import type { KV } from '../save/save';
import type { GameState } from '../sim/state';
import { EVENT_SCHEMA, TELEMETRY_SCHEMA_VERSION, isPinned as pinnedEvent } from './schema';
import { createSessionClock, type SessionClock, type SessionClockView } from './session-clock';
export const TELEMETRY_KEY = 'eggfarm.telemetry';
/** M3-AC7: random per-install id under its OWN key (never in the save), so it survives a save reset and the corrupt-save fallback. */
export const INSTALL_ID_KEY = 'eggfarm.install_id';
export function installId(kv: KV, rnd: () => string = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`)): string {
  let id: string | null = null; try { id = kv.getItem(INSTALL_ID_KEY); } catch { /* storage blocked */ }
  if (!id) { id = rnd(); try { kv.setItem(INSTALL_ID_KEY, id); } catch { /* private mode: id lives for this session */ } }
  return id;
}
/** Legacy type-only pin list (M3-AC7 retention, proposal §4). The ring no longer trims by it: it uses ringPinned (errata V-3).
 *  Kept for stored pre-0.6.2 events (legacy:true) and the TEL-AC11 "no pin lost" test. */
export const isPinned = (type: string) => type === 'session_start' || type === 'session_end' || type === 'upgrade' || type.startsWith('onboarding_')
  || type === 'worker_hire' || type.startsWith('worker_manage') || type === 'save_reset'
  || type === 'milestone_reached' || type === 'balanced_tier'
  || type === 'save_migrated' || type === 'save_migration_aborted' // M4A-34 (only emitted with the M4 flag on); m4-design §3c migration events
  || type === 'hatch_started' || type === 'flock_complete' // M5.1 breeds §8 L692/L695 (pinned; only emitted with m4.flags.breeds on)
  || type === 'zero_gain_purchase' || type === 'dead_zone'; // BBv2 errata v5 rev 12 #21/#22 (pinned; emitted only with bestBuyV2 = 1); #19/#20 stay ring
/** TEL-AC1 envelope (telemetry-spec v0.6.2 L17-20): every emitted event carries type, ts (wall ms), sid (6-char base36) and fgMs
 *  (foreground ms of that sid, hidden time excluded, non-decreasing per sid). No sessionMs (T-AC1). Stored legacy events may lack sid/fgMs. */
export interface TEvent { type: string; ts: number; sid?: string; fgMs?: number; [k: string]: unknown; }
/** ST-AC19/20 (errata rev. 16 f82bf4d6 V-3): the ring keeps every event the schema pins (event-based isPinned: §3.2 + the V-3 set,
 *  coop_full end/capped, tip_shown{clock_wage}). A stored legacy:true event also keeps its old type-based pin, so no pin is lost. */
export const ringPinned = (e: TEvent): boolean => pinnedEvent(e) || (e.legacy === true && isPinned(e.type));
/** One player coop tap with the credited-tap system on (streak §8 L288; the sim's `collect{credited, bonus_cents}`), plus whether a
 *  Coop Hand is hired at tap time. Absent = the credit system is off (flag-off tap events keep exactly {count, eggs}). */
export interface TapCredit { credited: boolean; bonus_cents?: number; coopHand: boolean; }
/** Game state read at session_end (streak §8.1): Farm level at emit, Coop Hand hired now, and whether credited taps are on. */
export interface SessionEndContext { farm_level: number; coop_hand: boolean; credit: boolean; }
type Env = { sid: string; fgMs: number };
type TapWin = { start: number; env: Env; count: number; eggs: number; credit?: { credited: number; empty_credited: number; bonus_cents: number } };
/** The tap fields of one window: {count, eggs} plus, with the credit system on, {credited, empty_credited, bonus_cents}. */
const tapFields = (w: TapWin) => ({ count: w.count, eggs: w.eggs, ...(w.credit ?? {}) });
export interface TelemetryConfig { ring_size: number; flush_interval_s: number; tap_batch_ms: number; worker_summary_s?: number; session_hidden_end_s?: number;
  bbv2?: { shown_min_gap_s: number; zero_gain_eta_max_s: number; dead_zone_min_s: number; zero_gain_purchase_cap: number }; }
/** v5-tel-envelope §3 (clock-api.md): one session_end contributor. Stable contract for stacked PRs:
 *  fields(src) is merged into session_end in registration order. `src` is the GameState to read
 *  (the hide snapshot for a back-dated session_end{hidden}; otherwise the live state). Game always
 *  passes src. Bare Telemetry tests may omit it; contributors that only read Telemetry- or Game-owned
 *  tallies may ignore src. Contributors that read sim state MUST use `src` (fallback `src ?? this.state`);
 *  do not close over Game.state — that leaks discarded hidden-sim time (QA F1). `at` is not a fields()
 *  argument; the emit time stays on endSession / track. counts(src) (A1, pure) is read for session_summary
 *  before any reset; reset() has no args and runs after session_end + session_summary. */
export interface SessionEndContributor { fields(src?: GameState): Record<string, unknown>; reset(): void; counts?(src?: GameState): Record<string, unknown>; }
/** Builds the session_summary payload from every contributor's counts (Generalist owns it, A1). null = emit nothing. */
export type SessionSummaryProducer = (at: number, counts: Readonly<Record<string, Record<string, unknown>>>) => Record<string, unknown> | null;
export interface TelemetryOpts { newSid?: () => string }
/** Pre-0.6.2 rings are a bare array, or {events} with no v. Tag those events; never drop them (G8-13). */
function tagLegacy(events: unknown[]): TEvent[] {
  return events.map(e => (e !== null && typeof e === 'object' && !Array.isArray(e) ? { ...(e as TEvent), legacy: true } : e)) as TEvent[];
}
function readRing(raw: string | null): TEvent[] {
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (Array.isArray(parsed)) return tagLegacy(parsed);
  if (!parsed || typeof parsed !== 'object') return [];
  const ring = parsed as { v?: unknown; events?: unknown };
  if (!Array.isArray(ring.events)) return [];
  return ring.v == null ? tagLegacy(ring.events) : ring.events as TEvent[];
}
const exportDoc = (exportedAt: number, events: readonly object[]) => JSON.stringify({ schema_version: TELEMETRY_SCHEMA_VERSION, exportedAt, events }, null, 2);
/**
 * Ring buffer (cap ring_size) persisted in batches: track() only touches memory; flush() writes storage.
 * Taps are aggregated into one `tap` event per tap_batch_ms window ({count, eggs}; + {credited, empty_credited, bonus_cents} with credited taps on).
 * Stored ring is {v: TELEMETRY_SCHEMA_VERSION, events} (errata rev 13 V-0, G8-12). A ring with no v keeps its
 * events and tags them legacy:true (G8-13); T-AC9 still applies to untagged events (validateEvent skips legacy:true).
 */
export class Telemetry {
  private buf: TEvent[]; private dirty = false; private warned = new Set<string>();
  /** The one foreground clock (TEL-AC1 sid/fgMs). Moved only by onPageHidden/onPageShown (Game, from page events). */
  private ck: SessionClock;
  /** Read-only view for everyone else (Gen's fg_ms = clock.nowFgMs(hiddenAt ?? now); no second accumulator). */
  get clock(): SessionClockView { return this.ck; }
  private contributors = new Map<string, SessionEndContributor>();
  /** A1: the session_summary producer (Generalist). Unset: no session_summary is emitted. */
  sessionSummary: SessionSummaryProducer | null = null;
  readonly hiddenEndMs: number;
  private tapWin: TapWin | null = null;
  /** Per page-load session tap totals for session_end (streak §8.1, ST-AC20). Never saved. */
  private ses = { taps_total: 0, taps_moved_eggs: 0, credited_taps: 0, empty_credited: 0, tap_bonus_cents: 0, coopHandSeen: false };
  /** Set by Game: reads farm_level / coop_hand / credit from `src` (or the live state). Without it (bare Telemetry) session_end carries the tap totals only. */
  sessionEndContext: ((src?: GameState) => SessionEndContext) | null = null;
  private sumWin: { start: number; env: Env; v: Record<string, number> } | null = null;
  writes = 0;
  constructor(private kv: KV, private cfg: TelemetryConfig, private now = () => Date.now(), opts: TelemetryOpts = {}) {
    this.hiddenEndMs = (cfg.session_hidden_end_s ?? 60) * 1000;
    this.ck = createSessionClock({ now, hiddenEndMs: this.hiddenEndMs, newSid: opts.newSid });
    // #123 ST-AC20 tally, behind the contributor interface (registered first, so its fields lead session_end as before).
    this.registerSessionEnd('taps', { fields: (src) => this.sessionEndFields(src), reset: () => { this.ses = { taps_total: 0, taps_moved_eggs: 0, credited_taps: 0, empty_credited: 0, tap_bonus_cents: 0, coopHandSeen: false }; } });
    try { this.buf = readRing(kv.getItem(TELEMETRY_KEY)); } catch { this.buf = []; }
    this.trim();
  }
  /** Evict the oldest NON-pinned events until the trimmable part fits ring_size. Pinned events are never dropped. */
  private trim() {
    const cap = this.cfg.ring_size; let free = 0; for (const e of this.buf) if (!ringPinned(e)) free++;
    if (free <= cap) return;
    let drop = free - cap; this.buf = this.buf.filter(e => { if (drop > 0 && !ringPinned(e)) { drop--; return false; } return true; });
  }
  /** `at` (default now) is the event's wall time; only endSession passes it (back-dated session_end{hidden}, T-AC13). */
  track(type: string, data: Record<string, unknown> = {}, at = this.now()) {
    // T-AC9: unknown types warn once in dev and are still recorded; release builds never drop or check (tree-shaken).
    if (import.meta.env.DEV && !Object.prototype.hasOwnProperty.call(EVENT_SCHEMA, type) && !this.warned.has(type)) { this.warned.add(type); console.warn(`[telemetry] unknown event type: ${type}`); }
    if (type !== 'tap') this.closeTapWindow();
    this.buf.push({ ...data, type, ts: at, ...this.env(at) }); this.trim(); this.dirty = true;
  }
  /** Envelope stamp for an event at wall time `at` (fgMs frozen at the hide while hidden). */
  private env(at: number): Env { return { sid: this.ck.sid, fgMs: this.ck.nowFgMs(at) }; }
  /** Register a session_end contributor (order = registration order; the same name again replaces it in place). */
  registerSessionEnd(name: string, c: SessionEndContributor) { this.contributors.set(name, c); }
  /** @internal Game only (visibilitychange hidden / pagehide): freeze fgMs. Idempotent. */
  onPageHidden(at: number) { this.ck.pause(at); }
  /** @internal Game only: is a hidden rotate due at `at` (open hide >= session_hidden_end_s, or this sid already ended)? */
  rotateDue(at: number): boolean { const h = this.ck.hiddenAt; return h !== null && (this.ck.ended || at - h >= this.hiddenEndMs); }
  /** @internal Game only (visible / pageshow{persisted}): resume the clock; returns the Split when it rotated to a new sid. */
  onPageShown(at: number, rotate = true) { return this.ck.resume(at, rotate); }
  /** End this sid (A1 order): session_end{reason, fg_ms, ...contributors}, then session_summary, then every contributor reset(),
   *  then markEnded. `at` = the end time: the hide time for reason 'hidden' (back-dated, T-AC13). `src` is the GameState
   *  passed to every contributor's fields/counts (the hide snapshot for a back-dated hidden end; otherwise the live
   *  state). Game always supplies it; bare Telemetry tests may omit it. No-op if this sid already ended. */
  endSession(reason: 'unload' | 'hidden', at: number, src?: GameState) {
    if (this.ck.ended) return; // one session_end per sid (B3)
    this.closeTapWindow(); this.closeSumWindow(); // windows belong to the sid they opened in; session_end = Σ tap events
    const extra: Record<string, unknown> = {}, counts: Record<string, Record<string, unknown>> = {};
    for (const c of this.contributors.values()) Object.assign(extra, c.fields(src));
    for (const [n, c] of this.contributors) if (c.counts) counts[n] = c.counts(src);
    const fg_ms = this.ck.nowFgMs(at);
    this.track('session_end', { ...extra, reason, fg_ms }, at);
    const sum = this.sessionSummary?.(at, counts); if (sum) this.track('session_summary', sum, at);
    for (const c of this.contributors.values()) c.reset();
    this.ck.markEnded();
  }
  /** Open a session: session_start{...fields, reason, session_id = sid, prev_hidden_ms?} as the first event of the current sid. */
  startSession(reason: 'load' | 'resume', fields: Record<string, unknown>, prevHiddenMs?: number) {
    this.closeTapWindow();
    this.track('session_start', { ...fields, reason, session_id: this.ck.sid, ...(prevHiddenMs === undefined ? {} : { prev_hidden_ms: Math.max(0, Math.round(prevHiddenMs)) }) });
  }
  /** One player coop tap. `c` is passed only while credited taps are on (ST-AC19). empty_credited counts a tap only when it was
   *  credited, moved 0 eggs, and a Coop Hand was hired at tap time (m5.0-sizing L382, streak §8 L288 / §8.1). */
  tap(eggs: number, c?: TapCredit) {
    const t = this.now();
    if (this.tapWin && t - this.tapWin.start >= this.cfg.tap_batch_ms) this.closeTapWindow();
    if (!this.tapWin) this.tapWin = { start: t, env: this.env(t), count: 0, eggs: 0 };
    this.tapWin.count++; this.tapWin.eggs += eggs;
    const S = this.ses; S.taps_total++; if (eggs > 0) S.taps_moved_eggs++;
    if (!c) return;
    const w = (this.tapWin.credit ??= { credited: 0, empty_credited: 0, bonus_cents: 0 }), bonus = c.bonus_cents ?? 0;
    if (c.coopHand) S.coopHandSeen = true;
    if (c.credited) { w.credited++; S.credited_taps++; if (eggs === 0 && c.coopHand) { w.empty_credited++; S.empty_credited++; } }
    w.bonus_cents += bonus; S.tap_bonus_cents += bonus;
  }
  /** session_end v5 fields (streak §8.1 / ST-AC20, errata rev. 16 V-2b): taps_total, taps_moved_eggs, farm_level always (v0.6.2
   *  base fields); credited_taps, tap_bonus_cents (ST-AC19 [T-sub]), empty_credited and coop_hand only with credited taps on
   *  (flag-gated fields are absent with their flag off). coop_hand = a Coop Hand was hired at any tap of the session or at emit. */
  private sessionEndFields(src?: GameState): Record<string, unknown> {
    const S = this.ses, ctx = this.sessionEndContext?.(src);
    const base = { taps_total: S.taps_total, taps_moved_eggs: S.taps_moved_eggs };
    if (!ctx) return base;
    return { ...base, farm_level: ctx.farm_level, ...(ctx.credit ? { credited_taps: S.credited_taps, tap_bonus_cents: S.tap_bonus_cents,
      empty_credited: S.empty_credited, coop_hand: S.coopHandSeen || ctx.coop_hand } : {}) };
  }
  /** M2: high-rate worker activity (wages, auto-collect, Market Hand sales) summed into one `worker_summary`
   *  event per worker_summary_s window, so a 1 s Market Hand doesn't flood the ring buffer. */
  sum(key: string, n: number) {
    const t = this.now();
    if (this.sumWin && t - this.sumWin.start >= (this.cfg.worker_summary_s ?? 60) * 1000) this.closeSumWindow();
    if (!this.sumWin) this.sumWin = { start: t, env: this.env(t), v: {} };
    this.sumWin.v[key] = (this.sumWin.v[key] ?? 0) + n;
  }
  private closeSumWindow() {
    const w = this.sumWin; if (!w) return; this.sumWin = null;
    this.buf.push({ ...w.v, type: 'worker_summary', ts: w.start, ...w.env, windowMs: this.now() - w.start }); this.trim(); this.dirty = true;
  }
  private closeTapWindow() {
    const w = this.tapWin; if (!w) return; this.tapWin = null;
    this.buf.push({ type: 'tap', ts: w.start, ...w.env, ...tapFields(w) }); this.trim(); this.dirty = true;
  }
  /** Close stale tap window if its second has passed (call per frame; memory only). */
  poll() { if (this.sumWin && this.now() - this.sumWin.start >= (this.cfg.worker_summary_s ?? 60) * 1000) this.closeSumWindow(); if (this.tapWin && this.now() - this.tapWin.start >= this.cfg.tap_batch_ms) this.closeTapWindow(); }
  flush(force = false) {
    if (force) { this.closeTapWindow(); this.closeSumWindow(); } else this.poll();
    if (!this.dirty) return; try { this.kv.setItem(TELEMETRY_KEY, JSON.stringify({ v: TELEMETRY_SCHEMA_VERSION, events: this.buf })); this.dirty = false; this.writes++; } catch { /* AC14c: quota/private mode; keep the buffer in memory */ }
  }
  events(): readonly TEvent[] { return this.buf; }
  /** v5 zeroGainUi (spec §11, HoE 02:55): add fields to the newest event of `type` (the UI sets `upgrade.zero_gain` after dispatch).
   *  Memory only (marks dirty; the next flush writes it). No-op when there is none. */
  annotateLast(type: string, data: Record<string, unknown>) {
    for (let i = this.buf.length - 1; i >= 0; i--) if (this.buf[i].type === type) { Object.assign(this.buf[i], data); this.dirty = true; return; }
  }
  /** Fields never returned by the console export (window.eggfarmExportTelemetry): the per-install id. */
  static readonly REDACT = ['install_id'] as const;
  /** Read-only export for the window.eggfarmExportTelemetry console global: no side effects (open tap/worker windows are
   *  appended as virtual events without being closed, nothing is written to storage), install_id removed.
   *  Settings > Export log keeps exportJSON() (M3-AC7 playtest log, includes install_id). */
  snapshotJSON(): string {
    const t = this.now(), extra: TEvent[] = [];
    if (this.tapWin) extra.push({ type: 'tap', ts: this.tapWin.start, ...this.tapWin.env, ...tapFields(this.tapWin), open: true });
    if (this.sumWin) extra.push({ ...this.sumWin.v, type: 'worker_summary', ts: this.sumWin.start, ...this.sumWin.env, windowMs: t - this.sumWin.start, open: true });
    const events = [...this.buf, ...extra].map(e => { const o: Record<string, unknown> = { ...e }; for (const k of Telemetry.REDACT) delete o[k]; return o; });
    return exportDoc(t, events);
  }
  exportJSON(): string { this.closeTapWindow(); this.closeSumWindow(); return exportDoc(this.now(), this.buf); }
  // Onboarding hooks: wired now, called by the onboarding overlay when it lands.
  onboardingStep(step: number, name: string, extra: Record<string, unknown> = {}) { this.track('onboarding_step', { step, name, ...extra }); }
  onboardingSkip(atStep: number) { this.track('onboarding_skip', { atStep }); }
}
