// Usage: vite-node gen.ts <worktree> <out> <minutes> <m2:0|1>
const [root, out, mins, m2] = process.argv.slice(2);
const { balance: b } = await import(root + '/src/config/balance.ts');
const { initialState } = await import(root + '/src/sim/state.ts');
const { step } = await import(root + '/src/sim/tick.ts');
const { apply } = await import(root + '/src/sim/actions.ts');
const { save } = await import(root + '/src/save/save.ts');
let s = initialState(b, 42); const dt = 1 / b.tickHz; const T = +mins * 60;
for (let t = 0, i = 0; t < T; t += dt, i++) {
  s = step(s, dt, b, []);
  if (i % b.tickHz === 0) {
    s = apply(s, { type: 'collect' }, b, []);
    if ((i / b.tickHz) % 15 === 0) s = apply(s, { type: 'sellAll' }, b, []);
    for (const a of [{ type: 'buyFarm' }, { type: 'buyCollection' }]) s = apply(s, a as any, b, []);
    if (m2 === '1') { for (const w of ['market_hand', 'coop_hand', 'hawker', 'grader']) s = apply(s, { type: 'hire', worker: w } as any, b, []);
      s = apply(s, { type: 'buyGraderTier' } as any, b, []); if ((i / b.tickHz) % 120 === 0) s = apply(s, { type: 'manageAll' } as any, b, []); }
  }
}
const kv = { v: '', getItem: () => kv.v, setItem: (_k: string, v: string) => { kv.v = v; } };
save(kv as any, s, Date.UTC(2026, 9, 15, 18, 0, 0));
(await import('node:fs')).writeFileSync(out, kv.v);
console.log(out, JSON.stringify({ v: JSON.parse(kv.v).version, F: s.farmLevel, C: s.collectionLevel, coins: s.coinsCents, workers: s.workers, tier: s.graderTier }));
