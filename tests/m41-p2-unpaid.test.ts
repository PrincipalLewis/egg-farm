// v5 / M4.1 patch 2, P2b: rc1-asleep-state-spec v1.0.10-v1.0.12 Unpaid ACs (AC-R10..R16, TP1-U1..U3; qa/m41/test-plan-patch1.md).
// Pure sim + workersHtml checks (debug-setter equivalents: coins, energy, unpaid, manageCdS). T = manage_prompt_threshold x 100.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { needManage, mood, isYawning } from '../src/sim/workers';
import { workersHtml, manageAllHtml, refillCount, promptManage, resumeAtCents, manageCaption, navRefillState, workerBanner } from '../src/ui/workers-ui';
import { fmtMoney } from '../src/ui/format';
const T = Math.round(b.workers.energy.manage_prompt_threshold * 100);
const st = (o: Record<string, unknown> = {}): any => ({ ...initialState(b, 1), customers: [], nextCustomerInS: 1e9, ...o });
const W = (energy: number, unpaid = false, cdS = 5) => ({ energy, cdS, ...(unpaid ? { unpaid: true } : {}) });
const card = (h: string, id: string) => h.match(new RegExp(`<div class="wk [^"]*" data-w="${id}">[\\s\\S]*?(?=<div class="wk |$)`))![0];
const refillBtn = (c: string) => c.match(/<button class="btn secondary manage[^>]*>/)![0];
const capOf = (c: string) => c.match(/<div class="wk-cap num" id="cap-[a-z_]+">([^<]*)<\/div>/)?.[1] ?? '';
const describedText = (c: string) => { const id = refillBtn(c).match(/aria-describedby="([^"]+)"/)?.[1]; return id ? c.match(new RegExp(`id="${id}">([^<]*)<`))![1] : null; };

describe('P2b Unpaid caption / Refill (AC-R10..R14, U1..U3)', () => {
  it('AC-R16 P2b: fmtMoney check (spec v1.0.10 §2)', () => {
    expect([500, 99_990_000, 99_995_000, 123_000_000, 999_999].map(c => fmtMoney(c))).toEqual(['$5.00', '$999.9K', '$1M', '$1.23M', '$9,999.99']);
  });
  it('AC-R10 (above T): MH F10 Unpaid energy 70 coins $1.00 -> "Resumes at $2.50", Refill aria-disabled, name "Refill Market Hand", describedby sentence', () => {
    const s = st({ farmLevel: 10, coinsCents: 100, manageCdS: 0, workers: { market_hand: W(70, true) } });
    const c = card(workersHtml(s, b), 'market_hand');
    expect(capOf(c)).toBe('Resumes at $2.50'); expect(c).not.toContain(`Rested, refill below ${T}%`);
    expect(refillBtn(c)).toContain('aria-disabled="true"'); expect(refillBtn(c)).toContain('aria-label="Refill Market Hand"');
    expect(describedText(c)).toBe('Market Hand is unpaid. Work resumes automatically when you have $2.50. Sell eggs to earn coins.');
  });
  it('AC-R11 (at/below T, cooldown 0): caption "Resumes at $2.50", aria-disabled (the UI tap guard is in m41-p2-ui-dom)', () => {
    const s = st({ farmLevel: 10, coinsCents: 100, manageCdS: 0, workers: { market_hand: W(30, true) } });
    const c = card(workersHtml(s, b), 'market_hand'); expect(capOf(c)).toBe('Resumes at $2.50'); expect(refillBtn(c)).toContain('aria-disabled="true"');
  });
  it('AC-R12 (cooldown 20 s): "Resumes at $2.50", not "Ready in 20s"; v1.0.12 precedence Unpaid > Rested > Ready in > none', () => {
    const s = st({ farmLevel: 10, coinsCents: 100, manageCdS: 20, workers: { market_hand: W(30, true) } });
    const c = card(workersHtml(s, b), 'market_hand'); expect(capOf(c)).toBe('Resumes at $2.50'); expect(c).not.toContain('Ready in');
    expect(manageCaption(W(70, true), 20, b, 250)).toBe('Resumes at $2.50');
    expect(manageCaption(W(70), 20, b)).toBe(`Rested, refill below ${T}%`); // energy reason beats the cooldown (AC-R8)
    expect(manageCaption(W(30), 20, b)).toBe('Ready in 20s'); expect(manageCaption(W(30), 0, b)).toBe('');
  });
  it('AC-R13: from R10, coins -> $2.50: within 1 tick worker_state working, coins unchanged by the resume, caption -> "Rested, refill below 50%"', () => {
    const s0 = st({ farmLevel: 10, coinsCents: 250, manageCdS: 0, workers: { market_hand: W(70, true, 0) } });
    const ev: any[] = []; const s1 = step(s0, 1 / b.tickHz, b, ev);
    expect(ev).toContainEqual({ type: 'worker_state', worker: 'market_hand', state: 'working' });
    expect(s1.workers.market_hand!.unpaid).toBe(false);
    // coins: the resume itself charges nothing; any change in the same tick is the first wage of the resumed worker
    const wages = ev.filter(e => e.type === 'wage').reduce((a, e) => a + e.cents, 0); expect(s1.coinsCents + wages).toBe(250);
    expect(capOf(card(workersHtml(s1, b), 'market_hand'))).toBe(`Rested, refill below ${T}%`);
  });
  it('AC-R14: F10 MH working + CH Unpaid -> CH X = $7.50; both Unpaid -> MH $2.50, CH $7.50; at $5.00 only the MH resumes', () => {
    const a = st({ farmLevel: 10, coinsCents: 0, workers: { market_hand: W(90), coop_hand: W(90, true) } });
    expect(resumeAtCents(a, b, 'coop_hand')).toBe(750); expect(capOf(card(workersHtml(a, b), 'coop_hand'))).toBe('Resumes at $7.50');
    const both = st({ farmLevel: 10, coinsCents: 0, workers: { market_hand: W(90, true), coop_hand: W(90, true) } });
    expect(resumeAtCents(both, b, 'market_hand')).toBe(250); expect(resumeAtCents(both, b, 'coop_hand')).toBe(750);
    const s1 = step({ ...both, coinsCents: 500 }, 1 / b.tickHz, b);
    expect(s1.workers.market_hand!.unpaid).toBe(false); expect(s1.workers.coop_hand!.unpaid).toBe(true);
    // the UI's X agrees with the tick at the boundary: CH resumes at exactly its X, not one cent below
    for (const [coins, resumed] of [[749, false], [750, true]] as const) expect(step({ ...a, coinsCents: coins }, 1 / b.tickHz, b).workers.coop_hand!.unpaid).toBe(!resumed);
  });
  it('TP1-U1/U2: Unpaid + energy 0 -> Unpaid wins: caption, aria-disabled + describedby, Unpaid banner, pill "Unpaid" (+ warn icon), no yawn', () => {
    const s = st({ farmLevel: 10, coinsCents: 0, manageCdS: 0, workers: { coop_hand: W(0, true) } });
    expect(mood(s.workers.coop_hand, b)).toBe('unpaid'); expect(isYawning(s.workers.coop_hand, b)).toBe(false);
    const c = card(workersHtml(s, b), 'coop_hand');
    expect(capOf(c)).toBe('Resumes at $5.00'); expect(refillBtn(c)).toContain('aria-disabled="true"');
    expect(describedText(c)).toBe('Coop Hand is unpaid. Work resumes automatically when you have $5.00. Sell eggs to earn coins.');
    expect(c).toContain('<span class="st">Unpaid<svg class="wi"'); expect(c).toContain('Coop Hand unpaid: collecting stopped'); expect(c).not.toContain('yawn');
    expect(workerBanner('coop_hand', 'unpaid', b)!.kind).toBe('unpaid');
  });
  it('TP1-U3: from U1, coins >= X; 1 tick -> resumes into Asleep: Asleep banner, normal Refill enabled; the reserve skips it (energy 0)', () => {
    const s = st({ farmLevel: 10, coinsCents: 500, manageCdS: 0, workers: { coop_hand: W(0, true, 0), market_hand: W(90, true) } });
    const s1 = step({ ...s, workers: { coop_hand: W(0, true, 0) } }, 1 / b.tickHz, b);
    expect(mood(s1.workers.coop_hand, b)).toBe('asleep');
    const c = card(workersHtml(s1, b), 'coop_hand');
    expect(c).toContain('Coop Hand asleep: collecting stopped'); expect(refillBtn(c)).toContain('aria-disabled="false"'); expect(c).not.toContain('Resumes at');
    // the resumed-but-asleep CH (energy 0) is not in the paid reserve: an Unpaid MH needs only its own minute
    const s2 = { ...s1, workers: { ...s1.workers, market_hand: W(90, true) } };
    expect(resumeAtCents(s2, b, 'market_hand')).toBe(250);
  });
});

describe('P2b nav / Manage all exclude Unpaid (AC-R15)', () => {
  it('AC-R15 P2b: 3 hired, CH Unpaid 30%, MH Tired 30%: count 1, aria "Refill 1 tired worker"; the sim needManage still has both (Manage all behaviour unchanged)', () => {
    const s = st({ farmLevel: 12, coinsCents: 0, manageCdS: 0, workers: { market_hand: W(30), coop_hand: W(30, true), hawker: W(90) } });
    expect(promptManage(s, b)).toEqual(['market_hand']); expect(refillCount(s, b)).toBe(1);
    expect(manageAllHtml(s, b)).toContain('aria-label="Refill 1 tired worker"');
    expect(navRefillState(s, b, false, { text: '', at: 0 }, 0)).toMatchObject({ label: 'Refill', badge: '1', aria: { text: 'Refill 1 tired worker' } });
    expect(needManage(s.workers, b)).toEqual(['market_hand', 'coop_hand']); // sim unchanged: refilling an Unpaid worker's energy is harmless
    const after = apply(s, { type: 'manageAll' } as any, b); expect(after.workers.coop_hand).toMatchObject({ energy: 100, unpaid: true });
  });
  it('AC-R15 AC-R9 P2b: only an Unpaid worker <= T -> N = 0: no Refill bar, nav hidden (AC-R9 hidden at 0)', () => {
    const s = st({ farmLevel: 12, coinsCents: 0, manageCdS: 0, workers: { market_hand: W(90), coop_hand: W(30, true), hawker: W(90) } });
    expect(refillCount(s, b)).toBe(0); expect(manageAllHtml(s, b)).toBe('');
  });
});

describe('AC-R16 copy forms (fit is browser-measured in scripts/m41-p2-browser.mjs at 360/390/1280 x 3 engines)', () => {
  it('AC-R16 P2b: the five captions', () => {
    expect([500, 99_990_000, 99_995_000, 123_000_000, 999_999].map(x => manageCaption(W(70, true), 0, b, x)))
      .toEqual(['Resumes at $5.00', 'Resumes at $999.9K', 'Resumes at $1M', 'Resumes at $1.23M', 'Resumes at $9,999.99']);
  });
});
