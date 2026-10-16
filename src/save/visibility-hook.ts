/**
 * ===== STUB: Saves visibility hook (C-AC36) =====
 * The real hook ships on fix/hidden-tab-offline (Saves; S2 hidden-tab defect, bug-offline-overcredit.md main.ts:58 +
 * game.ts:105-111; shared with telemetry-spec v0.6.1). Until it lands, this stub gives offline popup v2 the same
 * contract, so the swap is one import in main.ts:
 *   onHide(cb)          cb() when the tab is hidden (main.ts -> Game.suspendForHidden: save once, freeze like a closed game)
 *   onHiddenReturn(cb)  cb(hiddenMs) when it is shown again (main.ts -> Game.resumeFromHidden: >= offlineMinSeconds goes
 *                       through the offline grant + welcome popup, exactly like close-and-reload)
 * onHide also fires at once when subscribed while the page is already hidden (opened in a background tab).
 * Owner of the real hook: Saves (fix/hidden-tab-offline, S2, cap Sat 2026-10-17 08:00). Agree with Saves who owns the
 * Game side (suspendForHidden/resumeFromHidden vs their frame() change) so a hide is never granted or frozen twice.
 * Both return an unsubscribe. TO SWAP: import the Saves hook in main.ts instead of stubVisibilityHook, delete this file.
 */
export interface VisibilityHook {
  onHide(cb: () => void): () => void;
  onHiddenReturn(cb: (hiddenMs: number) => void): () => void;
}
interface DocLike { readonly visibilityState: string; addEventListener(t: 'visibilitychange', f: () => void): void }
export function stubVisibilityHook(doc: DocLike, now: () => number = () => Date.now()): VisibilityHook {
  let hiddenAt: number | null = doc.visibilityState === 'hidden' ? now() : null;
  const hide = new Set<() => void>(), ret = new Set<(ms: number) => void>();
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'hidden') { if (hiddenAt === null) { hiddenAt = now(); hide.forEach(f => f()); } return; }
    if (hiddenAt === null) return;
    const ms = now() - hiddenAt; hiddenAt = null; ret.forEach(f => f(ms));
  });
  return {
    onHide: cb => { hide.add(cb); if (hiddenAt !== null) cb(); return () => { hide.delete(cb); }; },
    onHiddenReturn: cb => { ret.add(cb); return () => { ret.delete(cb); }; },
  };
}
