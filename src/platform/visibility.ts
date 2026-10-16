/**
 * S2 hidden-tab fix: the one Page Visibility hook. Reports when the page was hidden and, on return, the hidden span.
 * Small on purpose so telemetry v0.6.1 can reuse it (session_hidden start/end/duration). No telemetry here.
 */
export interface VisibilityDoc {
  readonly visibilityState: string;
  addEventListener(type: 'visibilitychange', fn: () => void): void;
  removeEventListener(type: 'visibilitychange', fn: () => void): void;
}
/** One hidden period: wall-clock start/end (ms) and its duration (end - start; negative if the clock went back). */
export interface HiddenSpan { startAt: number; endAt: number; durationMs: number }
export interface VisibilityHandlers { onHidden?(startAt: number): void; onShown?(span: HiddenSpan): void }
export interface VisibilityWatch { readonly hidden: boolean; readonly hiddenSince: number | null; stop(): void }

export function watchVisibility(doc: VisibilityDoc, now: () => number, h: VisibilityHandlers): VisibilityWatch {
  let since: number | null = null;
  const sync = () => {
    if (doc.visibilityState === 'hidden') { if (since === null) { since = now(); h.onHidden?.(since); } }
    else if (since !== null) { const startAt = since, endAt = now(); since = null; h.onShown?.({ startAt, endAt, durationMs: endAt - startAt }); }
  };
  doc.addEventListener('visibilitychange', sync);
  sync(); // already hidden at start (opened in a background tab)
  return { get hidden() { return since !== null; }, get hiddenSince() { return since; }, stop() { doc.removeEventListener('visibilitychange', sync); } };
}
