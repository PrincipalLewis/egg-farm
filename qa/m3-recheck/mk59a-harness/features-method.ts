// Features' progression method (mhmw-gates/mk59.ts prog part, verbatim logic): runM2 seller15 + VAR_DEFAULT, 3600 s, incomeAt(L)*60 per seed.
// Usage: REPO=<worktree> vite-node features-method.ts -- <seedFrom> <seedTo> <out.json>
const R = process.env.REPO!;
const { balance: b0 } = await import(R + '/src/config/balance');
const { runM2 } = await import(R + '/tests/bot-m2');
const { VAR_DEFAULT } = await import(R + '/tests/seller-variance');
import { writeFileSync } from 'node:fs';
const [a, z, out] = process.argv.slice(-3); const res: any[] = [];
for (let seed = +a; seed <= +z; seed++) { const r = runM2(b0, seed, { model: 'seller15', T: 3600, variance: VAR_DEFAULT });
  const inc: Record<number, number | null> = {}, reach: Record<number, number> = {};
  for (let L = 0; L <= 30; L++) { const t = r.reach.get(L); if (t != null) reach[L] = t; }
  for (let L = 3; L <= 25; L++) { const v = r.incomeAt(L); inc[L] = v == null ? null : v * 60; }
  res.push({ seed, inc, reach }); }
writeFileSync(out, JSON.stringify(res));
