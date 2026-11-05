/** Slim v5 attendance API. No layout, spots, feature registry, audio or FX engine. */
import type { Game } from '../game';
import { DIALOG_SEL } from './onboarding';
import { explainerOpen } from './tracks-explainer';

export type AttendedDoc = Pick<Document, 'visibilityState' | 'hasFocus'>;
export const attendedProbe = (doc: AttendedDoc = document): boolean =>
  doc.visibilityState === 'visible' && doc.hasFocus();

export interface SheetHandle {
  readonly id: string;
  opened(): void;
  closeComplete(): void;
  readonly isOpen: boolean;
}
const sheets = new Map<string, boolean>();
/** A closing sheet is still open. Call closeComplete only after its real lifecycle completes.
 * Layout-independent, including docked. Registering the same id shares one lifecycle entry. */
export function registerSheet(id: string): SheetHandle {
  if (!sheets.has(id)) sheets.set(id, false);
  return {
    id,
    opened: () => { sheets.set(id, true); },
    closeComplete: () => { sheets.set(id, false); },
    get isOpen() { return sheets.get(id) === true; },
  };
}
export const anySheetOpen = (): boolean => {
  for (const open of sheets.values()) if (open) return true;
  return false;
};
export const openSheets = (): string[] => [...sheets].filter(([, open]) => open).map(([id]) => id);
/** Unit-test isolation only; not exposed on window or a QA hook. */
export const clearSheets = (): void => { sheets.clear(); };

export interface DialogSources {
  sheet(): 'market' | 'upgrades' | null;
  /** Current docked landscape layout. Permanently docked Upgrades is a play surface, not a dialog. */
  docked?: () => boolean;
  doc?: Pick<Document, 'querySelector'>;
}
/** Existing dialogs/explainer and mobile Upgrades suspend attendance. Market remains a play surface.
 * Permanently docked Upgrades is not an open modal; registered sheets still suspend at every width. */
export const makeDialogOpen = (src: DialogSources) => (): boolean => {
  const doc = src.doc ?? document;
  const upgradesDialog = src.sheet() === 'upgrades' && !(src.docked?.() ?? false);
  return !!doc.querySelector(DIALOG_SEL) || explainerOpen(doc as Document) || upgradesDialog || anySheetOpen();
};
/** One Game probe shared by frame focus and player-sale suspension; always reads current state. */
export const wireAttended = (g: Pick<Game, 'setAttendedProbe'>, dialogOpen: () => boolean, doc: AttendedDoc = document): void =>
  g.setAttendedProbe(() => attendedProbe(doc) && !dialogOpen());
