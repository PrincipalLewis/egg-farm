/**
 * v5 F6a: the UI's attended probe for Game.setAttendedProbe (game.ts; API sheet §5, Q-F1c-1 D-HOP-2026-10-29-06).
 * Attended = the page is visible AND has focus. The Market sheet is a play surface, not a dialog: opening it never makes
 * this false (it is not in onboarding DIALOG_SEL, and the UI never passes `suspended` for sheet sales).
 * Inert while every M5 flag is off (no SALE_EFFECTS entry and no timer consults it); required once they are on, since the
 * Game default is () => false (all player sales suspended, M5 timers frozen).
 * F6 absorbs this into ui/overlay.ts and adds its own `&& !dialogOpen()` (menus/modals/explainers/onboarding/coach).
 */
export type AttendedDoc = Pick<Document, 'visibilityState' | 'hasFocus'>;
/** true iff document.visibilityState === 'visible' && document.hasFocus(). */
export const attendedProbe = (doc: AttendedDoc = document): boolean => doc.visibilityState === 'visible' && doc.hasFocus();
/** One wiring line for the UI layer: the probe reads the live document on every call (no cached state, no listeners). */
export const wireAttendedProbe = (g: { setAttendedProbe(fn: () => boolean): void }, doc: AttendedDoc = document) =>
  g.setAttendedProbe(() => attendedProbe(doc));
