// Hire2/v5-clockwage S3 (game.ts telemetry) + S4 (session_end.asleep_s, D-HOE-57 amendment: Hire 2 builds it, gated on clockWage,
// independent of rc2Refill; Refill adds autoRefill time later). failure-cost v0.3.24 AC-FC15 / AC-FC12.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { mem } from './helpers';
const flags = (o: Record<string, number>) => ({ ...b, m4: { ...b.m4!, enabled: 1, flags: { ...b.m4!.flags, ...o } } }) as typeof b;
const kvOf = () => { const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k); return kv; };
const boot = (bb: typeof b, mh: { energy: number; cdS: number; paused?: boolean }) => {
  let t = 1_760_000_000_000; const g = new Game(bb, kvOf(), () => t, 1, 'dev', null, null, { idbBoot: 'absent' });
  g.state = { ...g.state, farmLevel: 12, coinsCents: 100_000, customers: [], nextCustomerInS: 1e9, workers: { market_hand: mh } } as typeof g.state;
  return { g, tick: (ms: number) => { for (let i = 0; i < ms / 500; i++) { t += 500; g.frame(); } } /* live frames, lastFrameAt kept */, at: (ms: number) => { t += ms; } };
};
const end = (g: Game) => { g.endSession(); return g.telemetry.events().filter(e => e.type === 'session_end').at(-1) as Record<string, unknown>; };

describe('[S4 / AC-FC15] session_end.asleep_s + wage_paid_asleep_cents', () => {
  it('clockWage = 1: 120 s Asleep MH -> asleep_s 120, wage_paid_asleep_cents 600 (rc2Refill 0 and 1 alike)', () => {
    for (const r of [0, 1]) {
      const { g, tick } = boot(flags({ clockWage: 1, rc2Refill: r }), { energy: 0, cdS: 0.5 });
      tick(120_000); const e = end(g);
      expect(e.asleep_s).toBe(120); expect(e.wage_paid_asleep_cents).toBe(600);
    }
  });
  it('clockWage = 0: session_end carries neither field (byte-identical payload)', () => {
    const { g, tick } = boot(b, { energy: 0, cdS: 0.5 }); tick(10_000); const e = end(g);
    expect('asleep_s' in e).toBe(false); expect('wage_paid_asleep_cents' in e).toBe(false);
  });
  it('a paused Asleep MH adds no asleep seconds', () => {
    const { g, tick } = boot(flags({ clockWage: 1, pause: 1 }), { energy: 0, cdS: 0.5, paused: true }); tick(30_000);
    expect(end(g).asleep_s).toBe(0);
  });
  it('dropped hidden sim (hidden >= offlineMinSeconds) adds nothing; a short kept hidden period counts', () => {
    const { g, tick, at } = boot(flags({ clockWage: 1 }), { energy: 0, cdS: 0.5 }); tick(10_000);
    g.onHidden(); at(b.offline.offlineMinSeconds * 1000 + 5_000); g.frame(); g.onShown();
    expect(g.clockWageSession().asleepS).toBeCloseTo(10, 6);
    const k = boot(flags({ clockWage: 1 }), { energy: 0, cdS: 0.5 }); k.tick(10_000);
    k.g.onHidden(); k.at(5_000); k.g.onShown(); expect(k.g.clockWageSession().asleepS).toBeCloseTo(15, 6);
  });
  it('AC-FC12 view: per-role asleep seconds and cents since the last welcome-back; reset clears it, session total stays', () => {
    const { g, tick } = boot(flags({ clockWage: 1 }), { energy: 0, cdS: 0.5 }); tick(60_000);
    expect(g.clockWageSinceWelcome().market_hand).toEqual({ asleepS: 60, cents: 300 });
    g.resetClockWageSinceWelcome(); expect(g.clockWageSinceWelcome().market_hand).toEqual({ asleepS: 0, cents: 0 });
    expect(g.clockWageSession().asleepS).toBeCloseTo(60, 6);
  });
});
