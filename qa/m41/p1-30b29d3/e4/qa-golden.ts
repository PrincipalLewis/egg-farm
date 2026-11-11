// QA-owned recompute of the AC7 flag-off golden (GOLDEN1 "sim trace") + SS-27 per-seed AC7 bot trace hashes (seeds 1..200).
// usage: (cd <clone> && npx vite-node <this> -- <clone> [seeds]). Uses the clone's SHIPPED balance as built (no in-process forcing),
// so on the flag-off clone (balance.json m4.enabled=0) it measures the real flag-off build. Prints m4.enabled it saw.
import { createHash } from 'node:crypto';
const R = process.argv.filter(a => a.startsWith('/')).pop()!; const NS = +(process.env.SEEDS ?? 200);
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const { balance: b } = await import(R + '/src/config/balance.ts');
const { step } = await import(R + '/src/sim/tick.ts'); const { initialState } = await import(R + '/src/sim/state.ts');
const { apply } = await import(R + '/src/sim/actions.ts'); const { applyOffline } = await import(R + '/src/sim/offline.ts');
const { runBot } = await import(R + '/tests/bot.ts'); const { runM2 } = await import(R + '/tests/bot-m2.ts');
console.log('clone', R, 'm4.enabled', (b as any).m4?.enabled);
if (process.env.GOLDEN !== '0') {
  const out: unknown[] = [];
  for (const model of ['seller15', 'cheapest']) for (let seed = 1; seed <= 6; seed++) { const r = runBot(b, seed, model as any, 1800); out.push([model, seed, r.firstUpgradeS, Array.from({ length: 31 }, (_, i) => [r.farmAt(i * 60), r.upgradesAt(i * 60)])]); }
  let s: any = { ...initialState(b, 7), coinsCents: 5_000_000 }; const ev: any[] = [];
  for (let i = 0; i < 6000; i++) { s = step(s, 0.1, b, ev);
    if (i % 3 === 0) s = apply(s, { type: 'collect' }, b, ev); if (i % 50 === 0) s = apply(s, { type: 'sellAll' }, b, ev);
    if (i % 97 === 0) s = apply(s, { type: 'buyFarm' }, b, ev); if (i % 131 === 0) s = apply(s, { type: 'buyCollection' }, b, ev);
    if (i % 400 === 0) for (const w of ['market_hand', 'coop_hand', 'hawker', 'grader'] as const) s = apply(s, { type: 'hire', worker: w }, b, ev);
    if (i % 700 === 0) s = apply(s, { type: 'buyGraderTier' }, b, ev); }
  const off = applyOffline(s, 5_400_000, b); const { hensLevel, eggValueLevel, celebratedMilestones, ...core } = s; out.push(core, ev, off.eggs);
  console.log('GOLDEN1 ' + sha(JSON.stringify(out)));
}
if (process.env.AC7 !== '0') {
  const per: string[] = [];
  for (let sd = 1; sd <= NS; sd++) {
    const m2 = runM2(b, sd, { model: 'seller15', use: [], T: 1800 }); const bt = runBot(b, sd, 'seller15' as any, 1800);
    per.push(sha(JSON.stringify([[...m2.reach.entries()], Array.from({ length: 31 }, (_, i) => [bt.farmAt(i * 60), bt.upgradesAt(i * 60)]), bt.firstUpgradeS])));
  }
  console.log('AC7SEEDS 1..' + NS + ' ' + sha(per.join('\n')));
  console.log('AC7PER ' + JSON.stringify(per.map(x => x.slice(0, 12))));
}
