import { defineConfig } from 'vite';
import { gitBuildId } from './scripts/build-id';

/** Injected into session_start.build as m3-rc0+<short>[+dirty] (QA PT1-1, rc0 item 6). */
const BUILD = gitBuildId();

/** Debug URL flags (?ios=) exist only outside release builds: `vite build` (mode production) compiles them out;
 *  `vite build --mode qa` / dev keep them (AC14g). */
export default defineConfig(({ mode }) => ({
  define: {
    __BUILD__: JSON.stringify(BUILD),
    __IOS_FLAG__: JSON.stringify(mode !== 'production'),
  },
}));
