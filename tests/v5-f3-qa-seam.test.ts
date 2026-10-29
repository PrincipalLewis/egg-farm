// v5 F3, QA seam Q8 (HoE): exact balance.json paths for the zero-gain UI pieces, and the release gate keeps QA hooks out.
// Spec product/collection/m5.1-zero-gain-purchase-ui.md (sha1 1098f14e) names m5.flags.zeroGainUi, m5.flags.bestBuyV2 and
// m5.zeroGain.confirm; the single-namespace ruling (manifest rule 5, rows 28/29) moves them to m4.flags.* / m4.zeroGain.*.
import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join } from 'node:path'; import { spawnSync } from 'node:child_process';
import raw from '../src/config/balance.json';
import { balance, validateBalance } from '../src/config/balance';
import { flagOn, zeroGainConfirmOn } from '../src/config/flags';
import { parseEconomyCsv, buildBalance, readEconomyConfig, keepZeroGain } from '../scripts/sync-economy';

const rows = parseEconomyCsv(readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
const withM4 = (m4: any) => ({ ...structuredClone(balance), m4: { ...structuredClone(balance.m4!), ...m4 } }) as typeof balance;
const at = (o: any, path: string) => path.split('.').reduce((x, k) => x?.[k], o);

describe('Q8 zero-gain paths (m4 namespace)', () => {
  it('ships m4.flags.zeroGainUi = 0, m4.flags.bestBuyV2 = 0, m4.zeroGain.confirm = 0, and no m5 block', () => {
    expect(at(raw, 'm4.flags.zeroGainUi')).toBe(0);
    expect(at(raw, 'm4.flags.bestBuyV2')).toBe(0);
    expect(at(raw, 'm4.zeroGain.confirm')).toBe(0);
    expect(raw.m4.zeroGain).toEqual({ confirm: 0 });
    expect('m5' in raw).toBe(false);
  });
  it('ships m4.flags.fatigueCue = 0 (Rule 2 chip cut flag, D-HOP-2026-10-29-05) and m4.flags.pause = 0', () => {
    expect(at(raw, 'm4.flags.fatigueCue')).toBe(0); expect(at(raw, 'm4.flags.pause')).toBe(0);
  });
  it('confirm is live only with zeroGainUi on (and m4.enabled) and confirm === 1', () => {
    expect(zeroGainConfirmOn(balance)).toBe(false);
    expect(zeroGainConfirmOn(withM4({ zeroGain: { confirm: 1 } }))).toBe(false);
    const on = withM4({ flags: { ...balance.m4!.flags, zeroGainUi: 1 }, zeroGain: { confirm: 1 } });
    expect(flagOn(on, 'zeroGainUi')).toBe(true); expect(zeroGainConfirmOn(on)).toBe(true);
    expect(zeroGainConfirmOn(withM4({ enabled: 0, flags: { ...balance.m4!.flags, zeroGainUi: 1 }, zeroGain: { confirm: 1 } }))).toBe(false);
  });
  it('sync keeps m4.zeroGain whole (a flipped confirm survives a re-sync; absent = 0) and refuses typos', () => {
    expect(buildBalance(rows, withM4({ zeroGain: { confirm: 1 } }), readEconomyConfig()).m4.zeroGain).toEqual({ confirm: 1 });
    const { zeroGain: _z, ...noZg } = balance.m4 as any;
    expect(buildBalance(rows, { ...balance, m4: noZg }, readEconomyConfig()).m4.zeroGain).toEqual({ confirm: 0 });
    expect(() => keepZeroGain({ m4: { zeroGain: { confirmed: 1 } } })).toThrow(/unknown key m4\.zeroGain\.confirmed/);
    expect(() => keepZeroGain({ m4: { zeroGain: { confirm: true } } })).toThrow(/must be 0 or 1/);
  });
  it('validateBalance rejects a non-0/1 confirm or an unknown zeroGain key', () => {
    expect(() => validateBalance(withM4({ zeroGain: { confirm: 2 } }))).toThrow(/zeroGain\.confirm must be 0 or 1/);
    expect(() => validateBalance(withM4({ zeroGain: { confirm: 0, strip: 1 } }))).toThrow(/zeroGain\.strip is not a known key/);
    expect(() => validateBalance(withM4({ zeroGain: { confirm: 1 } }))).not.toThrow();
  });
});

// Any QA seam stays in dev / build:qa: scripts/check-release-build.mjs must reject eggfarmQa* in a release bundle,
// whether assigned on window or only referenced (alias), so a future zero-gain QA hook cannot ship.
const runJs = (body: string) => {
  const d = mkdtempSync(join(tmpdir(), 'rb-q8-')); mkdirSync(join(d, 'assets'));
  writeFileSync(join(d, 'assets', 'i.js'), body); writeFileSync(join(d, 'index.html'), '<!doctype html><script type="module" src="/assets/i.js"></script>');
  try { return spawnSync('node', [new URL('../scripts/check-release-build.mjs', import.meta.url).pathname, d], { env: { ...process.env, HEAD_COMMIT: '19564ebaaaa' }, encoding: 'utf8' }); }
  finally { rmSync(d, { recursive: true, force: true }); made.push(d); } // CCR N-1 #82: no temp dir left behind
};
const made: string[] = [];
describe('Q8 release gate rejects eggfarmQa*', () => {
  afterAll(() => { expect(made.length).toBeGreaterThan(0); for (const d of made) expect(existsSync(d), d).toBe(false); });
  const base = 'const B="m4.1+abc1234"; window.eggfarmExportTelemetry=()=>{};';
  it('a clean bundle passes', () => { expect(runJs(base).status).toBe(0); });
  for (const s of ['window.eggfarmQaZeroGain=()=>{};', 'const w=window;w.eggfarmQaZeroGain=1;', 'const f=globalThis.eggfarmQaFitBanners;'])
    it(`fails: ${s}`, () => { const r = runJs(base + s); expect(r.status).toBe(1); expect(r.stderr + r.stdout).toMatch(/eggfarmQa/); });
});
