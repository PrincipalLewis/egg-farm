import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { initialState, coopCapacity } from '../src/sim/state';
import { unlockFarm } from '../src/sim/workers';
import { IncomeMeter, incomePerSec, etaSeconds, INCOME_WINDOW_MS } from '../src/econ/income';
import { totalWageCentsPerSec } from '../src/ui/rates';
import { coopFullHint, coopFullHintVariant, isCoopFull, rateAria, COOP_FULL_COPY } from '../src/ui/coop-full';
import { selectGoal } from '../src/ui/next-goal';
import { mem } from './helpers';
const full = (over: any = {}) => { const s = { ...initialState(b, 1), ...over }; return { ...s, coop: coopCapacity(s.farmLevel, b) }; };
const withHand = (s: any, w: any) => ({ ...s, workers: { ...s.workers, coop_hand: w } });

describe('B-1 coop full / realized net rate', () => {
  it('AC-B1/B8: after the coop fills with no sales, the rate stops being positive within 5 s and equals -wages', () => {
    const m = new IncomeMeter(); const s = full();
    m.add(0, 500); // last sale right as the coop fills
    expect(incomePerSec(m, s, b, 1000)).toBeGreaterThan(0);
    expect(incomePerSec(m, s, b, INCOME_WINDOW_MS)).toBeCloseTo(-totalWageCentsPerSec(s, b), 9);
    expect(incomePerSec(m, s, b, INCOME_WINDOW_MS)).toBeLessThanOrEqual(0);
    expect(INCOME_WINDOW_MS).toBeLessThanOrEqual(5000);
  });
  it('AC-B1: rate decays as the window rolls, never held at the last positive value', () => {
    const m = new IncomeMeter(); const s = full(); m.add(0, 1000); m.add(2000, 1000);
    const a = incomePerSec(m, s, b, 1000), c = incomePerSec(m, s, b, 5500);
    expect(c).toBeLessThan(a);
  });
  it('AC-B8: real sales continuing while full show their real net value', () => {
    const m = new IncomeMeter(); const s = full(); for (let t = 0; t < 5000; t += 1000) m.add(t, 100);
    expect(incomePerSec(m, s, b, 4999)).toBeCloseTo(500 / 5 - totalWageCentsPerSec(s, b), 6);
  });
  it('AC-B2: ETA "—" (null) at rate <= 0, (goal-coins)/rate otherwise; goal chip shows —', () => {
    expect(etaSeconds(1000, 0)).toBeNull(); expect(etaSeconds(1000, -3)).toBeNull(); expect(etaSeconds(1000, 50)).toBe(20);
    const s = { ...full(), coinsCents: 0 }; expect(selectGoal(s, b, 0).status).toBe('—');
  });
  it('AC-B3: rate = realized sales - wages, 6 samples within $0.01', () => {
    const m = new IncomeMeter(); const s = full(); const sales: [number, number][] = [];
    for (let t = 0; t < 12000; t += 700) { const c = 37 + (t % 5); m.add(t, c); sales.push([t, c]); }
    for (let i = 0; i < 6; i++) { const now = 6000 + i * 1000;
      const exp = sales.filter(([t]) => now - t < 5000).reduce((a, [, c]) => a + c, 0) / 5 - totalWageCentsPerSec(s, b);
      expect(Math.abs(incomePerSec(m, s, b, now) - exp)).toBeLessThan(1); }
  });
  it('AC-B4: hint variant follows Coop Hand state, clears when not full', () => {
    const pre = full({ farmLevel: Math.max(0, unlockFarm('coop_hand', b) - 1) });
    expect(coopFullHintVariant(pre, b)).toBe('collect');
    const un = full({ farmLevel: unlockFarm('coop_hand', b) });
    expect(coopFullHint(un, b)).toBe(COOP_FULL_COPY.hintHire);
    expect(coopFullHint(withHand(un, { energy: 0, cdS: 1 }), b)).toBe(COOP_FULL_COPY.hintRefill);
    expect(coopFullHint(withHand(un, { energy: 80, cdS: 1, unpaid: true }), b)).toBe(COOP_FULL_COPY.hintRefill);
    expect(coopFullHint(withHand(un, { energy: 100, cdS: 1 }), b)).toBe(COOP_FULL_COPY.hintCollect);
    expect(coopFullHint({ ...un, coop: 0 }, b)).toBe('');
  });
  it('AC-B5 (v0.3): coop_full fires once per transition with fields; exit_reason tap; durations', () => {
    const c = { t: 1.8e12 }; const g = new Game(b, mem(), () => c.t, 1);
    g.state = { ...g.state, coop: coopCapacity(g.state.farmLevel, b) - 0.01 };
    for (let i = 0; i < 30; i++) { c.t += 100; g.frame(); }
    c.t += 3000; g.frame(); g.frame();
    g.dispatch({ type: 'collect' }); g.frame(); g.dispatch({ type: 'collect' });
    const ev = g.telemetry.events().filter(e => e.type === 'coop_full');
    expect(ev.map(e => e.phase)).toEqual(['start', 'end']);
    expect(ev[0]).toMatchObject({ farm_level: g.state.farmLevel, coop_cap: coopCapacity(g.state.farmLevel, b), coop_hand_state: 'none' });
    expect(ev[1].exit_reason).toBe('tap');
    expect(Math.abs((ev[1].durationMs as number) - 5900)).toBeLessThan(1000);
    expect(ev[1].coop_full_ms).toBe(ev[1].durationMs); expect(ev[1].eggs_lost_while_full).toBeGreaterThanOrEqual(0);
  });
  it('AC-B5: cap upgrade ends the episode with exit_reason cap_upgrade', () => {
    const c = { t: 1.8e12 }; const g = new Game(b, mem(), () => c.t, 1);
    g.state = { ...g.state, coinsCents: 1e12, coop: coopCapacity(g.state.farmLevel, b) }; c.t += 100; g.frame();
    g.dispatch({ type: 'buyFarm' });
    const ev = g.telemetry.events().filter(e => e.type === 'coop_full');
    expect(ev.map(e => e.phase)).toEqual(['start', 'end']); expect(ev[1].exit_reason).toBe('cap_upgrade');
  });
  it('v1.0 copy: each hint variant string', () => {
    const pre = full({ farmLevel: Math.max(0, unlockFarm('coop_hand', b) - 1) }), un = full({ farmLevel: unlockFarm('coop_hand', b) });
    expect(coopFullHint(pre, b)).toBe('Collect eggs');
    expect(coopFullHint(un, b)).toBe('Collect or hire Coop Hand');
    expect(coopFullHint(withHand(un, { energy: 100, cdS: 1 }), b)).toBe('Collect eggs');
    expect(coopFullHint(withHand(un, { energy: b.workers.energy.tired_below_pct - 1, cdS: 1 }), b)).toBe('Collect eggs');
    expect(coopFullHint(withHand(un, { energy: 0, cdS: 1 }), b)).toBe('Collect or refill Coop Hand');
    expect(coopFullHint(withHand(un, { energy: 50, cdS: 1, unpaid: true }), b)).toBe('Collect or refill Coop Hand');
    expect(COOP_FULL_COPY.badge).toBe('Full!'); expect(COOP_FULL_COPY.rateChip).toBe('Full!');
  });
  it('AC-B6: aria label text in every state', () => {
    expect(rateAria(-125, true)).toBe('Net income minus $1.25 per second. Coop full.');
    expect(rateAria(3971, true)).toBe('Net income plus $39.71 per second. Coop full.');
    expect(rateAria(0, true)).toBe('Net income zero per second. Coop full.');
    expect(rateAria(120, false)).toBe('Net income plus $1.20 per second.');
  });
  it('AC-B9: one badge, one hint, old Coop Hand tip gone', () => {
    const app = readFileSync('src/ui/app.ts', 'utf8'), wui = readFileSync('src/ui/workers-ui.ts', 'utf8');
    expect(app.match(/class="fullbadge"/g)).toHaveLength(1);
    expect(app.match(/id="coopHint"/g)).toHaveLength(1);
    expect(app + wui).not.toMatch(/shouldShowCoopTip|COOP_TIP_TEXT|cooptip|coop_hand_tip_full_s/);
    expect(isCoopFull(full(), b)).toBe(true);
  });
});
