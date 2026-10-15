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
    f.onEvent({ type: 'sell', id: 1, k: 3, N: 8, price: 100, value: 0, by: 'player' }); expect(h.step).toHaveBeenLastCalledWith(3, 'upgrade');
    f.onEvent({ type: 'upgrade', upgrade: 'collection', newLevel: 1, cost: 1000, coinsBefore: 1000 });
    expect(f.finished).toBe(true); expect(h.done).toHaveBeenCalledOnce(); expect(h.skip).not.toHaveBeenCalled();
    expect(STEPS.map(s => s.name)).toEqual(['collect', 'sell', 'upgrade']);
  });
  it('skip logs the step it was skipped at and ends the flow', () => {
    const h = hooks(); const f = new OnboardingFlow(h); f.start(); f.onEvent({ type: 'collect', eggs: 5 }); f.skip(); f.skip();
    expect(h.skip).toHaveBeenCalledOnce(); expect(h.skip).toHaveBeenCalledWith(2); expect(f.finished).toBe(true);
    f.onEvent({ type: 'sell', id: 1, k: 1, N: 1, price: 1, value: 0, by: 'player' }); expect(h.step).toHaveBeenCalledTimes(2);
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
describe('M3 FTUE / Workers intro telemetry (AC4)', () => {
  it('onboarding_step carries the AC4 names and an action', () => {
    const g = new Game(b, mem(), () => 0);
    g.telemetry.onboardingStep(6, 'workers_hire_tip', { action: 'shown' }); g.telemetry.onboardingStep(7, 'workers_coach', { action: 'done' });
    expect(g.telemetry.events().filter(e => e.type === 'onboarding_step').map(e => [e.name, e.action])).toEqual([['workers_hire_tip', 'shown'], ['workers_coach', 'done']]);
  });
  it('step dots show the current of 3 steps', async () => {
    const { dots } = await import('../src/ui/onboarding'); expect(dots(0)).toBe('● ○ ○'); expect(dots(2)).toBe('○ ○ ●');
  });
});

describe('M3 pointer anchoring (m3-ftue-spec §1)', () => {
  it('rest tip is REST_GAP from the edge; bob peak keeps ≥ TIP_CLEARANCE', async () => {
    const { placeHand, REST_GAP, TIP_CLEARANCE, tipAtBobPeak, HAND_SIZE, TIP_UP, TIP_DOWN } = await import('../src/ui/onboarding');
    const target = { left: 100, top: 400, right: 280, bottom: 460 };
    const down = placeHand(target, 'down');
    expect(down.dir).toBe('down');
    expect(down.tipY).toBe(target.top - REST_GAP);
    expect(target.top - tipAtBobPeak(down)).toBe(TIP_CLEARANCE);
    expect(down.left).toBe((target.left + target.right) / 2 - TIP_DOWN.x);
    expect(down.top).toBe(down.tipY - TIP_DOWN.y);
    expect(down.top + HAND_SIZE).toBe(down.tipY);
    const up = placeHand(target, 'up');
    expect(up.dir).toBe('up');
    expect(up.tipY).toBe(target.bottom + REST_GAP);
    expect(tipAtBobPeak(up) - target.bottom).toBe(TIP_CLEARANCE);
    expect(up.left).toBe((target.left + target.right) / 2 - TIP_UP.x);
    expect(up.top).toBe(up.tipY - TIP_UP.y);
  });
  it('switches side or shifts at REST_GAP when the meter text would be covered', async () => {
    const { placeHand, handRect, rectOverlaps, REST_GAP, TIP_CLEARANCE, tipAtBobPeak } = await import('../src/ui/onboarding');
    // Collect in the lower half; narrow meter *text* sits on the centred approach path.
    const collect = { left: 24, top: 620, right: 366, bottom: 676 };
    const meterText = { left: 160, top: 560, right: 230, bottom: 576 }; // "0 / 50" centred
    const p = placeHand(collect, 'down', [meterText], { width: 390, height: 844 });
    expect(rectOverlaps(handRect(p.left, p.top), meterText)).toBe(false);
    // Tip stays at REST_GAP (phase-1), either up below Collect or down shifted off the text.
    if (p.dir === 'down') {
      expect(p.tipY).toBe(collect.top - REST_GAP);
      expect(Math.abs(p.tipX - (collect.left + collect.right) / 2)).toBeGreaterThanOrEqual(24);
      expect(collect.top - tipAtBobPeak(p)).toBe(TIP_CLEARANCE);
    } else {
      expect(p.tipY).toBe(collect.bottom + REST_GAP);
      expect(tipAtBobPeak(p) - collect.bottom).toBe(TIP_CLEARANCE);
    }
  });
  it('shifts sideways when both variants would cover label text even with a larger gap', async () => {
    const { placeHand, handRect, rectOverlaps, HAND_SIZE } = await import('../src/ui/onboarding');
    const target = { left: 200, top: 300, right: 280, bottom: 360 }; // cx = 240; natural hand [220,260]
    // Tall avoid bands cover the centred hand for any gap; only a side shift clears them.
    const above = { left: 210, top: 0, right: 270, bottom: 300 };
    const below = { left: 210, top: 360, right: 270, bottom: 844 };
    const p = placeHand(target, 'down', [above, below], { width: 400, height: 844 });
    expect(Math.abs(p.tipX - (target.left + target.right) / 2)).toBeGreaterThanOrEqual(24);
    expect(rectOverlaps(handRect(p.left, p.top), above)).toBe(false);
    expect(rectOverlaps(handRect(p.left, p.top), below)).toBe(false);
    expect(p.left + HAND_SIZE).toBeGreaterThan(p.left);
  });
    it('bob-peak hand box clears full-width meter text (grow gap on the preferred side)', async () => {
    const { placeHand, handRect, rectOverlaps, BOB, REST_GAP, TIP_CLEARANCE, tipAtBobPeak } = await import('../src/ui/onboarding');
    const collect = { left: 12, top: 724, right: 868, bottom: 788 };
    const meterText = { left: 14, top: 702, right: 866, bottom: 714 }; // display:block full width
    const p = placeHand(collect, 'down', [meterText], { width: 1280, height: 800 });
    expect(p.dir).toBe('down');
    const peak = handRect(p.left, p.top + BOB);
    expect(rectOverlaps(peak, meterText)).toBe(false);
    expect(rectOverlaps(handRect(p.left, p.top), meterText)).toBe(false);
    expect(p.tipY).toBeLessThanOrEqual(meterText.top - BOB);
    expect(collect.top - tipAtBobPeak(p)).toBeGreaterThanOrEqual(TIP_CLEARANCE);
    expect(collect.top - p.tipY).toBeGreaterThanOrEqual(REST_GAP);
  });
  it('tip anchors are the viewBox points scaled to 40px (up 24,0 / down 24,48 of 48)', async () => {
    const { TIP_UP, TIP_DOWN, HAND_SIZE } = await import('../src/ui/onboarding');
    expect(TIP_UP).toEqual({ x: (24 / 48) * HAND_SIZE, y: (0 / 48) * HAND_SIZE });
    expect(TIP_DOWN).toEqual({ x: (24 / 48) * HAND_SIZE, y: (48 / 48) * HAND_SIZE });
  });
});
