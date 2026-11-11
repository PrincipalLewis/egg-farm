// QA probe for pause spec v1.3.9 AC-P1 (L304) on rc/v5 a923206. Not committed: copied into a read-only scratch worktree, removed after.
// (a) fixed-time serialize, the #91 harness path (qa/v5-saves/trace-reviews/pr91-7d59dda/probe-saves.test.ts c8b8a7d1…):
//     validate -> m5Load -> serialize(o, NOW) with NOW = Date.UTC(2026, 9, 30, 9), no saveSeq, m4.flags.pause = 0.
// (b) real path: new Game(...) boot + g.save(), pause = 0, reload gap 5 s (< 60 s): saved `state` vs the (a) output's `state`.
import { it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { balance as b } from '../src/config/balance';
import { serialize, validate, SAVE_KEY } from '../src/save/save';
import { m5Load } from '../src/save/m5-fields';
import { Game } from '../src/game';
import { mem } from './helpers';
const NOW = Date.UTC(2026, 9, 30, 9);
const H = (s: string) => createHash('sha256').update(s).digest('hex');
const OUT = process.env.QA_PROBE_OUT!, DUMP = process.env.QA_DUMP_DIR!;
const f0: any = (b.m4 as any).flags;
const CFG: Record<string, any> = {
  ship: b,                                                                                  // shipped flags (pause 0, abilities 0)
  abOnly: { ...b, m4: { ...b.m4!, flags: { ...f0, abilities: 1, pause: 0 } } },            // the abilities-only golden config (sizing P-12)
};
const stOf = (raw: string) => JSON.stringify(JSON.parse(raw).state);
const FX: [string, () => { main: string; ls?: Record<string, string>; idb?: string | null }][] = [
  ['m2-rc1-v5-40min.json', () => ({ main: readFileSync('tests/fixtures/saves/m2-rc1-v5-40min.json', 'utf8') })],
  ['m2-rc1-v5-12min.json', () => ({ main: readFileSync('tests/fixtures/saves/m2-rc1-v5-12min.json', 'utf8') })],
  ['m2-rc1-v5-40min-edge.json', () => ({ main: readFileSync('tests/fixtures/saves/m2-rc1-v5-40min-edge.json', 'utf8') })],
  ['m1-rc2-v4-12min.json', () => ({ main: readFileSync('tests/fixtures/saves/m1-rc2-v4-12min.json', 'utf8') })],
  ['m4-pre-v7-F30-C30.json', () => ({ main: readFileSync('tests/fixtures/saves/m4-pre-v7-F30-C30.json', 'utf8') })],
  ['m4-exp1-committed-unseen.json#ls.eggfarm.save', () => { const j = JSON.parse(readFileSync('tests/fixtures/saves/m4-exp1-committed-unseen.json', 'utf8')); return { main: j.ls['eggfarm.save'], ls: j.ls, idb: j.idb?.main ?? null }; }],
];
it('AC-P1 (a) fixed-time serialize + (b) real path', () => {
  const rows: string[] = [];
  for (const [name, get] of FX) for (const [cn, bal] of Object.entries(CFG)) {
    const { main, ls, idb } = get();
    const run = () => { const v = validate(main, bal, NOW); if (!v.ok) throw new Error(v.reason); const ev: any[] = []; const o = m5Load(v.file.state, bal, NOW, ev); return { out: serialize(o, NOW), ev: ev.length, same: o === v.file.state }; };
    const a1 = run(), a2 = run();
    const tag = `${name.replace(/[#\/]/g, '_')}.${cn}`; writeFileSync(`${DUMP}/a-${tag}.json`, a1.out);
    // (b) real path, gap 5 s after the input's savedAt
    const t = JSON.parse(main).savedAt + 5_000;
    const kv = mem(); if (ls) for (const [k, v] of Object.entries(ls)) kv.setItem(k, v); else kv.setItem(SAVE_KEY, main);
    const g = idb !== undefined ? new Game(bal, kv, () => t, 7, 'dev', null, idb, { idbBoot: 'ok' }) : new Game(bal, kv, () => t, 7, 'dev', null, null, {});
    const boot = kv.getItem(SAVE_KEY)!; g.save(); const second = kv.getItem(SAVE_KEY)!;
    writeFileSync(`${DUMP}/b-${tag}.json`, second);
    const A = JSON.parse(a1.out), B = JSON.parse(second), I = JSON.parse(main);
    const keysDiff = (x: any, y: any) => [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(k => JSON.stringify(x[k]) !== JSON.stringify(y[k]));
    rows.push(JSON.stringify({ fixture: name, cfg: cn, inputSha256: H(main),
      a: { outSha256: H(a1.out), deterministic: a1.out === a2.out, m5LoadSameObject: a1.same, events: a1.ev, envelope: { version: A.version, savedAt: A.savedAt, saveSeq: A.saveSeq ?? null }, vsInputBytes: a1.out === main, vsInputStateKeys: keysDiff(I.state, A.state) },
      b: { tracksPending: g.tracksMigrationPending, recovery: g.recoveryOutcome ?? null, bootEqSecondState: stOf(boot) === stOf(second), stateSha256: H(JSON.stringify(B.state)), stateEqA: JSON.stringify(B.state) === JSON.stringify(A.state), stateKeysDiffVsA: keysDiff(A.state, B.state), envelopeDiffVsA: keysDiff({ ...A, state: 0 }, { ...B, state: 0 }), stateEqInput: JSON.stringify(B.state) === JSON.stringify(I.state) } }));
  }
  writeFileSync(OUT, rows.join('\n') + '\n');
});
