/** AC14d: detect a second tab. BroadcastChannel first, `storage` events as the fallback (no Web Locks).
 *  A new tab says hello; an existing tab answers "owner"; a tab that gets an answer goes read-only. */
export interface TabBus { post(m: TabMsg): void; on(f: (m: TabMsg) => void): void; close(): void }
export type TabMsg = { t: 'hello' | 'owner'; id: string };
export const TAB_KEY = 'eggfarm.tab';
export function bus(win: Window & typeof globalThis = window): TabBus {
  if (typeof win.BroadcastChannel === 'function') {
    const c = new win.BroadcastChannel('eggfarm-tabs'); const fs: ((m: TabMsg) => void)[] = [];
    c.onmessage = e => fs.forEach(f => f(e.data)); return { post: m => c.postMessage(m), on: f => fs.push(f), close: () => c.close() };
  }
  const fs: ((m: TabMsg) => void)[] = [];
  const h = (e: StorageEvent) => { if (e.key === TAB_KEY && e.newValue) try { const m = JSON.parse(e.newValue); fs.forEach(f => f(m)); } catch { /* ignore */ } };
  win.addEventListener('storage', h);
  return { post: m => { try { win.localStorage.setItem(TAB_KEY, JSON.stringify({ ...m, n: Math.random() })); } catch { /* storage unavailable */ } }, on: f => fs.push(f), close: () => win.removeEventListener('storage', h) };
}
/** Returns a controller; `onSecond` fires once if another tab already owns the game. */
export function guardTabs(b: TabBus, onSecond: () => void, id = Math.random().toString(36).slice(2)) {
  let second = false;
  b.on(m => {
    if (m.id === id) return;
    if (m.t === 'hello' && !second) b.post({ t: 'owner', id });
    if (m.t === 'owner' && !second) { second = true; onSecond(); }
  });
  b.post({ t: 'hello', id });
  return { get second() { return second; }, id };
}
