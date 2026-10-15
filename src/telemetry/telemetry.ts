import type { KV } from '../save/save';
export const TELEMETRY_KEY = 'eggfarm.telemetry';
/** M3-AC7: random per-install id under its OWN key (never in the save), so it survives a save reset and the corrupt-save fallback. */
export const INSTALL_ID_KEY = 'eggfarm.install_id';
export function installId(kv: KV, rnd: () => string = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`)): string {
  let id: string | null = null; try { id = kv.getItem(INSTALL_ID_KEY); } catch { /* storage blocked */ }
  if (!id) { id = rnd(); try { kv.setItem(INSTALL_ID_KEY, id); } catch { /* private mode: id lives for this session */ } }
  return id;
}
/** M3-AC7 retention (proposal §4): these events are kept for the whole playtest and never evicted by the ring;
 *  only the other (high-rate: tap, customer_*, sell, worker_summary...) events are ring-trimmed to ring_size. */
export const isPinned = (type: string) => type === 'session_start' || type === 'session_end' || type === 'upgrade' || type.startsWith('onboarding_')
  || type === 'worker_hire' || type.startsWith('worker_manage');
export interface TEvent { type: string; ts: number; sessionMs: number; [k: string]: unknown; }
export interface TelemetryConfig { ring_size: number; flush_interval_s: number; tap_batch_ms: number; worker_summary_s?: number; }
/**
 * Ring buffer (cap ring_size) persisted in batches: track() only touches memory; flush() writes storage.
 * Taps are aggregated into one `tap` event per tap_batch_ms window ({count, eggs}).
 */
export class Telemetry {
  private buf: TEvent[]; private dirty = false; private sessionStart: number;
  private tapWin: { start: number; count: number; eggs: number } | null = null;
  private sumWin: { start: number; v: Record<string, number> } | null = null;
  writes = 0;
  constructor(private kv: KV, private cfg: TelemetryConfig, private now = () => Date.now()) {
    this.sessionStart = now();
    try { const raw = kv.getItem(TELEMETRY_KEY); this.buf = raw ? JSON.parse(raw) : []; if (!Array.isArray(this.buf)) this.buf = []; } catch { this.buf = []; }
    this.trim();
  }
  /** Evict the oldest NON-pinned events until the trimmable part fits ring_size. Pinned events are never dropped. */
  private trim() {
    const cap = this.cfg.ring_size; let free = 0; for (const e of this.buf) if (!isPinned(e.type)) free++;
    if (free <= cap) return;
    let drop = free - cap; this.buf = this.buf.filter(e => { if (drop > 0 && !isPinned(e.type)) { drop--; return false; } return true; });
  }
  track(type: string, data: Record<string, unknown> = {}) {
    if (type !== 'tap') this.closeTapWindow();
    const t = this.now(); this.buf.push({ ...data, type, ts: t, sessionMs: t - this.sessionStart }); this.trim(); this.dirty = true;
  }
  tap(eggs: number) {
    const t = this.now();
    if (this.tapWin && t - this.tapWin.start >= this.cfg.tap_batch_ms) this.closeTapWindow();
    if (!this.tapWin) this.tapWin = { start: t, count: 0, eggs: 0 };
    this.tapWin.count++; this.tapWin.eggs += eggs;
  }
  /** M2: high-rate worker activity (wages, auto-collect, Market Hand sales) summed into one `worker_summary`
   *  event per worker_summary_s window, so a 1 s Market Hand doesn't flood the ring buffer. */
  sum(key: string, n: number) {
    const t = this.now();
    if (this.sumWin && t - this.sumWin.start >= (this.cfg.worker_summary_s ?? 60) * 1000) this.closeSumWindow();
    if (!this.sumWin) this.sumWin = { start: t, v: {} };
    this.sumWin.v[key] = (this.sumWin.v[key] ?? 0) + n;
  }
  private closeSumWindow() {
    const w = this.sumWin; if (!w) return; this.sumWin = null;
    this.buf.push({ ...w.v, type: 'worker_summary', ts: w.start, sessionMs: w.start - this.sessionStart, windowMs: this.now() - w.start }); this.trim(); this.dirty = true;
  }
  private closeTapWindow() {
    const w = this.tapWin; if (!w) return; this.tapWin = null;
    this.buf.push({ type: 'tap', ts: w.start, sessionMs: w.start - this.sessionStart, count: w.count, eggs: w.eggs }); this.trim(); this.dirty = true;
  }
  /** Close stale tap window if its second has passed (call per frame; memory only). */
  poll() { if (this.sumWin && this.now() - this.sumWin.start >= (this.cfg.worker_summary_s ?? 60) * 1000) this.closeSumWindow(); if (this.tapWin && this.now() - this.tapWin.start >= this.cfg.tap_batch_ms) this.closeTapWindow(); }
  flush(force = false) {
    if (force) { this.closeTapWindow(); this.closeSumWindow(); } else this.poll();
    if (!this.dirty) return; this.kv.setItem(TELEMETRY_KEY, JSON.stringify(this.buf)); this.dirty = false; this.writes++;
  }
  events(): readonly TEvent[] { return this.buf; }
  exportJSON(): string { this.closeTapWindow(); this.closeSumWindow(); return JSON.stringify({ exportedAt: this.now(), events: this.buf }, null, 2); }
  // Onboarding hooks: wired now, called by the onboarding overlay when it lands.
  onboardingStep(step: number, name: string, extra: Record<string, unknown> = {}) { this.track('onboarding_step', { step, name, ...extra }); }
  onboardingSkip(atStep: number) { this.track('onboarding_skip', { atStep }); }
}
