/**
 * v5 F6-AC-SHEET registry (D-HOE-20261030-18), moved out of ui/overlay.ts by CCR F-2 so ui/onboarding.ts and ui/tracks-explainer.ts can
 * register without an overlay <-> onboarding import cycle. ui/overlay.ts re-exports it unchanged.
 */
/** Any sheet or menu (the rc2 Shift sheet, M5 sheets, …) registers here and reports its own lifecycle; it does NOT go into
 *  onboarding DIALOG_SEL. It counts as OPEN (player not attended) from opened() until closeComplete(), at EVERY width, docked
 *  (min-width:960px, landscape) included: the registry never looks at the layout. A sheet that is still closing counts as open
 *  (abilities rule 10 / R6, PMW ruling). Re-registering an id returns a handle to the same entry. */
export interface SheetHandle { readonly id: string; opened(): void; closeComplete(): void; readonly isOpen: boolean }
const SHEETS = new Map<string, boolean>();
export function registerSheet(id: string): SheetHandle {
  if (!SHEETS.has(id)) SHEETS.set(id, false);
  return { id, opened: () => { SHEETS.set(id, true); }, closeComplete: () => { SHEETS.set(id, false); }, get isOpen() { return SHEETS.get(id) === true; } };
}
/** true while any registered sheet/menu is between opened() and closeComplete(). */
export const anySheetOpen = (): boolean => { for (const v of SHEETS.values()) if (v) return true; return false; };
export const openSheets = (): string[] => [...SHEETS].filter(([, v]) => v).map(([k]) => k);
/** Tests only: forget every registration. */
export const clearSheets = () => { SHEETS.clear(); };
