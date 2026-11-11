// Critic m4b triage, Item B: what can take ~$1,174 in a few seconds at Player's 10:14 state (fresh farm, F23 just bought).
import { writeFileSync, mkdirSync } from 'node:fs';
const P = '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd223f5/src';
import { balance as b } from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd223f5/src/config/balance';
import { initialState } from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd223f5/src/sim/state';
import { advance } from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd223f5/src/sim/tick';
import { apply } from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd223f5/src/sim/actions';
import * as F from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd223f5/src/config/formulas';
import { trackCost, trackLock } from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd223f5/src/sim/tracks';
import { graderTierCostCents } from '/workspace/egg-farm-studio/qa/scratch/triage-m4b/dd223f5/src/sim/workers';
const out = process.argv[process.argv.length - 1]; mkdirSync(out, { recursive: true });
// Player log levels at 10:14:4x: Farm 23 (just bought), Hens 15 (10:00), Egg value 20 (10:11:44), Collect 15 (10:01), all 4 workers, Grader tier 1 (09:53), coins $1,543.
const W = { energy: 60, cdS: 0 };
const s0 = { ...initialState(b, 7), farmLevel: 23, hensLevel: 15, eggValueLevel: 20, collectionLevel: 15, coinsCents: 154300, basket: 0, coop: 0,
  workers: { market_hand: { ...W }, coop_hand: { ...W }, hawker: { ...W }, grader: { ...W } }, graderTier: 1, tracksV7: 1 } as any;
const res: any = { state: { F: 23, H: 15, V: 20, C: 15, coinsCents: 154300, graderTier: 1 } };
res.wageCentsPerSec = (b.workers.market_hand.wage_per_farm_per_min + b.workers.coop_hand.wage_per_farm_per_min) * 23 / 60 * 100;
// Upper bound for a non-purchase loss: empty basket and coop (no sales possible), 5 s of sim; sum wage events.
{ const ev: any[] = []; const r = advance({ ...s0, coop: 0, basket: 0 }, 5000, 0, b, ev);
  res.noPurchase5s = { coinsDeltaCents: r.state.coinsCents - s0.coinsCents, wageEventsCents: ev.filter(e => e.type === 'wage').reduce((a, e) => a + e.cents, 0), otherCoinEvents: ev.filter(e => ['upgrade', 'worker_hire', 'grader_tier'].includes(e.type)).length }; }
// Every coin sink at this state with its cost.
res.sinks = {
  hens_L16: trackLock(s0, 'hens', b) ? 'locked' : trackCost(15, 'hens', b),
  eggValue_L21: trackLock(s0, 'eggValue', b) ? 'locked' : trackCost(20, 'eggValue', b),
  collect_L16: F.collectionCost(15, b), farm_L24: F.farmCost(23, b), grader_tier2: graderTierCostCents(1, b) / 100,
};
// Hypothesis: income ~$310/s (Player), Hens L16 bought the moment coins reach $1,842 -> coins a few seconds later.
const inc = 310, need = res.sinks.hens_L16;
res.hensHypothesis = { secondsToAffordFrom1543: (need - 1543) / inc, coinsAfterBuy: 0, secondsAfterBuyToShow369: 369 / inc, totalSecondsFrom1543To369: (need - 1543) / inc + 369 / inc };
{ const ev: any[] = []; const s = apply({ ...s0, coinsCents: need * 100 }, { type: 'buyTrack', track: 'hens' }, b, ev); res.hensBuyCheck = { coinsAfter: s.coinsCents, hensLevel: s.hensLevel, events: ev.map(e => e.type) }; }
writeFileSync(`${out}/B-sinks.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
