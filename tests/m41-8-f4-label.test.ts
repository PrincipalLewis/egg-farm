// M41-8 F4 next-goal strip label (art-ux/f4-next-goal-label.md; m4a-spec v1.24 §18 F4-1..19, L30+ F4-20..25 N/A).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { optionGain, options } from '../src/econ/best-buy';
import { incomePerSec } from '../src/econ/income';
import { trackLock } from '../src/sim/tracks';
import { selectGoal, goalAria } from '../src/ui/next-goal';
import { goalLabelParts, goalLabelSpec, pctOf, bestRoiDelta, bestBuyMark, trackMilestone, NBSP, MAX_GOAL_LEN, type GoalLabelSpec, type Pct } from '../src/ui/goal-label';
import { DualPicker } from '../src/ui/pick-hysteresis';

const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const off: Balance = { ...balance, m4: { ...balance.m4!, enabled: 0 } };
const cps = (s: string) => [...s].length;
const vis = (s: string) => s.replace(/\u00A0/g, ' ');
const pct = (track: string, n: number, x: Pct, star = true): GoalLabelSpec => ({ track, n, star, suffix: { kind: 'pct', x } });
const ms = (track: string, n: number, text: string, star = true): GoalLabelSpec => ({ track, n, star, suffix: { kind: 'milestone', text } });
const tap = (n: number, d: number, star = true): GoalLabelSpec => ({ track: 'Collection', n, star, suffix: { kind: 'tap', d } });
const T = (sp: GoalLabelSpec) => vis(goalLabelParts(sp).text);
const st = (o: object = {}) => ({ ...initialState(on, 1), ...o });

describe('F4 templates and truncation (pure)', () => {
  it('NBSP before L{n} and either side of ·; no space inside L{n}', () => {
    const t = goalLabelParts(pct('Egg value', 5, 9)).text;
    expect(t).toBe(`★ Egg value${NBSP}L5${NBSP}·${NBSP}+9% income`);
  });
  it('F4-1 exactly 27 keeps ★', () => { expect(T(pct('Egg value', 5, 9))).toBe('★ Egg value L5 · +9% income'); expect(cps(T(pct('Egg value', 5, 9)))).toBe(27); });
  it('F4-2 28 drops only ★', () => expect(T(pct('Egg value', 9, 12))).toBe('Egg value L9 · +12% income'));
  it('F4-3 L30 X=12 keeps the full name', () => expect(T(pct('Egg value', 30, 12))).toBe('Egg value L30 · +12% income'));
  it('F4-4 then the short name (never `Egg val.`)', () => {
    expect(T(pct('Egg value', 30, 100))).toBe('Value L30 · +100% income');
    expect(T(pct('Egg value', 55, 100))).toBe('Value L55 · +100% income');
  });
  it('F4-5 Hens never truncates', () => expect(T(pct('Hens', 55, 999))).toBe('★ Hens L55 · +999% income'));
  it('F4-6 no short form → ellipsis on the name only, exactly 27', () => {
    const t = T(pct('Supercalifragilistic', 30, 12));
    expect(t).toBe('Supercal… L30 · +12% income'); expect(cps(t)).toBe(27);
  });
  it('F4-8 milestone variant (levels from config), Farm gate', () => {
    for (const m of on.m4!.milestones.hens) expect(trackMilestone('hens', m.level, 0, on)).toBe('bigger coop');
    expect(T(ms('Hens', 10, 'bigger coop'))).toBe('★ Hens L10: bigger coop');
    expect(T(ms('Egg value', 5, 'Grade A'))).toBe('★ Egg value L5: Grade A');
    expect(trackMilestone('eggValue', 5, 0, on)).toBe('Grade A'); expect(trackMilestone('eggValue', 10, 0, on)).toBe('Large');
    const j = on.m4!.milestones.grades[2];
    expect(trackMilestone('eggValue', j.level, j.minFarm, on)).toBe('Jumbo');
    expect(trackMilestone('eggValue', j.level, j.minFarm - 1, on)).toBeNull(); // gate not met → % variant
    const s = st({ farmLevel: j.minFarm - 1, eggValueLevel: j.level - 1, hensLevel: 5 });
    expect(goalLabelSpec('VALUE', s, on, true).suffix.kind).toBe('pct');
    expect(goalLabelSpec('VALUE', { ...s, farmLevel: j.minFarm }, on, true).suffix).toEqual({ kind: 'milestone', text: 'Jumbo' });
  });
  it('F4-9 floor / F4-9b float edge / boundaries 0, 0.5 %, 1 % / F4-10 / F4-11', () => {
    expect(pctOf(4.9, 100)).toBe(4); expect(pctOf(1, 100)).toBe(1); expect(pctOf(99.99, 100)).toBe(99); expect(pctOf(12, 100)).toBe(12);
    expect(100 * 0.29 / 5.8).toBe(4.999999999999999); expect(pctOf(0.29, 5.8)).toBe(5); expect(pctOf(4.99999, 100)).toBe(4);
    expect(pctOf(0, 100)).toBeNull();          // exactly 0 → hidden
    expect(pctOf(0.5, 100)).toBe('<1');        // 0.5 % → <1
    expect(pctOf(0.999, 100)).toBe('<1');
    expect(pctOf(1, 100)).toBe(1);             // 1 % → 1
    expect(pctOf(-3, 100)).toBeNull();         // negative (D-PMFU-04) → hidden
    expect(pctOf(5, 0)).toBeNull();            // income/s now 0 → hidden
    expect(T(pct('Egg value', 30, '<1'))).toBe('Egg value L30 · +<1% income');
    expect(cps(T(pct('Egg value', 30, '<1')))).toBe(27);
    expect(T(pct('Hens', 12, null))).toBe('★ Hens L12');
  });
  it('F4-14 aria: untruncated, level/percent spelled out, no …/short name/★', () => {
    expect(goalLabelParts(ms('Egg value', 49, 'Jumbo')).aria).toBe('best buy, Egg value level 49, Jumbo');
    expect(goalLabelParts(pct('Egg value', 30, 12)).aria).toBe('best buy, Egg value level 30, plus 12 percent income');
    expect(goalLabelParts(pct('Egg value', 30, '<1')).aria).toBe('best buy, Egg value level 30, plus less than 1 percent income');
    expect(goalLabelParts(pct('Hens', 12, null)).aria).toBe('best buy, Hens level 12');
    expect(goalLabelParts(pct('Hens', 12, null, false)).aria).toBe('Hens level 12');
    expect(goalLabelParts(tap(5, 5)).aria).toBe('best buy, Collection level 5, plus 5 per tap');
    const g = { key: 'VALUE', state: 'ready', label: '', status: 'Ready!', costCents: 1, tab: 'farm', parts: goalLabelParts(pct('Egg value', 30, 100)) } as any;
    expect(goalAria(g)).toBe('Next goal: best buy, Egg value level 30, plus 100 percent income. Ready now.');
  });
  it('F4-16 Collection: Δtap kept, ★ only on best buy, never % income, same truncation', () => {
    expect(T(tap(5, 5))).toBe('★ Collection L5: +5/tap'); expect(T(tap(5, 5, false))).toBe('Collection L5: +5/tap');
    expect(T(tap(30, 5))).toBe('★ Collection L30: +5/tap');
    expect(T(tap(55, 1250))).toBe('★ Collection L55: +1250/tap');
    expect(T(tap(55, 12500))).toBe('Collection L55: +12500/tap');
    expect(T(tap(55, 1234567))).toBe('Coll. L55: +1234567/tap');
    const s = st({ collectionLevel: 4 }); const sp = goalLabelSpec('COLL', s, on, true);
    expect(sp.suffix.kind).toBe('tap'); expect(goalLabelParts(sp).text).not.toMatch(/income/);
  });
});

describe('F4-7 length property: no rendered label over 27, level + suffix intact, aria untruncated', () => {
  const X: Pct[] = [null, '<1', 1, 9, 10, 99, 100, 999];
  it('Hens / Egg value / Collection × levels 0..maxLevel and 0..55 × X × milestone × ★', () => {
    let n = 0;
    for (const max of [on.maxLevel, 55]) for (let L = 0; L <= max; L++) for (const star of [true, false]) {
      const specs: GoalLabelSpec[] = [];
      for (const track of ['Hens', 'Egg value']) { for (const x of X) specs.push(pct(track, L, x, star)); for (const m of ['bigger coop', 'Grade A', 'Large', 'Jumbo']) specs.push(ms(track, L, m, star)); }
      for (const d of [1, 5, 99, 1250, 12500, 1234567]) specs.push(tap(L, d, star));
      for (const sp of specs) {
        const p = goalLabelParts(sp);
        expect(cps(p.text), vis(p.text)).toBeLessThanOrEqual(MAX_GOAL_LEN);
        expect(p.text.endsWith(p.level + p.suffix)).toBe(true);
        expect(p.level).toBe(`${NBSP}L${L}`);
        expect(p.aria).not.toMatch(/…|★|Value level|Coll\./);
        expect(p.aria).toContain(`${sp.track} level ${L}`);
        n++;
      }
    }
    expect(n).toBeGreaterThan(2000);
  });
  it('real states (shipped data, every Hens / Egg value / Collection level 0..maxLevel-1): label ≤ 27 via selectGoal', () => {
    for (let L = 0; L < on.maxLevel; L++) for (const key of ['HENS', 'VALUE', 'COLL'] as const) {
      const F = Math.min(on.maxLevel - 1, Math.max(0, L - 2));
      const s = st({ farmLevel: F, hensLevel: key === 'HENS' ? L : 1, eggValueLevel: key === 'VALUE' ? L : 1, collectionLevel: key === 'COLL' ? L : 1, coinsCents: 1e13 });
      if (key !== 'COLL' && trackLock(s, key === 'HENS' ? 'hens' : 'eggValue', on)) continue;
      const g = selectGoal(s, on, 100, key, key);
      expect(g.key).toBe(key); expect(g.parts).toBeTruthy();
      expect(cps(g.label), vis(g.label)).toBeLessThanOrEqual(MAX_GOAL_LEN);
    }
  });
});

describe('F4-12 one calculation: X == floor(best_roi delta %) from the same call', () => {
  it('Hens and Egg value over a grid of real states', () => {
    let checked = 0, under1 = 0;
    for (const F of [2, 5, 9, 14, 20, 27]) for (const H of [F, F + 2]) for (const V of [F - 1, F + 1]) for (const key of ['HENS', 'VALUE'] as const) {
      const s = st({ farmLevel: F, hensLevel: H, eggValueLevel: Math.max(0, V), collectionLevel: F, coinsCents: 1e13 });
      if (!options(s, on).some(o => o.key === key)) continue;
      const sp = goalLabelSpec(key, s, on, true); if (sp.suffix.kind !== 'pct') continue;
      const gain = optionGain(s, on, key)!.gain, base = incomePerSec(s, on, { assumeWorking: true });
      const want = !(base > 0) || !(gain > 0) ? null : Math.floor(100 * gain / base + 1e-9) < 1 ? '<1' : Math.floor(100 * gain / base + 1e-9);
      expect(sp.suffix.x, `F${F}/H${H}/V${V} ${key}`).toBe(want);
      expect(bestRoiDelta(s, on, key)!.x).toBe(want);
      // and the rendered strip carries exactly that X
      const g = selectGoal(s, on, 100, key, key);
      if (typeof want === 'number') expect(vis(g.label)).toContain(`+${want}% income`);
      if (want === '<1') { under1++; expect(vis(g.label)).toContain('+<1% income'); }
      checked++;
    }
    expect(checked).toBeGreaterThan(20); void under1;
  });
});

describe('F4-13 ★ rule (one source with the UX-M4 chip)', () => {
  it('★ only when the strip target is the best_roi pick and it is affordable', () => {
    const s = st({ farmLevel: 10, hensLevel: 10, eggValueLevel: 10, collectionLevel: 10, coinsCents: 1e13 });
    const p = new DualPicker().tick(s, on, 0).hint!, mark = bestBuyMark(p);
    expect(mark).toBe(p.key);
    const g = selectGoal(s, on, 100, p.key, mark);
    if (g.parts) { // ★ kept unless step 1 had to drop it for length; aria always says best buy
      expect(g.parts.star === '★ ' || cps(`★ ${g.label}`) > 27).toBe(true);
      expect(g.parts.aria.startsWith('best buy, ')).toBe(true);
    }
    for (const other of ['HENS', 'VALUE', 'COLL'] as const) if (other !== p.key && options(s, on).some(o => o.key === other)) {
      const o = selectGoal(s, on, 100, other, mark); expect(o.label.startsWith('★')).toBe(false); expect(o.parts!.aria.startsWith('best buy')).toBe(false);
    }
    expect(bestBuyMark({ key: 'HENS', affordable: false })).toBeNull();
    expect(bestBuyMark(null)).toBeNull();
  });
});

describe('flag off and copy guards', () => {
  it('M4 off: AC5 labels unchanged (no parts, no NBSP, no ★)', () => {
    const g = selectGoal({ ...initialState(off, 1) }, off, 0, undefined, 'COLL');
    expect(g.parts).toBeUndefined(); expect(g.label).toMatch(/^Collection L1: \+\d+\/tap$/);
  });
  it('F4-18: no `Egg val.` anywhere in src/', () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
    for (const f of walk('src')) expect(readFileSync(f, 'utf8').includes('Egg val.'), f).toBe(false);
  });
});
