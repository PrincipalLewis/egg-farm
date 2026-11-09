// @vitest-environment jsdom
// Breeds UI PR-B — yard sprites (BR-AC33 / 34; spec §4.3b L373-392). TDD: written before breeds-yard.ts.
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { mountYard, uniquifySvgIds, YARD_FILL_ORDER } from '../src/ui/breeds-yard';
import { breedAsset } from '../src/ui/breeds-adapter';
import { flagOnBalance, flagOffBalance, stateWith, breeds, YARD_HTML } from './fixtures/breeds-prB/setup';

const b = flagOnBalance();
const svg = (n: string) => fs.readFileSync(path.resolve(__dirname, 'fixtures/breeds-prB', n), 'utf8');
const hens = () => YARD_FILL_ORDER.map(i => document.getElementById('yard')!.children[i].firstElementChild as HTMLImageElement | null).filter(Boolean) as HTMLImageElement[];
beforeEach(() => { document.body.innerHTML = YARD_HTML(6); });

describe('BR-AC34 yard placement', () => {
  it('fill order mirrors app.ts (keyed hen diff order)', () => expect(YARD_FILL_ORDER).toEqual([2, 3, 1, 4, 0, 5, 8, 9, 7, 10, 6, 11]));
  it('flag off → null, yard untouched', () => {
    const before = document.body.innerHTML; expect(mountYard({ doc: document, b: flagOffBalance() })).toBeNull(); expect(document.body.innerHTML).toBe(before);
  });
  it('slotted breeds replace the first hens in fill order, in the SAME cell/img (same box ⇒ same centre x24 / contact y42)', () => {
    const y = mountYard({ doc: document, b })!; const imgs = hens();
    y.sync(stateWith(b, 20, breeds({ owned: { brahma: { stars: 0 }, cochin: { stars: 0 }, leghorn: { stars: 0 } }, slots: ['brahma', null, 'cochin'] })));
    const h = hens(); expect(h).toEqual(imgs); // no element churn: the app's keyed diff and bob phase are untouched
    expect(h[0].getAttribute('src')!.endsWith(breedAsset('brahma'))).toBe(true); expect(h[0].dataset.breed).toBe('brahma');
    expect(h[0].getAttribute('data-testid')).toBe('breeds-yard-brahma');
    expect(h[1].getAttribute('src')!.endsWith(breedAsset('cochin'))).toBe(true);
    for (const x of h.slice(2)) { expect(x.getAttribute('src')!.endsWith('char-chicken.svg')).toBe(true); expect(x.dataset.breed).toBeUndefined(); }
    for (const x of h) { expect(x.className.split(' ')[0]).toBe('hen'); expect(x.alt).toBe(''); }
  });
  it('unslot restores the base hen; unknown ids (E10) and settling-irrelevant: unknown skipped', () => {
    const before = document.body.innerHTML; const y = mountYard({ doc: document, b })!;
    y.sync(stateWith(b, 20, breeds({ owned: { sussex: { stars: 0 } }, slots: ['bogus', 'sussex', null] })));
    expect(hens()[0].dataset.breed).toBe('sussex');
    y.sync(stateWith(b, 20, breeds())); expect(document.body.innerHTML).toBe(before);
  });
  it('locked slots are not shown (slot ≥ unlocked count)', () => {
    const y = mountYard({ doc: document, b })!;
    y.sync(stateWith(b, 10, breeds({ owned: { sussex: { stars: 0 }, brahma: { stars: 0 } }, slots: ['sussex', 'brahma', null] })));
    expect(hens().filter(h => h.dataset.breed).map(h => h.dataset.breed)).toEqual(['sussex']);
  });
  it('fewer hens than breeds: only as many as there are hens; a hen added later gets its breed on the next sync', () => {
    document.body.innerHTML = YARD_HTML(1); const y = mountYard({ doc: document, b })!;
    const s = stateWith(b, 20, breeds({ owned: { sussex: { stars: 0 }, brahma: { stars: 0 } }, slots: ['sussex', 'brahma', null] }));
    y.sync(s); expect(hens().map(h => h.dataset.breed)).toEqual(['sussex']);
    const cell = document.getElementById('yard')!.children[YARD_FILL_ORDER[1]]; cell.innerHTML = '<img class="hen" src="/assets/char-chicken.svg" alt="">';
    y.sync(s); expect(hens().map(h => h.dataset.breed)).toEqual(['sussex', 'brahma']);
  });
  it('dispose restores every hen', () => {
    const before = document.body.innerHTML; const y = mountYard({ doc: document, b })!;
    y.sync(stateWith(b, 20, breeds({ owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null] }))); y.dispose();
    expect(document.body.innerHTML).toBe(before);
  });
});

describe('BR-AC33 inline SVG ids are unique per instance', () => {
  it('two Cemani + two Legbar inlined: no duplicate ids, every url(#…) resolves to its own instance', () => {
    const host = document.createElement('div'); let n = 0;
    for (const f of ['char-breed-ayam-cemani.svg', 'char-breed-cream-legbar.svg', 'char-breed-ayam-cemani.svg', 'char-breed-cream-legbar.svg'])
      host.insertAdjacentHTML('beforeend', uniquifySvgIds(svg(f), `breeds-yard-i${n++}`));
    document.body.append(host);
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id); expect(new Set(ids).size).toBe(ids.length);
    for (const s of host.querySelectorAll('svg')) {
      const own = new Set([...s.querySelectorAll('[id]')].map(e => e.id));
      const refs = [...s.outerHTML.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map(m => m[1] ?? m[2]);
      expect(refs.length).toBeGreaterThan(0); for (const r of refs) expect(own.has(r)).toBe(true);
    }
  });
  it('an svg with no ids is unchanged', () => { const t = '<svg viewBox="0 0 48 48"><path d="M0 0"/></svg>'; expect(uniquifySvgIds(t, 'x')).toBe(t); });
  it('rejects an unsafe prefix', () => expect(() => uniquifySvgIds('<svg/>', 'a b')).toThrow());
});
