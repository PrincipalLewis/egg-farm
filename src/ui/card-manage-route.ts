/** HoP D-HOP-2026-11-10-20 (G0 §9), Hire2/v5-pause-ui: with m4.flags.rc2Refill = 1 the worker card has no direct Pause toggle, and its
 *  Manage opens the Features Shift sheet with entry 'card' (the sheet's Rest then emits rest_toggled{sheet_id, entry_point:'card'}).
 *  STUB / DEPENDENCY: the Shift sheet and its opener are Features' (engineering/tasks/v5-ui-shift-sheet/); they are not on rc/v5 d65391b0.
 *  Features registers its opener here (or replaces this module with its own API); until then routeCardManage() returns false and the card
 *  keeps the rc/v5 behaviour. With rc2Refill = 0 it is always false (flag-off unchanged). The UI emits nothing: the sheet's
 *  noteShiftSheetOpened (G0 §3) emits shift_sheet_opened. No new enum value: 'card' is in G0 RefillCtx.entryPoint. */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
import type { WorkerId } from '../sim/workers';
export type CardSheetEntry = 'card';
type Opener = (worker: WorkerId, entry: CardSheetEntry) => void;
let opener: Opener | null = null;
/** Features' Shift sheet calls this once at mount. Passing null unregisters (tests). */
export const setShiftSheetOpener = (fn: Opener | null) => { opener = fn; };
/** True when the tap was routed to the Shift sheet (the caller then does nothing else). */
export function routeCardManage(id: WorkerId, b: Balance): boolean {
  if (!flagOn(b, 'rc2Refill') || !opener) return false;
  opener(id, 'card'); return true;
}
