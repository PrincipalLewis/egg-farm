/** PL-1 (QA-D-1019-1): only a fresh Enter/Space press may activate a focused control; Escape only closes the panel/modal. */
export type KeyEv = { key: string; repeat: boolean; target: unknown; preventDefault(): void; stopPropagation(): void };
export function keyGuard(e: KeyEv, closeTop: () => void): void {
  const btn = (e.target as { closest?: (s: string) => unknown } | null)?.closest?.('button');
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeTop(); return; }
  if (btn && (e.key === 'Enter' || e.key === ' ') && e.repeat) e.preventDefault(); // held key: no auto-repeat buys
}
