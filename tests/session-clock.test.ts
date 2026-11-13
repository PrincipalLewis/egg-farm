import { describe, it, expect } from 'vitest';
import { createSessionClock, cryptoSid } from '../src/telemetry/session-clock';

const mk = (t0 = 1_000) => {
  let t = t0, n = 0; const sids = ['aaaaaa', 'bbbbbb', 'cccccc', 'dddddd'];
  const c = createSessionClock({ now: () => t, hiddenEndMs: 60_000, newSid: () => sids[n++] });
  return { c, at: (v: number) => { t = v; return v; } };
};

describe('session-clock (TEL-AC1 fgMs, B3 hidden split)', () => {
  it('cryptoSid is 6-char base36 and varies', () => {
    const s = new Set(Array.from({ length: 50 }, cryptoSid));
    for (const x of s) expect(x).toMatch(/^[0-9a-z]{6}$/);
    expect(s.size).toBeGreaterThan(45);
  });
  it('fg counts visible wall time as integer ms from construction', () => {
    const { c, at } = mk(); at(2_500.7); expect(c.sid).toBe('aaaaaa'); expect(c.nowFgMs()).toBe(1500);
  });
  it('R1: hide < 60 s keeps the sid and excludes the hidden span; fg frozen while hidden', () => {
    const { c, at } = mk();
    c.pause(at(11_000)); expect(c.hiddenAt).toBe(11_000);
    at(50_000); expect(c.nowFgMs()).toBe(10_000);
    expect(c.resume(at(70_999))).toBeNull(); // 59.999 s
    expect(c.sid).toBe('aaaaaa'); expect(c.hiddenAt).toBeNull();
    at(71_999); expect(c.nowFgMs()).toBe(11_000);
  });
  it('R2: hide >= 60 s rotates with the split as of the hide', () => {
    const { c, at } = mk();
    c.pause(at(11_000));
    expect(c.resume(at(71_000))).toEqual({ prevSid: 'aaaaaa', hiddenAt: 11_000, fgAtHide: 10_000, prevHiddenMs: 60_000 });
    expect(c.sid).toBe('bbbbbb'); expect(c.nowFgMs()).toBe(0);
    at(72_000); expect(c.nowFgMs()).toBe(1000);
  });
  it('pause is idempotent and resume without a hide is a no-op', () => {
    const { c, at } = mk();
    expect(c.resume(at(2_000))).toBeNull();
    c.pause(at(3_000)); c.pause(at(9_000)); expect(c.hiddenAt).toBe(3_000);
    expect(c.resume(at(62_999))).toBeNull(); expect(c.sid).toBe('aaaaaa'); // gap measured from the FIRST pause
  });
  it('R6: after markEnded any resume rotates (bfcache), prev_hidden_ms = gap', () => {
    const { c, at } = mk();
    c.pause(at(5_000)); c.markEnded(); expect(c.ended).toBe(true);
    const s = c.resume(at(5_400)); expect(s).toEqual({ prevSid: 'aaaaaa', hiddenAt: 5_000, fgAtHide: 4_000, prevHiddenMs: 400 });
    expect(c.ended).toBe(false); expect(c.sid).toBe('bbbbbb');
  });
  it('clock going back: no rotate, fg never decreases', () => {
    const { c, at } = mk();
    at(4_000); expect(c.nowFgMs()).toBe(3_000);
    at(2_000); expect(c.nowFgMs()).toBe(3_000);
    c.pause(at(5_000)); expect(c.resume(at(1_000))).toBeNull(); expect(c.sid).toBe('aaaaaa');
    at(6_000); expect(c.nowFgMs()).toBeGreaterThanOrEqual(4_000);
  });
  it('rotate() directly (tests / pagehide path) resets fg', () => {
    const { c, at } = mk();
    const s = c.rotate(at(3_000), 0); expect(s.prevSid).toBe('aaaaaa'); expect(s.fgAtHide).toBe(2_000); expect(c.sid).toBe('bbbbbb');
    at(3_500); expect(c.nowFgMs()).toBe(500);
  });
});
