/**
 * M5.1 Breeds UI PR-B — yard sprites (spec §4.3b L373-392; BR-AC33 / 34 L920-921). Seams: PR-B owns `breeds-yard-*`.
 *
 * Slotted breeds (unlocked slots, slot order) take over the first hens of the yard in the app's fill order. The mount only
 * swaps `src` on the hen `<img>` the app already rendered (same cell, same element, same CSS box), so the slot position
 * (centre x24, contact y42 of the 48×48 base hen) is identical to the default hen's and the app's keyed hen diff and bob
 * phase are untouched (BR-AC34). Sprites are used via `<img src>`, so BR-AC33 passes as is; `uniquifySvgIds` covers any
 * inline use (Ayam Cemani `cm-*`, Cream Legbar `lb-*` clip ids).
 * Assets: the 9 `char-breed-*.svg` are vendored by PR-A into public/assets (seams §5); PR-B does not re-vendor them.
 * BR-AC34 part 2 (Broody nest overlay over the feet): rc/v5 has no Broody nest overlay in the UI yet, so it is not wired here.
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { breedAsset, breedsFlagOn, slottedBreeds } from './breeds-adapter';

/** The app's hen fill order (src/ui/app.ts render(): `const order = [...]`, the keyed per-slot diff, art acfe36a7 UI-M1). */
export const YARD_FILL_ORDER = [2, 3, 1, 4, 0, 5, 8, 9, 7, 10, 6, 11] as const;
const A = (f: string) => `${import.meta.env.BASE_URL}assets/${f}`;

export interface YardMount { sync(s: GameState): void; dispose(): void; }

export function mountYard(o: { doc: Document; b: Balance }): YardMount | null {
  if (!breedsFlagOn(o.b)) return null;
  const orig = new Map<HTMLImageElement, string>(); // hen → its original src attribute (restored on unslot / dispose)
  const restore = (img: HTMLImageElement) => {
    const src = orig.get(img); if (src !== undefined) img.setAttribute('src', src);
    orig.delete(img); delete img.dataset.breed; img.removeAttribute('data-testid');
  };
  return {
    sync(s) {
      const yard = o.doc.getElementById('yard'); if (!yard) return;
      const ids = slottedBreeds(s, o.b);
      const hens = YARD_FILL_ORDER.map(i => yard.children[i]?.firstElementChild).filter((x): x is HTMLImageElement => x instanceof HTMLImageElement);
      for (const img of [...orig.keys()]) if (!img.isConnected) orig.delete(img); // the app removed that hen
      hens.forEach((img, k) => {
        const id = ids[k];
        if (!id) { if (orig.has(img)) restore(img); return; }
        if (img.dataset.breed === id) return;
        if (!orig.has(img)) orig.set(img, img.getAttribute('src') ?? '');
        img.setAttribute('src', A(breedAsset(id))); img.dataset.breed = id; img.setAttribute('data-testid', `breeds-yard-${id}`);
      });
    },
    dispose() { for (const img of [...orig.keys()]) restore(img); },
  };
}

const SAFE_PREFIX = /^[A-Za-z][\w-]*$/;
/** BR-AC33: prefix every internal id and its `url(#…)` / `href="#…"` references with `prefix-`, per inlined instance. */
export function uniquifySvgIds(svg: string, prefix: string): string {
  if (!SAFE_PREFIX.test(prefix)) throw new Error(`uniquifySvgIds: unsafe prefix ${JSON.stringify(prefix)}`);
  const ids = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map(m => m[1])); if (!ids.size) return svg;
  const p = (id: string) => (ids.has(id) ? `${prefix}-${id}` : id);
  return svg
    .replace(/(\sid=")([^"]+)"/g, (_, a: string, id: string) => `${a}${p(id)}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id: string) => `url(#${p(id)})`)
    .replace(/((?:xlink:)?href=")#([^"]+)"/g, (_, a: string, id: string) => `${a}#${p(id)}"`);
}
