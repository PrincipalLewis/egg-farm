import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fmtAffordableIn } from '../src/ui/format';
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
