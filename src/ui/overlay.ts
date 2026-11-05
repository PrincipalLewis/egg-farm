/** Slim v5 attendance API. No layout, spots, feature registry, audio or FX engine. */
import type { Game } from '../game';
import { DIALOG_SEL } from './onboarding';
import { explainerOpen } from './tracks-explainer';

export type AttendedDoc = Pick<Document, 'visibilityState' | 'hasFocus'>;
export const attendedProbe = (doc: AttendedDoc = document): boolean =>
  doc.visibilityState === 'visible' && doc.hasFocus();

/** D-HOE-27 / Q-AB-N16: docked = app matchMedia('(min-width:960px) and (orientation:landscape)'). */
export const DOCKED_MQ = '(min-width:960px) and (orientation:landscape)';
export const isDocked = (win: Pick<Window, 'matchMedia'> = window): boolean =>
  !!win.matchMedia?.(DOCKED_MQ)?.matches;

export const SHEET_OPENED = 'egg:sheetopened';
export const SHEET_CLOSE_COMPLETE = 'egg:sheetclosecomplete';
export type SheetEventDetail = { id: string; docked: boolean };

const sheets = new Map<string, boolean>();

export interface SheetHandle {
  readonly id: string;
  opened(): void;
  closeComplete(): void;
  readonly isOpen: boolean;
}

function dispatchSheet(name: typeof SHEET_OPENED | typeof SHEET_CLOSE_COMPLETE, id: string, doc: Document = document): void {
  const detail: SheetEventDetail = { id, docked: isDocked() };
  doc.dispatchEvent(new CustomEvent(name, { detail }));
}

/** A closing sheet is still open. Call closeComplete only after its real lifecycle completes
 * (after the close animation). Layout-independent, including docked.
 * Registering the same id shares one lifecycle entry.
 * D-HOE-27: opened → egg:sheetopened once (false→true); closeComplete → egg:sheetclosecomplete
 * once (true→false); detail exactly {id,docked}; repeat closeComplete is a no-op. */
export function registerSheet(id: string, doc: Document = document): SheetHandle {
  if (!sheets.has(id)) sheets.set(id, false);
  return {
    id,
    opened: () => {
      if (sheets.get(id) === true) return;
      sheets.set(id, true);
      dispatchSheet(SHEET_OPENED, id, doc);
    },
    closeComplete: () => {
      if (sheets.get(id) !== true) return;
      sheets.set(id, false);
      dispatchSheet(SHEET_CLOSE_COMPLETE, id, doc);
    },
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
  doc?: Pick<Document, 'querySelector'>;
}
/** Existing dialogs/explainer and mobile Upgrades suspend attendance. Market remains a play surface.
 * The permanently docked Upgrades panel is not an open modal; registered sheets still suspend at every width. */
export const makeDialogOpen = (src: DialogSources) => (): boolean => {
  const doc = src.doc ?? document;
  return !!doc.querySelector(DIALOG_SEL) || explainerOpen(doc as Document) || src.sheet() === 'upgrades' || anySheetOpen();
};
/** One Game probe shared by frame focus and player-sale suspension; always reads current state. */
export const wireAttended = (g: Pick<Game, 'setAttendedProbe'>, dialogOpen: () => boolean, doc: AttendedDoc = document): void =>
  g.setAttendedProbe(() => attendedProbe(doc) && !dialogOpen());
