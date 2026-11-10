import { describe, it, expect } from 'vitest';
import { frameStats, FrameSampler } from '../src/debug/frame-sampler';
describe('SM-9 frame sampler', () => {
  it('60 fps passes', () => { const s = frameStats(Array(600).fill(16.7)); expect(s.pass).toBe(true); expect(s.p95).toBeCloseTo(16.7); });
  it('p95 > 20 ms fails', () => { const s = frameStats([...Array(90).fill(16), ...Array(10).fill(25)]); expect(s.p95).toBe(25); expect(s.pass).toBe(false); });
  it('exactly 5% over 20 still passes on p95 and share', () => { const s = frameStats([...Array(95).fill(16), ...Array(5).fill(30)]); expect(s.over20Pct).toBe(5); expect(s.p95).toBe(16); expect(s.pass).toBe(true); });
  it('any frame > 100 ms fails', () => { const s = frameStats([...Array(999).fill(16), 120]); expect(s.p95).toBe(16); expect(s.over100).toBe(1); expect(s.pass).toBe(false); });
  it('empty sample does not pass', () => { expect(frameStats([]).pass).toBe(false); });
  it('sampler skips warm-up and collects deltas over the window', async () => {
    let t = 0; const q: FrameRequestCallback[] = [];
    const sm = new FrameSampler(f => { q.push(f); return q.length; }, () => {}, () => 0);
    const p = sm.run(1000, 500);
    while (q.length) { t += 10; q.shift()!(t); }
    const s = await p; expect(s.frames).toBe(100); expect(s.p95).toBe(10); expect(s.pass).toBe(true);
  });
});
