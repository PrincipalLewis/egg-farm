// AC14b save-recovery dialog v2.1 (art-ux/save-recovery-dialog.md): loader outcome -> dialog copy, one case per outcome.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { loadSafe, serialize, recoveryOutcome, SAVE_KEY, BAK_KEY, type Recovery } from '../src/save/save';
import { initialState } from '../src/sim/state';
import { recoveryCopy, showRecoveryDialog, EXPORT_ARIA } from '../src/ui/save-recovery';
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
