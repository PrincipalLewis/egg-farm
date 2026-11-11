// QA probe (Saves QA, PR #92 @2d15dac F-5 re-trace). Untracked copy, removed after the run.
import { it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { balance as b, validateBalance } from '../src/config/balance';
import { m5Load } from '../src/save/m5-fields';
import { initialState } from '../src/sim/state';
const tc: any = b.m4!.tc; const out: any = {};
const mk = (t: any, pause = 1) => ({ ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, pause }, tc: t } }) as typeof b;
const err = (bal: any) => { try { validateBalance(bal); return 'ok'; } catch (e: any) { return String(e.message); } };
it('[QA pr92] shipped pause keys, flag, spec ranges', () => {
  out.shipped = { pause_unlock_farm: tc.pause_unlock_farm, pause_call_lockout_s: tc.pause_call_lockout_s, flag_pause: b.m4!.flags!.pause };
  expect(tc.pause_unlock_farm).toBe(10); expect(tc.pause_call_lockout_s).toBe(45); expect(b.m4!.flags!.pause).toBe(0);
  expect(tc.pause_call_lockout_s).toBeGreaterThanOrEqual(15); expect(tc.pause_call_lockout_s).toBeLessThanOrEqual(60); // spec §9 range 15-60
  expect(err(b)).toBe('ok'); expect(err(mk(tc))).toBe('ok'); // b, and b + pause on with shipped keys
});
it('[QA pr92] F-5 strip is not a no-op; each key alone is required', () => {
  const { pause_unlock_farm: _u, pause_call_lockout_s: _c, ...both } = tc;
  expect('pause_unlock_farm' in both || 'pause_call_lockout_s' in both).toBe(false);
  const { pause_unlock_farm: _u2, ...noU } = tc; const { pause_call_lockout_s: _c2, ...noC } = tc;
  out.stripBoth = err(mk(both)); out.stripUnlockOnly = err(mk(noU)); out.stripLockoutOnly = err(mk(noC));
  out.stripBothFlagOff = err(mk(both, 0));
  expect(out.stripBoth).toMatch(/tc\.pause_unlock_farm is required while flags\.pause is on/);
  expect(out.stripUnlockOnly).toMatch(/tc\.pause_unlock_farm is required while flags\.pause is on/);
  expect(out.stripLockoutOnly).toMatch(/tc\.pause_call_lockout_s is required while flags\.pause is on/);
  expect(out.stripBothFlagOff).toBe('ok');
});
it('[QA pr92] info: value checks on the pause keys (validator is presence-only)', () => {
  out.values = {};
  for (const [k, v] of [['pause_call_lockout_s', NaN], ['pause_call_lockout_s', -1], ['pause_call_lockout_s', 0], ['pause_call_lockout_s', 1e9], ['pause_unlock_farm', NaN], ['pause_unlock_farm', -5], ['pause_unlock_farm', 2.5]] as const)
    out.values[`${k}=${v}`] = err(mk({ ...tc, [k]: v }));
});
it('[QA pr92] m5Load with shipped keys + pause on caps at 45 and opens at F10', () => {
  const W = (lock: number) => ({ market_hand: { energy: 40, cdS: 0.7, paused: true, callLockoutS: lock }, coop_hand: { energy: 60, cdS: 1.2 } });
  const s = (lvl: number, lock: number) => ({ ...initialState(b, 7), farmLevel: lvl, workers: W(lock) }) as any;
  const r = (lvl: number, lock: number) => (m5Load(s(lvl, lock), mk(tc), Date.UTC(2026, 9, 30, 9), []) as any).workers.market_hand;
  out.m5Load = { f10_1e308: r(10, 1e308), f10_30: r(10, 30), f9_30: r(9, 30) };
  expect(r(10, 1e308).callLockoutS).toBe(45); expect(r(10, 30)).toMatchObject({ paused: true, callLockoutS: 30 }); expect('paused' in r(9, 30)).toBe(false);
  writeFileSync(process.env.QA_PROBE_OUT!, JSON.stringify(out, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v), 1));
});
