import { describe, it, expect } from 'vitest';
import { noticeQueue } from '../src/ui/notice-queue';
const NO = "Your browser isn't letting us save right now (low space or private mode), so progress won't be saved.";
describe('AC14b ruling (a): no-storage notice deferred while the Saving is paused dialog is open', () => {
  it('dialog first, then storage refusal: deferred, shown once on close', () => {
    const shown: string[] = []; const q = noticeQueue(t => shown.push(t));
    q.dialogOpened(); q.notify(NO); expect(shown).toEqual([]); expect(q.held).toBe(NO);
    q.dialogClosed(); expect(shown).toEqual([NO]); q.dialogClosed(); expect(shown).toEqual([NO]);
  });
  it('storage refusal first, then dialog: notice taken down while the dialog is open, shown again once on close', () => {
    const shown: string[] = []; let hides = 0; const q = noticeQueue(t => shown.push(t), () => hides++);
    q.notify(NO); expect(shown).toEqual([NO]); expect(q.visible).toBe(NO);
    q.dialogOpened(); expect(hides).toBe(1); expect(q.visible).toBeNull(); expect(q.held).toBe(NO);
    q.notify(NO); expect(shown).toEqual([NO]);
    q.dialogClosed(); expect(shown).toEqual([NO, NO]); expect(q.visible).toBe(NO); q.dialogClosed(); expect(shown.length).toBe(2);
  });
  it('boot order (refusal detected, dialog marked open before the notice is raised): deferred until close', () => {
    const shown: string[] = []; const q = noticeQueue(t => shown.push(t));
    q.dialogOpened(); q.notify(NO); q.notify('other'); expect(shown).toEqual([]);
    q.dialogClosed(); expect(shown).toEqual([NO]);
  });
  it('no dialog: shown immediately', () => {
    const shown: string[] = []; const q = noticeQueue(t => shown.push(t)); q.notify(NO); expect(shown).toEqual([NO]);
  });
});
