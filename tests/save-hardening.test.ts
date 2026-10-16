// rc0 AC14b save hardening (engineering/m3-rc0-save-hardening.md) incl. QA edge cases 1-3 and the corrupt fixtures.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { loadSafe, validate, save, serialize, SAVE_KEY, BAK_KEY, CORRUPT_INDEX_KEY, CORRUPT_PREFIX } from '../src/save/save';
import { initialState } from '../src/sim/state';
import { Game } from '../src/game';
import { recoveryCopy, exportName } from '../src/ui/save-recovery';
const dir = new URL('./fixtures/saves/', import.meta.url);
const fx = (f: string) => readFileSync(new URL(f, dir), 'utf8');
const kvm = (quotaFor?: (k: string) => boolean) => {
  const m = new Map<string, string>();
  return { m, getItem: (k: string) => m.get(k) ?? null, removeItem: (k: string) => void m.delete(k),
    setItem: (k: string, v: string) => { if (quotaFor?.(k)) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } m.set(k, v); } };
};
const corrupt = (k: { m: Map<string, string> }) => [...k.m.keys()].filter(x => x.startsWith(CORRUPT_PREFIX) && x !== CORRUPT_INDEX_KEY);
const good = () => serialize({ ...initialState(b), coinsCents: 777, farmLevel: 3 }, 1000);
const reasons: Record<string, string> = { 'corrupt-empty.json': 'empty', 'corrupt-truncated.json': 'parse', 'corrupt-wrong-type.json': 'wrong_type', 'corrupt-version-99.json': 'version', 'corrupt-missing-state.json': 'missing_state' };

describe('validate', () => {
  for (const [f, r] of Object.entries(reasons)) it(`${f} is rejected as ${r}`, () => { expect(validate(fx(f), b)).toEqual({ ok: false, reason: r }); });
  it('real QA fixtures (no checksum, v4/v5) still validate', () => {
    for (const f of ['m1-rc2-v4-12min.json', 'm2-rc1-v5-12min.json', 'm2-rc1-v5-40min.json', 'm2-rc1-v5-40min-edge.json']) expect(validate(fx(f), b).ok).toBe(true);
  });
  it('checksum catches a changed state', () => {
    const t = good().replace('"coinsCents":777', '"coinsCents":778'); expect(validate(t, b)).toEqual({ ok: false, reason: 'checksum' });
  });
  it('negative / non-finite numbers are invalid_state', () => {
    expect(validate(JSON.stringify({ version: 5, savedAt: 1, state: { ...initialState(b), coinsCents: -1 } }), b)).toMatchObject({ reason: 'invalid_state' });
  });
});
describe('loadSafe', () => {
  it('no save -> new game, no recovery', () => { expect(loadSafe(kvm(), b)).toEqual({ file: null, recovery: null, outcome: null }); });
  for (const f of Object.keys(reasons).filter(f => f !== 'corrupt-version-99.json' /* M4-safety: newer saves are refused untouched, see newer-save.test.ts */)) it(`${f}: no backup -> case F, raw preserved`, () => {
    const k = kvm(); k.setItem(SAVE_KEY, fx(f)); k.setItem('eggfarm.install_id', 'iid');
    const r = loadSafe(k, b, 5000);
    expect(r.file).toBeNull(); expect(r.recovery).toMatchObject({ case: 'F', reason: reasons[f], had_backup: false, restored_from_backup: false, copy_failed: false });
    expect(k.getItem(`${CORRUPT_PREFIX}5000`)).toBe(fx(f)); expect(k.getItem('eggfarm.install_id')).toBe('iid');
  });
  it('valid backup -> case R', () => {
    const k = kvm(); k.setItem(SAVE_KEY, fx('corrupt-truncated.json')); k.setItem(BAK_KEY, good());
    const r = loadSafe(k, b, 1); expect(r.recovery).toMatchObject({ case: 'R', had_backup: true, restored_from_backup: true });
    expect(r.file!.state.coinsCents).toBe(777);
  });
  it('QA case 1: backup also corrupt -> F, both bad files kept', () => {
    const k = kvm(); k.setItem(SAVE_KEY, fx('corrupt-truncated.json')); k.setItem(BAK_KEY, fx('corrupt-empty.json'));
    const r = loadSafe(k, b, 9); expect(r.recovery).toMatchObject({ case: 'F', had_backup: true, restored_from_backup: false });
    expect(corrupt(k).map(x => k.getItem(x))).toEqual([fx('corrupt-truncated.json'), fx('corrupt-empty.json')]);
  });
  it('keeps only the last 3 corrupt copies', () => {
    const k = kvm(); for (let i = 0; i < 5; i++) { k.setItem(SAVE_KEY, `bad${i}`); loadSafe(k, b, 100 + i); }
    expect(corrupt(k).sort()).toEqual([102, 103, 104].map(n => `${CORRUPT_PREFIX}${n}`));
  });
  it('QA case 3: quota while copying -> Q, copy_failed, raw in memory, single attempt', () => {
    let tries = 0; const k = kvm(key => key.startsWith(CORRUPT_PREFIX) && ++tries > 0);
    k.m.set(SAVE_KEY, 'garbage');
    const r = loadSafe(k, b, 1); expect(r.recovery).toMatchObject({ case: 'Q', copy_failed: true, raw: 'garbage' }); expect(tries).toBe(1);
  });
});
describe('Game + rotation', () => {
  it('logs save_corrupt with reason/had_backup/restored_from_backup/build', () => {
    const k = kvm(); k.setItem(SAVE_KEY, fx('corrupt-missing-state.json'));
    const g = new Game(b, k, () => 1_000, 1, 'm3-rc0+abc1234');
    const e = JSON.parse(g.telemetry.exportJSON()).events.find((x: any) => x.type === 'save_corrupt');
    expect(e).toMatchObject({ reason: 'missing_state', had_backup: false, restored_from_backup: false, build: 'm3-rc0+abc1234' });
    expect(g.recovery?.case).toBe('F'); expect(g.isNewGame).toBe(true);
  });
  it('Q logs copy_failed:true', () => {
    const k = kvm(key => key.startsWith(CORRUPT_PREFIX)); k.m.set(SAVE_KEY, '{');
    const g = new Game(b, k, () => 1_000, 1, 'x');
    expect(JSON.parse(g.telemetry.exportJSON()).events.find((x: any) => x.type === 'save_corrupt')).toMatchObject({ copy_failed: true, reason: 'parse' });
  });
  it('normal play rotates the previous valid save into .bak', () => {
    const k = kvm(); let t = 0; const g = new Game(b, k, () => t, 1, 'x'); t = 10; g.save();
    expect(validate(k.getItem(BAK_KEY)!, b).ok).toBe(true);
  });
  it('QA case 2: fresh start never rotates into .bak until progress (purchase or 60 s)', () => {
    const k = kvm(); k.setItem(SAVE_KEY, fx('corrupt-truncated.json')); k.setItem(BAK_KEY, 'old-bad-bak');
    let t = 1000; const g = new Game(b, k, () => t, 1, 'x');
    for (let i = 0; i < 5; i++) { t += 5000; g.frame(); g.save(); }
    expect(k.getItem(BAK_KEY)).toBe('old-bad-bak'); expect(g.backupAllowed).toBe(false);
    for (let i = 0; i < 8; i++) { t += 5000; g.frame(); }
    expect(g.backupAllowed).toBe(true); g.save(); t += 5000; g.save();
    expect(validate(k.getItem(BAK_KEY)!, b).ok).toBe(true);
    expect(corrupt(k).length).toBe(2); // main + old bak were preserved before
  });
  it('QA case 2: a purchase also unlocks rotation', () => {
    const k = kvm(); k.setItem(SAVE_KEY, '{'); let t = 0; const g = new Game(b, k, () => t, 1, 'x');
    g.state = { ...g.state, coinsCents: 1e9 }; g.dispatch({ type: 'buyCollection' }); expect(g.backupAllowed).toBe(true);
  });
  it('restored game (R) keeps rotating; bad main never overwrites .bak', () => {
    const k = kvm(); k.setItem(SAVE_KEY, '{'); k.setItem(BAK_KEY, good()); const g = new Game(b, k, () => 5, 1, 'x');
    expect(g.recovery?.case).toBe('R'); expect(validate(k.getItem(BAK_KEY)!, b).ok).toBe(true); expect(g.state.coinsCents).toBe(777);
  });
  it('save() writes a checksummed save that validates', () => { const k = kvm(); save(k, initialState(b), 3); expect(JSON.parse(k.getItem(SAVE_KEY)!).sum).toMatch(/^[0-9a-f]{8}$/); });
});
describe('recovery dialog copy', () => {
  it('three cases, no jargon', () => {
    const all = [recoveryCopy({ case: 'R', copy_failed: false }), recoveryCopy({ case: 'F', copy_failed: false }), recoveryCopy({ case: 'Q', copy_failed: true }), recoveryCopy({ case: 'R', copy_failed: true })];
    expect(all.map(c => c.title)).toEqual(['Welcome back!', 'A fresh start', 'A fresh start', 'Welcome back!']);
    expect(all.map(c => c.button)).toEqual(['Keep farming', 'Start farming', 'Start farming', 'Keep farming']);
    for (const c of all) expect(`${c.title} ${c.body} ${c.note}`).not.toMatch(/corrupt|checksum|parse|quota/i);
    expect(all[2].note).toBe("Export it now if you'd like to keep it.");
  });
  it('export file name', () => { expect(exportName(new Date(2026, 9, 15, 9, 5))).toBe('eggfarm-old-save-20261015-0905.json'); });
});
describe('PT1-4 flags on fresh fallback', () => {
  it('keepPrefsOnly drops FTUE/Workers-tip flags, keeps prefs + install-level tip state', async () => {
    const { keepPrefsOnly } = await import('../src/save/save');
    expect(keepPrefsOnly({ sfx: false, reducedMotion: true, onboardingDone: true, workersIntroA: true, workersIntroB: true, seenSlots: 5, onbStep: 2, sessions: 4, iosHomeShown: true }))
      .toEqual({ sfx: false, reducedMotion: true, sessions: 4, iosHomeShown: true });
  });
});
