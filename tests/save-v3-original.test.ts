// QA rc1: an ORIGINAL v3 save captured from a real v3 build (6fad7d9, the only commit where SAVE_VERSION = 3), played
// headless in Chromium; raw localStorage 'eggfarm.save' bytes. Loads through the current loader + migrations with no loss.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { migrate, load, loadSafe, SAVE_KEY, SAVE_VERSION } from '../src/save/save';
import { applyOffline } from '../src/sim/offline';
import { coopTier } from '../src/sim/state';
import { mem } from './helpers';
const FILE = 'v3-original-6fad7d9.json';
const raw = readFileSync(new URL(`./fixtures/saves/${FILE}`, import.meta.url), 'utf8');
const v3 = JSON.parse(raw);
describe(`v3 original save (${FILE}) -> v${SAVE_VERSION}`, () => {
  it('is a genuine v3 file', () => { expect(v3.version).toBe(3); expect(v3.sum).toBeUndefined(); expect(v3.state.farmLevel).toBeGreaterThan(0); expect(v3.state.coinsCents % 100).not.toBe(0); });
  it('every v3 field maps unchanged; only migration-added fields are new', () => {
    const s = migrate(JSON.parse(raw), b);
    expect(s.version).toBe(SAVE_VERSION); expect(s.savedAt).toBe(v3.savedAt);
    for (const [k, v] of Object.entries(v3.state)) expect((s.state as any)[k], k).toEqual(v);
    expect(s.state.celebratedTier).toBe(coopTier(v3.state.farmLevel));
    expect(s.state.workers).toEqual({}); expect(s.state.graderTier).toBe(0); expect(s.state.wageFracCents).toEqual({});
  });
  it('load() and loadSafe() keep coins and upgrades', () => {
    const kv = mem(); kv.setItem(SAVE_KEY, raw);
    const a = load(kv, b)!; expect(a.state.coinsCents).toBe(v3.state.coinsCents);
    expect(a.state.farmLevel).toBe(v3.state.farmLevel); expect(a.state.collectionLevel).toBe(v3.state.collectionLevel);
    const kv2 = mem(); kv2.setItem(SAVE_KEY, raw);
    const r = loadSafe(kv2, b, v3.savedAt + 1000); expect(r.newer).toBeUndefined(); expect(r.file).not.toBeNull();
    expect(r.file!.state.coinsCents).toBe(v3.state.coinsCents); expect(r.file!.state.farmLevel).toBe(v3.state.farmLevel);
    expect(r.file!.state.collectionLevel).toBe(v3.state.collectionLevel); expect(r.file!.state.basket).toBe(v3.state.basket);
  });
  it('offline earnings from the v3 savedAt are sane (0 under a minute, capped, money untouched)', () => {
    const s = migrate(JSON.parse(raw), b).state;
    expect(applyOffline(s, 30_000, b).eggs).toBe(0);
    const h = applyOffline(s, 3600_000, b); expect(h.eggs).toBeGreaterThan(0); expect(Number.isInteger(h.eggs)).toBe(true);
    const cap = applyOffline(s, 1e9, b), capS = applyOffline(s, b.offline.offlineCapSeconds * 1000, b);
    expect(cap.eggs).toBe(capS.eggs); expect(cap.awayS).toBe(b.offline.offlineCapSeconds);
    expect(cap.state.coinsCents).toBe(v3.state.coinsCents);
  });
});
