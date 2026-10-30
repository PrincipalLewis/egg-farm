// M5.1 breeds PR B (tick, hatch + roll, placement + settle gate, BR-AC31e hook). Every test carries its BR-AC id
// (QA-D-1029-V5SCAP) or its D-HOE-20261030-14 rule. Roll = Econ's confirmed harness roll() (spec d43e2ce3, h/breeds.ts 76c07ecf).
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { initialState, nextRand, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { farmCost } from '../src/config/formulas';
import { incomePerSec } from '../src/econ/income';
import { BREED_IDS, ROSTER, BREEDS_RNG_SALT, type BreedId } from '../src/config/breeds';
import { revealHatch, breedsOffline, type BreedsSave } from '../src/sim/breeds';
import { rollBreed, startHatch, hatchCostCents, hatchCostFrom, placeBreed, slotTraitBp, hatchEstimate } from '../src/sim/breeds-hatch';
import { installBreedsQa } from '../src/debug/breeds-qa';
import { mem } from './helpers';
import { m5Persist } from '../src/save/m5-fields';
const T0 = Date.UTC(2026, 9, 30, 13);
const BR = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, breeds: 1 } } } as typeof b;
const fresh = (o: Partial<BreedsSave> = {}): BreedsSave => ({ owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0], hatches: 0, pity: 0, rng: 0x9e3779b9,
  freeHatchUsed: 0, flockCompleteLogged: 0, ...o });
const st = (o: Partial<BreedsSave> = {}, F = 12, coins = 0): GameState => ({ ...initialState(b, 7), farmLevel: F, coinsCents: coins, tracksV7: 1 as const, v6BackupId: '0123456789abcdef', breeds: fresh(o) });
const maxed = (ids: readonly string[]) => Object.fromEntries(ids.map(id => [id, { stars: 2 }]));
const COMMONS = BREED_IDS.filter(id => ROSTER[id][0] === 'C'), RAREP = BREED_IDS.filter(id => ROSTER[id][0] !== 'C');
const ticks = (s: GameState, n: number, bb = BR) => { for (let i = 0; i < n; i++) s = step(s, 0.1, bb); return s; };
/** Independent port of Econ's harness roll() (h/breeds.ts 76c07ecf L39-45) on xorshift nextRand, for the exact-order check. */
function harnessRoll(x: BreedsSave, F: number, free: boolean): [string | null, number] {
  const W: Record<string, number> = { C: 70, R: 22, E: 7, L: 1 }; let rng = x.rng, u = 0; const r = () => { [rng, u] = nextRand(rng); return u; };
  let el: string[] = BREED_IDS.filter(id => (x.owned[id]?.stars ?? -1) < 2 && (ROSTER[id][0] === 'C' || (ROSTER[id][0] === 'L' ? F >= 24 : F >= 14)));
  if (!el.length) return [null, rng];
  if (free) { const cm = el.filter(id => ROSTER[id as BreedId][0] === 'C'); return cm.length ? [cm[Math.floor(r() * cm.length)], rng] : [null, rng]; }
  const rp = el.filter(id => ROSTER[id as BreedId][0] !== 'C'); if (x.pity >= 8 - 1 && rp.length) el = rp;
  const byR: Record<string, string[]> = {}; for (const id of el) (byR[ROSTER[id as BreedId][0]] ??= []).push(id);
  const rs = Object.keys(byR), tot = rs.reduce((a, k) => a + W[k], 0); let v = r() * tot;
  for (const k of rs) { v -= W[k]; if (v <= 0 || k === rs[rs.length - 1]) { const l = byR[k]; return [l[Math.floor(r() * l.length)], rng]; } } return [null, rng];
}

describe('tick countdown (note point 1; BR-AC8, BR-AC25 hidden 30 s)', () => {
  it('[BR-AC8] remainingMs is an integer dropping 100 per tick; reveal on tick n + 600 with the breed stored at start', () => {
    let s = startHatch(st({}, 10), BR); const id = s.breeds!.incubator!.breed;
    for (let i = 1; i < 600; i++) { s = step(s, 0.1, BR); expect(s.breeds!.incubator!.remainingMs).toBe(60_000 - 100 * i); }
    s = step(s, 0.1, BR); expect(s.breeds!.incubator).toBeNull(); expect(s.breeds!.owned[id]).toEqual({ stars: 0 });
  });
  it('[BR-AC25] hidden 30 s (online sim): 40,000 -> 10,000', () => {
    const kv = mem(); let t = T0; const g = new Game(BR, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    g.state = st({ incubator: { breed: 'brahma', remainingMs: 40_000, costCents: 1 } }); g.onHidden(t);
    for (let i = 0; i < 30; i++) { t += 1000; g.frame(); } g.onShown(t); expect(g.state.breeds!.incubator!.remainingMs).toBe(10_000);
  });
  it('[BR-AC4b / note 1] order: settle on sim dt (no focus), then reveal + auto-slot with a full 300 s settle, then sinceUnlockMs', () => {
    let s = st({ owned: { leghorn: { stars: 0 } }, slots: ['leghorn', null, null], settleMs: [500, 0, 0], incubator: { breed: 'brahma', remainingMs: 100, costCents: 1 }, sinceUnlockMs: 0 }, 14);
    s = step(s, 0.1, BR); expect(s.breeds!.settleMs).toEqual([400, 300_000, 0]); expect(s.breeds!.slots).toEqual(['leghorn', 'brahma', null]); expect(s.breeds!.sinceUnlockMs).toBe(100);
    expect(s.breeds!.rng).toBe(0x9e3779b9); // a reveal never draws
  });
  it('[BR-AC11] duplicate reveal: stars +1 (capped at bc_star_cap); a 2★ breed is never drawn', () => {
    const s = ticks(st({ owned: { brahma: { stars: 1 } }, incubator: { breed: 'brahma', remainingMs: 100, costCents: 1 } }, 14), 1);
    expect(s.breeds!.owned.brahma).toEqual({ stars: 2 });
    let x = fresh({ owned: maxed(BREED_IDS.filter(id => id !== 'leghorn')), freeHatchUsed: 1 });
    for (let i = 0; i < 200; i++) { const r = rollBreed(x, 28, BR, false)!; expect(r.id).toBe('leghorn'); x = { ...x, rng: r.rng }; }
  });
});

describe('hatch action (BR-R5..R7; BR-AC5, BR-AC7, E4/E5)', () => {
  it('[BR-AC5] F10, freeHatchUsed 0: 0¢ charged, a Common, freeHatchUsed 1, exactly 1 draw, pity 1 (the free hatch counts)', () => {
    const s0 = st({}, 10, 77), s = apply(s0, { type: 'hatch' }, BR), x = s.breeds!;
    expect(s.coinsCents).toBe(77); expect(ROSTER[x.incubator!.breed as BreedId][0]).toBe('C'); expect(x).toMatchObject({ freeHatchUsed: 1, hatches: 1, pity: 1 });
    expect(x.rng).toBe(nextRand(0x9e3779b9)[0]); expect(x.incubator!.costCents).toBe(0); expect(s.rng).toBe(s0.rng);
  });
  it('[BR-AC7] coins = cost - 1¢: nothing charged, nothing starts; coins = cost: charged exactly, 2 draws', () => {
    const base = st({ freeHatchUsed: 1 }, 16), cost = hatchCostCents(base, BR);
    const poor = { ...base, coinsCents: cost - 1 }; expect(startHatch(poor, BR)).toBe(poor);
    const s = startHatch({ ...base, coinsCents: cost }, BR); expect(s.coinsCents).toBe(0); expect(s.breeds!.incubator!.costCents).toBe(cost);
    expect(s.breeds!.rng).toBe(nextRand(nextRand(0x9e3779b9)[0])[0]);
  });
  it('[BR-AC6 basis] cost = max(min, min(planRef x 45, house-round(farm_cost x 10000 bp))) on planner income', () => {
    for (const F of [10, 16, 26, 30]) { const s = st({ freeHatchUsed: 1 }, F), planRef = Math.round(incomePerSec(s, BR, { assumeWorking: true }) * 100);
      expect(hatchCostCents(s, BR)).toBe(Math.max(50_000, Math.min(planRef * 45, farmCost(F, BR) * 100))); }
  });
  it('[BR-AC7 / E4 / E5] busy incubator, flock complete, below F10, and all Commons 2★ below F14: nothing starts, no draw', () => {
    const rich = 1e12;
    for (const s of [st({ incubator: { breed: 'leghorn', remainingMs: 5, costCents: 0 } }, 12, rich), st({ owned: maxed(BREED_IDS), freeHatchUsed: 1 }, 28, rich),
      st({}, 9, rich), st({ owned: maxed(COMMONS), freeHatchUsed: 1 }, 13, rich)]) expect(startHatch(s, BR)).toBe(s);
  });
  it('[BR-AC1] flag off: the hatch and place actions are no-ops', () => {
    const s = st({}, 12, 1e9); expect(apply(s, { type: 'hatch' }, b)).toBe(s); expect(apply(s, { type: 'placeBreed', slot: 0, id: null }, b)).toBe(s);
  });
});

describe('roll (BR-R9/R10; BR-AC9, BR-AC10; D-HOE-20261030-14 Q3, Econ-confirmed)', () => {
  it('[BR-AC9] roll-only hook, fixed seed, F28 all eligible, pity disabled: 1,000 draws within ±3 pp of 70/22/7/1', () => {
    let x = fresh({ freeHatchUsed: 1 }); const n: Record<string, number> = { C: 0, R: 0, E: 0, L: 0 };
    for (let i = 0; i < 1000; i++) { const r = rollBreed(x, 28, BR, false)!; n[ROSTER[r.id][0]]++; x = { ...x, rng: r.rng }; }
    for (const [k, w] of Object.entries({ C: 70, R: 22, E: 7, L: 1 })) expect(Math.abs(n[k] / 10 - w)).toBeLessThanOrEqual(3);
  });
  it('[BR-AC9] pity on: no run of 8 consecutive draws lacks a Rare+ (5,000 draws, pity updated per draw)', () => {
    let x = fresh({ freeHatchUsed: 1 }), run = 0, worst = 0;
    for (let i = 0; i < 5000; i++) { const r = rollBreed(x, 28, BR, false)!, rare = ROSTER[r.id][0] !== 'C';
      run = rare ? 0 : run + 1; worst = Math.max(worst, run); x = { ...x, rng: r.rng, pity: rare ? 0 : x.pity + 1 }; }
    expect(worst).toBeLessThanOrEqual(7);
  });
  it('[BR-AC9 harness semantics] free hatch + 6 paid Commons: the 7th paid hatch (8th draw) is Rare+; pity 6 does not force', () => {
    let forcedSeen = 0, unforcedCommon = 0;
    for (let seed = 1; seed <= 400; seed++) {
      let s = st({ rng: seed }, 20, 1e13), allCommon = true;
      for (let h = 0; h < 8 && allCommon; h++) { const pity = s.breeds!.pity; s = startHatch(s, BR); const id = s.breeds!.incubator!.breed as BreedId;
        if (h === 7) { expect(pity).toBe(7); expect(ROSTER[id][0]).not.toBe('C'); forcedSeen++; }
        else if (ROSTER[id][0] !== 'C') allCommon = false; else if (h === 6) unforcedCommon++;
        s = { ...s, breeds: revealHatch({ ...s.breeds!, incubator: { ...s.breeds!.incubator!, remainingMs: 0 } }, BR, 0).br }; }
    }
    expect(forcedSeen).toBeGreaterThan(0); expect(unforcedCommon).toBeGreaterThan(0); // the 7th draw (pity 6) can still be a Common
  });
  it('[BR-AC9] a Rare+ hatch resets pity to 0 (pity 7 at F20 forces Rare+); a Common hatch adds 1', () => {
    const s = startHatch(st({ freeHatchUsed: 1, pity: 7 }, 20, 1e12), BR); expect(ROSTER[s.breeds!.incubator!.breed as BreedId][0]).not.toBe('C'); expect(s.breeds!.pity).toBe(0);
    const c = startHatch(st({ freeHatchUsed: 1, pity: 3 }, 13, 1e12), BR); expect(c.breeds!.pity).toBe(4);
  });
  it('[BR-AC9 / E6] pity due but no Rare+ eligible (F13): normal pool, pity keeps counting', () => {
    const s = startHatch(st({ freeHatchUsed: 1, pity: 9 }, 13, 1e12), BR); expect(ROSTER[s.breeds!.incubator!.breed as BreedId][0]).toBe('C'); expect(s.breeds!.pity).toBe(10);
  });
  it('[BR-AC10] F13: no Rare+ in 1,000 rolls; F23: no Legendary', () => {
    for (const [F, bad] of [[13, ['R', 'E', 'L']], [23, ['L']]] as const) { let x = fresh({ freeHatchUsed: 1, pity: 0 });
      for (let i = 0; i < 1000; i++) { const r = rollBreed(x, F, BR, false)!; expect(bad as readonly string[]).not.toContain(ROSTER[r.id][0]); x = { ...x, rng: r.rng }; } }
  });
  it('[D-HOE-20261030-14 Q3] exact draw order = the harness roll(): 3,000 states (free/paid, pity, partial stars, F10-30)', () => {
    let rng = 12345;
    for (let i = 0; i < 3000; i++) { let u: number; [rng, u] = nextRand(rng); const F = 10 + Math.floor(u * 21); [rng, u] = nextRand(rng);
      const owned: any = {}; for (const id of BREED_IDS) { [rng, u] = nextRand(rng); if (u < 0.6) owned[id] = { stars: Math.floor(u * 5) % 3 }; }
      const x = fresh({ owned, rng, pity: i % 10, freeHatchUsed: i % 7 === 0 ? 0 : 1 }), free = x.freeHatchUsed === 0;
      const r = rollBreed(x, F, BR, free), [hid, hrng] = harnessRoll(x, F, free);
      expect(r?.id ?? null).toBe(hid); if (r) expect(r.rng).toBe(hrng); }
  });
  it('[D-HOE-20261030-14 Q3] an empty rarity drops its weight (all Commons 2★, F28): R/E/L shares 22/7/1 of 30, ±3 pp', () => {
    let x = fresh({ owned: maxed(COMMONS), freeHatchUsed: 1 }); const n: Record<string, number> = { R: 0, E: 0, L: 0 };
    for (let i = 0; i < 3000; i++) { const r = rollBreed(x, 28, BR, false)!; n[ROSTER[r.id][0]]++; x = { ...x, rng: r.rng }; }
    for (const [k, w] of Object.entries({ R: 22, E: 7, L: 1 })) expect(Math.abs(n[k] / 30 - (w / 30) * 100)).toBeLessThanOrEqual(3);
  });
});

describe('D-HOE-20261030-14 Q1/Q2/Q4', () => {
  it('[D-HOE-20261030-14 Q1] rolls draw only from breeds.rng (salt 0x62726473): state.rng, evRngState, brRngState untouched', () => {
    expect(BREEDS_RNG_SALT).toBe(0x62726473);
    const s0 = { ...st({ freeHatchUsed: 1 }, 20, 1e12), evRngState: 11, brRngState: 22 }, s = startHatch(s0, BR);
    expect([s.rng, s.evRngState, s.brRngState]).toEqual([s0.rng, 11, 22]); expect(s.breeds!.rng).not.toBe(s0.breeds!.rng);
  });
  it('[D-HOE-20261030-14 Q2] created at the end of the first flag-on tick (that tick counts nothing); the next tick counts 100 ms', () => {
    const s1 = step({ ...initialState(b, 7), farmLevel: 12 }, 0.1, BR); expect('sinceUnlockMs' in s1.breeds!).toBe(false);
    expect(step(s1, 0.1, BR).breeds!.sinceUnlockMs).toBe(100);
  });
  it('[D-HOE-20261030-14 Q4] a reveal in the frame after a Farm buy unlocks slot 3 does not auto-slot there; without the buy it does', () => {
    const run = (buy: boolean) => { const kv = mem(); let t = T0; const g = new Game(BR, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
      g.state = st({ owned: { leghorn: { stars: 0 }, sussex: { stars: 0 } }, slots: ['leghorn', 'sussex', null], freeHatchUsed: 1 }, buy ? 19 : 20);
      t += 100; g.frame(); // frame start level recorded
      g.state = { ...g.state, farmLevel: 20, breeds: { ...g.state.breeds!, incubator: { breed: 'brahma', remainingMs: 100, costCents: 1 } } };
      t += 100; g.frame(); return g.state.breeds!.slots; };
    expect(run(true)).toEqual(['leghorn', 'sussex', null]); expect(run(false)).toEqual(['leghorn', 'sussex', 'brahma']);
  });
});

describe('placement + settle gate (BR-R3/R4; BR-AC4, BR-AC4b)', () => {
  it('[BR-AC4] X in slot 0 placed in slot 2: slot 0 null, slot 2 X, settle state kept; same-slot is a no-op', () => {
    const s = st({ owned: { leghorn: { stars: 0 } }, slots: ['leghorn', null, null], settleMs: [1234, 0, 0] }, 20), r = placeBreed(s, BR, 2, 'leghorn');
    expect(r.breeds!.slots).toEqual([null, null, 'leghorn']); expect(r.breeds!.settleMs).toEqual([0, 0, 1234]); expect(placeBreed(s, BR, 0, 'leghorn')).toBe(s);
    expect(placeBreed(s, BR, 2, 'brahma')).toBe(s); expect(placeBreed(s, BR, 1, 'leghorn').breeds!.slots).toEqual([null, 'leghorn', null]); // not owned: no-op
  });
  it('[BR-AC4b] a newly placed breed gives 0 bp for 300 s of sim time, then its star value (floor(base x (1 + stars x 0.25)))', () => {
    let s = placeBreed(st({ owned: { ayam_cemani: { stars: 1 } } }, 20), BR, 0, 'ayam_cemani'); expect(s.breeds!.settleMs[0]).toBe(300_000);
    s = ticks(s, 2999); expect(slotTraitBp(s.breeds!, 0, BR)).toBe(0); s = ticks(s, 1); expect(slotTraitBp(s.breeds!, 0, BR)).toBe(437);
    expect(placeBreed(s, BR, 1, 'ayam_cemani').breeds!.settleMs).toEqual([0, 0, 0]); // moved: stays settled
  });
});

describe('E10 / PMC Q5 with placement', () => {
  it('[BR-AC26 E10 / PMC Q5] placing into, then clearing, a slot that held an unknown raw id: the save gets null, not the raw id', () => {
    const s = { ...st({ owned: { leghorn: { stars: 0 } } }, 20), breedsRawSlots: [null, 'silkie', null] };
    const kept = m5Persist(s) as GameState; expect(kept.breeds!.slots).toEqual([null, 'silkie', null]);
    const r = placeBreed(placeBreed(s, BR, 1, 'leghorn'), BR, 1, null); expect((m5Persist(r) as GameState).breeds!.slots).toEqual([null, null, null]);
  });
});

describe('BR-AC31e eggfarmQa.breeds.hatchEstimate (debug-only)', () => {
  const need = 900_000; // $9,000 to the next Farm step, so incomes give exact ETAs
  const at28 = () => st({ freeHatchUsed: 1 }, 28, farmCost(28, BR) * 100 - need);
  it.each([[85, 95, true], [95, 85, false], [90.0, 95, true], [90.1, 85, false]])('[BR-AC31e] default ETA %s s / assumeWorking %s s -> note %s', (d, a, show) => {
    const r = hatchEstimate(at28(), BR, { defaultPerS: 9000 / d, assumeWorkingPerS: 9000 / a });
    expect(r.show).toBe(show); expect(r.defaultEtaS!).toBeCloseTo(d, 9); expect(r.assumeWorkingEtaS!).toBeCloseTo(a, 9);
  });
  it('[BR-AC31e] the hook sets both incomes independently through Game, returns both ETAs, and changes no cost/rng; the press still hatches', () => {
    const kv = mem(); const g = new Game(BR, kv, () => T0, 7, 'dev', null, null, { newId: () => '0123456789abcdef' }); g.state = { ...at28(), coinsCents: 1e13 };
    const w: any = {}; installBreedsQa(w, g); const cost = hatchCostCents(g.state, BR), before = JSON.stringify(g.state);
    expect(w.eggfarmQa.breeds.hatchEstimate({ defaultPerS: 9000 / 85, assumeWorkingPerS: 9000 / 95 }).show).toBe(true);
    expect(g.breedsEstimateOverride).toEqual({ defaultPerS: 9000 / 85, assumeWorkingPerS: 9000 / 95 }); expect(JSON.stringify(g.state)).toBe(before);
    expect(hatchCostCents(g.state, BR)).toBe(cost); expect(startHatch(g.state, BR).breeds!.incubator).not.toBeNull();
    expect(w.eggfarmQa.breeds.hatchEstimate(null).defaultEtaS).toBe(hatchEstimate(g.state, BR).defaultEtaS); // null = the real estimators
  });
  it('[BR-AC31e] not for the free hatch, a complete flock, or Farm MAX', () => {
    const inc = { defaultPerS: 1e9 };
    expect(hatchEstimate(st({}, 28), BR, inc).show).toBe(false); expect(hatchEstimate(st({ owned: maxed(BREED_IDS), freeHatchUsed: 1 }, 28), BR, inc).show).toBe(false);
    expect(hatchEstimate(st({ freeHatchUsed: 1 }, BR.maxLevel), BR, inc).show).toBe(false); expect(hatchEstimate(st({ freeHatchUsed: 1 }, 28), BR, inc).show).toBe(true);
  });
});

describe('#96 Architect review d7df1f9: BR-R17 guard, BR-R5 literals, E10 shadow, slot index, rarity boundary', () => {
  const ref = (p: bigint, step: bigint) => { const fb = (step * 10000n + 5000n) / 10000n, a = p * 45n; return a < fb ? a : fb; }; // BigInt min()
  it('[BR-AC13] planRefCents 200,159,983,438,688 takes the exact Number path; ...689 takes the Farm branch without overflow; both equal the BigInt min()', () => {
    const step = 9_007_199_254_740_990; // largest farm step whose farm branch is exact in Number (floor(step / 45) = ...688)
    expect(hatchCostFrom(200_159_983_438_688, step, BR)).toBe(9_007_199_254_740_960);
    expect(BigInt(hatchCostFrom(200_159_983_438_688, step, BR))).toBe(ref(200_159_983_438_688n, BigInt(step)));
    expect(hatchCostFrom(200_159_983_438_689, step, BR)).toBe(step);
    expect(BigInt(hatchCostFrom(200_159_983_438_689, step, BR))).toBe(ref(200_159_983_438_689n, BigInt(step)));
    expect(Number.isSafeInteger(hatchCostFrom(200_159_983_438_689, step, BR))).toBe(true);
  });
  it('[BR-AC13 guard boundary] planRef == floor(farmBranch / 45) keeps planRef x 45 (the min), one cent more takes the Farm branch', () => {
    expect(hatchCostFrom(3040, 136_801, BR)).toBe(136_800); // floor(136,801 / 45) = 3040: 3040 x 45 = 136,800 < 136,801
    expect(hatchCostFrom(3041, 136_801, BR)).toBe(136_801);
  });
  it('[BR-AC6] F28 277,973 -> 12,508,785; F10 8,486 -> 136,800 (one Farm step); F30 277,971 -> 12,508,695 (row 30 does not bind)', () => {
    expect(hatchCostFrom(277_973, 23_979_200, BR)).toBe(12_508_785);
    expect(hatchCostFrom(8_486, 136_800, BR)).toBe(136_800);
    expect(hatchCostFrom(277_971, 62_431_600, BR)).toBe(12_508_695);
    expect(hatchCostFrom(1, 136_800, BR)).toBe(50_000); // bc_hatch_min_cents floor
    for (const F of [10, 14, 20, 28, 30]) { const s = st({ freeHatchUsed: 1 }, F);
      expect(hatchCostCents(s, BR)).toBe(hatchCostFrom(Math.round(incomePerSec(s, BR, { assumeWorking: true }) * 100), farmCost(F, BR) * 100, BR)); }
  });
  it('[BR-AC26 E10 / PMC Q5] an auto-slot over a raw-id slot drops the shadow; moving that breed on does not resurrect the raw id', () => {
    const s0 = { ...st({ owned: { leghorn: { stars: 0 } }, slots: ['leghorn', null, null], incubator: { breed: 'brahma', remainingMs: 100, costCents: 0 } }, 20),
      breedsRawSlots: [null, 'silkie', null] };
    const s1 = step(s0, 0.1, BR); expect(s1.breeds!.slots).toEqual(['leghorn', 'brahma', null]); expect(s1.breedsRawSlots?.[1] ?? null).toBeNull();
    const s2 = placeBreed(s1, BR, 2, 'brahma'); expect((m5Persist(s2) as GameState).breeds!.slots).toEqual(['leghorn', null, 'brahma']);
  });
  it('[BR-AC26 E10 / PMC Q5] placeBreed clears the shadow at the source slot too', () => {
    const s = { ...st({ owned: { leghorn: { stars: 0 } }, slots: [null, null, 'leghorn'] }, 20), breedsRawSlots: [null, null, 'silkie'] };
    const r = placeBreed(placeBreed(s, BR, 0, 'leghorn'), BR, 0, null); // 'silkie' raw sat under slot 2 (non-null at runtime): moving out must not write it back
    expect((m5Persist(r) as GameState).breeds!.slots).toEqual([null, null, null]);
  });
  it('[BR-AC26 E10 / PMC Q5, BR-AC25] the offline reveal auto-slot drops the shadow at its slot', () => {
    const s0 = { ...st({ slots: [null, null, null], incubator: { breed: 'brahma', remainingMs: 1000, costCents: 0 } }, 20), breedsRawSlots: ['silkie', null, null] };
    const r = breedsOffline(s0, 120_000, BR).state; expect(r.breeds!.slots).toEqual(['brahma', null, null]);
    const r2 = placeBreed(r, BR, 1, 'brahma'); expect((m5Persist(r2) as GameState).breeds!.slots).toEqual([null, 'brahma', null]);
  });
  it('[BR-AC4 / Architect Minor 2] a non-integer, negative, NaN or out-of-range slot is a no-op (same state object)', () => {
    const s = st({ owned: { leghorn: { stars: 0 } } }, 20);
    for (const k of [0.5, -1, NaN, 3, Infinity]) expect(placeBreed(s, BR, k, 'leghorn')).toBe(s);
  });
  it('[BR-AC9 / harness roll() boundary] u x tot landing exactly on a cumulative weight picks that rarity (<=): Epic+Legendary only, u = 7/8', () => {
    const rng = 0xee007000; expect(nextRand(rng)[1]).toBe(0.875); // tot = 7 + 1 = 8, w = 7 -> 0 after Epic
    const x = fresh({ rng, pity: 7, freeHatchUsed: 1, owned: maxed(RAREP.filter(id => ROSTER[id][0] === 'R')) });
    const r = rollBreed(x, 24, BR, false)!; expect(ROSTER[r.id][0]).toBe('E');
    expect([r.id, r.rng]).toEqual(harnessRoll(x, 24, false));
  });
});
