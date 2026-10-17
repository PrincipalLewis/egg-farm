/** Toast top (F1 + rc2 item 1): 8px below the lower of the queue strip (not docked) and a visible 'New helper!' banner; null = default slide from the top. Pure. */
export const toastTop = (queueBottom: number, bannerBottom: number, docked: boolean): number | null => {
  const edge = Math.max(docked ? 0 : queueBottom, bannerBottom);
  return edge > 0 ? Math.round(edge + 8) : null;
};
/** The toast element operations the controller needs (DOM in app.ts, fakes in tests). */
export interface ToastDom { shown(): boolean; opacity(): number; show(): void; hide(): void; transitions(on: boolean): void; reflow(): void; place(): void; }
export interface ToastClock { raf(f: () => void): number; setTimeout(f: () => void, ms: number): number; clearTimeout(id: number): void; }
export const TOAST_MS = 1300;
/** toast-v3 state machine (pure, injected DOM + clock; unit-tested):
 *  - visible or still fading out (opacity > 0): re-show at once from the current value (no snap); place next frame only (review 148591a n3);
 *  - hidden: one pending settle (n4): next frame, transitions off -> place -> reflow -> on -> show;
 *  - the dismiss timer is armed only after .show is on (m1), and re-armed for every new toast. */
export function toastController(d: ToastDom, c: ToastClock) {
  let timer = 0, pending = false;
  const arm = () => { timer = c.setTimeout(() => d.hide(), TOAST_MS); };
  return (): void => {
    c.clearTimeout(timer); timer = 0;
    if (d.shown() || d.opacity() > 0) { d.show(); c.raf(() => d.place()); arm(); return; }
    if (pending) return;
    pending = true;
    c.raf(() => { pending = false; d.transitions(false); d.place(); d.reflow(); d.transitions(true); d.show(); arm(); });
  };
}
