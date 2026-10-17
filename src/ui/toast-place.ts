/** Toast top (F1 + rc2 item 1): 8px below the lower of the queue strip (not docked) and a visible 'New helper!' banner; null = default slide from the top. Pure. */
export const toastTop = (queueBottom: number, bannerBottom: number, docked: boolean): number | null => {
  const edge = Math.max(docked ? 0 : queueBottom, bannerBottom);
  return edge > 0 ? Math.round(edge + 8) : null;
};
/** The toast element operations the controller needs (DOM in app.ts, fakes in tests). */
export interface ToastDom { shown(): boolean; opacity(): number; show(): void; hide(): void; transitions(on: boolean): void; reflow(): void; place(): void; }
export interface ToastClock { raf(f: () => void): number; setTimeout(f: () => void, ms: number): number; clearTimeout(id: number): void; }
export const TOAST_MS = 1300;
/** toast-v3 state machine: a small stateful controller with injected DOM + clock (no globals), unit-tested.
 *  (This module now holds toast placement AND show/dismiss timing.)
 *  - visible or still fading out (opacity > 0): re-show at once from the current value (no snap); place next frame only;
 *  - hidden: one pending settle per frame: next frame, transitions off -> place -> reflow -> on -> show;
 *  - the dismiss timer is armed only after .show is on, and re-armed for every new toast. */
/** gate (rc2 M-Toast-layer, review e9b9826 #1): checked at the DOM-write point, so a toast still pending its settle frame
 *  when a modal opens is held instead of drawn over it. */
export interface ToastGateHook { blocked(): boolean; hold(ms: number): void }
export function toastController(d: ToastDom, c: ToastClock, gate?: ToastGateHook) {
  let timer = 0, pending = false, dur = TOAST_MS;
  const arm = () => { timer = c.setTimeout(() => d.hide(), dur); };
  return (ms: number = TOAST_MS): void => {
    c.clearTimeout(timer); timer = 0; dur = ms;
    if (gate?.blocked()) { pending = false; gate.hold(ms); return; }
    if (d.shown() || d.opacity() > 0) { d.show(); c.raf(() => d.place()); arm(); return; }
    if (pending) return;
    pending = true;
    c.raf(() => { pending = false; if (gate?.blocked()) { gate.hold(dur); return; } d.transitions(false); d.place(); d.reflow(); d.transitions(true); d.show(); arm(); });
  };
}

/** rc2 M-Toast-layer (designer spec): while a modal is open (#modal-layer.open) toasts are held, never shown over it
 *  (no z-index swap); after it closes they show one at a time, each its own duration + gap apart, oldest first, duplicates collapsed. */
export const TOAST_GAP_MS = 250;
export function toastGate(blocked: () => boolean, show: (text: string, ms: number) => void, c: Pick<ToastClock, 'raf' | 'setTimeout'>) {
  const held: [string, number][] = []; let draining = false;
  const next = () => { if (blocked()) { draining = false; return; } const t = held.shift(); if (t === undefined) { draining = false; return; } show(t[0], t[1]); c.setTimeout(next, t[1] + TOAST_GAP_MS); }; // the drain (and so pass-through) ends only after the last held toast's own time (review e9b9826 #2)
  return {
    toast(text: string, ms = TOAST_MS) { if (blocked() || draining) { if (held[held.length - 1]?.[0] !== text) held.push([text, ms]); return; } show(text, ms); },
    /** pull a toast that is on screen when a modal opens, so it re-shows after the modal */
    hold(text: string, ms = TOAST_MS) { if (text && !held.some(h => h[0] === text)) held.unshift([text, ms]); },
    released() { if (!held.length || draining) return; draining = true; c.raf(next); },
    held: () => held.map(h => h[0]),
  };
}
