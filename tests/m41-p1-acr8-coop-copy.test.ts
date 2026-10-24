// @vitest-environment jsdom
// M4.1 patch 1, D-HOP-29 (via HoE):
// (a) AC-R8 per rc1-asleep-state-spec v1.0.7 (sha1 8f2435dba4b4a5662193cf542d93af22619702fe): T = manage_prompt_threshold x 100,
//     read from balance; caption exactly 'Rested, refill below 50%' on the shipping data. Never hard-coded.
// (b) Coop Hand copy frozen per rc1-b1-coop-full-spec v1.0.6 (sha1 a2b36af50f6b78901bdde2c3149085a7c0de640b): asleep / unpaid text,
//     aria and the role-drop variant (only when the full string doesn't fit); Tired unchanged.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { mood } from '../src/sim/workers';
import { manageCaption, workerBanner, workerBannerHtml, workersHtml, fitBanners } from '../src/ui/workers-ui';
const withT = (t: number) => ({ ...b, workers: { ...b.workers, energy: { ...b.workers.energy, manage_prompt_threshold: t } } }) as any;
const st = (workers: object): any => ({ ...initialState(b, 1), farmLevel: 12, collectionLevel: 9, coinsCents: 1e9, workers });

describe('AC-R8 v1.0.7: caption derived from manage_prompt_threshold', () => {
  it('shipping balance: exactly "Rested, refill below 50%" (T read from balance)', () => {
    const T = Math.round(b.workers.energy.manage_prompt_threshold * 100);
    expect(T).toBe(50); // shipping data (balance.json 0.5); asserted only to pin the shipped caption, the rule below reads T
    expect(manageCaption({ energy: T + 1, cdS: 0 }, 0, b)).toBe(`Rested, refill below ${T}%`);
    expect(manageCaption({ energy: 90, cdS: 0 }, 0, b)).toBe('Rested, refill below 50%');
  });
  it('changing the tunable changes the caption and the threshold (not hard-coded)', () => {
    for (const t of [0.37, 0.4, 0.5, 0.65]) {
      const T = Math.round(t * 100), bt = withT(t);
      expect(manageCaption({ energy: T + 1, cdS: 0 }, 0, bt)).toBe(`Rested, refill below ${T}%`);
      expect(manageCaption({ energy: T, cdS: 0 }, 12, bt)).toBe('Ready in 12s'); // at/below T on cooldown
      expect(manageCaption({ energy: T, cdS: 0 }, 0, bt)).toBe('');
    }
  });
  it('source: the caption has no literal percentage', () => {
    const src = readFileSync(`${process.cwd()}/src/ui/workers-ui.ts`, 'utf8');
    expect(src).not.toMatch(/refill below (40|50)%/);
    expect(src).toMatch(/Rested, refill below \$\{Math\.round\(b\.workers\.energy\.manage_prompt_threshold \* 100\)\}%/);
  });
  it('rendered card: a rested worker shows the derived caption', () => {
    expect(workersHtml(st({ coop_hand: { energy: 90, cdS: 0 } }), b)).toContain('Rested, refill below 50%');
    expect(workersHtml(st({ coop_hand: { energy: 90, cdS: 0 } }), withT(0.37))).toContain('Rested, refill below 37%');
  });
});

const ROWS = [
  ['asleep', { energy: 0, cdS: 0 }, 'Coop Hand asleep: collecting stopped', 'Coop Hand is asleep. Auto-collecting has stopped.', 'Asleep: collecting stopped'],
  ['unpaid', { energy: 50, cdS: 0, unpaid: true }, 'Coop Hand unpaid: collecting stopped', 'Coop Hand is unpaid. Auto-collecting has stopped.', 'Unpaid: collecting stopped'],
] as const;
/** Mount the banner and fake its layout: the text box is `cw` wide, the full string needs `need` px. */
const mount = (html: string, cw: number, need: number) => {
  document.body.innerHTML = `<div id="r">${html}</div>`;
  const t = document.querySelector<HTMLElement>('.wk-banner .bt')!;
  Object.defineProperty(t, 'clientWidth', { configurable: true, get: () => cw });
  Object.defineProperty(t, 'scrollWidth', { configurable: true, get: () => (t.textContent === t.dataset.full ? need : Math.round(need * 0.6)) });
  fitBanners(document.getElementById('r')!); return t;
};

describe.each(ROWS)('Coop Hand %s (rc1-b1-coop-full v1.0.6, frozen)', (state, w, text, aria, short) => {
  const s = st({ market_hand: { energy: 90, cdS: 0 }, coop_hand: w });
  it('visible text, aria and short variant exactly', () => {
    const wb = workerBanner('coop_hand', mood(s.workers.coop_hand, b), s, b)!;
    expect(wb).toMatchObject({ kind: state, text, aria, short });
    expect(`${wb.text} ${wb.aria} ${wb.short}`).not.toMatch(/slowed|production/);
  });
  it('role-drop only when the full string does not fit (app fitBanners)', () => {
    const html = workerBannerHtml(workerBanner('coop_hand', state, s, b));
    const fits = mount(html, 260, 240); expect(fits.textContent).toBe(text); // fits -> full string
    const tight = mount(html, 200, 240); expect(tight.textContent).toBe(short); // doesn't fit -> role dropped
    expect(document.querySelector('.wk-banner .sr')!.textContent).toBe(aria); // aria always keeps the role
    const back = mount(html, 260, 240); expect(back.textContent).toBe(text);
  });
});

describe('Tired unchanged', () => {
  it('a Tired Coop Hand has no banner and no "stopped" copy; its card still reads "Tired"', () => {
    const s = st({ market_hand: { energy: 90, cdS: 0 }, coop_hand: { energy: 20, cdS: 0 } });
    expect(mood(s.workers.coop_hand, b)).toBe('tired');
    expect(workerBanner('coop_hand', 'tired', s, b)).toBeNull();
    const html = workersHtml(s, b);
    expect(html).toMatch(/data-w="coop_hand"[^]*?Tired/); expect(html).not.toMatch(/collecting stopped|wk-banner/);
  });
});
