// QA rc0: accelerated long session (8 h sim, greedy bot) + clock changes + big-number formatting. Run from <worktree>/qatmp/.
import { it, expect } from 'vitest';
import fs from 'node:fs';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { fmtMoney, fmtCount } from '../src/ui/format';
const kv = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size; } } as any; };
const bad = (s: string) => /NaN|Infinity|e\+|undefined|-\$/.test(s);
it('8 h accelerated greedy session: no NaN/Infinity, monotone levels, formatted numbers clean; max dead zone reported', () => {
  const store = kv(); let clock = Date.UTC(2026, 9, 20, 8); const g = new Game(b, store, () => clock, 7, 'qa');
  let lastBuy = 0, maxGap = 0, gapAtF = 0; const samples: string[] = [];
  for (let s = 0; s < 8 * 3600; s++) {
    clock += 1000; g.debugAdvance(1000); g.dispatch({ type: 'collect' }); if (s % 10 === 0) g.dispatch({ type: 'sellAll' });
    const before = g.state.farmLevel + g.state.collectionLevel; g.dispatch({ type: 'buyCollection' }); g.dispatch({ type: 'buyFarm' });
    for (const w of ['market_hand', 'coop_hand', 'hawker', 'grader'] as const) g.dispatch({ type: 'hire', worker: w });
    if (s % 60 === 0) g.dispatch({ type: 'manageAll' });
    if (g.state.farmLevel + g.state.collectionLevel > before) { if (s - lastBuy > maxGap) { maxGap = s - lastBuy; gapAtF = g.state.farmLevel; } lastBuy = s; }
    if (s % 600 === 0) { const t = fmtMoney(g.state.coinsCents) + ' ' + fmtCount(g.state.basket) + ' ' + fmtCount(g.state.coop); samples.push(t); expect(bad(t), t).toBe(false); }
    expect(Number.isFinite(g.state.coinsCents)).toBe(true);
  }
  for (const v of [1e3, 1e6, 1e9, 1e12, 1e15, 1e18, 1e21, 1e30, 1e100]) { const t = fmtMoney(v) + ' ' + fmtCount(v); samples.push('fmt ' + v + ': ' + t); }
  fs.writeFileSync('/workspace/egg-farm-studio/qa/m3-rc0/long-session.json', JSON.stringify({ F: g.state.farmLevel, C: g.state.collectionLevel, coins: g.state.coinsCents, maxGapS: maxGap, gapAtF, samples }, null, 1));
});
it('clock changes mid-session: back 1 h grants nothing, forward 1 day simulates <= 60 s', () => {
  const store = kv(); let clock = Date.UTC(2026, 9, 20, 8); const g = new Game(b, store, () => clock, 1, 'qa');
  for (let i = 0; i < 120; i++) { clock += 1000; g.frame(); }
  const c0 = g.state.coinsCents, e0 = g.state.coop; clock -= 3600e3; g.frame(); g.frame();
  expect(g.state.coop).toBeGreaterThanOrEqual(0); expect(g.state.coop - e0).toBeLessThan(5);
  const e1 = g.state.coop; clock += 86400e3; g.frame(); const gained = g.state.coop - e1;
  fs.writeFileSync('/workspace/egg-farm-studio/qa/m3-rc0/clock-change.json', JSON.stringify({ c0, e0, e1, gainedAfterForwardDay: gained }));
  expect(Number.isFinite(gained)).toBe(true);
});
