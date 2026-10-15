import { describe, it, expect, vi } from 'vitest';
import { OnboardingFlow, STEPS } from '../src/ui/onboarding';
import { Game } from '../src/game';
import { balance as b } from '../src/config/balance';
import { save } from '../src/save/save';
import { initialState } from '../src/sim/state';
import { mem } from './helpers';
const hooks = () => ({ step: vi.fn(), skip: vi.fn(), done: vi.fn() });
describe('onboarding flow', () => {
  it('3 steps in order: collect -> sell -> upgrade, then done', () => {
    const h = hooks(); const f = new OnboardingFlow(h); f.start(); expect(h.step).toHaveBeenLastCalledWith(1, 'collect');
    f.onEvent({ type: 'collect', eggs: 0 }); expect(f.step).toBe(0); // empty tap doesn't count
    f.onEvent({ type: 'upgrade', upgrade: 'farm', newLevel: 1, cost: 1, coinsBefore: 1 }); expect(f.step).toBe(0); // out of order ignored
    f.onEvent({ type: 'collect', eggs: 5 }); expect(h.step).toHaveBeenLastCalledWith(2, 'sell');
    f.onEvent({ type: 'sell', id: 1, k: 3, N: 8, price: 100 }); expect(h.step).toHaveBeenLastCalledWith(3, 'upgrade');
    f.onEvent({ type: 'upgrade', upgrade: 'collection', newLevel: 1, cost: 1000, coinsBefore: 1000 });
    expect(f.finished).toBe(true); expect(h.done).toHaveBeenCalledOnce(); expect(h.skip).not.toHaveBeenCalled();
    expect(STEPS.map(s => s.name)).toEqual(['collect', 'sell', 'upgrade']);
  });
  it('skip logs the step it was skipped at and ends the flow', () => {
    const h = hooks(); const f = new OnboardingFlow(h); f.start(); f.onEvent({ type: 'collect', eggs: 5 }); f.skip(); f.skip();
    expect(h.skip).toHaveBeenCalledOnce(); expect(h.skip).toHaveBeenCalledWith(2); expect(f.finished).toBe(true);
    f.onEvent({ type: 'sell', id: 1, k: 1, N: 1, price: 1 }); expect(h.step).toHaveBeenCalledTimes(2);
  });
  it('telemetry hooks record onboarding_step / onboarding_skip on the Game', () => {
    const g = new Game(b, mem(), () => 0); expect(g.isNewGame).toBe(true);
    const f = new OnboardingFlow({ step: (n, nm) => g.telemetry.onboardingStep(n, nm), skip: n => g.telemetry.onboardingSkip(n), done: () => g.telemetry.onboardingStep(4, 'complete') });
    f.start(); f.skip();
    expect(g.telemetry.events().filter(e => e.type.startsWith('onboarding')).map(e => [e.type, e.step ?? e.atStep])).toEqual([['onboarding_step', 1], ['onboarding_skip', 1]]);
  });
  it('existing save is not a new game (no onboarding)', () => { const kv = mem(); save(kv, initialState(b), 0); expect(new Game(b, kv, () => 1).isNewGame).toBe(false); });
});
describe('debug hooks', () => {
  it('debugAdvance runs the normal tick path', () => { const g = new Game(b, mem(), () => 0); g.debugAdvance(5000); expect(g.state.coop).toBeCloseTo(5 * 1.0, 6); });
  it('debugBackdateSave produces an offline grant on next load', () => {
    const kv = mem(); let t = 10_000_000; const g = new Game(b, kv, () => t); g.debugBackdateSave(3_600_000); g.save(); // further saves suppressed
    const g2 = new Game(b, kv, () => t); expect(g2.state.pendingOfflineEggs).toBe(Math.floor(3600 * b.offline.offlineRateMultiplier * 1.0));
  });
});
