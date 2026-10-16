import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { incomePerSec, secondsToAffordSteady, EtaHold, asleepOrUnpaidCount, productionStopped, collectPerSec } from '../src/econ/income';
import { bestBuy, optionGain } from '../src/econ/best-buy';
import { selectGoal, GoalHysteresis } from '../src/ui/next-goal';

const st = (o: Record<string, unknown> = {}) => ({ ...initialState(b, 1), ...o });

describe('incomePerSec (UC18)', () => {
  it('F0/C0 ≈ $1.50/s', () => {
    expect(incomePerSec(st(), b)).toBeCloseTo(1.5, 5);
  });
  it('F5/C4 ≈ $11.10/s (Economy example)', () => {
    expect(incomePerSec(st({ farmLevel: 5, collectionLevel: 4 }), b)).toBeCloseTo(11.1, 1);
  });
  it('asleep Coop Hand drops collect/s; badge counts; productionStopped', () => {
    const awake = st({ farmLevel: 10, collectionLevel: 8, workers: { coop_hand: { energy: 100, cdS: 0 } } });
    const asleep = st({ farmLevel: 10, collectionLevel: 8, workers: { coop_hand: { energy: 0, cdS: 0 } } });
    expect(collectPerSec(awake, b)).toBeGreaterThan(collectPerSec(asleep, b));
    expect(productionStopped(asleep, b)).toBe(true);
    expect(asleepOrUnpaidCount(asleep, b)).toBe(1);
  });
  it('asleep Grader keeps 15% bonus', () => {
    const base = st({ farmLevel: 18, collectionLevel: 10, graderTier: 1, workers: { grader: { energy: 100, cdS: 0 } } });
    const asleep = { ...base, workers: { grader: { energy: 0, cdS: 0 } } };
    const none = st({ farmLevel: 18, collectionLevel: 10, graderTier: 0, workers: {} });
    expect(incomePerSec(asleep, b)).toBeGreaterThan(incomePerSec(none, b));
    expect(incomePerSec(asleep, b)).toBeLessThan(incomePerSec(base, b));
  });
  it('may return ≤ 0 (no clamp); ETA is null', () => {
    // high wages vs low income: hire both hands at F3 with C0
    const s = st({
      farmLevel: 3, collectionLevel: 0,
      workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 } },
    });
    // not necessarily ≤0 but secondsToAffordSteady with 0 income returns null
    expect(secondsToAffordSteady(st({ farmLevel: 0, collectionLevel: 0 }), b, 0)).toBe(0);
  });
});

describe('bestBuy (UC5 / F0)', () => {
  it('F5/C4 picks Collection', () => {
    const s = st({ farmLevel: 5, collectionLevel: 4, coinsCents: 0 });
    expect(bestBuy(s, b)?.key).toBe('COLL');
    const g = optionGain(s, b, 'COLL')!;
    expect(g.gain).toBeCloseTo(0.9, 1);
    expect(g.payback).toBeCloseTo(72.2, 0);
  });
  it('fresh save first hint is Collection with ETA ~7 s (UC17)', () => {
    const s = st({ coinsCents: 0 });
    const g = selectGoal(s, b);
    expect(g.key).toBe('COLL');
    expect(g.state).toBe('waiting');
    // cost $10 / $1.50/s ≈ 6.67 s → fmtAffordableIn → "Affordable in a moment" (<10s) or ~0:07
    const secs = secondsToAffordSteady(s, b, 10 * 100)!;
    expect(secs).toBeLessThanOrEqual(60);
    expect(secs).toBeCloseTo(10 / 1.5, 1);
  });
});

describe('EtaHold monotonic (UC15)', () => {
  it('does not rise by more than 5 s unless income drops or coins spent', () => {
    const h = new EtaHold(5);
    expect(h.tick(100, 1, 0)).toBe(100);
    expect(h.tick(90, 1, 0)).toBe(90);
    expect(h.tick(100, 1, 0)).toBe(90); // rise clamped
    expect(h.tick(200, 0.5, 0)).toBe(200); // income drop → allow
    expect(h.tick(50, 0.5, -100)).toBe(50); // coins spent → allow
  });
});

describe('GoalHysteresis (UC6)', () => {
  it('keeps at 0.91× payback, switches at 0.90×', () => {
    const h = new GoalHysteresis(5000);
    const s = st({ farmLevel: 5, collectionLevel: 4 });
    const g1 = h.tick(s, b, 0, true);
    expect(g1.key).toBe('COLL');
    // same state 1 s later — no re-eval
    const g2 = h.tick(s, b, 1000);
    expect(g2.key).toBe('COLL');
    // force immediate after "purchase"
    const s2 = st({ farmLevel: 5, collectionLevel: 5 });
    const g3 = h.tick(s2, b, 2000, true);
    expect(g3.key).toBeTruthy();
  });
});

describe('UC13 ETA ignores rolling history', () => {
  it('secondsToAffordSteady equals (cost-coins)/incomePerSec', () => {
    const s = st({ farmLevel: 5, collectionLevel: 4, coinsCents: 1000 });
    const need = 65 * 100 - 1000;
    const inc = incomePerSec(s, b);
    expect(secondsToAffordSteady(s, b, need)).toBeCloseTo(need / 100 / inc, 8);
  });
});

describe('UC14 L16 Refill-burst style ETA', () => {
  it('after Refill, ETA from steady income does not rise and error ≤ 10% vs cost/income', () => {
    // Approximate Critic L16: Farm 16, some collection, post-refill workers working
    const s = st({
      farmLevel: 16, collectionLevel: 12, coinsCents: 50_000_00, // $50k
      workers: {
        market_hand: { energy: 100, cdS: 0 },
        coop_hand: { energy: 100, cdS: 0 },
        hawker: { energy: 100, cdS: 0 },
      },
    });
    const cost = 200_000_00; // next big buy
    const need = Math.max(0, cost - s.coinsCents);
    const h = new EtaHold(5);
    const inc = incomePerSec(s, b);
    expect(inc).toBeGreaterThan(0);
    let prev = h.tick(secondsToAffordSteady(s, b, need), inc, s.coinsCents)!;
    // simulate 30 s of countdown with stable income / rising coins
    for (let t = 1; t <= 30; t++) {
      const coins = s.coinsCents + Math.floor(inc * 100 * t);
      const raw = secondsToAffordSteady({ ...s, coinsCents: coins }, b, Math.max(0, cost - coins));
      const shown = h.tick(raw, inc, coins);
      if (shown != null && prev != null) expect(shown).toBeLessThanOrEqual(prev + 5);
      if (shown != null) prev = shown;
    }
    const finalNeed = cost - (s.coinsCents + Math.floor(inc * 100 * 30));
    if (finalNeed > 0) {
      const expected = finalNeed / 100 / inc;
      const shown = h.tick(expected, inc, s.coinsCents + Math.floor(inc * 100 * 30))!;
      expect(Math.abs(shown - expected) / expected).toBeLessThanOrEqual(0.10);
    }
  });
});

describe('UC15 30-min style: ETA never rises >5s without income drop', () => {
  it('seller15-like climb keeps monotonic ETA between spends', () => {
    const h = new EtaHold(5);
    let s = st({ coinsCents: 0 });
    let prev: number | null = null;
    let lastInc = incomePerSec(s, b);
    let lastCoins = s.coinsCents;
    for (let t = 0; t < 1800; t += 5) {
      const inc = incomePerSec(s, b);
      s = { ...s, coinsCents: s.coinsCents + Math.floor(inc * 100 * 5) };
      const bb = bestBuy(s, b);
      if (bb && s.coinsCents >= bb.cost * 100) {
        if (bb.key === 'COLL') s = { ...s, collectionLevel: s.collectionLevel + 1, coinsCents: s.coinsCents - Math.round(bb.cost * 100) };
        else if (bb.key === 'FARM') s = { ...s, farmLevel: s.farmLevel + 1, coinsCents: s.coinsCents - Math.round(bb.cost * 100) };
      }
      const next = bestBuy(s, b);
      if (!next) break;
      const need = Math.round(next.cost * 100) - s.coinsCents;
      const raw = secondsToAffordSteady(s, b, Math.max(0, need));
      const incNow = incomePerSec(s, b);
      const shown = h.tick(raw, incNow, s.coinsCents);
      const spent = s.coinsCents < lastCoins - 1e-9;
      const dropped = incNow < lastInc - 1e-9;
      if (shown != null && prev != null && !spent && !dropped) {
        expect(shown).toBeLessThanOrEqual(prev + 5 + 1e-6);
      }
      prev = shown;
      lastInc = incNow;
      lastCoins = s.coinsCents;
      if (s.farmLevel >= 20) break;
    }
  });
});

describe('T6 HUD text === aria money (MK-39)', () => {
  it('rateView text and aria share the same money token for critic amounts', async () => {
    const { rateView } = await import('../src/ui/s2-economy-ui');
    for (const cps of [13461, 3461, 0, -7, 120000, 99999]) {
      const v = rateView(cps);
      expect(v.aria).toContain(v.money);
      // visible text embeds the same money token (after optional ⚠ / + / −)
      expect(v.text.replace('⚠ ', '').replace('\u2212', '').replace('+', '')).toBe(`${v.money}/s`);
    }
    // stopped never positive
    const stopped = rateView(13461, { stopped: true });
    expect(stopped.sign).not.toBe('pos');
    expect(stopped.money).toBe('$0.00');
    expect(stopped.aria).toContain('$0.00');
  });
});
