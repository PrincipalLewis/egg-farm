// @vitest-environment jsdom
// QA: fresh-save (never-migrated, fresh-reachable) Hens / Egg value rows on MAIN data, dumped byte-for-byte (outerHTML incl. aria)
// so the same file run on main dd223f5 and on PR #60 5789805 can be diffed. States: F0..30, H and V each 0..min(30, F+3), coins 0 and rich.
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { balance, type Balance } from '../src/config/balance';
import { Game } from '../src/game';
import { mem } from './helpers';
it('dump', async () => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  const b = balance as Balance, g = new Game(b, mem() as any, () => 1760000000000, 1, 'test');
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.openPanel('upgrades'); (document.querySelector('[data-tab=farm]') as HTMLElement).click();
  const lines: string[] = [];
  for (let F = 0; F <= b.maxLevel; F++) { const cap = Math.min(b.maxLevel, F + b.m4!.hens.capOverFarm);
    for (let H = 0; H <= cap; H++) for (const V of [0, Math.min(cap, H), cap]) for (const coins of [0, 1e15]) {
      g.state = { ...g.state, tracksV7: 1, farmLevel: F, hensLevel: H, eggValueLevel: V, coinsCents: coins } as any; ui.render();
      for (const t of ['hens', 'eggValue']) { const r = document.querySelector(`.up.track[data-track=${t}]`);
        lines.push(`F${F} H${H} V${V} c${coins ? 'rich' : 0} ${t}\t${(r?.outerHTML ?? 'NONE').replace(/\s+/g, ' ')}`); }
    } }
  writeFileSync(process.env.QA_OUT!, lines.join('\n') + '\n');
}, 600000);
