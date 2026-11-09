// trace10 canonical encoder (design engineering/design/trace10-harness-of-record.md §6.1). No new quantization:
// numbers use ECMAScript Number::toString (what JSON.stringify emits, shortest round-trip, exact for every double).
// -0 -> "-0", NaN/±Infinity -> "NaN"/"Infinity"/"-Infinity" (strings; the producer flags them INVALID), absent -> null,
// object keys sorted by UTF-16 code unit. Pure and deterministic: no Date, Math.random, env, or unsorted iteration.
import { createHash } from 'node:crypto';

/** Non-finite numbers seen by `canonValue` are reported here so the producer can fail closed. */
export class NonFiniteError extends Error {}

/** Map a value to its canonical JSON-able form. `undefined` (absent) -> null. Objects -> sorted keys. Typed arrays -> plain arrays. */
export function canonValue(x: unknown, onNonFinite?: (v: number) => void): unknown {
  if (x === undefined || x === null) return null;
  if (typeof x === 'number') {
    if (Object.is(x, -0)) return '-0';
    if (Number.isNaN(x)) { onNonFinite?.(x); return 'NaN'; }
    if (x === Infinity) { onNonFinite?.(x); return 'Infinity'; }
    if (x === -Infinity) { onNonFinite?.(x); return '-Infinity'; }
    return x;
  }
  if (typeof x === 'string' || typeof x === 'boolean') return x;
  if (typeof x === 'bigint') return x.toString();
  if (Array.isArray(x)) return x.map(v => canonValue(v, onNonFinite));
  if (ArrayBuffer.isView(x)) return Array.from(x as unknown as ArrayLike<number>, v => canonValue(v, onNonFinite));
  if (x instanceof Map) return canonValue(Object.fromEntries([...x.entries()].map(([k, v]) => [String(k), v])), onNonFinite);
  if (typeof x === 'object') {
    const o = x as Record<string, unknown>, out: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort(cmpUtf16)) out[k] = canonValue(o[k], onNonFinite);
    return out;
  }
  throw new TypeError(`trace10 encode: unsupported type ${typeof x}`);
}
/** UTF-16 code unit order (what Array.prototype.sort does by default, written out so intent is explicit). */
export const cmpUtf16 = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
/** Canonical JSON text of a value (one line, no spaces). */
export const canon = (x: unknown, onNonFinite?: (v: number) => void): string => JSON.stringify(canonValue(x, onNonFinite));
export const sha256 = (s: string | Uint8Array): string => createHash('sha256').update(s).digest('hex');
