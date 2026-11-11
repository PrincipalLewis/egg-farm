// DRYRUN stub (TS path, run via vite-node). Same as share-guard-stub.mjs shareGood.
export function rule2Share(fatigueLoss: number, incomePerSec: number): number { const d = incomePerSec + fatigueLoss; if (!(d > 0)) return fatigueLoss > 0 ? 1 : 0; return fatigueLoss / d; }
