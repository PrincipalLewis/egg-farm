/**
 * Pure session telemetry field builders (HoE/v5-session-end-base).
 *
 * - Base `session_end` fields (spec L28, T-AC7/8/10). Does **not** emit `reason` or
 *   `fg_ms` — the envelope's `endSession` sets those (clock-api.md be95124a).
 * - `session_summary` payload (spec §3.3, TEL-AC11 `start.viewport_h`).
 * - T8 `session_start` TEL-AC2 base fields (TEL-AC2/3, T-AC1).
 * - `allocateSessionIndex` (D-HOP-2026-11-10-21): resume carries session_index+1;
 *   a single helper, never reuse a persisted value.
 *
 * Shaped for later `registerSessionEnd('base', { fields(at), reset(), counts?(at) })`
 * and `telemetry.sessionSummary = createSessionSummaryProducer(...)`. This module
 * does not import envelope clock code. Wiring into Game and rc/v5's
 * current `session_end` is pending #138 (envelope types). Flag-off goldens stay
 * byte-identical because nothing is emitted from here in this PR.
 *
 * T-AC9: when a later PR wires these into `track('session_end', …)`, the literal
 * must take plain keys or `...spreads` only (no comma-bearing expressions).
 */
import { EVENT_SCHEMA, VIEWPORT_H_BUCKETS, VIEWPORT_W_BUCKETS } from './schema';

export type ViewportW = (typeof VIEWPORT_W_BUCKETS)[number];
export type ViewportH = (typeof VIEWPORT_H_BUCKETS)[number];
export type SessionStartReason = 'load' | 'resume';
export type SessionEndReason = 'unload' | 'hidden';

/** Sales-stopped fatigue-cue CSS breakpoint (V-4, TEL-AC3). Must stay 740. */
export const VIEWPORT_H_CHIP_MAX_PX = 740;
export const VIEWPORT_H_TALL_MIN_PX = 900;
export const VIEWPORT_W_NARROW_MAX_PX = 375;
export const VIEWPORT_W_WIDE_MIN_PX = 768;

/** T-AC10 / spec L94: 100 end events, then one capped marker; totals keep counting. */
export const COOP_FULL_EPISODE_CAP = 100;

export const SESSION_END_BASE_KEYS = [
  'taps_total', 'taps_moved_eggs', 'eggs_collected_manual',
  'coop_full_ms', 'eggs_lost_while_full', 'managed',
  'farm_level', 'collection_level',
] as const;

/** Planned envelope contract (clock-api.md be95124a). Local shape — do not import envelope code. */
export interface SessionEndContributorShape {
  fields(at: number): Record<string, unknown>;
  reset(): void;
  counts?(at: number): Record<string, unknown>;
}

const asCount = (n: number): number => {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
};
const asNonNeg = (n: number): number => {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
};
/** Fresh object assignable to Record<string, unknown> (envelope contributor / validateEvent). */
const wire = <T extends object>(o: T): T & Record<string, unknown> => ({ ...o }) as T & Record<string, unknown>;

// ---- viewport buckets (TEL-AC2 / TEL-AC3) --------------------------------------------------------------------

export function bucketViewportW(px: number): ViewportW {
  const n = Number.isFinite(px) ? px : 0;
  if (n < VIEWPORT_W_NARROW_MAX_PX) return VIEWPORT_W_BUCKETS[0];
  if (n < VIEWPORT_W_WIDE_MIN_PX) return VIEWPORT_W_BUCKETS[1];
  return VIEWPORT_W_BUCKETS[2];
}

export function bucketViewportH(px: number): ViewportH {
  const n = Number.isFinite(px) ? px : 0;
  if (n < VIEWPORT_H_CHIP_MAX_PX) return VIEWPORT_H_BUCKETS[0];
  if (n < VIEWPORT_H_TALL_MIN_PX) return VIEWPORT_H_BUCKETS[1];
  return VIEWPORT_H_BUCKETS[2];
}

// ---- session_index (D-HOP-2026-11-10-21) ---------------------------------------------------------------------

/**
 * Allocate `session_index` for a `session_start`. Pure: returns the new index and
 * the flags patch to persist alongside the UI flags (`flags.sessions`).
 *
 * Both `load` and `resume` increment: first load is 1; a resume after a hide
 * rotate carries session_index+1 (T-AC2, D-HOP-2026-11-10-21). Never reuse a
 * value — persist `flags` and pass it back in before the next call. Calling
 * twice with the same `prev` is pure and returns the same index; that is a
 * caller bug if both are emitted.
 *
 * Persistence of the resume bump is pending #138 (envelope rotate path). The
 * existing page-load bump in `ui/app.ts` should eventually call this helper
 * (not moved in this PR).
 */
export function allocateSessionIndex(
  flags: Readonly<{ sessions?: number }>,
  _reason: SessionStartReason,
): { session_index: number; flags: { sessions: number } } {
  const prev = asCount(flags.sessions ?? 0);
  const session_index = prev + 1;
  return { session_index, flags: { sessions: session_index } };
}

/** Eggs that would have entered the coop but didn't: uncapped − capped, ≥ 0. */
export function eggsLostWhileFull(uncapped: number, capped: number): number {
  if (!Number.isFinite(uncapped) || !Number.isFinite(capped)) return 0;
  return Math.max(0, uncapped - capped);
}

// ---- T8 session_start (TEL-AC2) ------------------------------------------------------------------------------

export interface SessionStartBaseInput {
  reason: SessionStartReason;
  session_index: number;
  farm_level: number;
  collection_level: number;
  has_coop_hand: boolean;
  viewport_w_px: number;
  viewport_h_px: number;
  reduced_motion: boolean;
  /** Envelope clock `sid` (pending #138). Required for a schema-valid emit. */
  session_id?: string;
  build?: string;
  install_id?: string;
  /** Resume only. Envelope `startSession` also sets this (pending #138). */
  prev_hidden_ms?: number;
}

export interface SessionStartBaseFields {
  reason: SessionStartReason;
  session_index: number;
  farm_level: number;
  collection_level: number;
  has_coop_hand: boolean;
  viewport_w: ViewportW;
  viewport_h: ViewportH;
  reduced_motion: boolean;
  session_id?: string;
  build?: string;
  install_id?: string;
  prev_hidden_ms?: number;
}

export function sessionStartBaseFields(input: SessionStartBaseInput): SessionStartBaseFields {
  const session_index = Math.max(1, asCount(input.session_index));
  const out: SessionStartBaseFields = {
    reason: input.reason,
    session_index,
    farm_level: asCount(input.farm_level),
    collection_level: asCount(input.collection_level),
    has_coop_hand: !!input.has_coop_hand,
    viewport_w: bucketViewportW(input.viewport_w_px),
    viewport_h: bucketViewportH(input.viewport_h_px),
    reduced_motion: !!input.reduced_motion,
  };
  if (input.session_id !== undefined) out.session_id = input.session_id;
  if (input.build !== undefined) out.build = input.build;
  if (input.install_id !== undefined) out.install_id = input.install_id;
  if (input.reason === 'resume' && input.prev_hidden_ms !== undefined) {
    out.prev_hidden_ms = asCount(input.prev_hidden_ms);
  }
  return out;
}

// ---- session_end base (no reason / fg_ms) --------------------------------------------------------------------

export interface SessionEndBaseInput {
  taps_total: number;
  taps_moved_eggs: number;
  eggs_collected_manual: number;
  coop_full_ms: number;
  eggs_lost_while_full: number;
  managed: boolean;
  farm_level: number;
  collection_level: number;
  coop_full_flapping?: boolean;
}

export interface SessionEndBaseFields {
  taps_total: number;
  taps_moved_eggs: number;
  eggs_collected_manual: number;
  coop_full_ms: number;
  eggs_lost_while_full: number;
  managed: boolean;
  farm_level: number;
  collection_level: number;
  coop_full_flapping?: true;
}

export function sessionEndBaseFields(input: SessionEndBaseInput): SessionEndBaseFields {
  const out: SessionEndBaseFields = {
    taps_total: asCount(input.taps_total),
    taps_moved_eggs: asCount(input.taps_moved_eggs),
    eggs_collected_manual: asCount(input.eggs_collected_manual),
    coop_full_ms: asCount(input.coop_full_ms),
    eggs_lost_while_full: asNonNeg(input.eggs_lost_while_full),
    managed: !!input.managed,
    farm_level: asCount(input.farm_level),
    collection_level: asCount(input.collection_level),
  };
  // Optional (T-AC10): present only when true, so a quiet session stays at the required 10 keys.
  if (input.coop_full_flapping) out.coop_full_flapping = true;
  return out;
}

// ---- session_summary (spec §3.3) -----------------------------------------------------------------------------

export interface SessionSummaryStart {
  reason: SessionStartReason;
  build: string;
  session_index: number;
  farm_level: number;
  collection_level: number;
  has_coop_hand: boolean;
  viewport_w: ViewportW;
  viewport_h: ViewportH;
  reduced_motion: boolean;
  prev_hidden_ms?: number;
}

export interface SessionSummaryEnd {
  reason: SessionEndReason;
  fg_ms: number;
  taps_total: number;
  taps_moved_eggs: number;
  eggs_collected_manual: number;
}

export interface FirstUpgrade {
  fgMs: number;
  upgrade: 'collection' | 'farm' | 'hens' | 'eggValue';
  newLevel: number;
  cost: number;
  taps_before: number;
}

export interface SessionSummaryInput {
  start: SessionSummaryStart;
  end: SessionSummaryEnd | null;
  counts: Record<string, number>;
  coop_full_ms: number;
  eggs_lost_while_full: number;
  coop_full_episodes: number;
  coop_full_flapping: boolean;
  first_upgrade: FirstUpgrade | null;
  upgrades: number;
}

const COUNT_KEY = /^[a-z][a-z0-9_]{0,39}$/;

export function sessionSummaryPayload(input: SessionSummaryInput): Record<string, unknown> {
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(input.counts)) {
    if (!COUNT_KEY.test(k) || !(k in EVENT_SCHEMA)) continue; // schema RULES: unknown event type fails
    const n = asCount(v);
    if (n > 0) counts[k] = n;
  }
  const start: Record<string, unknown> = {
    reason: input.start.reason,
    build: input.start.build,
    session_index: Math.max(1, asCount(input.start.session_index)),
    farm_level: asCount(input.start.farm_level),
    collection_level: asCount(input.start.collection_level),
    has_coop_hand: !!input.start.has_coop_hand,
    viewport_w: input.start.viewport_w,
    viewport_h: input.start.viewport_h, // TEL-AC11
    reduced_motion: !!input.start.reduced_motion,
  };
  if (input.start.reason === 'resume' && input.start.prev_hidden_ms !== undefined) {
    start.prev_hidden_ms = asCount(input.start.prev_hidden_ms);
  }
  const end = input.end ? {
    reason: input.end.reason,
    fg_ms: asCount(input.end.fg_ms),
    taps_total: asCount(input.end.taps_total),
    taps_moved_eggs: asCount(input.end.taps_moved_eggs),
    eggs_collected_manual: asCount(input.end.eggs_collected_manual),
  } : null;
  const fu = input.first_upgrade;
  const first_upgrade = fu ? {
    fgMs: asCount(fu.fgMs),
    upgrade: fu.upgrade,
    newLevel: asCount(fu.newLevel),
    cost: asNonNeg(fu.cost),
    taps_before: asCount(fu.taps_before),
  } : null;
  return {
    start,
    end,
    counts,
    coop_full_ms: asCount(input.coop_full_ms),
    eggs_lost_while_full: asNonNeg(input.eggs_lost_while_full),
    coop_full_episodes: asCount(input.coop_full_episodes),
    coop_full_flapping: !!input.coop_full_flapping,
    first_upgrade,
    upgrades: asCount(input.upgrades),
  };
}

/** Hook adapter: `telemetry.sessionSummary = createSessionSummaryProducer(getCtx)`. Pending #138. */
export function createSessionSummaryProducer(getCtx: () => {
  start: SessionSummaryStart | null;
  end: { reason: SessionEndReason; fg_ms: number } | null;
  eventCounts?: Record<string, number>;
}): (at: number, counts: Readonly<Record<string, Record<string, unknown>>>) => Record<string, unknown> | null {
  return (_at, contrib) => {
    const ctx = getCtx();
    if (!ctx.start) return null;
    const base = contrib.base ?? {};
    const end = ctx.end ? {
      reason: ctx.end.reason,
      fg_ms: ctx.end.fg_ms,
      taps_total: asCount(Number(base.taps_total)),
      taps_moved_eggs: asCount(Number(base.taps_moved_eggs)),
      eggs_collected_manual: asCount(Number(base.eggs_collected_manual)),
    } : null;
    const fu = base.first_upgrade;
    return sessionSummaryPayload({
      start: ctx.start,
      end,
      counts: ctx.eventCounts ?? {},
      coop_full_ms: asCount(Number(base.coop_full_ms)),
      eggs_lost_while_full: asNonNeg(Number(base.eggs_lost_while_full)),
      coop_full_episodes: asCount(Number(base.coop_full_episodes)),
      coop_full_flapping: !!base.coop_full_flapping,
      first_upgrade: isFirstUpgrade(fu) ? { ...fu } : null,
      upgrades: asCount(Number(base.upgrades)),
    });
  };
}

function isFirstUpgrade(v: unknown): v is FirstUpgrade {
  if (!v || typeof v !== 'object') return false;
  const o = v as FirstUpgrade;
  return typeof o.fgMs === 'number' && typeof o.upgrade === 'string' && typeof o.newLevel === 'number'
    && typeof o.cost === 'number' && typeof o.taps_before === 'number';
}

// ---- contributor factory (slots into registerSessionEnd) -----------------------------------------------------

export interface SessionEndBaseCtx {
  /** Live levels at fields()/counts() time. */
  levels?: () => { farm_level: number; collection_level: number };
  /** Hired worker present (including from a previous session). Dashboard §5 managed cut. */
  hasHiredWorker?: () => boolean;
}

export interface SessionEndBaseCounts {
  taps_total: number;
  taps_moved_eggs: number;
  eggs_collected_manual: number;
  coop_full_ms: number;
  eggs_lost_while_full: number;
  coop_full_episodes: number;
  coop_full_flapping: boolean;
  first_upgrade: FirstUpgrade | null;
  upgrades: number;
  managed: boolean;
  farm_level: number;
  collection_level: number;
}

export interface SessionEndBaseContributor extends SessionEndContributorShape {
  fields(at: number): SessionEndBaseFields & Record<string, unknown>;
  counts(at: number): SessionEndBaseCounts & Record<string, unknown>;
  recordTap(tap: { count: number; eggs: number; empty?: number }): void;
  recordCollect(eggs: number): void;
  recordCoopFullStart(at: number): void;
  recordCoopFullEnd(durationMs: number, eggsLost: number): void;
  /** A2: close an open episode at `at` (Architect closes before fields(); wiring pending). */
  closeOpenEpisode(at: number, eggsLost: number): void;
  recordManage(): void;
  recordHire(): void;
  setLevels(farm_level: number, collection_level: number): void;
  setHasHiredWorker(v: boolean): void;
  recordUpgrade(u: FirstUpgrade & { is_first_upgrade?: boolean }): void;
  /** True for the first 100 ended episodes (T-AC10). Totals always record. */
  shouldEmitCoopFullEnd(): boolean;
  /** True once when the 101st episode is recorded (capped marker). */
  takeCappedMarker(): boolean;
}

interface Acc {
  taps_total: number;
  taps_moved_eggs: number;
  eggs_collected_manual: number;
  coop_full_ms: number;
  eggs_lost_while_full: number;
  episodes: number;
  openAt: number | null;
  manages: number;
  hiredThisSession: boolean;
  hasHired: boolean;
  farm_level: number;
  collection_level: number;
  first_upgrade: FirstUpgrade | null;
  upgrades: number;
  cappedTaken: boolean;
}

const emptyAcc = (): Acc => ({
  taps_total: 0, taps_moved_eggs: 0, eggs_collected_manual: 0,
  coop_full_ms: 0, eggs_lost_while_full: 0, episodes: 0, openAt: null,
  manages: 0, hiredThisSession: false, hasHired: false,
  farm_level: 0, collection_level: 0, first_upgrade: null, upgrades: 0,
  cappedTaken: false,
});

export function createSessionEndBase(ctx: SessionEndBaseCtx = {}): SessionEndBaseContributor {
  let a = emptyAcc();

  const levels = () => {
    const live = ctx.levels?.();
    return {
      farm_level: live ? asCount(live.farm_level) : a.farm_level,
      collection_level: live ? asCount(live.collection_level) : a.collection_level,
    };
  };
  const hired = () => !!(ctx.hasHiredWorker?.() || a.hasHired || a.hiredThisSession);
  const managed = () => hired() && a.manages > 0;
  const snapshot = (): SessionEndBaseInput & { coop_full_flapping: boolean } => ({
    ...levels(),
    taps_total: a.taps_total,
    taps_moved_eggs: a.taps_moved_eggs,
    eggs_collected_manual: a.eggs_collected_manual,
    coop_full_ms: a.coop_full_ms,
    eggs_lost_while_full: a.eggs_lost_while_full,
    managed: managed(),
    coop_full_flapping: a.episodes > COOP_FULL_EPISODE_CAP,
  });

  const addEpisode = (durationMs: number, eggsLost: number) => {
    a.episodes += 1;
    a.coop_full_ms += asCount(Math.round(durationMs));
    a.eggs_lost_while_full += asNonNeg(eggsLost);
    a.openAt = null;
  };

  return {
    fields(_at) { return wire(sessionEndBaseFields(snapshot())); },
    counts(_at): SessionEndBaseCounts & Record<string, unknown> {
      const s = snapshot();
      return wire({
        taps_total: s.taps_total,
        taps_moved_eggs: s.taps_moved_eggs,
        eggs_collected_manual: s.eggs_collected_manual,
        coop_full_ms: s.coop_full_ms,
        eggs_lost_while_full: s.eggs_lost_while_full,
        coop_full_episodes: a.episodes,
        coop_full_flapping: s.coop_full_flapping,
        first_upgrade: a.first_upgrade ? { ...a.first_upgrade } : null,
        upgrades: a.upgrades,
        managed: s.managed,
        farm_level: s.farm_level,
        collection_level: s.collection_level,
      });
    },
    reset() { a = emptyAcc(); },
    recordTap(tap) {
      const count = asCount(tap.count);
      const empty = tap.empty !== undefined ? asCount(tap.empty) : (tap.eggs > 0 ? 0 : count);
      a.taps_total += count;
      a.taps_moved_eggs += Math.max(0, count - empty);
    },
    recordCollect(eggs) { a.eggs_collected_manual += asCount(eggs); },
    recordCoopFullStart(at) { if (a.openAt === null) a.openAt = at; },
    recordCoopFullEnd(durationMs, eggsLost) { addEpisode(durationMs, eggsLost); },
    closeOpenEpisode(at, eggsLost) {
      if (a.openAt === null) return;
      addEpisode(Math.max(0, at - a.openAt), eggsLost);
    },
    recordManage() { a.manages += 1; },
    recordHire() { a.hiredThisSession = true; a.hasHired = true; },
    setLevels(farm_level, collection_level) {
      a.farm_level = asCount(farm_level);
      a.collection_level = asCount(collection_level);
    },
    setHasHiredWorker(v) { a.hasHired = !!v; },
    recordUpgrade(u) {
      a.upgrades += 1;
      if (u.is_first_upgrade && !a.first_upgrade) {
        a.first_upgrade = {
          fgMs: asCount(u.fgMs), upgrade: u.upgrade, newLevel: asCount(u.newLevel),
          cost: asNonNeg(u.cost), taps_before: asCount(u.taps_before),
        };
      }
    },
    shouldEmitCoopFullEnd() { return a.episodes < COOP_FULL_EPISODE_CAP; },
    takeCappedMarker() {
      if (a.episodes <= COOP_FULL_EPISODE_CAP || a.cappedTaken) return false;
      a.cappedTaken = true;
      return true;
    },
  };
}
