import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { OnboardingFlow, ftueGate } from '../src/ui/onboarding';
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
