/** Resolve a public/ asset path ("assets/x.svg", "fonts/OFL.txt") to a URL.
 *  Normal builds: BASE_URL + path. The single-file HTML build (`npm run build:html`) defines
 *  __INLINE_ASSETS__ as a path -> data: URL map so the page needs no network and works from file://. */
declare const __INLINE_ASSETS__: Record<string, string> | null | undefined;
const INLINE: Record<string, string> | null = typeof __INLINE_ASSETS__ === 'undefined' ? null : __INLINE_ASSETS__;
export const assetUrl = (rel: string): string => INLINE?.[rel] ?? `${import.meta.env.BASE_URL}${rel}`;
/** Same, for a full URL already prefixed with BASE_URL (e.g. the audio base + file name). */
export const resolveAssetUrl = (url: string): string => {
  const b = import.meta.env.BASE_URL; return INLINE && url.startsWith(b) ? (INLINE[url.slice(b.length)] ?? url) : url;
};
