/** Save notices (AC14c/AC14d) vs the recovery dialog (v2.2 fix 2 + HoE AC14b ruling (a), 2026-10-17):
 *  while a recovery dialog is open no bottom notice is visible, including the no-storage notice (SD6-1). A notice raised
 *  while the dialog is open is deferred; a notice already on screen when the dialog opens is taken down and deferred.
 *  Either way it is shown when the dialog closes. One notice at a time (the first wins); never shown twice at once. */
export interface NoticeQueue { notify(text: string): void; dialogOpened(): void; dialogClosed(): void; readonly held: string | null; readonly visible: string | null }
export function noticeQueue(show: (text: string) => void, hide: () => void = () => {}): NoticeQueue {
  let open = false, held: string | null = null, visible: string | null = null;
  const put = (t: string) => { if (visible !== null) return; visible = t; show(t); };
  return {
    notify(text) { if (open) { held ??= text; return; } put(text); },
    dialogOpened() { open = true; if (visible !== null) { held ??= visible; visible = null; hide(); } },
    dialogClosed() { if (!open) return; open = false; if (held !== null) { const t = held; held = null; put(t); } },
    get held() { return held; }, get visible() { return visible; },
  };
}
