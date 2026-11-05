/**
 * v5 F6a probe, absorbed into ui/overlay.ts by F6 (attendedProbe, wireAttended with !dialogOpen()). Kept as a thin re-export
 * for the F6a tests and any caller of the visible+focused-only probe; app.ts wires overlay.wireAttended.
 */
import { attendedProbe, type AttendedDoc } from './overlay';
export { attendedProbe, type AttendedDoc };
/** F6a wiring (visible && focused only). app.ts no longer uses it (F6: overlay.wireAttended adds && !dialogOpen()). */
export const wireAttendedProbe = (g: { setAttendedProbe(fn: () => boolean): void }, doc: AttendedDoc = document) =>
  g.setAttendedProbe(() => attendedProbe(doc));
