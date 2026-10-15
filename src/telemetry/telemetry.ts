import type { KV } from '../save/save';
export const TELEMETRY_KEY = 'eggfarm.telemetry';
export interface TEvent { type: string; ts: number; sessionMs: number; [k: string]: unknown; }
export interface TelemetryConfig { ring_size: number; flush_interval_s: number; tap_batch_ms: number; }
/**
 * Ring buffer (cap ring_size) persisted in batches: track() only touches memory; flush() writes storage.
 * Taps are aggregated into one `tap` event per tap_batch_ms window ({count, eggs}).
 */
export class Telemetry {
  private buf: TEvent[]; private dirty = false; private sessionStart: number;
  private tapWin: { start: number; count: number; eggs: number } | null = null;
  writes = 0;
  constructor(private kv: KV, private cfg: TelemetryConfig, private now = () => Date.now()) {
    this.sessionStart = now();
    try { const raw = kv.getItem(TELEMETRY_KEY); this.buf = raw ? JSON.parse(raw) : []; if (!Array.isArray(this.buf)) this.buf = []; } catch { this.buf = []; }
    this.trim();
  }
  private trim() { if (this.buf.length > this.cfg.ring_size) this.buf.splice(0, this.buf.length - this.cfg.ring_size); }
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
  private closeTapWindow() {
    const w = this.tapWin; if (!w) return; this.tapWin = null;
    this.buf.push({ type: 'tap', ts: w.start, sessionMs: w.start - this.sessionStart, count: w.count, eggs: w.eggs }); this.trim(); this.dirty = true;
  }
  /** Close stale tap window if its second has passed (call per frame; memory only). */
  poll() { if (this.tapWin && this.now() - this.tapWin.start >= this.cfg.tap_batch_ms) this.closeTapWindow(); }
  flush(force = false) {
    if (force) this.closeTapWindow(); else this.poll();
    if (!this.dirty) return; this.kv.setItem(TELEMETRY_KEY, JSON.stringify(this.buf)); this.dirty = false; this.writes++;
  }
  events(): readonly TEvent[] { return this.buf; }
  exportJSON(): string { this.closeTapWindow(); return JSON.stringify({ exportedAt: this.now(), events: this.buf }, null, 2); }
  // Onboarding hooks: wired now, called by the onboarding overlay when it lands.
  onboardingStep(step: number, name: string) { this.track('onboarding_step', { step, name }); }
  onboardingSkip(atStep: number) { this.track('onboarding_skip', { atStep }); }
}
