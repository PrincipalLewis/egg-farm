import { defineConfig } from 'vite';
import { gitBuildId } from './scripts/build-id';

/** Injected into session_start.build as m3-rc1-pre+<short>[+dirty] (QA PT1-1, rc0 item 6). */
const BUILD = gitBuildId();

/** Debug URL flags (?ios=) exist only outside release builds: `vite build` (mode production) compiles them out;
 *  `vite build --mode qa` / dev keep them (AC14g). */
/** F-META (equivalent of ccd7bf9, static so the release gate can read it): <meta name="build-id"> + #app[data-build-id]. */
const buildIdHtml = { name: 'build-id-html', transformIndexHtml: (h: string) => h
  .replace('<meta name="build-id" content="">', '')
  .replace(/<title>/, `<meta name="build-id" content="${BUILD}">\n  <title>`)
  .replace('<div id="app">', `<div id="app" data-build-id="${BUILD}">`) };

export default defineConfig(({ mode }) => ({
  plugins: [buildIdHtml],
  define: {
    __BUILD__: JSON.stringify(BUILD),
    __IOS_FLAG__: JSON.stringify(mode !== 'production'),
  },
}));
