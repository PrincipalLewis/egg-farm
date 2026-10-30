// D-HOE-38 (HoE/sim-flag-list): anyM5FlagOn counts SIM flags only. The UI-only flags zeroGainUi and bestBuyV2 must never change
// sim behaviour (F1c fx suspension in sim/tick.ts, the attended probe in game.ts, stepTimers). Source: Architect #97 review,
// engineering/reviews/v5-zerogain-546de85-architect.md "Ruling needed". No balance values are asserted here: every check
// compares two runs on the same config, differing only in one flag.
import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { M5_FLAGS, SIM_M5_FLAGS, UI_ONLY_M5_FLAGS, type M5Flag } from '../src/config/flags';
import { anyM5FlagOn } from '../src/sim/timers';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { Game } from '../src/game';
import { SRC_M5_FLAGS, SRC_M51_FLAGS } from './bot-m5';
import { mem } from './helpers';
import type { SimEvent } from '../src/sim/events';

const ALL0 = Object.fromEntries(M5_FLAGS.map(f => [f, 0])) as Record<M5Flag, number>;
const B = (on: readonly M5Flag[] = []) => ({ ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...ALL0, ...Object.fromEntries(on.map(f => [f, 1])) } } }) as Balance;
const UI_CASES: (readonly M5Flag[])[] = [['zeroGainUi'], ['bestBuyV2'], ['zeroGainUi', 'bestBuyV2']];

describe('D-HOE-38 flag classification', () => {
  it('every M5 flag is classified exactly once, as SIM or UI-only (no unclassified or doubly classified flag)', () => {
    const sim = new Set<string>(SIM_M5_FLAGS), ui = new Set<string>(UI_ONLY_M5_FLAGS);
    expect(sim.size).toBe(SIM_M5_FLAGS.length); expect(ui.size).toBe(UI_ONLY_M5_FLAGS.length);
    for (const f of M5_FLAGS) expect(Number(sim.has(f)) + Number(ui.has(f)), f).toBe(1);
    expect([...SIM_M5_FLAGS, ...UI_ONLY_M5_FLAGS].sort()).toEqual([...M5_FLAGS].sort());
  });
  it('UI-only is exactly zeroGainUi and bestBuyV2 (D-HOE-38); SIM keeps M5_FLAGS order', () => {
    expect([...UI_ONLY_M5_FLAGS]).toEqual(['zeroGainUi', 'bestBuyV2']);
    expect([...SIM_M5_FLAGS]).toEqual(M5_FLAGS.filter(f => !(UI_ONLY_M5_FLAGS as readonly string[]).includes(f)));
  });
  it('bot-m5 O-3 guard lists (SRC_M5_FLAGS, SRC_M51_FLAGS) are SIM flags only', () => {
    for (const f of [...SRC_M5_FLAGS, ...SRC_M51_FLAGS]) expect((SIM_M5_FLAGS as readonly string[]).includes(f), f).toBe(true);
  });
  it('anyM5FlagOn: false for all-0 and for UI-only flags; true for each single SIM flag; needs m4.enabled', () => {
    expect(anyM5FlagOn(B())).toBe(false);
    for (const on of UI_CASES) expect(anyM5FlagOn(B(on)), on.join('+')).toBe(false);
    for (const f of SIM_M5_FLAGS) expect(anyM5FlagOn(B([f])), f).toBe(true);
    for (const f of SIM_M5_FLAGS) expect(anyM5FlagOn({ ...B([f]), m4: { ...B([f]).m4!, enabled: 0 } } as Balance), `${f} enabled 0`).toBe(false);
  });
});

/** 10 min at 10 Hz, alternating focus, with player actions; returns JSON of the full state (incl. rng) and the event trace. */
function play(b: Balance, seed: number): string {
  let s: GameState = { ...initialState(b, seed), coinsCents: 5_000_000 }; const ev: SimEvent[] = [];
  for (let i = 0; i < 6000; i++) {
    s = step(s, 0.1, b, ev, { focus: i % 2 === 0 });
    if (i % 3 === 0) s = apply(s, { type: 'collect' }, b, ev);
    if (i % 50 === 0) s = apply(s, { type: 'sellAll' }, b, ev);
    if (i % 97 === 0) s = apply(s, { type: 'buyFarm' }, b, ev);
  }
  return JSON.stringify({ s, ev });
}

describe('D-HOE-38 UI-only flags leave the sim byte-identical', () => {
  it.each(UI_CASES)('step()/apply(): %s = 1 vs all-0, seeds 1-3 x 6000 ticks: JSON(state incl. rng + events) identical', (...on) => {
    for (let seed = 1; seed <= 3; seed++) {
      const base = play(B(), seed);
      expect(play(B(on), seed), `seed ${seed}`).toBe(base);
    }
  });
  it('control: a SIM flag (streak) does change the sim on the same run', () => {
    expect(play(B(['streak']), 1)).not.toBe(play(B(), 1));
  });

  const T0 = Date.UTC(2026, 9, 30, 12);
  const runGame = (b: Balance, attended: boolean) => {
    let t = T0, calls = 0; const g = new Game(b, mem(), () => t, 7);
    g.setAttendedProbe(() => { calls++; return attended; });
    for (let i = 0; i < 120; i++) { t += 500; g.frame(); }
    t += 61_000; g.frame();
    const v = JSON.parse(JSON.stringify(g.state)); delete v.v6BackupId; return { v: JSON.stringify(v), calls };
  };
  it.each(UI_CASES)('Game: %s = 1 never reads the attended probe and the game state equals all-0', (...on) => {
    const base = runGame(B(), true);
    for (const attended of [true, false]) {
      const r = runGame(B(on), attended);
      expect(r.calls, `attended ${attended}`).toBe(0); expect(r.v, `attended ${attended}`).toBe(base.v);
    }
    expect(base.calls).toBe(0);
  });
  it('control: a SIM flag (streak) reads the probe', () => {
    expect(runGame(B(['streak']), true).calls).toBeGreaterThanOrEqual(120);
  });
});
