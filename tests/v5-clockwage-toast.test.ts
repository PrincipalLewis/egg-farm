// @vitest-environment jsdom
// Architect review M1 (AC-FC9, manifest row 26): fall-asleep toast only on Working/Tired -> Asleep; Asleep <-> Unpaid flips and the
// Unpaid -> resume event never toast; same-tick MH + CH -> 2 toasts, queued (never overwritten).
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import type { SimEvent } from '../src/sim/events';
import { FallAsleepToasts, asleepToast } from '../src/ui/clock-wage-ui';
import { Game } from '../src/game';
import { mem } from './helpers';
const C = { ...b, m4: { ...b.m4!, enabled: 1, flags: { ...b.m4!.flags, clockWage: 1 } } } as typeof b;
const DT = 1 / b.tickHz;
const st = (o: Partial<GameState>): GameState => ({ ...initialState(b, 1), customers: [], nextCustomerInS: 1e9, farmLevel: 12, coinsCents: 100_000, coop: 0, ...o }) as GameState;
/** Drive step() like the shell: observe once per "frame", feed every worker_state event to the tracker. */
const run = (s: GameState, n: number, f = new FallAsleepToasts(), edit?: (i: number, s: GameState) => GameState) => {
  const toasts: string[] = []; f.observe(s, C);
  for (let i = 1; i <= n; i++) { if (edit) s = edit(i, s); const ev: SimEvent[] = []; s = step(s, DT, C, ev);
    for (const e of ev) if (e.type === 'worker_state' && f.onState(e.worker, e.state)) toasts.push(e.worker); f.observe(s, C); }
  return { s, toasts };
};
describe('[M1 / AC-FC9] fall-asleep onset', () => {
  it('Working -> Asleep toasts once', () => {
    expect(run(st({ workers: { market_hand: { energy: 0.02, cdS: 0.5 } } }), 5).toasts).toEqual(['market_hand']);
  });
  it('Tired -> Asleep toasts once', () => {
    expect(run(st({ workers: { coop_hand: { energy: 0.02, cdS: 0.5 } } }), 5).toasts).toEqual(['coop_hand']);
  });
  it('Asleep <-> Unpaid flips (AC-FC19 a-d) and the Unpaid -> resume worker_state{asleep} add no toast: count stays 1', () => {
    // MH + CH fall asleep, coins run out (flip to Unpaid), then coins added (resume -> worker_state asleep), repeatedly
    const r = run(st({ coinsCents: 400, workers: { market_hand: { energy: 0.02, cdS: 0.1 }, coop_hand: { energy: 0.02, cdS: 0.1 } } }), 3000, undefined,
      (i, s) => i % 600 === 0 ? { ...s, coinsCents: s.coinsCents + 600 } : s);
    expect(r.toasts.sort()).toEqual(['coop_hand', 'market_hand']); // one onset each, whatever the flips
  });
  it('the resume event alone (Unpaid -> asleep) never toasts', () => {
    const f = new FallAsleepToasts(); const s = st({ coinsCents: 10_000, workers: { coop_hand: { energy: 0, cdS: 0, unpaid: true } } });
    f.observe(s, C); const ev: SimEvent[] = []; step(s, DT, C, ev);
    expect(ev.some(e => e.type === 'worker_state' && e.state === 'asleep')).toBe(true);
    expect(ev.filter(e => e.type === 'worker_state').map(e => e.type === 'worker_state' && f.onState(e.worker, e.state))).toEqual([false]);
  });
});

describe('[M1] same tick MH + CH -> 2 toasts through the queue (app)', () => {
  beforeAll(() => {
    window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
    (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
    (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
  });
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });
  it('MH shows first, CH follows after the first toast ends; neither overwrites the other', async () => {
    vi.useFakeTimers();
    const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k);
    const g = new Game(C, kv, () => 1_760_000_000_000, 1, 'dev', null, null, { idbBoot: 'absent' });
    g.state = { ...g.state, farmLevel: 12, coinsCents: 100_000, workers: {} };
    const { mountApp } = await import('../src/ui/app');
    document.body.innerHTML = '<div id="app"></div>';
    const ui = mountApp(document.getElementById('app')!, g, C, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
    ui.render(); vi.advanceTimersByTime(10_000); ui.render(); // drain boot toasts (e.g. "Coop upgraded!")
    g.state = { ...g.state, workers: { market_hand: { energy: 0.02, cdS: 0.5 }, coop_hand: { energy: 0.02, cdS: 0.5 } } }; ui.render(); g.debugAdvance(1000);
    const t = document.querySelector(".toast")!;
    expect(t.textContent).toBe(asleepToast('market_hand', C)); expect(t.classList.contains('cw-b1')).toBe(true);
    vi.advanceTimersByTime(1300 + 250 + 10);
    expect(t.textContent).toBe(asleepToast('coop_hand', C));
    ui.dispose();
  });
});
