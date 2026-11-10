// v5/vitest-teardown-fix (HoE/v5-vitest-teardown): per-file cleanup of listeners added to `document` / `window`.
// mountApp (src/ui/app.ts) adds document/window listeners for the page's lifetime and has no unmount. Hosted CI runs each
// test file in its own fork + jsdom, so they die with the file. A single-worker local run (--pool=forks
// --poolOptions.forks.singleFork=true) shares one jsdom across files, so they outlive their file: a stale app's Escape
// handler (app.ts:381 -> openPanel, app.ts:192) then threw `Cannot set properties of null (setting 'hidden')` 134 times in
// tests/m41-9-ux-minors.test.ts:125 (exit 1, 0 failed). This makes every file end the way a fresh jsdom would start.
import { afterAll } from 'vitest';

type Added = [EventTarget, string, EventListenerOrEventListenerObject, boolean | EventListenerOptions | undefined];

/** Records listeners added to `targets` from now on; the returned function removes them all and restores addEventListener. */
export function trackGlobalListeners(targets: EventTarget[]): () => number {
  const added: Added[] = [];
  const restore = targets.map(t => {
    const own = Object.prototype.hasOwnProperty.call(t, 'addEventListener'), orig = t.addEventListener;
    t.addEventListener = function (this: EventTarget, type: string, l: EventListenerOrEventListenerObject | null, o?: boolean | AddEventListenerOptions) {
      if (l) added.push([t, type, l, typeof o === 'object' ? { capture: !!o.capture } : o]);
      return orig.call(this, type, l, o);
    };
    return () => { if (own) t.addEventListener = orig; else delete (t as { addEventListener?: unknown }).addEventListener; };
  });
  return () => { const n = added.length; for (const [t, type, l, o] of added.splice(0)) t.removeEventListener(type, l, o); restore.forEach(r => r()); return n; };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') afterAll(trackGlobalListeners([document, window]));
