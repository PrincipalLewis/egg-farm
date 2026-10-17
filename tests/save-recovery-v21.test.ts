// AC14b save-recovery dialog v2.1 (art-ux/save-recovery-dialog.md): loader outcome -> dialog copy, one case per outcome.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { loadSafe, serialize, recoveryOutcome, storageBlockedRecovery, SAVE_KEY, BAK_KEY, type Recovery } from '../src/save/save';
import { initialState } from '../src/sim/state';
import { recoveryCopy, showRecoveryDialog, EXPORT_ARIA, CANTSAVE_ARIA } from '../src/ui/save-recovery';
const kvm = (quota = false) => { const m = new Map<string, string>(); let quotaHits = 0;
  return { m, get quotaHits() { return quotaHits; }, getItem: (k: string) => m.get(k) ?? null, removeItem: (k: string) => { m.delete(k); }, key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size; },
    setItem: (k: string, v: string) => { if (quota && k !== SAVE_KEY && k !== BAK_KEY) { quotaHits++; const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } m.set(k, v); } } as any; };
const good = () => serialize({ ...initialState(b), coinsCents: 777 }, 1000);
const JARGON = /corrupt|error|checksum|quota/i;
describe('AC14b v2.1 outcome -> dialog', () => {
  it('restored: main missing + valid .bak', () => {
    const k = kvm(); k.m.set(BAK_KEY, good()); const r = loadSafe(k, b, 2000);
    expect(r.outcome).toBe('restored'); const c = recoveryCopy(r.recovery!)!;
    expect([c.title, c.body, c.button, c.badge, c.badgeClass, c.icon, c.exportStyle]).toEqual(['Welcome back!', 'We loaded your backup. You may be a few moments behind.', 'Keep farming', '\u2713', 'ok', 'icon-coop.svg', 'link']);
    expect(r.recovery!.raw).toBe(''); // nothing to export -> no Export control (§1: shown only when raw bytes exist)
  });
  it('restored: corrupt main + valid .bak keeps the export link', () => {
    const k = kvm(); k.m.set(SAVE_KEY, '{'); k.m.set(BAK_KEY, good()); const r = loadSafe(k, b, 2000);
    expect(r.outcome).toBe('restored'); expect(r.recovery!.raw).toBe('{'); expect(recoveryCopy(r.recovery!)!.exportStyle).toBe('link');
  });
  it('fresh: corrupt main + corrupt .bak', () => {
    const k = kvm(); k.m.set(SAVE_KEY, '{'); k.m.set(BAK_KEY, '{"v":'); const r = loadSafe(k, b, 2000);
    expect(r.outcome).toBe('fresh'); const c = recoveryCopy(r.recovery!)!;
    expect([c.title, c.body, c.button, c.badge, c.badgeClass, c.icon, c.exportStyle]).toEqual(['A fresh start', "We couldn't open your farm. Your old save is kept safe.", 'Start farming', '\u2605', 'new', 'char-chicken.svg', 'link']);
  });
  it('SD4-3 / N5: main missing + invalid .bak -> fresh (not silent), old bytes exportable', () => {
    const k = kvm(); k.m.set(BAK_KEY, '{"v":'); const r = loadSafe(k, b, 2000);
    expect(r.outcome).toBe('fresh'); expect(r.recovery!.raw).toBe('{"v":'); expect(recoveryCopy(r.recovery!)!.body).toBe("We couldn't open your farm. Your old save is kept safe.");
  });
  it('storage: corrupt main, preserving the copy hits the quota once', () => {
    const k = kvm(true); k.m.set(SAVE_KEY, '{'); const r = loadSafe(k, b, 2000);
    expect(r.outcome).toBe('storage'); const c = recoveryCopy(r.recovery!)!;
    expect([c.title, c.body, c.button, c.badge, c.badgeClass, c.icon, c.exportStyle]).toEqual(['A fresh start', "We couldn't open your farm. Export it now to keep a copy.", 'Start farming', '!', 'warn', 'char-chicken.svg', 'secondary']);
    expect(r.recovery!.raw).toBe('{'); expect(k.quotaHits).toBeLessThanOrEqual(1); // §6.6: no retry loop
  });
  it('restored + copy_failed: Restored title, export-now body, outlined button', () => {
    const c = recoveryCopy({ case: 'R', restored_from_backup: true, copy_failed: true })!;
    expect([c.title, c.body, c.exportStyle]).toEqual(['Welcome back!', 'We loaded your backup. Export the old save now to keep it.', 'secondary']);
  });
  it('null outcome: no copy, no dialog', async () => {
    const k = kvm(); k.m.set(SAVE_KEY, good()); const r = loadSafe(k, b, 2000);
    expect(r.outcome).toBeNull(); expect(recoveryOutcome(null)).toBeNull();
    await expect(showRecoveryDialog(null, f => f, [])).resolves.toBeUndefined(); // resolves without touching the DOM (no document in node)
  });
  it('v2.1 strings: titles <= 4 words, no jargon, export aria label', () => {
    for (const r of [{ case: 'R', restored_from_backup: true, copy_failed: false }, { case: 'R', restored_from_backup: true, copy_failed: true }, { case: 'F', restored_from_backup: false, copy_failed: false }, { case: 'Q', restored_from_backup: false, copy_failed: true }] as Recovery[]) {
      const c = recoveryCopy(r)!; expect(c.title.split(/\s+/).length).toBeLessThanOrEqual(4); expect(`${c.title} ${c.body} ${c.button}`).not.toMatch(JARGON);
    }
    expect(EXPORT_ARIA).toBe('Export old save, downloads a copy of your old save file');
  });
  it('dialog markup + CSS follow §2/§5 (alertdialog, labelled/described, hidden icon, 44px controls, focus ring)', () => {
    const src = readFileSync('src/ui/save-recovery.ts', 'utf8'), css = readFileSync('src/ui/styles.css', 'utf8');
    expect(src).toMatch(/role="alertdialog" aria-modal="true" aria-labelledby="rcT" aria-describedby="rcB/);
    expect(src).toMatch(/class="rc-icon" aria-hidden="true"/);
    expect(css).toMatch(/\.recovery-card \.rc-export-q\{[^}]*min-height:44px[^}]*border:2px solid var\(--c-wood-text\)/);
    expect(css).toMatch(/\.recovery-card \.rc-link\{[^}]*min-width:120px;min-height:44px/);
    expect(css).toMatch(/\.recovery-card \.rc-primary\{[^}]*min-height:48px/);
    expect(css).toMatch(/\.recovery-card :focus-visible\{outline:3px solid var\(--c-focus\);outline-offset:3px\}/);
  });
});

describe('v4 storageBlocked routes through the v2.1 Storage dialog', () => {
  it('synthesized recovery is the storage outcome with the current main bytes for Export', () => {
    const kv = kvm(); const raw = good(); kv.m.set(SAVE_KEY, raw);
    const r = storageBlockedRecovery(kv); expect(recoveryOutcome(r)).toBe('storage');
    expect(r.raw).toBe(raw); expect(recoveryCopy(r)!.outcome).toBe('storage'); expect(recoveryCopy(r)!.exportStyle).toBe('secondary');
  });
  it('blocked localStorage still yields a storage recovery', () => {
    const r = storageBlockedRecovery({ getItem: () => { throw new Error('blocked'); } } as any); expect(recoveryOutcome(r)).toBe('storage'); expect(r.raw).toBe('');
  });
  it('main.ts sets g.recovery so app.ts opens the dialog', () => {
    const src = readFileSync('src/main.ts', 'utf8'); expect(src).toMatch(/lease\.storageBlocked[\s\S]{0,200}g\.recovery = storageBlockedRecovery\(localStorage\)/);
  });
});

describe("v2.2 'Can't save' (storage refused, farm loaded)", () => {
  it('exact v2.2 copy; real Storage keeps v2.1', () => {
    const c = recoveryCopy(storageBlockedRecovery(kvm()))!;
    expect(c).toMatchObject({ variant: 'cantsave', outcome: 'storage', icon: 'icon-coop.svg', badge: '!', badgeClass: 'warn', title: 'Saving is paused', button: 'Keep farming', exportStyle: 'secondary', exportLabel: 'Export save', exportAria: CANTSAVE_ARIA });
    expect(c.body).toBe("Your farm is fine, but your browser won't let us save right now. Export a copy to keep your progress.");
    const q = recoveryCopy({ case: 'Q', copy_failed: true, restored_from_backup: false })!;
    expect(q.variant).toBeUndefined(); expect(q.title).toBe('A fresh start'); expect(q.body).toBe("We couldn't open your farm. Export it now to keep a copy."); expect(q.button).toBe('Start farming'); expect(q.exportLabel).toBeUndefined();
  });
  it('not an old save: no session "Export old save" in Settings', () => { expect(storageBlockedRecovery(kvm()).copy_failed).toBe(false); });
  it('card has no opacity animation (fix 1)', () => {
    const css = readFileSync('src/ui/styles.css', 'utf8'); const kf = css.match(/@keyframes rcPop\{[^}]*\}[^}]*\}/)![0];
    expect(kf).not.toMatch(/opacity/); expect(css).not.toMatch(/\.reduced-motion \.recovery-card\{animation:rcFade/);
  });
  it('main.ts holds the save-warning toast until the dialog closes (fix 2), and Export uses the live farm', () => {
    const src = readFileSync('src/main.ts', 'utf8');
    expect(src).toMatch(/if \(holdNotices\) \{ heldNotice \?\?= text; return; \}/);
    expect(src).toMatch(/addEventListener\(RECOVERY_CLOSED[\s\S]{0,120}holdNotices = false/);
    expect(src).toMatch(/g\.recovery\.live = \(\) => recoveryExport\(g\.state, balance\)/); // Saves minor 2: live farm, with the build's balance
    expect(readFileSync('src/ui/save-recovery.ts', 'utf8')).toMatch(/layer\.remove\(\); document\.dispatchEvent\(new Event\(RECOVERY_CLOSED\)\)/);
  });
});
