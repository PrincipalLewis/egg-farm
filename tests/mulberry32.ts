/** Shared mulberry32 with hashed seed init.
 *  Canonical copy of the helper formerly inlined at tests/k10-breeds-offset.ts L118
 *  and tests/bot-m5.ts L37: state0 = (seed * 2654435761 + 99) >>> 0.
 *  Do not replace with a direct state=seed seed; those streams are not interchangeable.
 */
export function mulberry32(seed: number): () => number {
  let a = (seed * 2654435761 + 99) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
