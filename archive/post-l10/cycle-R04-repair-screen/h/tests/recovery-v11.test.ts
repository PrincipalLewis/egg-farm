// art-ux/m3-save-recovery-dialog.md v1.1: export result handling (item 2).
import { describe, it, expect } from 'vitest';
import { exportOldSave, FAIL_MSG, OK_MSG } from '../src/ui/save-recovery';
const ios = (share: () => Promise<void>, clip: () => Promise<void> = () => Promise.reject(new Error('no'))) => ({ userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5, canShare: () => true, share, clipboard: { writeText: clip } });
describe('recovery v1.1 export', () => {
  it('copy', () => { expect([OK_MSG, FAIL_MSG]).toEqual(['Saved a copy.', "Couldn't save a copy. Try again."]); });
  it('share sheet cancelled -> false (dialog shows FAIL_MSG, stays open)', async () => {
    expect(await exportOldSave('{}', 'x.json', ios(() => Promise.reject(Object.assign(new Error('c'), { name: 'AbortError' }))), {} as any)).toBe(false);
  });
  it('share ok -> true; share error falls back to clipboard; both failing -> false', async () => {
    expect(await exportOldSave('{}', 'x.json', ios(() => Promise.resolve()), {} as any)).toBe(true);
    expect(await exportOldSave('{}', 'x.json', ios(() => Promise.reject(new Error('x')), () => Promise.resolve()), {} as any)).toBe(true);
    expect(await exportOldSave('{}', 'x.json', ios(() => Promise.reject(new Error('x'))), {} as any)).toBe(false);
  });
});
