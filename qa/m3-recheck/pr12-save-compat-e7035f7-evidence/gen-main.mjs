// run in main tree: write real main saves (fresh, played 10/30 min with actions)
const root = process.argv[2], outdir = process.argv[3]; const fs = await import('node:fs');
const S = await import(root + '/src/save/save.ts'); const { balance: b } = await import(root + '/src/config/balance.ts');
const { initialState } = await import(root + '/src/sim/state.ts'); const { apply } = await import(root + '/src/sim/actions.ts'); const { step } = await import(root + '/src/sim/tick.ts');
for (const [name, n] of [['fresh', 0], ['10min', 6000], ['30min', 18000]]) {
  let s = initialState(b, 3); const ev = [];
  for (let i = 0; i < n; i++) { s = step(s, 0.1, b, ev); if (i % 3 === 0) s = apply(s, { type: 'collect' }, b, ev); if (i % 50 === 0) s = apply(s, { type: 'sellAll' }, b, ev);
    if (i % 97 === 0) s = apply(s, { type: 'buyFarm' }, b, ev); if (i % 131 === 0) s = apply(s, { type: 'buyCollection' }, b, ev);
    if (i % 400 === 0) for (const w of ['market_hand','coop_hand','hawker','grader']) s = apply(s, { type: 'hire', worker: w }, b, ev); }
  const m = new Map(); const kv = { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  fs.writeFileSync(`${outdir}/main-2700804-${name}.json`, S.save(kv, s, 1789000000000 + n, b));
}
