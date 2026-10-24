/** Build id injected at compile time via Vite define (QA PT1-1). Format: <BUILD_PREFIX>+<7+ hex>[+dirty]; the prefix is the
 *  single release-prefix constant in scripts/build-id.ts (M41-10), injected as __BUILD_PREFIX__. */
declare const __BUILD__: string;
declare const __BUILD_PREFIX__: string;
export const BUILD_PREFIX: string = typeof __BUILD_PREFIX__ !== 'undefined' ? __BUILD_PREFIX__ : 'dev';
export const BUILD_ID: string = typeof __BUILD__ !== 'undefined' ? __BUILD__ : `${BUILD_PREFIX}+dev`;
const esc = (t: string) => t.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
export const BUILD_ID_RE = new RegExp('^' + esc(BUILD_PREFIX) + '\\+[0-9a-f]{7,}(\\+dirty)?$');
