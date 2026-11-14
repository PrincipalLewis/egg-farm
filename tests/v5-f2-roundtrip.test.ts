// v5 F2 fixtures + goldens (m5.0-sizing.md §6 risk 4): old -> new -> old -> new across the three stores (LS main, .bak, the
// IndexedDB mirror). The fixture is the pinned M5 save; every stage's stored bytes are pinned by sha256 (re-pin needs HoE OK).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { initialState } from '../src/sim/state';
import { serialize, SAVE_KEY, BAK_KEY } from '../src/save/save';
import { IdbMirror, IDB_KEY } from '../src/save/idb-mirror';
import { fakeIdb } from './fake-idb';
import { mem } from './helpers';
import { ON } from './v5-f2-helpers';
const T0 = Date.UTC(2026, 9, 29, 12);
const RAW = readFileSync(new URL('./fixtures/v5-f2/m5-save.json', import.meta.url), 'utf8').trim();
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const M5_KEYS = ['abilities', 'nextSpawnRemainingS', 'frenzyRemainingS', 'evRngState', 'broodyNestCents', 'broodyHenIdx'];
const pick = (st: any) => Object.fromEntries(M5_KEYS.filter(k => k in st).map(k => [k, st[k]]));
const m5State = () => ({ ...initialState(b, 7), farmLevel: 12, coinsCents: 1_234_567, tracksV7: 1 as const, v6BackupId: '0123456789abcdef',
  workers: { market_hand: { energy: 80, cdS: 1 } }, nextSpawnRemainingS: 87, frenzyRemainingS: 12, evRngState: 123456789, broodyNestCents: 4321, broodyHenIdx: 3,
  abilities: { market_hand: { readyAt: T0 + 120_000, activeS: 18 }, coop_hand: { readyAt: T0 - 5_000 } } });
describe('v5 F2 fixture', () => {
  it('tests/fixtures/v5-f2/m5-save.json is exactly serialize(m5State, T0, saveSeq 5)', () => { expect(serialize(m5State(), T0, 5)).toBe(RAW); });
});
/** Golden pins (v5 F2, generated on feat/saves-v5-f2): sha256 of LS main after each hop. ls and idb share bytes (the
 *  IndexedDB copy is reconciled into main as a stale restore); bak restores with saveSeq 1 (no main to carry from). */
const PINS = {
  ls: { r1: 'a6d21272d790248a1a713d51f8711af4cf6f43a78300e2dc6a459de95a08ce09', r2: 'ebd90e76918930376bd02645f20f645b78fe1d6973bff261aa3938eee27492ed', r3: 'bc35f03447db79b4ba8648d981df4aecce5439525dd9848b60819e08f4c02598' },
  bak: { r1: 'deccfeadcd769b1789d52c9b7de2b5bcf2d68696b8071e29bc0f3c991e101fe8', r2: '074071f0108ae8671bec217f396d28396641c61c72fe1105f3b7e73963d5b229', r3: '521c2e10e83eba53135023e4f14a43386b302011671b3d31e1f14c6cab16217e' },
  idb: { r1: 'a6d21272d790248a1a713d51f8711af4cf6f43a78300e2dc6a459de95a08ce09', r2: 'ebd90e76918930376bd02645f20f645b78fe1d6973bff261aa3938eee27492ed', r3: 'bc35f03447db79b4ba8648d981df4aecce5439525dd9848b60819e08f4c02598' },
};
const flush = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 0)); };
describe.each(['ls', 'bak', 'idb'] as const)('old -> new -> old -> new, M5 save starting in %s', store => {
  it('fields survive every hop; the new build clamps/ends per F2; the old build leaves them untouched; bytes pinned', async () => {
    const kv = mem(), f = fakeIdb(), mirror = new IdbMirror(f.db);
    if (store === 'ls') kv.setItem(SAVE_KEY, RAW); else if (store === 'bak') kv.setItem(BAK_KEY, RAW); else f.data.set(IDB_KEY, RAW);
    const boot = (bb: typeof b, t: number) => { const g = new Game(bb, kv, () => t, 7, 'dev', mirror, store === 'idb' ? f.data.get(IDB_KEY) ?? null : null, store === 'idb' ? { idbBoot: 'ok' } : {}); return g; };
    // new (flags on), 30 s after the save: readyAt clamped to [now, now + cd], the running call ends once (reload = offline)
    const n1 = boot(ON, T0 + 30_000); expect(n1.state.abilities).toEqual({ market_hand: { readyAt: T0 + 120_000 }, coop_hand: { readyAt: T0 + 30_000 } }); await flush();
    const r1 = kv.getItem(SAVE_KEY)!; expect(f.data.get(IDB_KEY)).toBe(r1);
    expect(pick(JSON.parse(r1).state)).toEqual({ ...pick(JSON.parse(RAW).state), abilities: { market_hand: { readyAt: T0 + 120_000 }, coop_hand: { readyAt: T0 + 30_000 } } });
    // old (flags off = the shipped M4.1 rules), 60 s later: ignored + written back unchanged; .bak now holds the M5 bytes
    const o = boot(b, T0 + 90_000); expect(pick(o.state)).toEqual(pick(JSON.parse(r1).state)); o.save(); await flush();
    const r2 = kv.getItem(SAVE_KEY)!; expect(pick(JSON.parse(r2).state)).toEqual(pick(JSON.parse(r1).state)); expect(f.data.get(IDB_KEY)).toBe(r2);
    expect(pick(JSON.parse(kv.getItem(BAK_KEY)!).state)).toEqual(pick(JSON.parse(r1).state));
    // new again: the cooldown kept running on the wall clock across the downgrade (ready at T0 + 120 s; loaded at T0 + 150 s)
    const n2 = boot(ON, T0 + 150_000); expect(n2.state.abilities).toEqual({ market_hand: { readyAt: T0 + 150_000 }, coop_hand: { readyAt: T0 + 150_000 } }); await flush();
    const r3 = kv.getItem(SAVE_KEY)!;
    expect({ r1: sha(r1), r2: sha(r2), r3: sha(r3) }).toEqual(PINS[store]);
  });
});
