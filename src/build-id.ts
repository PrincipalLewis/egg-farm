/** Build id injected at compile time via Vite define (QA PT1-1). Format: m3-rc0+<7+ hex>[+dirty]. */
declare const __BUILD__: string;
export const BUILD_ID: string = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'm3-rc0+dev';
export const BUILD_ID_RE = /^m3-rc0\+[0-9a-f]{7,}(\+dirty)?$/;
