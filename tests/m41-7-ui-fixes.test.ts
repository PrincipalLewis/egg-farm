// @vitest-environment jsdom
// M41-7 rework (PR #63), Head of Art & UX P1/P2 on UI's src/ui/save-recovery.ts (art-ux/copy/csr9-recovery-copy.md
// "Implementation confirmations"). Spec of record corrupt-save-recovery-spec.m41-final.md sha256 6131c290…433334d.
import { describe, it, expect, afterEach } from 'vitest';
import { showRecoveryDialog, csrCopy, EXPORT_ARIA } from '../src/ui/save-recovery';
import type { CsrRecovery } from '../src/ui/save-recovery';
import type { Recovery } from '../src/save/save';

const NOW = Date.UTC(2026, 9, 19, 10, 0, 0);
const R = (x: Partial<CsrRecovery> = {}): CsrRecovery => ({ case: 'R', reason: 'parse', had_backup: true, restored_from_backup: true, copy_failed: false, raw: '{corrupt', source: 'bak', store: 'ls', ...x });
const OLD = 'Export save file, downloads a copy of your old save file', LIVE = 'Export save file, downloads a copy of your current farm';
const show = (r: CsrRecovery, storageBlocked = false) => {
  const p = showRecoveryDialog(r as unknown as Recovery, f => f, [], undefined, async () => true, { storageBlocked, now: NOW });
  const L = document.querySelector<HTMLElement>('.recovery-layer')!;
  const exp = L.querySelector<HTMLButtonElement>('#rcExport'), badge = L.querySelector<HTMLElement>('.rc-badge')!, icon = L.querySelector<HTMLImageElement>('.rc-icon img')!;
  return { L, exp, badge, icon, close: async () => { L.querySelector<HTMLButtonElement>('#rcGo')!.click(); await p; } };
};
afterEach(() => { document.body.innerHTML = ''; });

describe('P1 (Major): M5 uses the coop icon + "!" warn badge like M4, never the green restored badge', () => {
  it('M5 renders the warn badge, not the restored badge', async () => {
    const d = show(R({ live: () => '{live}' }), true); expect(d.L.dataset.notice).toBe('M5');
    expect(d.badge.className).toContain('warn'); expect(d.badge.className).not.toContain('ok'); expect(d.badge.textContent).toBe('!');
    expect(d.badge.textContent).not.toBe('\u2713'); expect(d.icon.getAttribute('src')).toBe('icon-coop.svg'); await d.close();
  });
  it('M5 badge/icon equal M4; M1 keeps the restored badge', () => {
    const m4 = csrCopy({ id: 'M4', source: 'deferred' }, R({ case: 'D', source: 'deferred' }))!, m5 = csrCopy({ id: 'M5', source: 'bak' }, R())!;
    expect([m5.icon, m5.badge, m5.badgeClass]).toEqual([m4.icon, m4.badge, m4.badgeClass]); expect(m5.badgeClass).toBe('warn');
    expect(csrCopy({ id: 'M1', source: 'bak' }, R())!.badgeClass).toBe('ok');
  });
});

describe('P2 (WCAG 2.5.3): the accessible name starts with the visible label', () => {
  const cases: [string, CsrRecovery, boolean, string, string][] = [
    ['M1 copy_failed', R({ copy_failed: true }), false, 'Export save file', OLD],
    ['M2 copy_failed', R({ copy_failed: true, source: 'v6_backup', prevLevel: 17, restoredLevel: 12 }), false, 'Export save file', OLD],
    ['M4', R({ case: 'D', source: 'deferred', restored_from_backup: false }), false, 'Export save file', OLD],
    ['M5', R({ live: () => '{live}' }), true, 'Export save file', LIVE],
    ['M3 (unchanged: visible label is "Export old save file")', R({ case: 'F', source: 'none', restored_from_backup: false }), false, 'Export old save file', 'Export old save file, downloads a copy of your old save file'],
  ];
  for (const [name, r, blocked, label, aria] of cases) it(name, async () => {
    const d = show(r, blocked); expect(d.exp).not.toBeNull();
    expect(d.exp!.textContent).toBe(label); expect(d.exp!.getAttribute('aria-label')).toBe(aria);
    expect(d.exp!.getAttribute('aria-label')!.startsWith(d.exp!.textContent!)).toBe(true); await d.close();
  });
  it('legacy EXPORT_ARIA still renders with the legacy "Export old save" label (unchanged; P2 names would not start with it)', async () => {
    expect(EXPORT_ARIA.startsWith('Export old save')).toBe(true);
    const d = show(R({ case: 'Q', source: 'none', restored_from_backup: false, copy_failed: true }));
    expect(d.exp!.textContent).toBe('Export old save'); expect(d.exp!.getAttribute('aria-label')).toBe(EXPORT_ARIA); await d.close();
  });
});
