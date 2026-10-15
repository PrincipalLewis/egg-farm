import raw from './balance.json';
export type Balance = typeof raw;
function check(o: any, path: string) {
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('_')) continue;
    if (v && typeof v === 'object') check(v, `${path}.${k}`);
    else if (typeof v !== 'number' || !isFinite(v) || v < 0) throw new Error(`balance${path}.${k} invalid`);
  }
}
export function validateBalance(b: Balance): Balance { check(b, ''); return b; }
export const balance: Balance = validateBalance(raw);
