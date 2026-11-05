/** F5: source-only measurements on shipped CSV, never the historical overlay.
 * npm run test:slow discovers this unconditionally. Optional F5_RESULTS writes auditable JSON. */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameState } from '../src/sim/state';
import { runSource, type RunOpts } from './bot-m5';
import { activeWindow, summarizeActiveWindows, F5_PROFILES, F5_SEEDS, F5_FARMS, type ActiveWindow, type WindowKey } from './bot-m5-active';
import { x1Balance } from './pacing-x1/harness';
const record = x1Balance('shipped-tree'), b = record.b;
const save = (name: string, value: unknown) => {
  if (!process.env.F5_RESULTS) return;
  mkdirSync(process.env.F5_RESULTS, { recursive: true });
  writeFileSync(join(process.env.F5_RESULTS, name + '.json'), JSON.stringify(value, null, 2) + '\n');
};
/** Events retain full JSON shape and order; states retain every key, including optional session keys.
 * No projection that could hide an unwanted state field or RNG shift. */
function trace(seed: number, start: GameState, streak: number) {
  const hash = createHash('sha256'); let collects = 0, sales = 0;
  const z = runSource({ ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, streak } } }, seed, 'never', 600,
    { start: structuredClone(start), noBuy: true,
      onEvents: (t, ev) => { hash.update(JSON.stringify([t, ev]) + '\n'); for (const e of ev) { if (e.type === 'collect') collects++; if (e.type === 'sell') sales++; } },
      onSecond: (t, st) => hash.update(JSON.stringify([t, st]) + '\n') });
  hash.update(JSON.stringify(z.final));
  return { hash: hash.digest('hex'), collects, sales };
}

describe('F5 G0 controls and G1 sampled metrics, source-only rc/v5', () => {
  it('seeds 0–99: funded natural F10 never-tap streak off/on bytes; three-profile F10/F18/F24 paired windows', () => {
    expect(record.balance.flagsOn).toEqual([]); // this PR never flips the shipping config
    const windows: ActiveWindow[] = [], expected: WindowKey[] = [], g0: unknown[] = [], reaches: unknown[] = [];
    for (const seed of F5_SEEDS) {
      // Reuse the port's seller15 purchase policy; no invented late-game fixture or new purchase path.
      const r = runSource(b, seed, 'seller15', 7200, { snapAt: [...F5_FARMS] });
      reaches.push({ seed, reaches: Object.fromEntries(F5_FARMS.map(farm => [farm, r.reach.get(farm) ?? null])) });
      for (const farm of F5_FARMS) {
        const st = r.snaps.get(farm);
        for (const profile of F5_PROFILES) {
          expected.push({ seed, profile, farm });
          if (st) windows.push(activeWindow(b, seed, profile, st));
        }
      }
      const st = r.snaps.get(10);
      expect(st, `seed ${seed} reaches F10`).toBeDefined();
      const off = trace(seed, st!, 0), on = trace(seed, st!, 1);
      expect(on, `G0 seed ${seed}`).toEqual(off);
      expect(off.collects).toBe(0); expect(off.sales).toBeGreaterThan(0); // non-vacuous, real customer RNG draws
      g0.push({ seed, ...off });
    }
    const summary = summarizeActiveWindows(windows, expected);
    save('source-windows', { csvSha256: record.csvSha256, balance: record.balance, seeds: [0, 99], horizonS: 7200, reaches, summary, windows });
    save('g0-never-tap', { scope: 'streak off/on only; not the unmerged full ship stack', seeds: [0, 99], rows: g0 });
    expect(windows).toHaveLength(900); expect(summary.missing).toEqual([]);
    expect(summary.status).toBe('DEPENDENCY-BLOCKED');
    // Measured threshold/denominator failures remain in the report, not an invented full-stack pass.
    console.log('F5 G1 source-only sampled measurement:', JSON.stringify(summary));
  }, 600_000);

  it('AC-SC9 L0–9 abilities unused off/on trace controls (inert API: not final abilities certification)', () => {
    const rows: unknown[] = [];
    for (const seed of F5_SEEDS) {
      const play = (abilities: number) => {
        const samples: [number, string][] = [], events: [number, string][] = [];
        const opt: RunOpts = { onSecond: (t, s) => { if (s.farmLevel < 10) samples.push([t, JSON.stringify(s)]); },
          onEvents: (t, ev) => { events.push([t, JSON.stringify(ev)]); } };
        const r = runSource({ ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, abilities } } }, seed, 'seller15', 1800, opt);
        const t10 = r.reach.get(10); expect(t10, `seed ${seed} reaches F10`).toBeDefined();
        expect(samples.length).toBeGreaterThan(0);
        const bytes = JSON.stringify([samples, events.filter(([t]) => t <= t10!)]);
        return { hash: createHash('sha256').update(bytes).digest('hex'), t10, samples: samples.length };
      };
      const off = play(0), on = play(1); expect(on, `AC-SC9 seed ${seed}`).toEqual(off); rows.push({ seed, ...off });
    }
    save('ac-sc9-l0-9', { scope: 'abilities flag is currently inert; repeat when fireAbility lands; all events to F10 plus per-second full states', rows });
  }, 300_000);
});
