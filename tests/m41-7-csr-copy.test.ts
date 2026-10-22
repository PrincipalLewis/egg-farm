// @vitest-environment jsdom
// M41-7 CSR v0.2.3 copy half (D-HOE-20261019-04): M1-M5 copy == art-ux/copy/csr9-recovery-copy.md, the M2 variant matrix
// (CSR-9a/9b), notice telemetry (engineering/reviews/m41-7-copy-interface.md §3, incl. store) and G1 (M5 Export = live farm).
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
import { CSR_COPY, recoveryNotice, csrCopy, recoveryCopy, formatAge, formatMinutes, formatDays, noticePayload, exportBytes, showRecoveryDialog,
  type CsrRecovery, type RecoveryNotice } from '../src/ui/save-recovery';
import type { Recovery } from '../src/save/save';

const COPY_PATH = join(HERE, 'fixtures/copy/csr9-recovery-copy.md');
const COPY_SHA256 = '87cefbb238c1c1b0f1a59ca8f395289aafd4f74dc44b19651d8e38fb5de8878f'; // art-ux/copy/csr9-recovery-copy.md (G1 Export row on M5)
const md = readFileSync(COPY_PATH, 'utf8');
/** Section -> { Title, Body, Button, Link } parsed from the copy file. */
function section(head: RegExp, stop = /^(M\d |## |Explainer)/): Record<string, string> {
  const lines = md.split('\n'); const i = lines.findIndex(l => head.test(l)); expect(i).toBeGreaterThanOrEqual(0);
  const out: Record<string, string> = {};
  for (const l of lines.slice(i + 1)) { if (stop.test(l)) break; const m = /^\s+([A-Za-z ()']+?):\s+(.+?)\s*$/.exec(l); if (m) out[m[1]] = m[2]; }
  return out;
}
const NOW = Date.UTC(2026, 9, 19, 10, 0, 0);
const MIN = 60_000, H = 60 * MIN;
const R = (x: Partial<CsrRecovery> = {}): CsrRecovery => ({ case: 'R', reason: 'parse', had_backup: true, restored_from_backup: true, copy_failed: false, raw: '{corrupt', source: 'bak', store: 'ls', ...x });

describe('copy file pin', () => {
  it('vendored copy file is the updated version (M5 has the G1 Export link)', () => {
    expect(createHash('sha256').update(readFileSync(COPY_PATH)).digest('hex')).toBe(COPY_SHA256);
    expect(section(/^M5 /).Link).toMatch(/^Export save file\s+\(exports the current restored farm/);
  });
});

describe('M1-M5 copy matches the copy file', () => {
  const linkText = (s?: string) => s?.split(/\s{2,}/)[0];
  const cases: [string, RegExp, RecoveryNotice, CsrRecovery][] = [
    ['m1', /^M1 /, { id: 'M1', source: 'bak' }, R()],
    ['m3', /^M3 /, { id: 'M3', source: 'none' }, R({ case: 'F', restored_from_backup: false, source: 'none' })],
    ['m4', /^M4 /, { id: 'M4', source: 'deferred' }, R({ case: 'D', restored_from_backup: false, source: 'deferred' })],
    ['m5', /^M5 /, { id: 'M5', source: 'bak' }, R({ live: () => '{live}' })],
  ];
  for (const [k, head, n, r] of cases) it(`${n.id}`, () => {
    const f = section(head), c = csrCopy(n, r)!;
    const S = CSR_COPY as Record<string, string>;
    expect([S[`csr.${k}.title`], S[`csr.${k}.body`], S[`csr.${k}.button`]]).toEqual([f.Title, f.Body, f.Button]);
    expect([c.title, c.body, c.button]).toEqual([f.Title, f.Body, f.Button]);
    if (f.Link) { expect(S[`csr.${k}.link`]).toBe(linkText(f.Link)); expect(c.exportLabel).toBe(linkText(f.Link)); }
  });
  it('M2 title/button + the three bodies (## M2 update)', () => {
    const f = section(/^## M2 update/, /^## (?!M2)|^$x/);
    expect([CSR_COPY['csr.m2.title'], CSR_COPY['csr.m2.button']]).toEqual([f.Title, f.Button]);
    expect(CSR_COPY['csr.m2.body.level']).toBe(f['Body (level known)']);
    expect(CSR_COPY['csr.m2.body.age']).toBe(f['Body (time known)']);
    expect(CSR_COPY['csr.m2.body.fallback']).toBe(f["Body (can't estimate)"]);
    expect(CSR_COPY['csr.link']).toBe('Export save file'); // copy-file rule line 2
  });
  it('M5 = G1 layout: Continue primary, Export save file as the AC14b storage-full secondary (.rc-export-q, 44px)', () => {
    const c = csrCopy({ id: 'M5', source: 'bak' }, R({ live: () => '{live}' }))!;
    expect([c.button, c.exportStyle, c.exportLabel]).toEqual(['Continue', 'secondary', 'Export save file']);
    expect(readFileSync(join(HERE, '../src/ui/styles.css'), 'utf8')).toMatch(/\.recovery-card \.rc-export-q\{[^}]*min-height:44px/);
  });
  it('no jargon, no error codes; storage and cantsave keep their v2.1/v2.2 copy (G2)', () => {
    for (const v of Object.values(CSR_COPY)) expect(v).not.toMatch(/corrupt|error|checksum|quota|\b[A-Z]{2,}\d/i);
    const q = R({ case: 'Q', restored_from_backup: false, copy_failed: true, source: 'none' });
    expect(csrCopy({ id: 'storage', source: 'none' }, q)).toEqual(recoveryCopy(q as Recovery));
    const cs = R({ case: 'Q', restored_from_backup: false, cantSave: true, source: 'none' });
    expect(csrCopy({ id: 'cantsave', source: 'none' }, cs)).toEqual(recoveryCopy(cs as Recovery));
  });
});

describe('notice selection (interface §2)', () => {
  const sel = (r: CsrRecovery | null, storageBlocked = false) => recoveryNotice(r, { storageBlocked, now: NOW });
  it('maps cases to notices', () => {
    expect(sel(null)).toBeNull();
    expect(sel(R({ source: 'bak' }))!.id).toBe('M1'); expect(sel(R({ source: 'idb' }))!.id).toBe('M1');
    expect(sel(R({ source: 'v6_backup' }))!.id).toBe('M2');
    expect(sel(R({ case: 'F', restored_from_backup: false, source: 'none' }))!.id).toBe('M3');
    expect(sel(R({ case: 'D', restored_from_backup: false, source: 'deferred' }))!.id).toBe('M4');
    expect(sel(R({ source: 'bak' }), true)!.id).toBe('M5'); expect(sel(R({ source: 'v6_backup' }), true)!.id).toBe('M5');
    expect(sel(R({ case: 'Q', restored_from_backup: false, copy_failed: true, source: 'none' }))!.id).toBe('storage');
    expect(sel(R({ case: 'Q', restored_from_backup: false, cantSave: true }), true)!.id).toBe('cantsave');
  });
});

describe('M2 variant matrix (CSR-9a, CSR-9b)', () => {
  const m2 = (x: Partial<CsrRecovery>) => { const r = R({ source: 'v6_backup', ...x }); const n = recoveryNotice(r, { storageBlocked: false, now: NOW })!; return { n, body: csrCopy(n, r)!.body }; };
  const SAVED = NOW - 3 * H - 20 * MIN; // valid savedAt -> "about 3 hours"
  it('level: prevLevel set and != restoredLevel -> restored level shown (CSR-9a-1)', () => {
    const { n, body } = m2({ prevLevel: 17, restoredLevel: 12, restoredSavedAt: SAVED });
    expect([n.variant, n.level]).toEqual(['level', 12]); expect(body).toBe('We restored an earlier save, from Farm level 12.');
  });
  it('level 31 above maxLevel is accepted (level tolerance)', () => { expect(m2({ prevLevel: 15, restoredLevel: 31 }).body).toBe('We restored an earlier save, from Farm level 31.'); });
  it('level equal -> age when validSavedAt passes', () => {
    const { n, body } = m2({ prevLevel: 12, restoredLevel: 12, restoredSavedAt: SAVED });
    expect([n.variant, n.ageMs]).toEqual(['age', 3 * H + 20 * MIN]); expect(body).toBe('We restored a save from about 3 hours ago.');
  });
  it('prevLevel unset -> age (CSR-9a-3)', () => { expect(m2({ restoredLevel: 12, restoredSavedAt: SAVED }).n.variant).toBe('age'); });
  it('unvalidated levels never shown: 12.5 / NaN / -1 / "17" fall through', () => {
    for (const bad of [12.5, NaN, -1, '17' as any, null as any]) {
      expect(m2({ prevLevel: bad, restoredLevel: 12, restoredSavedAt: SAVED }).n.variant).toBe('age');
      expect(m2({ prevLevel: 17, restoredLevel: bad }).n.variant).toBe('fallback');
    }
  });
  it('age hidden unless validSavedAt passes: NaN, 0, negative, future, pre-2020 -> fallback', () => {
    for (const t of [NaN, 0, -5, NOW + 10 * MIN, Date.UTC(2010, 0, 1), Infinity, undefined]) {
      const { n, body } = m2({ restoredSavedAt: t as number });
      expect(n.variant).toBe('fallback'); expect(n.ageMs).toBeUndefined();
      expect(body).toBe('We restored an earlier save. A little recent progress may be missing.');
    }
  });
  it('level wins over age; no level and no time -> fallback', () => {
    expect(m2({ prevLevel: 3, restoredLevel: 4, restoredSavedAt: SAVED }).n.variant).toBe('level');
    expect(m2({}).n.variant).toBe('fallback');
  });
  it('M5 from v6_backup keeps the M2 params but shows the M5 body', () => {
    const r = R({ source: 'v6_backup', prevLevel: 17, restoredLevel: 12, live: () => '{live}' });
    const n = recoveryNotice(r, { storageBlocked: true, now: NOW })!;
    expect([n.id, n.variant, n.level]).toEqual(['M5', 'level', 12]); expect(csrCopy(n, r)!.body).toBe(CSR_COPY['csr.m5.body']);
  });
  it('{age} boundaries and singulars (CSR-9b)', () => {
    const s = 1000;
    const t: [number, string][] = [[-1, 'a few minutes'], [0, 'a few minutes'], [4 * MIN + 59 * s, 'a few minutes'], [5 * MIN, '5 minutes'], [59 * MIN + 59 * s, '59 minutes'],
      [H, 'about 1 hour'], [H + 59 * MIN + 59 * s, 'about 1 hour'], [2 * H, 'about 2 hours'], [24 * H, 'about 24 hours'], [47 * H + 59 * MIN, 'about 47 hours'], [48 * H, '2 days'], [72 * H - 1, '2 days'], [NaN, 'a few minutes']];
    for (const [ms, out] of t) expect(formatAge(ms)).toBe(out);
    expect(formatMinutes(1)).toBe('1 minute'); expect(formatDays(1)).toBe('1 day'); expect(formatDays(3)).toBe('3 days');
    for (let h = 24; h < 48; h++) expect(formatAge(h * H)).not.toBe('1 day');
    for (const ms of [6 * MIN, 2 * H, 3 * 24 * H]) expect(formatAge(ms)).not.toMatch(/second/);
    expect(CSR_COPY['csr.m2.body.age']).not.toMatch(/about/);
  });
});

describe('notice telemetry payload (interface §3)', () => {
  it('shape: notice, source, variant?, store', () => {
    const r = R({ source: 'v6_backup', store: 'idb', restoredSavedAt: NOW - 10 * MIN });
    const n = recoveryNotice(r, { storageBlocked: false, now: NOW })!;
    expect(noticePayload(n, r)).toEqual({ notice: 'M2', source: 'v6_backup', variant: 'age', store: 'idb' });
    const r1 = R(); expect(noticePayload(recoveryNotice(r1, { storageBlocked: false, now: NOW })!, r1)).toEqual({ notice: 'M1', source: 'bak', store: 'ls' });
  });
  it('enum: notice in M1..M5|storage|cantsave, source RecoverySource|null, store ls|idb (null only for cantsave)', () => {
    const NOTICES = ['M1', 'M2', 'M3', 'M4', 'M5', 'storage', 'cantsave'], SOURCES = ['bak', 'idb', 'v6_backup', 'none', 'deferred', null];
    const rs: CsrRecovery[] = [R(), R({ source: 'idb', store: 'idb' }), R({ source: 'v6_backup' }), R({ case: 'F', restored_from_backup: false, source: 'none' }),
      R({ case: 'D', restored_from_backup: false, source: 'deferred' }), R({ case: 'Q', restored_from_backup: false, copy_failed: true, source: 'none' }),
      R({ case: 'Q', restored_from_backup: false, cantSave: true, source: undefined, store: undefined }), R({ source: undefined, store: undefined })];
    for (const blocked of [false, true]) for (const r of rs) {
      const n = recoveryNotice(r, { storageBlocked: blocked, now: NOW })!, p = noticePayload(n, r);
      expect(NOTICES).toContain(p.notice); expect(SOURCES).toContain(p.source);
      expect(Object.keys(p).sort()).toEqual(['notice', 'source', 'store', ...(p.variant ? ['variant'] : [])].sort());
      if (p.notice === 'cantsave') expect(p.store).toBeNull(); else expect(['ls', 'idb']).toContain(p.store);
      if (p.variant !== undefined) expect(['level', 'age', 'fallback']).toContain(p.variant);
      expect(JSON.stringify(p)).not.toContain('corrupt'); // no save bytes
    }
  });
});

describe('Export bytes (G1-G3)', () => {
  it('M5 exports recovery.live() and never the corrupt bytes', () => {
    const live = vi.fn(() => '{"current":1}');
    const r = R({ raw: '{corrupt', copy_failed: true, live });
    const n = recoveryNotice(r, { storageBlocked: true, now: NOW })!;
    expect(exportBytes(n, r, true)!()).toBe('{"current":1}'); expect(live).toHaveBeenCalledTimes(1);
    expect(exportBytes(n, R({ raw: '{corrupt' }), true)).toBeNull(); // no live -> no Export, never a raw fallback
  });
  it('M1/M2 only on copy_failed; M3/M4 when raw bytes exist', () => {
    const n1: RecoveryNotice = { id: 'M1', source: 'bak' };
    expect(exportBytes(n1, R(), true)).toBeNull(); expect(exportBytes(n1, R({ copy_failed: true }), true)!()).toBe('{corrupt');
    expect(exportBytes({ id: 'M2', source: 'v6_backup' }, R({ copy_failed: true, source: 'v6_backup' }), true)!()).toBe('{corrupt');
    expect(exportBytes({ id: 'M3', source: 'none' }, R({ case: 'F' }), true)!()).toBe('{corrupt');
    expect(exportBytes({ id: 'M4', source: 'deferred' }, R({ case: 'D', raw: '' }), true)).toBeNull();
  });
});

describe('dialog (jsdom)', () => {
  afterEach(() => { document.body.innerHTML = ''; });
  it('M5: Continue primary + Export save file secondary; Export hands out live(), never raw; telemetry shown/dismissed', async () => {
    const live = vi.fn(() => '{"current":1}'), track = vi.fn(), doExport = vi.fn(async () => true);
    const r = R({ raw: '{corrupt', live }) as unknown as Recovery;
    const p = showRecoveryDialog(r, f => f, [], undefined, doExport, { storageBlocked: true, now: NOW, track });
    const layer = document.querySelector<HTMLElement>('.recovery-layer')!;
    expect(layer.dataset.notice).toBe('M5');
    expect(layer.querySelector('#rcT')!.textContent).toBe('Your farm is back!');
    expect(layer.querySelector('#rcB')!.textContent).toBe(CSR_COPY['csr.m5.body']);
    expect(layer.querySelector('#rcGo')!.textContent).toBe('Continue');
    const exp = layer.querySelector<HTMLButtonElement>('#rcExport')!;
    expect([exp.className, exp.textContent]).toEqual(['rc-export-q', 'Export save file']);
    expect(exp.compareDocumentPosition(layer.querySelector('#rcGo')!) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy(); // underneath Continue
    expect(track).toHaveBeenCalledWith('save_recovery_notice_shown', { notice: 'M5', source: 'bak', store: 'ls' });
    exp.click(); await Promise.resolve();
    expect(doExport).toHaveBeenCalledTimes(1);
    const [bytes, name] = doExport.mock.calls[0] as unknown as [string, string];
    expect(bytes).toBe('{"current":1}'); expect(bytes).not.toContain('corrupt'); expect(name).toMatch(/^eggfarm-save-/);
    layer.querySelector<HTMLButtonElement>('#rcGo')!.click(); await p;
    expect(track).toHaveBeenLastCalledWith('save_recovery_notice_dismissed', { notice: 'M5', source: 'bak', store: 'ls' });
  });
  it('M2 level variant renders; M1 without copy_failed has no Export', async () => {
    const r = R({ source: 'v6_backup', prevLevel: 17, restoredLevel: 12 }) as unknown as Recovery;
    const p = showRecoveryDialog(r, f => f, [], undefined, undefined, { now: NOW });
    expect(document.querySelector('#rcB')!.textContent).toBe('We restored an earlier save, from Farm level 12.');
    expect(document.querySelector('#rcExport')).toBeNull();
    document.querySelector<HTMLButtonElement>('#rcGo')!.click(); await p;
  });
  it("today's strings keep working until the swap: a loader Recovery without `source` renders the v2.1 copy unchanged", async () => {
    const r: Recovery = { case: 'R', reason: 'parse', had_backup: true, restored_from_backup: true, copy_failed: false, raw: '{' };
    const track = vi.fn();
    const p = showRecoveryDialog(r, f => f, [], undefined, undefined, { now: NOW, track });
    const layer = document.querySelector<HTMLElement>('.recovery-layer')!;
    expect(layer.dataset.notice).toBeUndefined();
    expect(layer.querySelector('#rcT')!.textContent).toBe('Welcome back!');
    expect(layer.querySelector('#rcB')!.textContent).toBe('We loaded your backup. You may be a few moments behind.');
    expect(layer.querySelector('#rcExport')!.textContent).toBe('Export old save');
    expect(track).toHaveBeenCalledWith('save_recovery_notice_shown', { notice: 'M1', source: null, store: 'ls' });
    layer.querySelector<HTMLButtonElement>('#rcGo')!.click(); await p;
  });
});
