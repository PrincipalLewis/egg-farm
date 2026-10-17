import { IOS_FLAG_ENABLED } from '../ui/ios-tip';
/** SM-9 rAF frame sampler (engineering/m3-smoke-plan.md). Test-hook only: loaded with ?perf=1 (separate chunk). */
export interface FrameStats { frames: number; p50: number; p95: number; max: number; over20Pct: number; over100: number; durationMs: number; pass: boolean; }
/** Pure stats over frame deltas (ms). Pass: p95 <= 20, <= 5% of frames > 20 ms, no frame > 100 ms. */
export function frameStats(deltas: number[], durationMs = deltas.reduce((a, b) => a + b, 0)): FrameStats {
  const s = [...deltas].sort((a, b) => a - b), n = s.length;
  const q = (p: number) => n ? s[Math.min(n - 1, Math.ceil(p * n) - 1)] : 0;
  const over20 = deltas.filter(d => d > 20).length, over100 = deltas.filter(d => d > 100).length;
  const p95 = q(0.95), over20Pct = n ? (over20 / n) * 100 : 0;
  return { frames: n, p50: q(0.5), p95, max: n ? s[n - 1] : 0, over20Pct, over100, durationMs, pass: n > 0 && p95 <= 20 && over20Pct <= 5 && over100 === 0 };
}
export class FrameSampler {
  private deltas: number[] = []; private last = 0; private raf = 0; private t0 = 0; running = false;
  constructor(private raf_ = (f: FrameRequestCallback) => requestAnimationFrame(f), private caf = (id: number) => cancelAnimationFrame(id), private now = () => performance.now()) {}
  /** Sample for `ms` after `warmupMs`; resolves with stats. */
  run(ms: number, warmupMs = 0, onTick?: (st: FrameStats) => void): Promise<FrameStats> {
    this.deltas = []; this.running = true; const start = this.now();
    return new Promise(res => {
      const step = (t: number) => {
        if (t - start < warmupMs) { this.last = t; this.raf = this.raf_(step); return; }
        if (!this.t0) { this.t0 = t; this.last = t; } else { this.deltas.push(t - this.last); this.last = t; }
        if (onTick && this.deltas.length % 30 === 0) onTick(frameStats(this.deltas, t - this.t0));
        if (t - this.t0 >= ms) { this.running = false; this.t0 = 0; res(frameStats(this.deltas, ms)); return; }
        this.raf = this.raf_(step);
      };
      this.raf = this.raf_(step);
    });
  }
  stop() { this.caf(this.raf); this.running = false; }
}
/** On-screen overlay for real devices; result also on window.eggfarmPerf. */
export function mountPerfOverlay(params: URLSearchParams) {
  if (!IOS_FLAG_ENABLED) return; // QA B-4: never in release (compile-time __IOS_FLAG__); main.ts also gates the import
  const el = document.createElement('div'); el.className = 'perf-ov'; el.setAttribute('aria-hidden', 'true');
  document.body.append(el);
  const sec = Number(params.get('perfS') ?? 60), warm = Number(params.get('perfWarmS') ?? 10);
  const fmt = (s: FrameStats, done: boolean) => `SM-9 ${done ? (s.pass ? 'PASS' : 'FAIL') : 'sampling…'}\np95 ${s.p95.toFixed(1)} ms · p50 ${s.p50.toFixed(1)}\n>20ms ${s.over20Pct.toFixed(1)}% · max ${s.max.toFixed(0)} ms\nframes ${s.frames} / ${(s.durationMs / 1000).toFixed(0)} s`;
  el.textContent = `SM-9 warm-up ${warm} s…`;
  const w = window as any;
  w.eggfarmPerf = { done: false, result: null };
  void new FrameSampler().run(sec * 1000, warm * 1000, s => { el.textContent = fmt(s, false); }).then(s => { el.textContent = fmt(s, true); el.dataset.pass = String(s.pass); w.eggfarmPerf = { done: true, result: s }; });
}
