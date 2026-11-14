/**
 * HoQA N1 (Major, flag on, docked desktop): the closed Flock sheet must compute display:none and none of its controls may be
 * focusable / in the tab order. Cause: the docked M1 rule `.sheet[hidden]{display:flex!important}` (styles.css, 73828bf5) keeps
 * Market + Upgrades side by side while the phone panel logic sets [hidden]; it also matched `section#breeds-sheet.sheet`.
 * Real Chromium (same launcher as check-globals: CHROME or /usr/bin/google-chrome) against the real src/ui/styles.css.
 * Also pins the M1 purpose: docked #p-market / #p-upgrades with [hidden] still compute display:flex.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import pw, { type Browser, type Page } from 'playwright-core';

const CSS = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
const MOUNT = readFileSync(new URL('../src/ui/breeds-mount.ts', import.meta.url), 'utf8');
// Use breeds-mount's real id / class so the test tracks the shipped markup.
const SHEET_CLASS = /sheet\.className = '([^']+)'/.exec(MOUNT)?.[1];
const SHEET_ID = /sheet\.id = '([^']+)'/.exec(MOUNT)?.[1];

const html = (breedsHidden: boolean) => `<!doctype html><html><head><style>${CSS}</style></head><body>
<div id="app"><div class="hud"><button id="before">before</button></div>
<div id="panel-layer" data-testid="docked-panel"><div class="scrim"></div>
  <section class="sheet" id="p-market" hidden aria-label="Market"><header><h2>Market</h2><button class="icon-btn close" aria-label="Close">x</button></header><div class="body"><button id="sellAll">Sell</button></div></section>
  <section class="sheet" id="p-upgrades" hidden aria-label="Upgrades"><header><h2>Upgrades</h2><button class="icon-btn close" aria-label="Close">x</button></header><div class="body"><button id="upBtn">Up</button></div></section>
  <section id="${SHEET_ID}" class="${SHEET_CLASS}" ${breedsHidden ? 'hidden' : ''} role="dialog" aria-label="Flock">
    <header role="none"><button type="button" class="icon-btn breeds-back" aria-label="Back to Upgrades">‹</button><h2>Flock</h2>
    <button type="button" class="icon-btn breeds-close" aria-label="Close">x</button></header>
    <div class="body breeds-body"><button type="button" class="slot-main">slot</button><a href="#x">link</a><input aria-label="i"></div></section>
</div></div><button id="after">after</button></body></html>`;

let br: Browser;
beforeAll(async () => { br = await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] }); }, 60_000);
afterAll(async () => { await br?.close(); });

async function at(viewport: { width: number; height: number }, breedsHidden: boolean): Promise<Page> {
  const p = await br.newPage({ viewport }); await p.setContent(html(breedsHidden)); return p;
}
const display = (p: Page, sel: string) => p.$eval(sel, e => getComputedStyle(e).display);
/** Tab from #before through the page; returns every focused element that sits inside the Flock sheet. */
const tabbedIntoFlock = async (p: Page, sel: string) => {
  await p.focus('#before'); const hits: string[] = [];
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press('Tab');
    const r = await p.evaluate(s => { const a = document.activeElement; return { inFlock: !!a && !!document.querySelector(s)?.contains(a), id: a?.outerHTML.slice(0, 60) ?? '' }; }, sel);
    if (r.inFlock) hits.push(r.id);
  }
  return hits;
};
const focusableInFlock = (p: Page, sel: string) => p.$$eval(`${sel} button, ${sel} a[href], ${sel} input`, els =>
  els.filter(e => { (e as HTMLElement).focus(); return document.activeElement === e || (e as HTMLElement).checkVisibility(); }).length);

const DOCKED = { width: 1280, height: 800 }, PHONE = { width: 390, height: 844 };

describe('HoQA N1: closed Flock sheet is hidden and out of the tab order', () => {
  it('test reads the shipped breeds-mount id/class (section#breeds-sheet.sheet.breeds-sheet)', () => {
    expect(SHEET_ID).toBe('breeds-sheet'); expect(SHEET_CLASS?.split(' ')).toContain('sheet');
  });
  for (const [name, vp] of [['docked 1280x800', DOCKED], ['phone 390x844', PHONE]] as const) {
    it(`${name}: closed Flock computes display:none, no control focusable or tabbable`, async () => {
      const p = await at(vp, true);
      try {
        expect(await p.evaluate(() => matchMedia('(min-width:960px) and (orientation:landscape)').matches)).toBe(vp === DOCKED);
        expect(await display(p, '#breeds-sheet')).toBe('none');
        expect(await focusableInFlock(p, '#breeds-sheet')).toBe(0);
        expect(await tabbedIntoFlock(p, '#breeds-sheet')).toEqual([]);
      } finally { await p.close(); }
    }, 30_000);
  }
  it('docked: open Flock (not hidden) still computes display:flex and its Close is tabbable', async () => {
    const p = await at(DOCKED, false);
    try {
      expect(await display(p, '#breeds-sheet')).toBe('flex');
      expect((await tabbedIntoFlock(p, '#breeds-sheet')).some(s => s.includes('breeds-close'))).toBe(true);
    } finally { await p.close(); }
  }, 30_000);
  it('M1 purpose kept: docked #p-market / #p-upgrades with [hidden] still display:flex; phone they are display:none', async () => {
    const d = await at(DOCKED, true), m = await at(PHONE, true);
    try {
      expect(await display(d, '#p-market')).toBe('flex'); expect(await display(d, '#p-upgrades')).toBe('flex');
      expect(await display(m, '#p-market')).toBe('none'); expect(await display(m, '#p-upgrades')).toBe('none');
    } finally { await d.close(); await m.close(); }
  }, 30_000);
});
