// @vitest-environment jsdom
// Guard for tests/setup/global-listeners.ts (HoE/v5-vitest-teardown): a file's document/window listeners must not reach the next
// file when one jsdom is shared (local --poolOptions.forks.singleFork=true). Hosted CI isolates files, so it can't catch this.
import { describe, it, expect } from 'vitest';
import { trackGlobalListeners } from './setup/global-listeners';

describe('global listener cleanup (single-fork teardown guard)', () => {
  it('removes every tracked listener (capture and bubble, document and window) and restores addEventListener', () => {
    const doc = new EventTarget(), win = new EventTarget(), protoAdd = EventTarget.prototype.addEventListener;
    const dispose = trackGlobalListeners([doc, win]); let calls = 0; const f = () => calls++;
    doc.addEventListener('keydown', f); doc.addEventListener('keydown', () => calls++, true); doc.addEventListener('click', { handleEvent: f }, { capture: true, passive: true });
    win.addEventListener('resize', f);
    doc.dispatchEvent(new Event('keydown')); doc.dispatchEvent(new Event('click')); win.dispatchEvent(new Event('resize')); expect(calls).toBe(4);
    expect(dispose()).toBe(4);
    doc.dispatchEvent(new Event('keydown')); doc.dispatchEvent(new Event('click')); win.dispatchEvent(new Event('resize')); expect(calls).toBe(4);
    expect(Object.prototype.hasOwnProperty.call(doc, 'addEventListener')).toBe(false); expect(doc.addEventListener).toBe(protoAdd);
  });
  it('is installed by the vitest config for this jsdom file (document.addEventListener is wrapped)', () => {
    expect(Object.prototype.hasOwnProperty.call(document, 'addEventListener')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(window, 'addEventListener')).toBe(true);
  });
});
