// QA probe (not committed; copied into a scratch worktree of rc/v5 a923206 and removed after).
// AC-P13 (1) per spec v1.3.7: load a flag-1 save with m4.flags.pause = 0 and save with no sim step, through the REAL
// entry point (new Game(...) boot save, then Game.save()), and diff every KV key + the IDB mirror write against the input.
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { initialState } from '../src/sim/state';
import { save, SAVE_KEY, BAK_KEY } from '../src/save/save';
import { LEASE_KEY } from '../src/save/tab-lease';
import { TAB_KEY } from '../src/save/tab-guard';
import { mem } from './helpers';
const OUT = process.env.QA_PROBE_OUT!;
const T0 = Date.UTC(2026, 9, 30, 9);
const PZ: any = { ...b, m4: { ...b.m4!, flags: { ...(b.m4 as any).flags, pause: 1 }, tc: { ...b.m4!.tc!, pause_unlock_farm: 10, pause_call_lockout_s: 45 } } };
const SHIP: any = { ...b, m4: { ...b.m4!, tc: { ...b.m4!.tc!, pause_unlock_farm: 10, pause_call_lockout_s: 45 } } }; // flag 0 (shipped flags), keys present
const rows: string[] = []; const log = (o: object) => rows.push(JSON.stringify(o));
const fieldDiff = (a: string | null, z: string | null) => {
  if (a === z) return 'identical'; if (a == null || z == null) return { before: a == null ? null : 'present', after: z == null ? null : 'present' };
  const A = JSON.parse(a), Z = JSON.parse(z), d: any = {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(Z)])) if (k !== 'state' && JSON.stringify(A[k]) !== JSON.stringify(Z[k])) d[k] = [A[k], Z[k]];
  if (A.state && Z.state) { const sk: any = {}; for (const k of new Set([...Object.keys(A.state), ...Object.keys(Z.state)])) if (JSON.stringify(A.state[k]) !== JSON.stringify(Z.state[k])) sk[k] = k === 'workers' ? 'changed' : [A.state[k], Z.state[k]]; d.state = Object.keys(sk).length ? sk : 'identical'; }
  else if (typeof A === 'object') d.raw = 'differs';
  return d;
};
const mkInput = (withBak: boolean) => {
  const st: any = { ...initialState(b, 7), farmLevel: 12, tracksV7: 1, v6BackupId: '0123456789abcdef' }; // a committed M4 farm (as any flag-1 M4-build save is)
  st.workers = { ...st.workers, market_hand: { ...(st.workers?.market_hand ?? { energy: 40, cdS: 0 }), paused: true, callLockoutS: 30 } };
  const kv = mem();
  if (withBak) save(kv, st, T0 - 60_000, PZ);           // an older valid copy, so a rotate has something to move
  const raw = save(kv, st, T0, PZ, withBak);             // the input: written by a flag-1 build (real save())
  kv.setItem(LEASE_KEY, JSON.stringify({ id: 'other', at: 0 })); kv.setItem(TAB_KEY, '{"t":"x"}');
  return { kv, raw };
};
it('AC-P13 (1) real boot save + Game.save(), flag 0, no sim step', () => {
  for (const bal of [['flag0', SHIP], ['flag1', PZ]] as const) for (const withBak of [false, true]) for (const dt of [0, 5_000, 60_000]) for (const idb of [false, true]) {
    const { kv, raw } = mkInput(withBak); const before: Record<string, string | null> = {};
    const keys = () => [...((kv as any).m as Map<string, string>).keys()];
    const snap = (k: string) => kv.getItem(k);
    const ALL = [SAVE_KEY, BAK_KEY, LEASE_KEY, TAB_KEY];
    const seen = new Set([...ALL, ...keys()]); for (const k of seen) before[k] = snap(k);
    const mirrorWrites: string[] = []; const mirror = { write: (r: string) => { mirrorWrites.push(r); }, clear: async () => {} };
    const t = T0 + dt;
    const g = idb ? new Game(bal[1], kv, () => t, 7, 'dev', mirror as any, raw, { idbBoot: 'ok' }) : new Game(bal[1], kv, () => t, 7, 'dev', mirror as any, null, {}); // idb: main.ts path, LS/IDB reconcile inside loadSafe   // boot: loadSafe -> m5Load -> grantOffline -> save() (game.ts:105)
    const boot = kv.getItem(SAVE_KEY);
    g.save();                                                                      // explicit second save, still no step
    const after: Record<string, string | null> = {}; for (const k of new Set([...seen, ...keys()])) after[k] = snap(k);
    const mh = JSON.parse(kv.getItem(SAVE_KEY)!).state.workers?.market_hand;
    log({ bal: bal[0], withBak, dt, idb, recovery: g.recoveryOutcome ?? null, mainBytesIdentical: boot === raw, main_boot: fieldDiff(raw, boot), main_2nd: fieldDiff(boot, kv.getItem(SAVE_KEY)),
      bak: fieldDiff(before[BAK_KEY], after[BAK_KEY]), bak_eq_input: after[BAK_KEY] === raw,
      mirror: mirrorWrites.map(w => w === raw ? 'input' : w === boot ? 'boot' : w === kv.getItem(SAVE_KEY) ? 'second' : 'other'),
      lease: before[LEASE_KEY] === after[LEASE_KEY], tab: before[TAB_KEY] === after[TAB_KEY],
      otherKeys: [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(k => ![SAVE_KEY, BAK_KEY, LEASE_KEY, TAB_KEY].includes(k) && before[k] !== after[k]),
      mh: { paused: mh?.paused, callLockoutS: mh?.callLockoutS }, gamePaused: (g.state as any).workers?.market_hand?.paused });
  }
  writeFileSync(OUT, rows.join('\n') + '\n');
});
