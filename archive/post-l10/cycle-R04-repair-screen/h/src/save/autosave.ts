/** Autosave: every intervalMs, on visibilitychange→hidden, pagehide, beforeunload. Returns stop(). */
export interface PageEvents { addEventListener(t: string, f: () => void): void; removeEventListener(t: string, f: () => void): void; }
export function startAutosave(doSave: () => void, intervalMs: number, win: PageEvents, doc: PageEvents & { visibilityState: string }) {
  const id = setInterval(doSave, intervalMs);
  const onVis = () => { if (doc.visibilityState === 'hidden') doSave(); };
  doc.addEventListener('visibilitychange', onVis);
  win.addEventListener('pagehide', doSave);
  win.addEventListener('beforeunload', doSave);
  return () => { clearInterval(id); doc.removeEventListener('visibilitychange', onVis); win.removeEventListener('pagehide', doSave); win.removeEventListener('beforeunload', doSave); };
}
