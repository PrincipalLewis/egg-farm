import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fmtAffordableIn, fmtGoalEta } from '../src/ui/format';
import { OnboardingFlow, ftueGate } from '../src/ui/onboarding';
describe('upgrade-card ETA "Affordable in" (Product Oct 16)', () => {
  it('5 s -> a moment', () => expect(fmtAffordableIn(5)).toBe('Affordable in a moment'));
  it('9.2 s rounds up to 10 s', () => expect(fmtAffordableIn(9.2)).toBe('Affordable in ~0:10'));
  it('10 s -> ~0:10', () => expect(fmtAffordableIn(10)).toBe('Affordable in ~0:10'));
  it('80 s -> ~1:20', () => expect(fmtAffordableIn(80)).toBe('Affordable in ~1:20'));
  it('59:59 -> ~59:59', () => expect(fmtAffordableIn(3599)).toBe('Affordable in ~59:59'));
  it('1:00:00 -> ~1:00:00', () => expect(fmtAffordableIn(3600)).toBe('Affordable in ~1:00:00'));
  it('1:05:00 -> ~1:05:00', () => expect(fmtAffordableIn(3900)).toBe('Affordable in ~1:05:00'));
  it('no income -> —', () => { expect(fmtAffordableIn(null)).toBe('Affordable in —'); expect(fmtAffordableIn(Infinity)).toBe('Affordable in —'); });
});
describe('P1 FTUE sell step never points at a missing customer / never softlocks', () => {
  const C = { coop: 0, eggsPerTap: 5, customers: 0, basket: 5, coinsCents: 0, costCents: 1000, nextCustomerInS: 2 };
  it('no customer: gate closed, wait hint (not "customer is waiting")', () => {
    const g = ftueGate('sell', C); expect(g.open).toBe(false); expect(g.hint).not.toMatch(/waiting|Tap them/);
  });
  it('no customer forever: step times out instead of softlocking', () => {
    const f = new OnboardingFlow({ step() {}, skip() {}, done() {} }); f.step = 1;
    for (let i = 0; i < 700; i++) f.gateTick(C, 0.1);
    expect(f.step).toBe(2);
  });
  it('sell-step target never falls back to the empty queue strip', () => {
    const src = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/chip:not\(\.empty\)'\) \?\? queueEl/);
  });
  it('game surface is not selectable and shows no caret; no contenteditable', () => {
    const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
    expect(css).toMatch(/#app,#scene,#yard,\.onb\{[^}]*user-select:none[^}]*caret-color:transparent/);
    expect(readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8')).not.toMatch(/contenteditable/i);
  });
});
import { offlineEggsParts, offlineEggsLine } from '../src/ui/format';
describe('C-AC25 Welcome-back copy', () => {
  it('N=1 singular', () => { expect(offlineEggsParts(1)).toEqual({ hero: '+1', line2: 'egg added to your basket' }); expect(offlineEggsLine(1)).toBe('+1 egg added to your basket'); });
  it('N=2,278 (spec example)', () => expect(offlineEggsLine(2278)).toBe('+2,278 eggs added to your basket'));
  it('N=1,234,567', () => expect(offlineEggsParts(1234567)).toEqual({ hero: '+1,234,567', line2: 'eggs added to your basket' }));
  it('N=9,999,999 still separators', () => expect(offlineEggsParts(9999999).hero).toBe('+9,999,999'));
  it('N=12,345,678 short form', () => expect(offlineEggsParts(12345678).hero).toBe('+12.3M'));
  it('fractional pending eggs floor to whole eggs actually added', () => expect(offlineEggsParts(1.7)).toEqual({ hero: '+1', line2: 'egg added to your basket' }));
});

describe('fmtGoalEta (rc1-upgrade-value v1.4 goal status)', () => {
  it('short ~m:ss under 1h; ~Hh Mm at/over 1h; — when no income', () => {
    expect(fmtGoalEta(null)).toBe('—');
    expect(fmtGoalEta(65)).toBe('~1:05');
    expect(fmtGoalEta(9)).toBe('~0:09');
    expect(fmtGoalEta(3600 + 59 * 60)).toBe('~1h 59m');
    expect(fmtGoalEta(7200)).toBe('~2h');
  });
});
