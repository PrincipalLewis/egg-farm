/** Autosave: every intervalMs, on visibilitychange→hidden, pagehide, beforeunload. Returns stop(). */
export interface PageEvents { addEventListener(t: string, f: () => void): void; removeEventListener(t: string, f: () => void): void; }
/** SD5-1: `onHide` (default doSave) runs on hidden/pagehide/beforeunload so the caller can use the unload-safe write. */
export function startAutosave(doSave: () => void, intervalMs: number, win: PageEvents, doc: PageEvents & { visibilityState: string }, onHide: () => void = doSave) {
  const id = setInterval(doSave, intervalMs);
  const onVis = () => { if (doc.visibilityState === 'hidden') onHide(); };
  doc.addEventListener('visibilitychange', onVis);
  win.addEventListener('pagehide', onHide);
  win.addEventListener('beforeunload', onHide);
  return () => { clearInterval(id); doc.removeEventListener('visibilitychange', onVis); win.removeEventListener('pagehide', onHide); win.removeEventListener('beforeunload', onHide); };
}
