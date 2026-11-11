#!/usr/bin/env python3
"""Apply one named mutation to the #80 worktree (exactly one match per edit). Revert with git checkout -- src."""
import sys, pathlib
R = pathlib.Path('/workspace/egg-farm-studio/qa/scratch/wt-pr80-aa0ed32')
M = {
 'Q1-every-tick-focus': [('src/sim/tick.ts', 'const nFocus = clock ? focusTicks(clock.focusMs, dtMs) : 0;', 'const nFocus = clock && clock.focusMs > 0 ? Infinity : 0;')],
 'Q2a-offline-legacy-live-ctx': [('src/sim/offline.ts', 'offlineEggs(awayMs / 1000, s.farmLevel, b, prodEggsPerSec(s, b), offlineMult(s, b))', 'offlineEggs(awayMs / 1000, s.farmLevel, b, prodEggsPerSec(s, b, { suspended: false }), offlineMult(s, b))')],
 'Q2b-offline-m4-live-layfactor': [('src/sim/offline.ts', 'm4OfflineEggs(awayMs / 1000, s.hensLevel, b, offlineMult(s, b))', 'm4OfflineEggs(awayMs / 1000, s.hensLevel, b, offlineMult(s, b) * layFactor(s, b, { suspended: false }))'),
                                   ('src/sim/offline.ts', "import { m4On, clampL } from '../config/formulas';", "import { m4On, clampL } from '../config/formulas';\nimport { layFactor } from './effects';")],
 'Q3-incomePerSec-live-ctx': [('src/econ/income.ts', 'Math.min(prodEggsPerSec(s, b), demandPerSec', 'Math.min(prodEggsPerSec(s, b, { suspended: false }), demandPerSec')],
 'C1-playerSaleCtx-always-attended': [('src/sim/effects.ts', "export const playerSaleCtx = (attended: boolean): SaleCtx => attended ? PLAYER_SALE : { by: 'player', suspended: true };", "export const playerSaleCtx = (_attended: boolean): SaleCtx => PLAYER_SALE;")],
 'C2-Game.playerSaleCtx-ignores-attended': [('src/game.ts', 'playerSaleCtx(): SaleCtx { return playerSaleCtx(this.attendedNow()); }', 'playerSaleCtx(): SaleCtx { return playerSaleCtx(true); }')],
 'C3-sellAllPreview-drops-ctx': [('src/sim/payout.ts', 'cents += saleValueCents(s, k, b, ctx);', 'cents += saleValueCents(s, k, b);')],
 'E1-ccr-suspended-ignored': [('src/sim/effects.ts', 'if (ctx.suspended || !effects.length) return [];', 'if (!effects.length) return [];')],
 'E2-ccr-tick-never-suspended': [('src/sim/tick.ts', 'fx = live ? { suspended: !clock?.focus } : undefined', 'fx = live ? { suspended: false } : undefined')],
 'S1-ccr-sellAll-ignores-attended': [('src/sim/actions.ts', "r = sellTo(r, c.id, b, ev, 'player', !attended); }", "r = sellTo(r, c.id, b, ev, 'player', false); }")],
}
for f, a, b in M[sys.argv[1]]:
    p = R / f; t = p.read_text(); n = t.count(a)
    assert n == 1, f'{sys.argv[1]}: {n} matches in {f}'
    p.write_text(t.replace(a, b)); print(f'applied {sys.argv[1]} to {f}')
