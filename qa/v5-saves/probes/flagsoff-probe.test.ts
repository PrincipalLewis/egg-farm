// v5 RC Saves: flags-off rows FO-1..FO-n (D-HOP-2026-10-30-04). Copied into a scratch worktree of the SHA under test and removed after.
// env: QA_FLAGS (comma list, the flags-off set), QA_PROBE_OUT (jsonl). Run at the candidate and at baseline 458f74c, then compare with
// flagsoff-compare.mjs. Per flag: (1) shipped balance.json m4.flags[f] is 0/absent, (2) validateBalance passes on the flags-off balance,
// (3) state bytes on that flag set, two paths: Game boot + save() (gap 5 s) and fixed-time validate -> m5Load -> serialize (NOW pinned, no saveSeq).
import { it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import raw from '../src/config/balance.json';
import { balance as b, validateBalance } from '../src/config/balance';
import { Game } from '../src/game';
import { serialize, validate, SAVE_KEY } from '../src/save/save';
import { m5Load } from '../src/save/m5-fields';
const NOW = Date.UTC(2026, 9, 30, 9);
const H = (s: string) => createHash('sha256').update(s).digest('hex');
const FLAGS = (process.env.QA_FLAGS ?? '').split(',').filter(Boolean);
const kvm = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
const EXP1 = 'tests/fixtures/saves/m4-exp1-committed-unseen.json';
const FX: [string, () => string][] = [
  ['m4-exp1-committed-unseen.json#ls.eggfarm.save', () => JSON.parse(readFileSync(EXP1, 'utf8')).ls['eggfarm.save']],
  ...['m1-rc2-v4-12min', 'm2-rc1-v5-12min', 'm2-rc1-v5-40min', 'm2-rc1-v5-40min-edge', 'm4-pre-v7-F30-C30'].map(n => [`${n}.json`, () => readFileSync(`tests/fixtures/saves/${n}.json`, 'utf8')] as [string, () => string]),
];
it('flags-off probe', () => {
  const rows: string[] = [];
  const shippedFlags: any = (raw as any).m4?.flags ?? {};
  const FO: any = { ...b, m4: { ...b.m4!, flags: { ...(b.m4 as any).flags, ...Object.fromEntries(FLAGS.map(f => [f, 0])) } } };
  let vb = 'ok'; for (const prod of [false, true]) { try { validateBalance(structuredClone(FO), prod); } catch (e) { vb = `THROW(prod=${prod}) ` + (e as Error).message; } }
  for (const f of FLAGS) rows.push(JSON.stringify({ kind: 'flag', flag: f, shipped: f in shippedFlags ? shippedFlags[f] : 'absent', off: !(shippedFlags[f] === 1), validateBalance: vb }));
  rows.push(JSON.stringify({ kind: 'balance', m4enabled: (raw as any).m4?.enabled, flagsOn: Object.keys(shippedFlags).filter(k => shippedFlags[k] === 1), FOeqShipped: JSON.stringify(FO.m4.flags) === JSON.stringify((b.m4 as any).flags) }));
  for (const [name, get] of FX) {
    const input = get(); const I = JSON.parse(input);
    const v = validate(input, FO, NOW); if (!v.ok) { rows.push(JSON.stringify({ kind: 'save', fixture: name, error: v.reason })); continue; }
    const fixed = serialize(m5Load(v.file.state, FO, NOW, []), NOW); const A = JSON.parse(fixed);
    const kv = kvm(); kv.setItem(SAVE_KEY, input); const t = I.savedAt + 5_000;
    const g = new Game(FO, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' } as any); g.save(); const S = JSON.parse(kv.getItem(SAVE_KEY)!);
    rows.push(JSON.stringify({ kind: 'save', fixture: name, committed: I.state?.tracksV7 === 1, inputSha256: H(input),
      fixed: { fileSha256: H(fixed), stateSha256: H(JSON.stringify(A.state)) }, game: { stateSha256: H(JSON.stringify(S.state)), pending: g.tracksMigrationPending, stateEqInput: JSON.stringify(S.state) === JSON.stringify(I.state) } }));
  }
  writeFileSync(process.env.QA_PROBE_OUT!, rows.join('\n') + '\n');
});
