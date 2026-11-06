/**
 * M2 18-state diagnostic (pre-fix ship picker).
 * Cite: Architect b6dec409 §M2; D-HOP-2026-11-05-14; spec v1.0.4 4ea3841a; Card #12 9f900304.
 *
 * Pre-fix picker = DualPicker(zgFiltered(scorer with rankable empty→all)).
 * Seeds 1–200 × (runBot seller15 3600s + runM2 workers 7200s), VAR_DEFAULT.
 * Writes engineering/tasks/bbv2/m2-18-state-diagnostic.{json,md} under the studio tree.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { AC14_CONFIGS, seeds } from '../tests/bbv2-sim';
import { meaningfulKeys, options, optionGain, bbv2Mark, paybackOf, type BuyKey } from '../src/econ/best-buy';
import { isZeroGain, zeroGainInputs, zgFiltered } from '../src/ui/zero-gain';
import { DualPicker, type Scorer } from '../src/ui/pick-hysteresis';
import { STATE_TRACE, runBot } from '../tests/bot';
import { runM2 } from '../tests/bot-m2';
import { VAR_DEFAULT } from '../tests/seller-variance';
import { bestBuyV2On } from '../src/config/flags';
import type { GameState } from '../src/sim/state';
import type { Balance } from '../src/config/balance';

const SHIP = AC14_CONFIGS['CONFIRMATORY ship bestBuyV2=1 zeroGainUi=1'];
const LEVEL: Record<BuyKey, (s: GameState) => number> = {
  FARM: s => s.farmLevel, HENS: s => s.hensLevel, VALUE: s => s.eggValueLevel, COLL: s => s.collectionLevel,
  W1: s => +!!s.workers.market_hand, W2: s => +!!s.workers.coop_hand, W3: s => +!!s.workers.hawker,
  W4: s => s.workers.grader ? s.graderTier : 0,
};
/** PRE-FIX rankable: empty meaningful → all keys (ship used this before D-HOP-14). */
const oldRankable = <K extends BuyKey>(s: GameState, b: Balance, keys: readonly K[]): K[] => {
  if (!bestBuyV2On(b)) return [...keys];
  const m = meaningfulKeys(s, b);
  return m.size ? keys.filter(k => m.has(k)) : [...keys];
};
const oldScorerFor = (keys: readonly BuyKey[]): Scorer => (s, b) => {
  const ks = oldRankable(s, b, keys);
  return options(s, b).filter(o => ks.includes(o.key)).map(o => ({
    key: o.key, costCents: Math.round(o.cost * 100), payback: paybackOf(s, b, o.key), level: LEVEL[o.key](s),
  }));
};
const oldAppPicker = () => new DualPicker(
  zgFiltered(oldScorerFor(['FARM', 'HENS', 'VALUE'])),
  zgFiltered(oldScorerFor(['FARM', 'HENS', 'VALUE', 'COLL', 'W1', 'W2', 'W3', 'W4'])),
);

const rows: any[] = [];
let states = 0, suppressedAffordable = 0, below30 = 0;
const perBot: Record<string, number> = {};

const runOne = (bot: string, run: (b: Balance, sd: number) => void) => {
  for (const sd of seeds(1, 200)) {
    const P = oldAppPicker();
    STATE_TRACE.fn = (t, s) => {
      states++;
      const h = P.tick(s, SHIP, t * 1000).hint; if (!h) return;
      const mark = bbv2Mark(h, s, SHIP);
      if (!(h.affordable && mark === null)) return;
      suppressedAffordable++;
      perBot[bot] = (perBot[bot] ?? 0) + 1;
      if (s.farmLevel < 30) { below30++; return; }
      if (rows.length >= 40) return;
      const offered = options(s, SHIP);
      rows.push({
        bot, seed: sd, t, F: s.farmLevel, H: s.hensLevel, V: s.eggValueLevel, C: s.collectionLevel,
        coinsCents: s.coinsCents, selected: h.key, affordable: true, mark: null,
        gains: Object.fromEntries(offered.map(o => [o.key, optionGain(s, SHIP, o.key)?.gain ?? null])),
        dCap: Object.fromEntries(['HENS', 'VALUE', 'COLL'].map(k => {
          const zi = offered.some(o => o.key === k) ? zeroGainInputs(s, SHIP, k as any) : null;
          return [k, zi?.dCap ?? null];
        })),
        zg: Object.fromEntries(['HENS', 'VALUE', 'COLL'].map(k => [
          k, offered.some(o => o.key === k) ? isZeroGain(s, SHIP, k as any) : null,
        ])),
        meaningful: [...meaningfulKeys(s, SHIP)],
        offered: offered.map(o => o.key),
      });
    };
    run(SHIP, sd);
  }
  STATE_TRACE.fn = null;
};

runOne('runBot', (b, sd) => runBot(b, sd, 'seller15', 3600, 15, VAR_DEFAULT));
console.error('runBot done', { states, suppressedAffordable, perBot, below30 });
runOne('runM2', (b, sd) => runM2(b, sd, { model: 'seller15', T: 7200, variance: VAR_DEFAULT }));
console.error('runM2 done', { states, suppressedAffordable, perBot, below30 });

const outDir = '/workspace/egg-farm-studio/engineering/tasks/bbv2';
mkdirSync(outDir, { recursive: true });
const payload = {
  title: 'M2 18-state diagnostic (pre-fix ship picker)',
  generatedAt: new Date().toISOString(),
  method: 'oldAppPicker=DualPicker(zgFiltered(scorer with rankable empty→all)); seeds 1–200; runBot seller15 3600s + runM2 7200s; VAR_DEFAULT; STATE_TRACE @ 1 Hz',
  cite: 'Architect v5-m51-bbv2-b6dec409-architect.md §M2; D-HOP-2026-11-05-14; spec v1.0.4 4ea3841a; Card #12 9f900304',
  counts: { states, suppressedAffordable, below30, perBot, rowsDumped: rows.length },
  note: 'Post-fix rankable(ship empty→[]): CONFIRMATORY suppressedAffordable===0. DECISIVE zg-off net unchanged.',
  states: rows,
};
writeFileSync(`${outDir}/m2-18-state-diagnostic.json`, JSON.stringify(payload, null, 2));
writeFileSync(`${outDir}/m2-18-state-diagnostic.md`, `# M2 18-state diagnostic (pre-fix)

**Cite:** Architect b6dec409 §M2; D-HOP-2026-11-05-14; spec v1.0.4 \`4ea3841a\`; Card #12 \`9f900304\`.

## How generated
Pre-fix ship picker = \`DualPicker(zgFiltered(scorerUsingRankableEmptyToAll))\`.
Seeds 1–200 × (runBot seller15 3600 s + runM2 workers 7200 s), VAR_DEFAULT.
\`STATE_TRACE\` every integer sim second; record when \`hint.affordable && bbv2Mark===null\`.
Script: \`scripts/m2-18-state-diagnostic.ts\` (lane H). JSON: \`m2-18-state-diagnostic.json\`.

## Counts
- states traced: ${states}
- suppressedAffordable (all Farms): ${suppressedAffordable}
- suppressedAffordableBelow30: ${below30}
- per bot: ${JSON.stringify(perBot)}
- rows dumped: ${rows.length}

## Fix (this PR)
Ship \`rankable\`: empty BBv2 set → \`[]\` → no-pick strip / BR-BB4 (v1.0.4 §2.7/§4.1; D-HOP-14).
DECISIVE zg-off keeps empty→all mark-null net. CONFIRMATORY asserts \`suppressedAffordable===0\`.

## Rows (selected / gains / meaningful candidates)
${rows.map((r, i) => `### ${i + 1}. ${r.bot} seed ${r.seed} t=${r.t} F${r.F} H${r.H} V${r.V} C${r.C}
- selected: **${r.selected}** affordable mark=null
- offered: ${r.offered.join(', ')}
- meaningful: ${r.meaningful.length ? r.meaningful.join(', ') : '(empty)'}
- gains: \`${JSON.stringify(r.gains)}\`
- dCap: \`${JSON.stringify(r.dCap)}\`  zg: \`${JSON.stringify(r.zg)}\`
- coinsCents: ${r.coinsCents}`).join('\n\n')}
`);
console.log(JSON.stringify(payload.counts));
