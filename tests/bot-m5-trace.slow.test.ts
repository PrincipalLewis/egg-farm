// CCR N-5 on #78: pin the m5x-casual verify trace (24 h, seed 1, shipped balance) = the trace in #78's self-review and CCR's re-run
// (`npm run verify -- --hours 24 --profile m5x-casual`), and the checkpoint egg counters against an independent onEvents counter.
import { describe, it, expect } from 'vitest';
import { balance } from '../src/config/balance';
import { runVerify, checkpointSeconds } from '../scripts/verify/sim';
import { run, PROFS, M5X_STACKS } from './bot-m5';

describe('verify m5x-casual: pinned trace and checkpoint counters (CCR N-5)', () => {
  it('[VER-1h N-5] 24 h seed 1: trace 07139bdd, and eggs.collected/sold at each checkpoint equal sums over bot-m5 events', () => {
    const v = runVerify(balance, { hours: 24, seed: 1, profile: 'm5x-casual' });
    expect(v.traceSha256).toBe('07139bdd505a060e3daf27b33f10bd6cd8f2e7c118b6bf1c917d597b4ddd965e');
    expect(v.events).toBe(391661);
    expect(v.checkpoints.map(c => [c.eggs.collected, c.eggs.sold])).toEqual([[86134, 86134], [652476, 652476], [1332086, 1332086], [2011697, 2011697], [2691307, 2691307]]);
    let col = 0, sold = 0; const at = new Map<number, [number, number]>(); const secs = checkpointSeconds(24), cps = new Set(secs);
    run(balance, 1, PROFS.casual, M5X_STACKS.AssZ, 24 * 3600, { onEvents: (_t, evs) => { for (const e of evs) { if (e.type === 'collect' || e.type === 'worker_collect') col += e.eggs; else if (e.type === 'sell') sold += e.k; } },
      onSecond: t => { if (cps.has(t)) at.set(t, [col, sold]); } });
    expect(secs.map(t => at.get(t))).toEqual(v.checkpoints.map(c => [c.eggs.collected, c.eggs.sold]));
  }, 300_000);
});
