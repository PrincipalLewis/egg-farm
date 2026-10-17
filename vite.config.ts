/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import { gitBuildId } from './scripts/build-id';

/** Injected into session_start.build as m3-rc1-pre+<short>[+dirty] (QA PT1-1, rc0 item 6). */
const BUILD = gitBuildId();

/** Debug URL flags (?ios=) exist only outside release builds: `vite build` (mode production) compiles them out;
 *  `vite build --mode qa` / dev keep them (AC14g). */
export default defineConfig(({ mode }) => ({
  define: {
    __BUILD__: JSON.stringify(BUILD),
    __IOS_FLAG__: JSON.stringify(mode !== 'production'),
  },
  // *.slow.test.ts (e.g. the 100-seed seller-variance parity) is skipped by default `vitest run`; CI runs it via `npm run test:slow`.
  test: { exclude: [...configDefaults.exclude, '**/*.slow.test.ts'] },
}));
