/** M3 AC14g iOS "Add to Home Screen" tip (art-ux/m3-ios-homescreen-tip.md + Product scope update, Oct 15). */
export type IosKind = 'safari' | 'chrome' | 'standalone' | null; // 'chrome' = any non-Safari iOS browser (CriOS/FxiOS/EdgiOS/...)
export interface Env { ua: string; platform?: string; maxTouchPoints?: number; standalone?: boolean; displayStandalone?: boolean; }
/** Debug override `?ios=safari|chrome|standalone`; compiled out of release builds (__IOS_FLAG__ = false). */
declare const __IOS_FLAG__: boolean;
export const IOS_FLAG_ENABLED: boolean = typeof __IOS_FLAG__ !== 'undefined' ? __IOS_FLAG__ : true;
export function detectIos(e: Env): IosKind {
  const iPadDesktop = e.platform === 'MacIntel' && (e.maxTouchPoints ?? 0) > 1;
  const ios = /iP(hone|ad|od)/.test(e.ua) || iPadDesktop;
  if (!ios) return null;
  if (e.standalone === true || e.displayStandalone) return 'standalone';
  return /CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|YaBrowser|DuckDuckGo/.test(e.ua) ? 'chrome' : 'safari';
}
export function resolveIos(e: Env, search: string, flagEnabled = true): IosKind {
  if (IOS_FLAG_ENABLED && flagEnabled) {
    const f = new URLSearchParams(search).get('ios');
    if (f === 'safari' || f === 'chrome' || f === 'standalone') return f;
  }
  return detectIos(e);
}
export const TIP_TITLE = 'Add Egg Farm to your Home Screen so your farm is never cleared.';
export const howTo = (k: 'safari' | 'chrome', icon: string) =>
  k === 'safari' ? `Tap Share ${icon}, then Add to Home Screen.` : `Tap Share ${icon} in the address bar, then Add to Home Screen.`;
export const howToText = (k: 'safari' | 'chrome') => howTo(k, '').replace(/\s+/g, ' ').replace(' ,', ',');
/** Show at session >= 2, never during FTUE, once per install (until dismissed it may return in the same session). */
export const shouldShowIosTip = (k: IosKind, sessions: number, ftueActive: boolean, shownBefore: boolean) =>
  (k === 'safari' || k === 'chrome') && sessions >= 2 && !ftueActive && !shownBefore;
export const SHARE_SVG = `<svg class="share-ic" role="img" aria-label="Share" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2B79A8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2"/></svg>`;
