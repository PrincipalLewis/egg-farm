import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

/** Injected into session_start.build as m3-pt1+<short> (QA PT1-1). */
function buildId(): string {
  try {
    const short = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    if (/^[0-9a-f]{7,}$/.test(short)) return `m3-pt1+${short}`;
  } catch { /* fall through */ }
  return 'm3-pt1+unknown';
}

const BUILD = buildId();

/** Debug URL flags (?ios=) exist only outside release builds: `vite build` (mode production) compiles them out;
 *  `vite build --mode qa` / dev keep them (AC14g). */
export default defineConfig(({ mode }) => ({
  define: {
    __BUILD__: JSON.stringify(BUILD),
    __IOS_FLAG__: JSON.stringify(mode !== 'production'),
  },
}));
