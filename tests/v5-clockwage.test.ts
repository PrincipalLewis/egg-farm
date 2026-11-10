// Hire2/v5-clockwage: failure-cost v0.3.24 (54b994bd). Pure Asleep-wage step (wired into tick.ts only after the Saves/Architect seam
// agreement, HANDOFF S1) + running-wage UI copy and card caption. AC ids cited per test; tick-level ACs re-run once S1 lands.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { clockWageAsleepStep, clockWageOn, wageState, wagePerMinCents } from '../src/sim/clock-wage';
import { stillPaidCaption, stillPaidDescription, asleepToast, sleptDuration, welcomeBackWageLine, CLOCK_WAGE_TIP } from '../src/ui/clock-wage-ui';
import { workersHtml } from '../src/ui/workers-ui';
import type { SimEvent } from '../src/sim/events';

const flags = (o: Record<string, number>) => ({ ...b, m4: { ...b.m4!, enabled: 1, flags: { ...b.m4!.flags, ...o } } }) as typeof b;
const C = flags({ clockWage: 1 }), CP = flags({ clockWage: 1, pause: 1 });
const DT = 1 / b.tickHz;
const st = (o: Partial<GameState> = {}): GameState => ({ ...initialState(b, 1), customers: [], nextCustomerInS: 1e9, farmLevel: 12, coinsCents: 100_000, graderTier: 1, ...o }) as GameState;
const run = (s: GameState, id: 'market_hand' | 'coop_hand', steps: number, bb = C) => {
  const ev: SimEvent[] = [], at: number[] = [];
  for (let i = 1; i <= steps; i++) { const n = ev.length; s = clockWageAsleepStep(s, id, DT, bb, ev); if (ev.length > n && ev[n].type === 'wage') at.push(i); }
  return { s, ev, at };
};

describe('[FC-R7 / AC-FC7a] flag off', () => {
  it('shipped balance clockWage = 0; step returns the same object; no wage.state', () => {
    expect(b.m4!.flags!.clockWage ?? 0).toBe(0); expect(clockWageOn(b)).toBe(false);
    const s = st({ workers: { market_hand: { energy: 0, cdS: 0.05 } } });
    expect(clockWageAsleepStep(s, 'market_hand', DT, b)).toBe(s);
    expect(wageState('asleep', b)).toEqual({}); expect(wageState('working', C)).toEqual({ state: 'working' }); expect(wageState('unpaid', C)).toEqual({});
  });
  it('card markup unchanged with clockWage = 0 for an Asleep MH/CH', () => {
    const s = st({ workers: { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 0, cdS: 0 } } });
    expect(workersHtml(s, flags({ clockWage: 0 }))).toBe(workersHtml(s, b));
    expect(workersHtml(s, b)).not.toContain('Still paid');
  });
});

describe('[AC-FC1 / AC-FC2] Asleep clock wage, U1 phase', () => {
  it('MH F12, c0 = 0.5 s: 120 charges in 120 s at c0 + k, 5 cents each, 600 cents, wage.state asleep', () => {
    const { s, ev, at } = run(st({ workers: { market_hand: { energy: 0, cdS: 0.5 } } }), 'market_hand', 1200);
    const w = ev.filter(e => e.type === 'wage');
    expect(w).toHaveLength(120); expect(w.every(e => e.type === 'wage' && e.cents === 5 && e.state === 'asleep')).toBe(true);
    expect(at[0]).toBe(5); expect(at[1]).toBe(15); expect(at[119]).toBe(1195);
    expect(100_000 - s.coinsCents).toBe(600);
  });
  it('CH F12, c0 = 1.0 s: 60 charges, 20 cents each, 1,200 cents', () => {
    const { s, ev } = run(st({ workers: { coop_hand: { energy: 0, cdS: 1.0 } } }), 'coop_hand', 1200);
    expect(ev.filter(e => e.type === 'wage')).toHaveLength(60); expect(100_000 - s.coinsCents).toBe(1200);
  });
  it('AC-FC18a: carried cdS 2.5 s → first charge on step 25, then every 10 steps: 8 charges in 100 steps', () => {
    const { at } = run(st({ workers: { market_hand: { energy: 0, cdS: 2.5 } } }), 'market_hand', 100);
    expect(at).toEqual([25, 35, 45, 55, 65, 75, 85, 95]);
  });
});

describe('[AC-FC3 / AC-FC4] paused, not asleep, can\'t pay', () => {
  it('a Paused Asleep MH is charged 0 (FC-R2); a Working MH is not this helper\'s business', () => {
    const p = st({ workers: { market_hand: { energy: 0, cdS: 0.1, paused: true } } });
    expect(clockWageAsleepStep(p, 'market_hand', DT, CP)).toBe(p);
    const w = st({ workers: { market_hand: { energy: 80, cdS: 0.1 } } });
    expect(clockWageAsleepStep(w, 'market_hand', DT, C)).toBe(w);
  });
  it('CH F10 Asleep, coins below one interval wage → Unpaid on that interval, cdS 0, no charge, coins never negative', () => {
    const ev: SimEvent[] = [];
    const s = clockWageAsleepStep(st({ farmLevel: 10, coinsCents: 5, workers: { coop_hand: { energy: 0, cdS: 0.05 } } }), 'coop_hand', DT, C, ev);
    expect(s.workers.coop_hand).toMatchObject({ unpaid: true, cdS: 0 }); expect(s.coinsCents).toBe(5);
    expect(ev).toEqual([{ type: 'worker_state', worker: 'coop_hand', state: 'unpaid' }]);
  });
});

describe('[AC-FC8 / AC-FC10] card caption + description', () => {
  it('F10 MH "Still paid $2.50/min", CH "$5.00/min"; F30 CH "$15.00/min"', () => {
    const s = st({ farmLevel: 10, workers: { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 0, cdS: 0 } } });
    expect(stillPaidCaption(s, 'market_hand', C)).toBe('Still paid $2.50/min'); expect(stillPaidCaption(s, 'coop_hand', C)).toBe('Still paid $5.00/min');
    expect(stillPaidCaption({ ...s, farmLevel: 30 }, 'coop_hand', C)).toBe('Still paid $15.00/min');
    expect(stillPaidCaption(s, 'hawker', C)).toBeNull(); expect(stillPaidCaption(s, 'market_hand', b)).toBeNull();
    expect(wagePerMinCents('market_hand', 10, b)).toBe(250);
  });
  it('Unpaid wins (never both); Paused shows no wage line', () => {
    expect(stillPaidCaption(st({ workers: { market_hand: { energy: 0, cdS: 0, unpaid: true } } }), 'market_hand', C)).toBeNull();
    expect(stillPaidCaption(st({ workers: { market_hand: { energy: 0, cdS: 0, paused: true } } }), 'market_hand', CP)).toBeNull();
    const h = workersHtml(st({ workers: { market_hand: { energy: 0, cdS: 0, unpaid: true } } }), C);
    expect(h).toContain('Resumes at'); expect(h).not.toContain('Still paid');
  });
  it('card: caption in the wk-cap slot, Refill aria-describedby → the asleep sentence (no aria-label change)', () => {
    const h = workersHtml(st({ farmLevel: 10, workers: { market_hand: { energy: 0, cdS: 0 } } }), C);
    expect(h).toContain('<div class="wk-cap num" id="cap-market_hand">Still paid $2.50/min</div>');
    expect(h).toContain('aria-describedby="capw-market_hand"'); expect(h).toContain('aria-label="Refill Market Hand"');
    expect(h).toContain(`<span class="sr" id="capw-market_hand">${stillPaidDescription('Market Hand', 250)}</span>`);
    expect(stillPaidDescription('Market Hand', 250)).toBe('Market Hand is asleep and still paid $2.50 per minute. Refill to get them working.');
  });
});

describe('[AC-FC9 / AC-FC11 / AC-FC12] copy', () => {
  it('toasts per role; {pct} from data', () => {
    expect(asleepToast('market_hand', C)).toBe('Market Hand fell asleep. Auto-selling stopped, wage still running.');
    expect(asleepToast('coop_hand', C)).toBe('Coop Hand fell asleep. Collecting stopped, wage still running.');
    expect(asleepToast('hawker', C)).toBe('Hawker fell asleep: sales slowed. Tap Refill.');
    expect(asleepToast('grader', C)).toBe(`Egg Grader fell asleep: bonus down to ${Math.round(b.workers.grader.asleep_bonus_share * 100)}%. Tap Refill.`);
    const b2 = { ...C, workers: { ...C.workers, grader: { ...C.workers.grader, asleep_bonus_share: 0.2 } } } as typeof b;
    expect(asleepToast('grader', b2)).toContain('bonus down to 20%');
  });
  it('tip copy', () => { expect(CLOCK_WAGE_TIP).toBe('Sleeping workers still get paid. Refill to wake them.'); });
  it('duration: floor first; 3599.5 → 59:59; 3600 → 1:00:00; 3900 → 1:05:00; 252 → 4:12', () => {
    expect(sleptDuration(3599.5)).toBe('59:59'); expect(sleptDuration(3600)).toBe('1:00:00'); expect(sleptDuration(3900)).toBe('1:05:00');
    expect(sleptDuration(252)).toBe('4:12'); expect(sleptDuration(120)).toBe('2:00');
  });
  it('welcome-back line only when Y > 0', () => {
    expect(welcomeBackWageLine('Coop Hand', 120, 1200)).toBe('Coop Hand slept 2:00 and was paid $12.00');
    expect(welcomeBackWageLine('Coop Hand', 120, 0)).toBeNull();
  });
});
