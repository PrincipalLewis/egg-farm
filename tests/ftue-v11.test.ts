// art-ux/m3-ftue-spec.md v1.1 §2.1 event gating + §2.2 Collect label.
import { describe, it, expect } from 'vitest';
import { OnboardingFlow, ftueGate, collectLabel, GATE_TIMEOUT_S, HINT_HIDE_S, type GateCtx } from '../src/ui/onboarding';
const C = (o: Partial<GateCtx> = {}): GateCtx => ({ coop: 0, eggsPerTap: 5, customers: 0, basket: 0, coinsCents: 0, costCents: 1000, nextCustomerInS: 10, ...o });
const mk = () => { const log: any[] = []; const f = new OnboardingFlow({ step: (n, nm) => log.push(['step', n, nm]), skip: n => log.push(['skip', n]), done: () => log.push(['done']), timeout: (n, nm) => log.push(['timeout', n, nm]) }); f.start(); return { f, log }; };
describe('FTUE v1.1 §2.1 gates', () => {
  it('Collect only once coop >= eggs_per_tap', () => { expect(ftueGate('collect', C({ coop: 4.9 })).open).toBe(false); expect(ftueGate('collect', C({ coop: 5 })).open).toBe(true); });
  it('Sell needs a customer AND basket >= 1; empty queue shows the countdown hint', () => {
    expect(ftueGate('sell', C({ customers: 0, basket: 5, nextCustomerInS: 7.2 }))).toEqual({ open: false, hint: 'A customer is on the way… 8 s' });
    expect(ftueGate('sell', C({ customers: 0, nextCustomerInS: 30 })).hint).toBe('A customer is on the way…');
    expect(ftueGate('sell', C({ customers: 1, basket: 0 })).open).toBe(false);
    expect(ftueGate('sell', C({ customers: 1, basket: 1 })).open).toBe(true);
  });
  it('Buy needs coins >= cost (PT1: "Tap Buy" while $2 short)', () => {
    expect(ftueGate('upgrade', C({ coinsCents: 800 }))).toEqual({ open: false, hint: 'Sell a few more eggs to afford it · $2 to go' });
    expect(ftueGate('upgrade', C({ coinsCents: 1000 })).open).toBe(true);
  });
  it('each step waits for its own event; pointer hides if the gate closes while shown', () => {
    const { f } = mk();
    expect(f.gateTick(C({ coop: 5 }), 0.1)).toBe('mark');
    f.onEvent({ type: 'collect', eggs: 5 } as any); expect(f.step).toBe(1);
    expect(f.gateTick(C({ basket: 5 }), 0.1)).toBe('hint'); // no customer: no "Tap Sell" at an empty queue
    expect(f.gateTick(C({ basket: 5, customers: 1 }), 0.1)).toBe('mark');
    expect(f.gateTick(C({ basket: 5, customers: 0 }), 0.1)).toBe('hint'); // customer left
    f.onEvent({ type: 'upgrade' } as any); expect(f.step).toBe(1); // wrong event does nothing
  });
  it('hint auto-hides after 15 s, re-shows when the gate opens; 60 s closed = silent skip with timeout', () => {
    const { f, log } = mk(); f.onEvent({ type: 'collect', eggs: 5 } as any);
    for (let t = 0; t < HINT_HIDE_S - 0.5; t += 0.5) expect(f.gateTick(C(), 0.5)).toBe('hint');
    expect(f.gateTick(C(), 1)).toBe('none');
    expect(f.gateTick(C({ customers: 1, basket: 1 }), 0.1)).toBe('mark');
    for (let t = 0; t < GATE_TIMEOUT_S - 1; t += 1) f.gateTick(C(), 1);
    expect(f.step).toBe(1); f.gateTick(C(), 1);
    expect(f.step).toBe(2); expect(log).toContainEqual(['timeout', 2, 'sell']); expect(log.at(-1)).toEqual(['step', 3, 'upgrade']);
  });
  it('skip works from a hint', () => { const { f, log } = mk(); f.gateTick(C(), 1); f.skip(); expect(log.at(-1)).toEqual(['skip', 1]); expect(f.gateTick(C(), 1)).toBe('none'); });
});
describe('FTUE v1.1 §2.2 Collect label', () => {
  it('always shows real eggs_per_tap; smaller coop is secondary', () => {
    expect(collectLabel(1, 5)).toBe('Collect +5 · 1 ready');
    expect(collectLabel(0, 5)).toBe('Collect +5 · 0 ready');
    expect(collectLabel(12, 5)).toBe('Collect +5');
    expect(collectLabel(7, 10)).toBe('Collect +10 · 7 ready');
  });
});
