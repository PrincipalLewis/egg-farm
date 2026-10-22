// @vitest-environment jsdom
// M41-7 Art M-1 (#63 @dfdf49c) + D-HOP-2026-10-22-06 AC: after an M1/M2 restore of a pre-M4 save, the tracks explainer
// (a) waits while the recovery dialog (.recovery-layer) is open, (b) shows after it closes (EXP_MS from that moment),
// (c) sets and saves seenTracksExplainer=true ONLY on the player's dismissal; the 8 s auto-hide never marks it seen.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as live } from '../src/config/balance';
import { Game } from '../src/game';
import { SAVE_KEY, type Recovery } from '../src/save/save';
import { showTracksExplainer, EXP_MS, EXP_RETRY_MS } from '../src/ui/tracks-explainer';
import { showRecoveryDialog, type CsrRecovery } from '../src/ui/save-recovery';
const PRE = readFileSync(`${process.cwd()}/tests/fixtures/saves/m4-pre-v7-F30-C30.json`, 'utf8').trim();
const ON = structuredClone(live); ON.m4!.enabled = 1;
const T = JSON.parse(PRE).savedAt + 30_000;
const mem = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as any; };
const cards = () => document.querySelectorAll('.tracks-exp').length;
const seenLs = (kv: any) => JSON.parse(kv.getItem(SAVE_KEY)).state.seenTracksExplainer;
const REC: Record<string, Partial<CsrRecovery>> = {
  M1: { case: 'R', source: 'bak', store: 'ls' },
  M2: { case: 'R', source: 'v6_backup', store: 'ls', prevLevel: 31, restoredLevel: 30 },
  legacyQ: { case: 'Q', source: undefined }, // legacy Q/storage dialog (recoveryCopy path, same .recovery-layer)
};
/** Boot a pre-M4 save, open the recovery dialog (app.ts order: dialog first), wire the explainer like app.ts, commit in-session. */
async function setup(kind: keyof typeof REC) {
  vi.useFakeTimers(); vi.setSystemTime(T);
  const kv = mem({ [SAVE_KEY]: PRE }); const g = new Game(ON, kv, () => T, 1, 'qa');
  const saves: (boolean | undefined)[] = []; const save = g.save.bind(g); (g as any).save = (o?: any) => { saves.push(g.state.seenTracksExplainer); save(o); };
  const r = { reason: 'parse', had_backup: true, restored_from_backup: kind !== 'legacyQ', copy_failed: kind === 'legacyQ', raw: '{corrupt', ...REC[kind] } as CsrRecovery;
  const closed = showRecoveryDialog(r as unknown as Recovery, f => f, [], undefined, async () => true, { now: T });
  const layer = document.querySelector<HTMLElement>('.recovery-layer'); expect(layer).not.toBeNull();
  let card: HTMLElement | null = null; g.onTracksCommitted = () => { card = showTracksExplainer(g); };
  expect(await g.startTracksMigration()).toBe('committed');
  return { kv, g, saves, layer: layer!, card: () => card, close: async () => { layer!.querySelector<HTMLButtonElement>('#rcGo')!.click(); await closed; } };
}
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

describe('Art M-1: the explainer waits for the recovery dialog', () => {
  for (const kind of ['M1', 'M2', 'legacyQ'] as const) it(`${kind}: (a) no card while open, seen stays false, no flag save; (b) shows after close; (c) seen only on Got it`, async () => {
    const s = await setup(kind);
    expect(s.layer.dataset.notice ?? s.layer.dataset.outcome).toBeTruthy();
    const nSaves = s.saves.length;
    await vi.advanceTimersByTimeAsync(20_000); // longer than EXP_MS: no card behind the scrim, no hidden auto-close
    expect(cards()).toBe(0); expect(s.g.state.seenTracksExplainer).toBeFalsy(); expect(s.saves.slice(nSaves)).not.toContain(true);
    await s.close(); expect(document.querySelector('.recovery-layer')).toBeNull();
    await vi.advanceTimersByTimeAsync(EXP_RETRY_MS); expect(cards()).toBe(1); // the pending retry shows it after close
    expect(s.g.state.seenTracksExplainer).toBeFalsy(); expect(seenLs(s.kv)).toBeFalsy(); // shown, not yet seen
    document.querySelector<HTMLButtonElement>('.tracks-exp-ok')!.click(); expect(cards()).toBe(0);
    expect(s.g.state.seenTracksExplainer).toBe(true); expect(seenLs(s.kv)).toBe(true);
  });
  it('M1: the 8 s timer starts when the card appears after close; the auto-hide never marks it seen; nothing re-shows it this session, next load shows it', async () => {
    const s = await setup('M1');
    await vi.advanceTimersByTimeAsync(5_000); await s.close();
    await vi.advanceTimersByTimeAsync(EXP_RETRY_MS); expect(cards()).toBe(1);
    await vi.advanceTimersByTimeAsync(EXP_MS - 1); expect(cards()).toBe(1); // full 8 s from appear
    await vi.advanceTimersByTimeAsync(1); expect(cards()).toBe(0);
    expect(s.g.state.seenTracksExplainer).toBeFalsy(); expect(s.saves).not.toContain(true);
    await vi.advanceTimersByTimeAsync(EXP_RETRY_MS * 30); expect(cards()).toBe(0); // no retry pending: not again this session
    s.g.save(); expect(seenLs(s.kv)).toBeFalsy();
    const g2 = new Game(ON, s.kv, () => T + 60_000, 1, 'qa'); expect(g2.tracksMigratedWithBackup).toBe(true);
    expect(showTracksExplainer(g2)).not.toBeNull(); // next load: shown again
  });
  it('no recovery dialog: shows at the commit as before (seen on dismissal)', async () => {
    vi.useFakeTimers(); vi.setSystemTime(T);
    const kv = mem({ [SAVE_KEY]: PRE }); const g = new Game(ON, kv, () => T, 1, 'qa'); g.onTracksCommitted = () => { showTracksExplainer(g); };
    await g.startTracksMigration(); expect(cards()).toBe(1); expect(seenLs(kv)).toBeFalsy();
    (document.querySelector('.tracks-exp p') as HTMLElement).click(); expect(cards()).toBe(0); expect(seenLs(kv)).toBe(true); // tap on the card = dismissal
  });
});
