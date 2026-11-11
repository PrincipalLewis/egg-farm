// PR #12 repro: stale IndexedDB copy WITH saveSeq + older savedAt vs newer flag-off localStorage save WITHOUT saveSeq.
// Boot step = reconcile() (idb-mirror.ts). Expected: the newer LS save wins ('ls'), LS bytes untouched. Exit 1 on FAIL.
// Usage: cd <worktree> && flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 ./node_modules/.bin/vite-node <this> "$PWD"
const root = process.argv[2] ?? process.cwd();
const S = await import(root + '/src/save/save.ts'); const I = await import(root + '/src/save/idb-mirror.ts');
const { balance } = await import(root + '/src/config/balance.ts'); const { initialState } = await import(root + '/src/sim/state.ts');
const off = balance.m4 ? { ...balance, m4: { ...balance.m4, enabled: 0 } } : balance; const NOW = 1790000000000;
const base = { ...initialState(off) }; for (const k of ['hensLevel', 'eggValueLevel', 'celebratedMilestones', 'tracksV7']) delete base[k];
const mk = (coins, savedAt, seq) => { const sj = JSON.stringify({ ...base, coinsCents: coins }); return `{"version":6,"savedAt":${savedAt},${seq ? `"saveSeq":${seq},` : ''}"sum":"${S.checksum(sj)}","state":${sj}}`; };
const idbRaw = mk(111, NOW - 600_000, 5);          // stale copy written by an M4-format session (saveSeq 5), 10 min old
const m = new Map(); const kv = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) };
S.save(kv, { ...base, coinsCents: 999 }, NOW - 1_000, off); // real flag-off write path: no saveSeq, 1 s old
const lsBefore = kv.getItem(S.SAVE_KEY);
const pick = I.reconcile(kv, idbRaw, off, NOW);
const coins = JSON.parse(kv.getItem(S.SAVE_KEY)).state.coinsCents;
const ok = pick === 'ls' && coins === 999 && kv.getItem(S.SAVE_KEY) === lsBefore && !lsBefore.includes('"saveSeq"');
console.log(JSON.stringify({ root, lsHasSaveSeq: lsBefore.includes('"saveSeq"'), pick, restoredCoins: coins, expected: { pick: 'ls', coins: 999 } }));
console.log(ok ? 'PASS: newer flag-off save kept' : 'FAIL: stale IDB copy (saveSeq) outranked newer flag-off save -> rollback');
process.exit(ok ? 0 : 1);
