/** Autosave: every intervalMs, on visibilitychange→hidden, pagehide, beforeunload. Returns stop(). */
export interface PageEvents { addEventListener(t: string, f: () => void): void; removeEventListener(t: string, f: () => void): void; }
/** SD5-1: `onClose` (default doSave) runs on pagehide/beforeunload so the caller can use the unload-safe write; hidden keeps
 *  doSave (the page survives a tab switch: normal strict checked write). */
export function startAutosave(doSave: () => void, intervalMs: number, win: PageEvents, doc: PageEvents & { visibilityState: string }, onClose: () => void = doSave) {
  const id = setInterval(doSave, intervalMs);
  const onVis = () => { if (doc.visibilityState === 'hidden') doSave(); };
  doc.addEventListener('visibilitychange', onVis);
  win.addEventListener('pagehide', onClose);
  win.addEventListener('beforeunload', onClose);
  return () => { clearInterval(id); doc.removeEventListener('visibilitychange', onVis); win.removeEventListener('pagehide', onClose); win.removeEventListener('beforeunload', onClose); };
}
