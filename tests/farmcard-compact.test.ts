import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FARM_FX_LABELS, customerEveryAria, paybackChip, levelTag, levelTagHtml, farmEveryLi } from '../src/ui/upgrade-card';

/** Pure helpers + source-order checks here; the rendered-layout AC (260/282±2, Buy 48px full width, no clipping) is gated by rc0 farmCompact on 3 engines. */
describe('B-3 compact Farm card', () => {
  it('short fx labels in mock order (Hens, Every, Coop, Price, Demand)', () => {
    expect(Object.values(FARM_FX_LABELS).map(s => s.trim())).toEqual(['Hens', 'Every', 'Coop', 'Price', 'Demand']);
  });
  it('customer interval aria keeps the full sentence', () => {
    expect(customerEveryAria(3.68, 3.49)).toBe('Customers arrive every 3.68 s, next 3.49 s');
    expect(customerEveryAria(3.68, 3.68, true)).toBe('Customers arrive every 3.68 s');
  });
  it('payback chip: short visual form, full SR text', () => {
    expect(paybackChip('~3 min 43 s')).toEqual({ short: '~3 min 43 s', aria: 'Pays back in about 3 min 43 s' });
    expect(paybackChip('12 s').short).toBe('~12 s');
  });
  it('level tag in the title row: visual L6/30 hidden from SR, SR text Level 6 of 30', () => {
    expect(levelTag(6, 30)).toBe('L6/30');
    expect(levelTagHtml(6, 30)).toBe('<span class="lv"><span class="lvv" aria-hidden="true">L6/30</span><span class="sr">Level 6 of 30</span></span>');
  });
  it('Every li: icon + arrow + aria; unchanged -> null; max shows only the current value', () => {
    const li = farmEveryLi(3.68, 3.49, false, 'i.svg')!;
    expect(li).toMatch(/^<li class="every" aria-label="Customers arrive every 3.68 s, next 3.49 s"><img class="fxi" src="i.svg" alt="">Every 3.68 <span class="arrow">→<\/span> 3.49s<\/li>$/);
    expect(farmEveryLi(3.49, 3.49, false, 'i.svg')).toBeNull();
    expect(farmEveryLi(3.49, 3.49, true, 'i.svg')).toBe('<li class="every" aria-label="Customers arrive every 3.49 s"><img class="fxi" src="i.svg" alt="">Every 3.49s</li>');
  });
  it('app.ts farm fx order is Hens, Every, Coop, Price, Demand and uses the helpers', () => {
    const src = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
    const seq = ['FARM_FX_LABELS.hens', 'farmEveryLi(', 'FARM_FX_LABELS.coop', 'FARM_FX_LABELS.price', 'FARM_FX_LABELS.demand'].map(k => src.indexOf(k));
    expect(seq.every(i => i > 0)).toBe(true); expect([...seq].sort((a, b) => a - b)).toEqual(seq);
    expect(src).toMatch(/levelTagHtml\(L, b\.maxLevel\)/); expect(src).not.toMatch(/\\u0001/);
  });
  it('card markup: title row, no .meta line, ETA before Buy, limiter after Buy', () => {
    const src = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
    const row = src.slice(src.indexOf('const upRowHtml'), src.indexOf('let lastUp'));
    expect(row).not.toMatch(/class="meta">Level/);
    expect(row).toMatch(/class="t"><h3>/);
    const i = row.lastIndexOf('${hint}'), j = row.indexOf('btn buy'), k = row.lastIndexOf('${limit}');
    expect(i).toBeGreaterThan(0); expect(i).toBeLessThan(j); expect(j).toBeLessThan(k);
  });
  it('css: compact gaps, 48px Buy, focus ring, 16px limiter offset, real display:none for hidden hints', () => {
    const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
    const b3 = css.slice(css.indexOf('/* B-3 compact Farm card'));
    for (const re of [/\.up \.col\{gap:6px\}/, /max-width:390px\)\{\.up\{padding:12px\}/, /height:48px/, /\.btn\.buy:focus-visible\{outline:3px/, /\.hint\.limit\{margin-top:16px\}/, /flex-wrap:wrap;column-gap:10px/, /\.up \.btn\.buy,\.up \.btn\.maxed\{width:100%;align-self:stretch\}/])
      expect(b3).toMatch(re);
  });
});
