// v5 F3 (HoE, manifest row 8): Worker.paused is read ONLY through isPaused(w, b), which is false while m4.flags.pause = 0.
// A stray `paused: true` (old save, QA setter) must leave income byte-identical with the flag off; with the flag on it counts.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import type { Worker } from '../src/sim/workers';
import { isPaused } from '../src/sim/pause';
import { incomePerSec, demandPerSec, collectPerSec, wagesPerSec, marketHandStalled, salesStopped, secondsToAffordSteady, asleepOrUnpaidCount, productionStopped } from '../src/econ/income';

const withPause = (pause: number, enabled = 1) => ({ ...b, m4: { ...b.m4!, enabled, flags: { ...b.m4!.flags, pause } } }) as typeof b;
const st = (mh: Worker, extra: Partial<GameState> = {}) => ({ ...initialState(b, 1), farmLevel: 6, collectionLevel: 4, coinsCents: 1e6, workers: { market_hand: mh, coop_hand: { ...mh } }, ...extra }) as GameState;
const income = (s: GameState, bb: typeof b) => JSON.stringify([incomePerSec(s, bb), demandPerSec(s, bb), collectPerSec(s, bb), wagesPerSec(s, bb), marketHandStalled(s, bb),
  salesStopped(s, bb), productionStopped(s, bb), asleepOrUnpaidCount(s, bb), secondsToAffordSteady(s, bb, 100_000), incomePerSec(s, bb, { assumeWorking: true })]);

describe('isPaused(w, b)', () => {
  it('shipped balance has m4.flags.pause = 0', () => { expect(b.m4!.flags!.pause).toBe(0); });
  it('false whenever pause = 0 (or m4.enabled = 0); true only with pause = 1 and paused === true', () => {
    const w: Worker = { energy: 0, cdS: 0, paused: true };
    expect(isPaused(w, b)).toBe(false); expect(isPaused(w, withPause(0))).toBe(false); expect(isPaused(w, withPause(1, 0))).toBe(false);
    expect(isPaused(w, withPause(1))).toBe(true);
    expect(isPaused({ energy: 0, cdS: 0 }, withPause(1))).toBe(false); expect(isPaused(undefined, withPause(1))).toBe(false);
    expect(isPaused({ energy: 0, cdS: 0, paused: 1 as any }, withPause(1))).toBe(false); // strictly === true
  });
});

describe('pause = 0: paused:true leaves income byte-identical to the unpaused case', () => {
  for (const [name, w] of [['asleep', { energy: 0, cdS: 0 }], ['working', { energy: 100, cdS: 0 }], ['tired', { energy: 30, cdS: 0 }], ['unpaid', { energy: 60, cdS: 0, unpaid: true }]] as const)
    it(name, () => {
      for (const bb of [b, withPause(0), withPause(1, 0)]) expect(income(st({ ...w, paused: true }), bb)).toBe(income(st({ ...w }), bb));
    });
  it('asleep MH with paused:true and pause = 0 is stalled (sales stop), as if not paused', () => {
    const s = st({ energy: 0, cdS: 0, paused: true });
    expect(marketHandStalled(s, b)).toBe(true); expect(demandPerSec(s, b)).toBe(0);
  });
});

describe('pause = 1: paused is respected', () => {
  it('a paused asleep Market Hand is not stalled (the player sells by hand); unpaused it is', () => {
    const on = withPause(1), p = st({ energy: 0, cdS: 0, paused: true }), u = st({ energy: 0, cdS: 0 });
    expect(marketHandStalled(p, on)).toBe(false); expect(marketHandStalled(u, on)).toBe(true);
    expect(demandPerSec(p, on)).toBeGreaterThan(0); expect(demandPerSec(u, on)).toBe(0);
    expect(income(p, on)).not.toBe(income(u, on));
  });
});

describe('every src read of `paused` goes through isPaused', () => {
  it('no `.paused` / `["paused"]` / `paused !==|===` read outside sim/pause.ts isPaused', () => {
    const SRC = new URL('../src/', import.meta.url).pathname;
    const files = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : /\.(ts|mjs|js)$/.test(p) ? [p] : []; });
    const hits: string[] = [];
    // block comments blanked line-for-line (line numbers kept), then line comments dropped
    const noBlock = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
    for (const f of files(SRC)) noBlock(readFileSync(f, 'utf8')).split('\n').forEach((l, i) => {
      const code = l.replace(/\/\/.*$/, '');
      if (/\.paused\b|\[['"`]paused['"`]\]|\{[^}]*\bpaused\b[^}]*\}\s*=\s*\w/.test(code) && !/export const isPaused = /.test(code)) hits.push(`${f.slice(SRC.length)}:${i + 1}: ${l.trim()}`);
    });
    expect(hits).toEqual([]);
  });
});
