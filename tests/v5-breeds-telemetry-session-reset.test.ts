// Architect m1 on #127 (engineering/reviews/telemetry-127-04add420-architect.md): the breeds session counters (breedsTel) were not
// reset after session_end and there was no pageshow handler, so a bfcache restore (pagehide -> pageshow{persisted}) made the next
// session_end cumulative. Red-first (HoE/v5-127-restack): these fail on 04add420 + #125 merge, pass with the reset + pageshow guard.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { initialState, type GameState } from '../src/sim/state';
import { hatchCostCents } from '../src/sim/breeds-hatch';
import { sessionEndBreedsFields } from '../src/telemetry/breeds-session';
import type { BreedsSave } from '../src/sim/breeds';
import { mem } from './helpers';

const T0 = Date.UTC(2026, 10, 10, 12);
const BR = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, breeds: 1 } } } as typeof b;
const fresh = (o: Partial<BreedsSave> = {}): BreedsSave => ({ owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0], hatches: 0, pity: 0, rng: 0x9e3779b9,
  freeHatchUsed: 0, flockCompleteLogged: 0, ...o });
const st = (o: Partial<BreedsSave> = {}, F = 12, coins = 0): GameState => ({ ...initialState(b, 7), farmLevel: F, coinsCents: coins, tracksV7: 1 as const, v6BackupId: '0123456789abcdef', breeds: fresh(o) });
const boot = (kv: ReturnType<typeof mem>, t: number) => new Game(BR, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ends = (g: Game) => g.telemetry.events().filter(x => x.type === 'session_end') as any[];
const freeIncubator = (g: Game) => { g.state = { ...g.state, breeds: { ...g.state.breeds!, incubator: null } }; };
describe('m1: breeds session counters reset after session_end; bfcache restore starts fresh (no double-count)', () => {
  it('m1-red-1 bfcache restore: pagehide session_end, pageshow{persisted}, 1 more hatch -> the 2nd session_end counts only that hatch', () => {
    let t = T0; const g = boot(mem(), T0); (g as any).now = () => t; // eslint-disable-line @typescript-eslint/no-explicit-any
    g.state = st({ owned: { leghorn: { stars: 0 } }, freeHatchUsed: 1 }, 16, 1e12);
    const c1 = hatchCostCents(g.state, BR); g.dispatch({ type: 'hatch' });
    g.endSession(); // pagehide (main.ts) -> page enters bfcache with the JS heap intact
    t += 5_000;
    g.onPageShow(t); // #138 R6: pageshow{persisted} with wall time (sid already ended => rotate)
    freeIncubator(g); const c2 = hatchCostCents(g.state, BR); g.dispatch({ type: 'hatch' });
    g.endSession();
    const [e1, e2] = ends(g);
    expect([e1.breed_hatches, e1.breed_spend_cents]).toEqual([1, c1]);
    expect([e2.breed_hatches, e2.breed_spend_cents]).toEqual([1, c2]); // red: [2, c1 + c2]
  });
  it('m1-red-2 session_end resets breedsTel: right after it the breeds session fields read 0 (family seconds too)', () => {
    const g = boot(mem(), T0); let t = T0; (g as any).now = () => t; // eslint-disable-line @typescript-eslint/no-explicit-any
    g.state = st({ owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null], freeHatchUsed: 0 }, 12, 0);
    g.dispatch({ type: 'hatch' }); t += 2_000; g.frame();
    g.endSession();
    expect(ends(g)[0].breed_hatches).toBe(1); expect(ends(g)[0].breed_family_s.A).toBeGreaterThan(0);
    expect(sessionEndBreedsFields(g.state, BR)).toMatchObject({ breed_hatches: 0, breed_spend_cents: 0, breed_present_eggs: 0, breed_away_eggs: 0,
      breed_broody_cents: 0, breed_family_s: { P: 0, A: 0, B: 0 } });
  });
  // DESIGN: the old m1-red-3 asserted a standalone pageshow{persisted} guard (and a no-op for persisted=false)
  // even when endSession was skipped (e.g. held). #138 telemetryShown no-ops when hiddenAt is null, and R7
  // frozen tabs never rotate or reset. The standalone guard would also have wiped a still-live sid.
  // After #138, a live session keeps its breeds counters until contributor reset() / resetSessionFields
  // on a real rotation (or endSession).
  it('m1-red-3 pageshow without a prior hide does not wipe live-session breeds counters (#138 hiddenAt/R7)', () => {
    const g = boot(mem(), T0); g.state = st({}, 10, 0); g.dispatch({ type: 'hatch' });
    g.onPageShow(T0);
    expect(sessionEndBreedsFields(g.state, BR)).toMatchObject({ breed_hatches: 1 });
  });
});
