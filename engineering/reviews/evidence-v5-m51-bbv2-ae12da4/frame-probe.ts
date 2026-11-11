// Architect probe (not committed): resolved game.ts frame catch-up with BBv2 telemetry + income-ref both on.
import { balance as b0 } from '/workspace/wt-arch-review100-ae12da4/src/config/balance';
import { Game } from '/workspace/wt-arch-review100-ae12da4/src/game';
import { mem } from '/workspace/wt-arch-review100-ae12da4/tests/helpers';
const mk = (bb: number, tap: number) => ({ ...b0, m4: { ...b0.m4!, enabled: 1, flags: { ...b0.m4!.flags, bestBuyV2: bb, tapCoins: tap } } }) as typeof b0;
const out: any = {};
for (const [bb, tap] of [[0,0],[1,0],[0,1],[1,1]]) {
  let now = 1_800_000_000_000; const g: any = new Game(mk(bb, tap), mem(), () => now, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
  g.state = { ...g.state, farmLevel: 12, coinsCents: 5e7 };
  for (let i = 0; i < 90; i++) { now += 1000; g.frame(); }         // warm: ring builds under tapCoins
  const before = { ring: 'irefRingCents' in g.state, warm: g.state.refWarmS ?? null, bbSimMs: g.bbSimMs ?? null };
  now += 120_000; g.frame();                                        // gap >= 60 s visible stall: capped catch-up path
  const after = { ring: 'irefRingCents' in g.state, warm: g.state.refWarmS ?? null, bbSimMs: g.bbSimMs ?? null, bbTel: !!g.bbTel };
  now += 1000; g.frame();
  out[`bb${bb}tap${tap}`] = { before, after, next: { ring: 'irefRingCents' in g.state, warm: g.state.refWarmS ?? null } };
}
console.log(JSON.stringify(out, null, 1));
