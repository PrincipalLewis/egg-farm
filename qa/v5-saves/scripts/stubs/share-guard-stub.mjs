// DRYRUN stub for ss15-share-guard.mjs (NOT game code). shareGood = spec §4.8 guard; shareNaive = no guard (negative control).
export function shareGood(fatigueLoss, incomePerSec) { const d = incomePerSec + fatigueLoss; if (!(d > 0)) return fatigueLoss > 0 ? 1 : 0; return fatigueLoss / d; }
export function shareNaive(fatigueLoss, incomePerSec) { return fatigueLoss / (incomePerSec + fatigueLoss); }
export function shareObj({ fatigueLoss, incomePerSec }) { return shareGood(fatigueLoss, incomePerSec); }
