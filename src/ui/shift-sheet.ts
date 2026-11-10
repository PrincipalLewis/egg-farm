/**
 * MINIMAL TYPED STUB, TO BE REPLACED by Features (TASK HoE/v5-ui-shift-sheet). Hook agreed with Features 2026-11-10 01:39 CET:
 * openShiftSheet(id, opener, entry) opens the Shift sheet focused on that worker's row, returns focus to `opener` on close,
 * and is a no-op at m4.flags.rc2Refill = 0. `entry` = shift_sheet_opened.entry (the sim/Features side logs it; the UI caller logs nothing).
 * Until Features' module lands this is a no-op at every flag value.
 */
import type { WorkerId } from '../sim/workers';
export type ShiftSheetEntry = 'stall_chip' | 'fatigue_chip' | (string & {});
export function openShiftSheet(_id: WorkerId, _opener: HTMLElement, _entry: ShiftSheetEntry): void { /* no-op until Features merges */ }
