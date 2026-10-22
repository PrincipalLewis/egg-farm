// @vitest-environment jsdom
// M41-6: Game.save({ mirrorOnFail }), canPersist == save()'s guards (side-effect free), CCR #49 m1 (retry forwards
// storageBlocked, app.ts wiring) and n2 (the sim keeps stepping while the explainer card is open).
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as live, type Balance } from '../src/config/balance';
import { Game } from '../src/game';
import { SAVE_KEY, BAK_KEY } from '../src/save/save';
import { showTracksExplainer, EXP_RETRY_MS } from '../src/ui/tracks-explainer';

const ON: Balance = { ...live, m4: { ...live.m4!, enabled: 1 } };
const EXP1 = JSON.parse(readFileSync(`${process.cwd()}/tests/fixtures/saves/m4-exp1-committed-unseen.json`, 'utf8'));
const T0 = JSON.parse(EXP1.ls[SAVE_KEY]).savedAt + 5000;
type KvCtl = { failSave: boolean; blockReads: boolean; writes: string[] };
const kvOf = (init: Record<string, string> = EXP1.ls) => {
  const m = new Map(Object.entries(init)); const ctl: KvCtl = { failSave: false, blockReads: false, writes: [] };
  const kv = { m, ctl,
    getItem: (k: string) => { if (ctl.blockReads) throw new DOMException('blocked', 'SecurityError'); return m.get(k) ?? null; },
    setItem: (k: string, v: string) => { if (ctl.failSave && k.startsWith('eggfarm.save')) throw new DOMException('quota', 'QuotaExceededError'); m.set(k, v); if (k === SAVE_KEY) ctl.writes.push(v); },
    removeItem: (k: string) => void m.delete(k) } as any;
  return kv;
};
const mirrorOf = () => { const writes: string[] = []; return { writes, mirror: { write: (r: string) => { writes.push(r); }, clear: async () => {}, newer: null as number | null, onNewer: null } as any }; };
const newer = (v = 99) => JSON.stringify({ version: v, savedAt: T0, state: {} });
const cards = () => document.querySelectorAll('.tracks-exp').length;
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('M41-6 Game.save({ mirrorOnFail })', () => {
  it('default (true): when localStorage throws, the IndexedDB mirror still gets the save (SD fallback unchanged)', () => {
    const kv = kvOf(); const { writes, mirror } = mirrorOf(); const g = new Game(ON, kv, () => T0, 1, 'test', mirror, null);
    const n0 = writes.length; kv.ctl.failSave = true; g.save();
    expect(g.storageFailed).toBe(true); expect(writes.length).toBe(n0 + 1);
    expect(JSON.parse(writes.at(-1)!).saveSeq).toBeGreaterThan(JSON.parse(kv.m.get(SAVE_KEY)).saveSeq ?? 0); // same ranking as before
  });
  it('false: when localStorage throws, no mirror write; storageFailed + telemetry as usual', () => {
    const kv = kvOf(); const { writes, mirror } = mirrorOf(); const g = new Game(ON, kv, () => T0, 1, 'test', mirror, null);
    let warned = 0; g.onStorageFail = () => { warned++; };
    const n0 = writes.length; kv.ctl.failSave = true; g.save({ mirrorOnFail: false });
    expect(writes.length).toBe(n0); expect(g.storageFailed).toBe(true); expect(warned).toBe(1);
  });
  it('false: on a successful localStorage write the mirror is still written (only the fallback is skipped)', () => {
    const kv = kvOf(); const { writes, mirror } = mirrorOf(); const g = new Game(ON, kv, () => T0, 1, 'test', mirror, null);
    const n0 = writes.length; g.save({ mirrorOnFail: false });
    expect(writes.length).toBe(n0 + 1); expect(writes.at(-1)).toBe(kv.m.get(SAVE_KEY));
  });
  it('explainer: a failed flag save sends nothing with seen=true to the mirror, even if the mirror then fails too (QE-LATE-e)', () => {
    const kv = kvOf(); const { writes, mirror } = mirrorOf(); const g = new Game(ON, kv, () => T0, 1, 'test', mirror, null);
    const n0 = writes.length; kv.ctl.failSave = true;
    let failMirror = false; const w = mirror.write; mirror.write = (r: string) => { if (failMirror) throw new DOMException('quota', 'QuotaExceededError'); w(r); };
    const save = g.save.bind(g); let calls = 0; (g as any).save = (o?: any) => { calls++; if (calls === 2) failMirror = true; save(o); };
    const c = showTracksExplainer(g, document, () => g.storageFailed); expect(c).not.toBeNull(); expect(calls).toBe(0);
    c!.querySelector('button')!.click(); // D-HOP-2026-10-22-06: the flag save runs on dismissal
    expect(writes.slice(n0).some(r => r.includes('"seenTracksExplainer":true'))).toBe(false);
    expect(g.state.seenTracksExplainer).toBe(false); expect(cards()).toBe(0);
  });
});

describe('M41-6 canPersist matches save()', () => {
  // canPersist must be true exactly when save() reaches the write (localStorage setItem or the fallback).
  const writesOnSave = (g: Game, kv: any) => { const n = kv.ctl.writes.length; g.save(); return kv.ctl.writes.length > n; };
  const mk = () => { const kv = kvOf(); const { mirror } = mirrorOf(); const g = new Game(ON, kv, () => T0, 1, 'test', mirror, null); return { kv, g, mirror }; };
  it('baseline: true, and save() writes', () => { const { g, kv } = mk(); expect(g.canPersist).toBe(true); expect(writesOnSave(g, kv)).toBe(true); });
  it('newer save in localStorage main or .bak: false, and reading it has no side effect (no refuseNewer)', () => {
    for (const key of [SAVE_KEY, BAK_KEY]) {
      const { g, kv } = mk(); kv.m.set(key, newer());
      expect(g.canPersist).toBe(false); expect(g.newerSave).toBeNull(); expect(g.readOnly).toBe(false); // getter is pure
      expect(writesOnSave(g, kv)).toBe(false); expect(g.newerSave).toBe(99); // save() is what refuses
    }
  });
  it('newer copy reported by the IndexedDB mirror: false', () => {
    const { g, kv, mirror } = mk(); mirror.newer = 8;
    expect(g.canPersist).toBe(false); expect(g.newerSave).toBeNull(); expect(writesOnSave(g, kv)).toBe(false);
  });
  it('hidden tab: false (save() would persist the hide snapshot, not a change made now); visible again: true', () => {
    const { g } = mk(); g.onHidden(T0); expect(g.canPersist).toBe(false); g.onShown(T0 + 1000); expect(g.canPersist).toBe(true);
  });
  it('lease lost (canWrite false): false, with no deactivate side effect', () => {
    const { g } = mk(); g.canWrite = () => false; expect(g.canPersist).toBe(false); expect(g.inactive).toBe(false);
  });
  it('localStorage reads blocked: true (as in newerGuard, a throw is "no newer"; save() attempts the write)', () => {
    const { g, kv } = mk(); kv.ctl.blockReads = true; expect(g.canPersist).toBe(true);
  });
  it('readOnly / inactive / held / resetting: false (unchanged)', () => {
    const { g } = mk();
    g.readOnly = true; expect(g.canPersist).toBe(false); g.readOnly = false;
    g.inactive = true; expect(g.canPersist).toBe(false); g.inactive = false;
    g.holdUntil = T0 + 1e9; expect(g.canPersist).toBe(false); g.holdUntil = 0;
    (g as any).resetting = true; expect(g.canPersist).toBe(false);
  });
  it('explainer on a hidden Game: no card and no flag until shown (canPersist gate, not only document.visibilityState)', () => {
    vi.useFakeTimers(); const { g } = mk(); g.onHidden(T0);
    expect(showTracksExplainer(g, document)).toBeNull(); expect(g.state.seenTracksExplainer).toBeFalsy(); expect(cards()).toBe(0);
    g.onShown(T0 + 1000); vi.advanceTimersByTime(EXP_RETRY_MS);
    expect(cards()).toBe(1); document.querySelector<HTMLButtonElement>('.tracks-exp-ok')!.click(); // D-HOP-2026-10-22-06: saved on dismissal
    expect(JSON.parse((g as any).kv.getItem(SAVE_KEY)).state.seenTracksExplainer).toBe(true);
  });
});

describe('CCR #49 m1: storageBlocked survives the retry path', () => {
  it('direct call: canPersist false, then storage blocks before the retry: no card, flag never set', () => {
    vi.useFakeTimers(); let blocked = false; const saved: any[] = [];
    const g: any = { state: { ...new Game(ON, kvOf(), () => T0, 1, 'test').state, seenTracksExplainer: false }, balance: ON, canPersist: false, save() { saved.push(g.state.seenTracksExplainer); } };
    expect(showTracksExplainer(g, document, () => blocked)).toBeNull();
    blocked = true; g.canPersist = true; vi.advanceTimersByTime(EXP_RETRY_MS * 3);
    expect(cards()).toBe(0); expect(saved).toEqual([]); expect(g.state.seenTracksExplainer).toBe(false);
    blocked = false; vi.advanceTimersByTime(EXP_RETRY_MS * 3); expect(cards()).toBe(0); // blocked return does not reschedule (next load shows)
  });
  it('app.ts wiring: mountApp passes opts.storageBlocked on the load path and through the retry', async () => {
    const { mountApp } = await import('../src/ui/app');
    const run = async (blockedAtMount: boolean, blockLater: boolean, holdAtMount: boolean) => {
      vi.useFakeTimers(); vi.setSystemTime(T0); document.body.innerHTML = '<div id="app"></div>';
      const g = new Game(ON, kvOf(), () => Date.now(), 1, 'test'); expect(g.tracksMigratedWithBackup).toBe(true);
      if (holdAtMount) g.holdUntil = Date.now() + 500;
      let blocked = blockedAtMount;
      mountApp(document.getElementById('app')!, g, ON, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false, storageBlocked: () => blocked });
      const atMount = cards(); if (blockLater) blocked = true; await vi.advanceTimersByTimeAsync(EXP_RETRY_MS * 2);
      const after = cards(); document.querySelectorAll<HTMLButtonElement>('.tracks-exp-ok').forEach(b => b.click()); // D-HOP-2026-10-22-06: seen on dismissal
      const r = { atMount, after, seen: !!g.state.seenTracksExplainer }; vi.useRealTimers(); return r;
    };
    expect(await run(false, false, false)).toEqual({ atMount: 1, after: 1, seen: true });
    expect(await run(true, false, false)).toEqual({ atMount: 0, after: 0, seen: false });
    expect(await run(false, true, true)).toEqual({ atMount: 0, after: 0, seen: false }); // held at mount -> retry sees blocked
  });
});

describe('CCR #49 n1: storageFailed is sticky for the session (intended)', () => {
  it('an earlier save failure withholds the card although storage has recovered: no flag write, seen unset; next load shows once', () => {
    vi.useFakeTimers(); const kv = kvOf(); const { writes, mirror } = mirrorOf(); const g = new Game(ON, kv, () => T0, 1, 'test', mirror, null);
    kv.ctl.failSave = true; g.save(); expect(g.storageFailed).toBe(true); kv.ctl.failSave = false; // storage recovered, flag stays set
    const n = writes.length, nLs = kv.ctl.writes.length;
    expect(showTracksExplainer(g, document, () => g.storageFailed)).toBeNull(); expect(cards()).toBe(0);
    expect(g.state.seenTracksExplainer).toBeFalsy(); expect(JSON.parse(kv.m.get(SAVE_KEY)).state.seenTracksExplainer).toBeFalsy();
    expect([writes.length, kv.ctl.writes.length]).toEqual([n, nLs]); // the early storageBlocked gate returns before any flag write
    expect(JSON.parse(writes.at(-1)!).state.seenTracksExplainer).toBeFalsy();
    vi.advanceTimersByTime(EXP_RETRY_MS * 5); expect(cards()).toBe(0); // no in-session retry
    const g2 = new Game(ON, kv, () => T0 + 5000, 1, 'test'); expect(g2.storageFailed).toBe(false); // a new load starts clean
    expect(showTracksExplainer(g2, document, () => g2.storageFailed)).not.toBeNull(); expect(cards()).toBe(1);
  });
});

describe('CCR #49 n2 (#46 m2): the sim keeps stepping while the card is open', () => {
  it('state after N frames with the card open equals the same Game without the card (except seenTracksExplainer)', () => {
    vi.useFakeTimers(); let t = T0; const clock = () => t;
    const a = new Game(ON, kvOf(), clock, 1, 'test'), b = new Game(ON, kvOf(), clock, 1, 'test');
    expect(showTracksExplainer(a, document)).not.toBeNull(); expect(cards()).toBe(1);
    const s0 = JSON.stringify({ ...a.state, seenTracksExplainer: undefined });
    for (let i = 0; i < 50; i++) { t += 100; a.frame(); b.frame(); }
    expect(cards()).toBe(1);
    const strip = (s: any) => JSON.stringify({ ...s, seenTracksExplainer: undefined });
    expect(strip(a.state)).toBe(strip(b.state)); expect(strip(a.state)).not.toBe(s0); // it advanced, identically
  });
});
