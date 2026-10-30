/**
 * v5 CCR rcv5-vs-main-1a61b36 F-2 (D-HOE-20261030-08): the UI's attended probe for Game.setAttendedProbe (game.ts; API sheet L79,
 * Q-F1c-1 D-HOP-2026-10-29-06). Attended = the page is visible AND focused AND no dialog is open, where a dialog is a DIALOG_SEL
 * modal (settings/welcome/confirm, recovery, rotate prompt, alertdialog), the tracks explainer, or the Upgrades sheet (F6 design).
 * The Market sheet is a play surface, never a dialog, so player sales made in it keep Frenzy/streak.
 * Game only reads the probe while an M5 flag is on (CCR N-1 #79), so this is inert with every flag off.
 */
import { DIALOG_SEL } from './onboarding';
import { explainerOpen } from './tracks-explainer';

export type AttendedDoc = Pick<Document, 'visibilityState' | 'hasFocus' | 'querySelector'>;
export type SheetName = 'market' | 'upgrades' | null;
/** true iff document.visibilityState === 'visible' && document.hasFocus(). */
export const pageAttended = (doc: Pick<Document, 'visibilityState' | 'hasFocus'> = document): boolean => doc.visibilityState === 'visible' && doc.hasFocus();
/** A modal / recovery / rotate prompt / alertdialog, the tracks explainer, or the Upgrades sheet. The Market sheet never counts. */
export const dialogOpenNow = (sheet: SheetName, doc: Pick<Document, 'querySelector'> = document): boolean =>
  !!doc.querySelector(DIALOG_SEL) || explainerOpen(doc as Document) || sheet === 'upgrades';
/** The one wiring line: the probe reads the live document and sheet on every call (no cached state, no listeners). */
export const wireAttended = (g: { setAttendedProbe(fn: () => boolean): void }, sheet: () => SheetName, doc: AttendedDoc = document) =>
  g.setAttendedProbe(() => pageAttended(doc) && !dialogOpenNow(sheet(), doc));
