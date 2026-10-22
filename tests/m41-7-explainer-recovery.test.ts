// @vitest-environment jsdom
// M41-7 Art M-1 (#63) as narrowed by D-HOP-2026-10-22-07 (a), spec of record sha256 073fafd3…6742b.
// M1/M2 restore boot (Game.recoveryOutcome 'restored') with a pre-M4 save: the explainer waits while the recovery dialog
// (.recovery-layer) is open, shows after it closes (EXP_MS from that moment), and seenTracksExplainer=true is set and saved
// ONLY on the player's dismissal; the 8 s auto-hide never marks it seen. Every other boot (no recovery, legacy Q/storage,
// tab guard, newer save) keeps m4a §17 / EXP-B1 as built: seen set and saved at show, the auto-hide counts; the card may
// still wait under a recovery layer.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as live } from '../src/config/balance';
import { Game } from '../src/game';
import { SAVE_KEY, BAK_KEY, type Recovery } from '../src/save/save';
import { showTracksExplainer, EXP_MS, EXP_RETRY_MS } from '../src/ui/tracks-explainer';
import { showRecoveryDialog, recoveryNotice, type CsrRecovery } from '../src/ui/save-recovery';
const PRE = readFileSync(`${process.cwd()}/tests/fixtures/saves/m4-pre-v7-F30-C30.json`, 'utf8').trim();
const ON = structuredClone(live); ON.m4!.enabled = 1;
const T = JSON.parse(PRE).savedAt + 30_000;
const mem = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as any; };
const cards = () => document.querySelectorAll('.tracks-exp').length;
const seenLs = (kv: any) => JSON.parse(kv.getItem(SAVE_KEY)).state.seenTracksExplainer;
type Kind = 'M1' | 'M2' | 'legacyQ' | 'tabGuard';
/** Boot, open the dialog first (app.ts order), wire the explainer like app.ts, commit the tracks migration in-session. */
async function setup(kind: Kind) {
  vi.useFakeTimers(); vi.setSystemTime(T);
  // M1 is a real restore boot: corrupt LS main + the pre-M4 save as .bak -> loadSafe case R, source 'bak' (M1).
  const kv = mem(kind === 'M1' ? { [SAVE_KEY]: '{corrupt', [BAK_KEY]: PRE } : { [SAVE_KEY]: PRE });
  const g = new Game(ON, kv, () => T, 1, 'qa'); let r: CsrRecovery;
  if (kind === 'M1') { expect(g.recoveryOutcome).toBe('restored'); r = g.recovery as CsrRecovery; }
  else if (kind === 'M2') { r = { case: 'R', reason: 'parse', had_backup: false, restored_from_backup: true, copy_failed: false, raw: '{corrupt', source: 'v6_backup', store: 'ls', prevLevel: 31, restoredLevel: 30 } as CsrRecovery; g.recovery = r as Recovery; g.recoveryOutcome = 'restored'; } // loader outcome of a v6_backup restore
  else if (kind === 'legacyQ') { r = { case: 'Q', reason: 'parse', had_backup: false, restored_from_backup: false, copy_failed: true, raw: '{corrupt' } as CsrRecovery; g.recovery = r as Recovery; g.recoveryOutcome = 'storage'; }
  else r = null as any;
  if (r) expect(recoveryNotice(r, { storageBlocked: false, now: T })?.id).toBe(kind === 'legacyQ' ? 'storage' : kind);
  let closed: Promise<void> = Promise.resolve(); let layer: HTMLElement;
  if (kind === 'tabGuard') { layer = document.createElement('div'); layer.className = 'recovery-layer tab-guard'; document.body.append(layer); } // not a restore boot
  else { closed = showRecoveryDialog(r as unknown as Recovery, f => f, [], undefined, async () => true, { now: T }); layer = document.querySelector<HTMLElement>('.recovery-layer')!; }
  const saves: (boolean | undefined)[] = []; const save = g.save.bind(g); (g as any).save = (o?: any) => { saves.push(g.state.seenTracksExplainer); save(o); };
  g.onTracksCommitted = () => { showTracksExplainer(g); };
  expect(await g.startTracksMigration()).toBe('committed');
  return { kv, g, saves, close: async () => { if (kind === 'tabGuard') layer.remove(); else layer.querySelector<HTMLButtonElement>('#rcGo')!.click(); await closed; } };
}
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

describe('restore boot (M1/M2): waits for the dialog, seen only on dismissal', () => {
  for (const kind of ['M1', 'M2'] as const) it(`${kind}: no card while open (no flag save); shows after close; seen only on Got it`, async () => {
    const s = await setup(kind); const n0 = s.saves.length;
    await vi.advanceTimersByTimeAsync(20_000); // longer than EXP_MS: no card behind the scrim, no hidden auto-close
    expect(cards()).toBe(0); expect(s.g.state.seenTracksExplainer).toBeFalsy(); expect(s.saves.slice(n0)).not.toContain(true);
    await s.close(); await vi.advanceTimersByTimeAsync(EXP_RETRY_MS); expect(cards()).toBe(1);
    expect(s.g.state.seenTracksExplainer).toBeFalsy(); expect(seenLs(s.kv)).toBeFalsy(); // shown, not yet seen
    document.querySelector<HTMLButtonElement>('.tracks-exp-ok')!.click(); expect(cards()).toBe(0);
    expect(s.g.state.seenTracksExplainer).toBe(true); expect(seenLs(s.kv)).toBe(true);
  });
  it('M1: the 8 s timer starts when the card appears; the auto-hide never marks it seen; the next load shows it', async () => {
    const s = await setup('M1'); await vi.advanceTimersByTimeAsync(5_000); await s.close();
    await vi.advanceTimersByTimeAsync(EXP_RETRY_MS); expect(cards()).toBe(1);
    await vi.advanceTimersByTimeAsync(EXP_MS - 1); expect(cards()).toBe(1); // full 8 s from appear
    await vi.advanceTimersByTimeAsync(1); expect(cards()).toBe(0);
    expect(s.g.state.seenTracksExplainer).toBeFalsy(); expect(s.saves).not.toContain(true);
    await vi.advanceTimersByTimeAsync(EXP_RETRY_MS * 30); expect(cards()).toBe(0); // nothing re-shows it this session
    s.g.save(); expect(seenLs(s.kv)).toBeFalsy();
    const g2 = new Game(ON, s.kv, () => T + 60_000, 1, 'qa'); expect(g2.tracksMigratedWithBackup).toBe(true);
    expect(showTracksExplainer(g2)).not.toBeNull(); expect(g2.state.seenTracksExplainer).toBe(true); // next (normal) load: shown, seen at show
  });
  it('M1: a second call while the card is up never adds a second card', async () => {
    const s = await setup('M1'); await s.close(); await vi.advanceTimersByTimeAsync(EXP_RETRY_MS); expect(cards()).toBe(1);
    expect(showTracksExplainer(s.g)).toBeNull(); expect(cards()).toBe(1);
  });
});

describe('every other boot: m4a §17 / EXP-B1 as built (seen at show, the auto-hide counts)', () => {
  for (const kind of ['legacyQ', 'tabGuard'] as const) it(`${kind}: waits under the recovery layer, then seen is set and saved at show`, async () => {
    const s = await setup(kind); await vi.advanceTimersByTimeAsync(20_000); expect(cards()).toBe(0); expect(s.g.state.seenTracksExplainer).toBeFalsy();
    await s.close(); await vi.advanceTimersByTimeAsync(EXP_RETRY_MS); expect(cards()).toBe(1);
    expect(s.g.state.seenTracksExplainer).toBe(true); expect(seenLs(s.kv)).toBe(true); // at show
  });
  it('no recovery: shows at the commit, seen saved at show; the 8 s auto-hide counts (reload: not shown)', async () => {
    vi.useFakeTimers(); vi.setSystemTime(T);
    const kv = mem({ [SAVE_KEY]: PRE }); const g = new Game(ON, kv, () => T, 1, 'qa'); expect(g.recoveryOutcome).toBeNull();
    g.onTracksCommitted = () => { showTracksExplainer(g); };
    await g.startTracksMigration(); expect(cards()).toBe(1); expect(seenLs(kv)).toBe(true);
    await vi.advanceTimersByTimeAsync(EXP_MS); expect(cards()).toBe(0); expect(seenLs(kv)).toBe(true);
    const g2 = new Game(ON, kv, () => T + 60_000, 1, 'qa'); expect(showTracksExplainer(g2)).toBeNull();
  });
});
