/** Audio + juice v1 (audio-hooks.md v1.1, juice-spec v1, number-pop-spec v1.0). Default OFF.
 *  Opt in for QA/listening checks with `?juice=1` or localStorage `eggfarm.flag.audioJuiceV1` = '1'. */
export const AUDIO_JUICE_V1_DEFAULT = false;
export function audioJuiceV1(search = typeof location !== 'undefined' ? location.search : '', store: Pick<Storage, 'getItem'> | null = typeof localStorage !== 'undefined' ? localStorage : null): boolean {
  const q = new URLSearchParams(search).get('juice'); if (q === '1') return true; if (q === '0') return false;
  try { if (store?.getItem('eggfarm.flag.audioJuiceV1') === '1') return true; } catch { /* storage blocked */ }
  return AUDIO_JUICE_V1_DEFAULT;
}
