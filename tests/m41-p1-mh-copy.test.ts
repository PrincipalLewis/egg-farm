// M4.1 patch 1 (4/4): Market Hand banner copy, D-HOP-2026-10-24-14 (Asleep) as amended by D-HOP-2026-10-24-17 (Unpaid).
// Source: art-ux/rc2-workers-copy.md §6 (amended 16:52); product/workers/rc1-asleep-state-spec.md + rc1-b1-coop-full-spec.md
// (AC-R1m, AC-B11 revised, AC-B11u). One switch: MARKET_HAND_COPY (workers-ui.ts). Other roles unchanged.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { mood } from '../src/sim/workers';
import { salesStopped } from '../src/econ/income';
import { workerBanner, workerBannerHtml, workersHtml, MARKET_HAND_COPY, BANNER_ICON } from '../src/ui/workers-ui';
const st = (workers: object, o: object = {}): any => ({ ...initialState(b, 1), farmLevel: 12, collectionLevel: 9, coinsCents: 1e9, ...o, workers });
const MH_ASLEEP = { energy: 0, cdS: 0 }, MH_UNPAID = { energy: 60, cdS: 0, unpaid: true };
const banner = (s: any, id: 'market_hand' | 'coop_hand' | 'hawker' | 'grader' = 'market_hand') => workerBanner(id, mood(s.workers[id], b), s, b)!;
const CASES = [
  ['asleep', MH_ASLEEP, 'Market Hand asleep: sales stopped', 'Market Hand is asleep. Auto-sales have stopped.', 'Asleep: sales stopped', 'icon-moon.svg'],
  ['unpaid', MH_UNPAID, 'Market Hand unpaid: sales stopped', 'Market Hand is unpaid. Auto-sales have stopped.', 'Unpaid: sales stopped', 'icon-warning.svg'],
] as const;
// states: Market Hand alone, with awake helpers, with other off workers (salesStopped true in every case after §4.2)
const OTHERS = [{}, { coop_hand: { energy: 90, cdS: 0 }, hawker: { energy: 90, cdS: 0 } }, { coop_hand: { energy: 0, cdS: 0 }, hawker: { energy: 50, cdS: 0, unpaid: true }, grader: { energy: 0, cdS: 0 } }];

describe('D-HOP-14 / -17: the one switch is set to "stopped"', () => {
  it('MARKET_HAND_COPY === "stopped"', () => { expect(MARKET_HAND_COPY).toBe('stopped'); });
});

describe.each(CASES)('Market Hand %s (D-HOP-2026-10-24-14 / -17)', (state, mh, text, aria, short, icon) => {
  it.each(OTHERS.map((o, i) => [i, o] as const))(`visible text exactly "${text}" (state %i)`, (_i, o) => {
    const s = st({ market_hand: mh, ...o });
    expect(salesStopped(s, b)).toBe(true);
    expect(banner(s).text).toBe(text);
  });
  it(`full aria exactly "${aria}" (always with the role)`, () => {
    for (const o of OTHERS) expect(banner(st({ market_hand: mh, ...o })).aria).toBe(aria);
  });
  it(`role-dropped short variant exactly "${short}"`, () => {
    for (const o of OTHERS) expect(banner(st({ market_hand: mh, ...o })).short).toBe(short);
  });
  it('markup: data-full / data-short / sr aria / 14px aria-hidden SVG icon; no "slowed", "production", "auto-selling", no emoji', () => {
    const wb = banner(st({ market_hand: mh }));
    expect(wb.kind).toBe(state); expect(wb.icon).toBe(icon); expect(BANNER_ICON[state]).toBe(icon);
    const h = workerBannerHtml(wb);
    expect(h).toContain(`data-full="${text}"`); expect(h).toContain(`data-short="${short}"`);
    expect(h).toContain(`<span class="sr">${aria}</span>`);
    expect(h).toMatch(new RegExp(`<img class="wb-ico" src="[^"]*${icon}" width="14" height="14" alt="" aria-hidden="true">`));
    expect(h).toMatch(new RegExp(`<span class="bt" aria-hidden="true"[^>]*>${text}</span>`));
    for (const v of [wb.text, wb.short, wb.aria]) { expect(v).not.toMatch(/slowed|production|auto-selling/i); expect(v).not.toMatch(/[\u{1F300}-\u{1FAFF}\u26A0]/u); }
  });
  it('rendered Workers tab card carries the exact strings', () => {
    const html = workersHtml(st({ market_hand: mh, hawker: { energy: 90, cdS: 0 } }, { farmLevel: 20 }), b);
    expect(html).toContain(`data-full="${text}"`); expect(html).toContain(`data-short="${short}"`); expect(html).toContain(aria);
  });
});

describe('other roles unchanged by D-HOP-14 / -17', () => {
  it('Hawker asleep / unpaid with a working Market Hand: "sales slowed"', () => {
    const s = st({ market_hand: { energy: 90, cdS: 0 }, hawker: { energy: 0, cdS: 0 } });
    expect(banner(s, 'hawker')).toMatchObject({ text: 'Hawker asleep: sales slowed', aria: 'Hawker is asleep. Sales are slowed.', short: 'Asleep: sales slowed' });
    const u = st({ market_hand: { energy: 90, cdS: 0 }, hawker: { energy: 50, cdS: 0, unpaid: true } });
    expect(banner(u, 'hawker')).toMatchObject({ text: 'Hawker unpaid: sales slowed', aria: 'Hawker is unpaid. Sales are slowed.' });
  });
  it('Coop Hand asleep / unpaid with a working Market Hand: spec v1.0.6 rows ("collecting stopped"), never "slowed"', () => {
    const s = st({ market_hand: { energy: 90, cdS: 0 }, coop_hand: { energy: 0, cdS: 0 } });
    expect(banner(s, 'coop_hand')).toMatchObject({ text: 'Coop Hand asleep: collecting stopped', aria: 'Coop Hand is asleep. Auto-collecting has stopped.', short: 'Asleep: collecting stopped' });
    const u = st({ market_hand: { energy: 90, cdS: 0 }, coop_hand: { energy: 50, cdS: 0, unpaid: true } });
    expect(banner(u, 'coop_hand')).toMatchObject({ text: 'Coop Hand unpaid: collecting stopped', aria: 'Coop Hand is unpaid. Auto-collecting has stopped.', short: 'Unpaid: collecting stopped' });
    for (const x of [banner(s, 'coop_hand'), banner(u, 'coop_hand')]) expect(`${x.text} ${x.short} ${x.aria}`).not.toMatch(/slowed/);
  });
  it('Grader asleep: bonus string', () => {
    const s = st({ market_hand: { energy: 90, cdS: 0 }, grader: { energy: 0, cdS: 0 } }, { graderTier: 1, farmLevel: 20 });
    expect(banner(s, 'grader').text).toMatch(/^Grader asleep: bonus down to \d+%$/);
  });
  it('the "slowed" switch value still gives the rc1 rule for the Market Hand (switch is the only difference)', () => {
    const s = st({ market_hand: MH_ASLEEP });
    expect(workerBanner('market_hand', 'asleep', s, b, 'slowed')!.text).toBe('Market Hand asleep: production stopped');
  });
});
