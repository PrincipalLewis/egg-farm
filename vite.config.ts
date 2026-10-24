/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import { gitBuildId, BUILD_PREFIX } from './scripts/build-id';
import balance from './src/config/balance.json';

/** Injected into session_start.build as <BUILD_PREFIX>+<short>[+dirty] (QA PT1-1, rc0 item 6; prefix = scripts/build-id.ts, M41-10). */
const BUILD = gitBuildId();

/** Debug URL flags (?ios=) exist only outside release builds: `vite build` (mode production) compiles them out;
 *  `vite build --mode qa` / dev keep them (AC14g). */
/** F-META (equivalent of ccd7bf9, static so the release gate can read it): <meta name="build-id"> + #app[data-build-id]. */
const buildIdHtml = { name: 'build-id-html', transformIndexHtml: (h: string) => h
  .replace('<meta name="build-id" content="">', '')
  .replace(/<title>/, `<meta name="build-id" content="${BUILD}">\n  <title>`)
  .replace('<div id="app">', `<div id="app" data-build-id="${BUILD}">`) };

/** M4A-S1 (QA m4a-v3-677317d-smoke; HoE 05:18 #2): the M4 build (balance.m4.enabled) drops the unused Fredoka 700 preload
 *  (Firefox 'preloaded but not used'); the @font-face stays, so 700 loads on demand. Flag-off index.html = main, byte for byte. */
const M4_ON = !!(balance as { m4?: { enabled?: number } }).m4?.enabled;
const m4Preload = { name: 'm4-font-preload', transformIndexHtml: (h: string) => M4_ON
  ? h.replace(/\n *<link rel="preload" href="\/fonts\/fredoka-latin-700-normal\.woff2"[^>]*>/, '') : h };

export default defineConfig(({ mode }) => ({
  plugins: [buildIdHtml, m4Preload],
  define: {
    __BUILD__: JSON.stringify(BUILD),
    __BUILD_PREFIX__: JSON.stringify(BUILD_PREFIX),
    __IOS_FLAG__: JSON.stringify(mode !== 'production'),
  },
  // *.slow.test.ts (e.g. the 100-seed seller-variance parity) is skipped by default `vitest run`; CI runs it via `npm run test:slow`.
  test: { exclude: [...configDefaults.exclude, '**/*.slow.test.ts'] },
}));
