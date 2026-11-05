/**
 * Shift sheet attended lifecycle (D-HOP-2026-11-05-06, Q-AB-N7/N8, RF-AC16).
 * Registers with slim overlay as not-attended from opened() through closeComplete()
 * at every width including docked. Owner calls closeAfterAnimation() so D-HOE-27
 * fires after the real close animation (or immediately when prefers-reduced-motion /
 * no transition). Full Shift DOM (charges, Boost rows) lands with rc2Refill/abilities;
 * this module owns the attendance + CustomEvent contract those surfaces reuse.
 */
import { registerSheet, type SheetHandle } from './overlay';

export const SHIFT_SHEET_ID = 'shift';

export interface ShiftSheetOpts {
  root?: ParentNode;
  /** ms to wait for close animation before closeComplete; 0 = immediate (tests / reduced motion). */
  closeMs?: number;
  doc?: Document;
  reducedMotion?: () => boolean;
}

export interface ShiftSheetController {
  readonly id: string;
  readonly handle: SheetHandle;
  readonly isOpen: boolean;
  open(): void;
  /** Request close; schedules closeComplete after animation (or immediately). */
  requestClose(): void;
  /** Harness/step: force closeComplete now (after animation would have ended). */
  closeCompleteNow(): void;
  destroy(): void;
}

const DEFAULT_CLOSE_MS = 180;

export function createShiftSheet(opts: ShiftSheetOpts = {}): ShiftSheetController {
  const doc = opts.doc ?? document;
  const handle = registerSheet(SHIFT_SHEET_ID, doc);
  let closeTimer = 0;
  const rm = opts.reducedMotion ?? (() =>
    !!doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  const closeMs = () => (rm() ? 0 : (opts.closeMs ?? DEFAULT_CLOSE_MS));

  const clearTimer = () => { if (closeTimer) { clearTimeout(closeTimer); closeTimer = 0; } };

  return {
    id: SHIFT_SHEET_ID,
    handle,
    get isOpen() { return handle.isOpen; },
    open() {
      clearTimer();
      handle.opened();
    },
    requestClose() {
      if (!handle.isOpen) return;
      clearTimer();
      const ms = closeMs();
      if (ms <= 0) { handle.closeComplete(); return; }
      closeTimer = doc.defaultView!.setTimeout(() => {
        closeTimer = 0;
        handle.closeComplete();
      }, ms) as unknown as number;
    },
    closeCompleteNow() {
      clearTimer();
      handle.closeComplete();
    },
    destroy() {
      clearTimer();
      if (handle.isOpen) handle.closeComplete();
    },
  };
}
