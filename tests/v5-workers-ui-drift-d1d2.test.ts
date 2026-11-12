// HoE/workers-ui-drift: src/ui/workers-ui.ts follows Saves' sim fix for Workers drift D1/D2 (saves/workers-drift-d1d2 @ 8ee3db1).
// Audit: product/workers/drift-audit-rc-v5-eed62687-20261109.md (sha1 09c2663c), rows 14 (D1) and 15 (D2).
// Spec: product/workers/m5-worker-pause-spec.md v1.3.15 rule 8 / AC-P12 (gate PAU-AC8) and rule 10.
// D1: "Manage all (N need it)" excludes paused workers (promptManage reuses the sim's needManage). AC-P12: 1 paused + 1 unpaused tired -> N = 1.
// D2: resumeAtCents leaves paused workers out of the R9 reserve and the Unpaid-resume queue, and equals the coins at which the sim resumes.
// Every value comes from balance (thresholds, unlock farms, wages via resumeNeedCents); flag-off cases pin the pre-fix UI (E13).
import { describe, it, expect } from 'vitest';
import { balance as b, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { needManage, resumeNeedCents, unlockFarm, type WorkerId } from '../src/sim/workers';
import { isPaused } from '../src/sim/pause';
import type { SimEvent } from '../src/sim/events';
import { promptManage, refillCount, manageAllHtml, showFarmManageAll, navRefillState, refillTiredLabel, resumeAtCents, unpaidCaption, workersHtml } from '../src/ui/workers-ui';

const withFlags = (flags: Record<string, number>, bb: Balance = b) => ({ ...bb, m4: { ...bb.m4!, flags: { ...bb.m4!.flags, ...flags } } }) as Balance;
const P = withFlags({ pause: 1 });
const OFF = b;
const T = Math.round(b.workers.energy.manage_prompt_threshold * 100); // Manage prompt threshold, percent
const FULL = 100; // energy scale (percent)
const HIRED: WorkerId[] = ['market_hand', 'coop_hand', 'hawker'];
const F = Math.max(b.m4!.tc!.pause_unlock_farm as number, ...HIRED.map(id => unlockFarm(id, b)));
const BIG_CD = 1e9; // keeps a worker's own action/wage out of the single checked tick
const st = (o: Partial<GameState> = {}, bb = P): GameState =>
  ({ ...initialState(bb, 1), farmLevel: F, customers: [], nextCustomerInS: 1e9, manageCdS: 0, ...o }) as GameState;
const W = (energy: number, extra: object = {}) => ({ energy, cdS: BIG_CD, ...extra });
const card = (h: string, id: string) => h.match(new RegExp(`<div class="wk [^"]*" data-w="${id}">[\\s\\S]*?(?=<div class="wk |$)`))![0];
const capOf = (c: string) => c.match(/<div class="wk-cap num" id="cap-[a-z_]+">([^<]*)<\/div>/)?.[1] ?? '';

describe('[AC-P12][PAU-AC8][D1] UI: Manage all N excludes paused workers', () => {
  // Audit row 14 case: Manage all with 1 paused and 1 unpaused tired worker (3 hired so Manage all shows).
  const ws = { market_hand: W(T, { paused: true }), coop_hand: W(T), hawker: W(FULL) };
  it('[AC-P12][D1] 1 paused + 1 unpaused tired worker: promptManage = [coop_hand], N = 1 on the Refill bar and the nav badge', () => {
    const s = st({ workers: ws });
    expect(promptManage(s, P)).toEqual(['coop_hand']);
    expect(refillCount(s, P)).toBe(1);
    expect(manageAllHtml(s, P)).toContain(`aria-label="${refillTiredLabel(1)}"`);
    expect(navRefillState(s, P, false, { text: '', at: 0 }, 0)).toMatchObject({ badge: '1', aria: { text: refillTiredLabel(1) } });
    expect(promptManage(s, P)).toEqual(needManage(s.workers, P)); // the UI count is the sim's Manage-all set (no Unpaid here)
  });
  it('[AC-P12][D1] the UI N matches what the sim Manage all refills: only the unpaused worker goes to 100, the paused one is untouched', () => {
    const s = st({ workers: ws });
    const n = apply(s, { type: 'manageAll' }, P);
    expect(n.workers.coop_hand!.energy).toBe(FULL);
    expect(n.workers.market_hand).toEqual(s.workers.market_hand);
    expect(isPaused(n.workers.market_hand, P)).toBe(true);
  });
  it('[D1] only a paused worker is at/below the threshold: N = 0, the Refill bar and Farm View Manage all are hidden', () => {
    const s = st({ workers: { market_hand: W(T, { paused: true }), coop_hand: W(FULL), hawker: W(FULL) } });
    expect(promptManage(s, P)).toEqual([]);
    expect(manageAllHtml(s, P)).toBe('');
    expect(showFarmManageAll(s, P)).toBe(false);
  });
  it('[D1][AC-R15] Unpaid exclusion still holds with the pause flag on (paused MH, Unpaid CH, tired hawker -> N = 1)', () => {
    const s = st({ workers: { market_hand: W(T, { paused: true }), coop_hand: W(T, { unpaid: true }), hawker: W(T) } });
    expect(promptManage(s, P)).toEqual(['hawker']);
  });
  it('[E13][D1] flag off: a stray paused field is ignored, both tired workers count (N = 2, pre-fix behaviour)', () => {
    const s = st({ workers: ws }, OFF);
    expect(promptManage(s, OFF)).toEqual(['market_hand', 'coop_hand']);
    expect(refillCount(s, OFF)).toBe(2);
    expect(manageAllHtml(s, OFF)).toContain(`aria-label="${refillTiredLabel(2)}"`);
  });
});

describe('[D2] UI: resumeAtCents reserve excludes paused workers (pause rule 10)', () => {
  const MH = resumeNeedCents('market_hand', F, b), CH = resumeNeedCents('coop_hand', F, b);
  const resumes = (s: GameState, bb: Balance, id: WorkerId) => {
    const ev: SimEvent[] = []; const n = step(s, 1 / bb.tickHz, bb, ev);
    return !n.workers[id]!.unpaid && ev.some(e => e.type === 'worker_state' && e.worker === id);
  };
  it('[D2] paused working MH + Unpaid CH: CH resumes at its own need only (MH not reserved); caption shows that amount', () => {
    const s = st({ workers: { market_hand: W(FULL, { paused: true }), coop_hand: W(FULL, { unpaid: true }) } });
    expect(resumeAtCents(s, P, 'coop_hand')).toBe(CH);
    expect(capOf(card(workersHtml(s, P), 'coop_hand'))).toBe(unpaidCaption(CH));
  });
  it('[D2] UI X equals the sim resume point: at X coins the tick resumes CH, at X - 1 it does not', () => {
    const base = { workers: { market_hand: W(FULL, { paused: true }), coop_hand: W(FULL, { unpaid: true }) } };
    const x = resumeAtCents(st(base), P, 'coop_hand')!;
    expect(resumes(st({ ...base, coinsCents: x }), P, 'coop_hand')).toBe(true);
    expect(resumes(st({ ...base, coinsCents: x - 1 }), P, 'coop_hand')).toBe(false);
  });
  it('[D2] a paused Unpaid MH is out of the queue: it has no resume point (null) and does not raise CH\'s X; the sim agrees', () => {
    const base = { workers: { market_hand: W(FULL, { paused: true, unpaid: true }), coop_hand: W(FULL, { unpaid: true }) } };
    expect(resumeAtCents(st(base), P, 'market_hand')).toBeNull();
    expect(resumeAtCents(st(base), P, 'coop_hand')).toBe(CH);
    const s = st({ ...base, coinsCents: CH });
    expect(resumes(s, P, 'coop_hand')).toBe(true);
    expect(step(s, 1 / P.tickHz, P).workers.market_hand!.unpaid).toBe(true);
  });
  it('[E13][D2] flag off: the stray paused MH is a paid worker again, so CH needs MH + CH (pre-fix value), matching the sim', () => {
    const base = { workers: { market_hand: W(FULL, { paused: true }), coop_hand: W(FULL, { unpaid: true }) } };
    expect(resumeAtCents(st(base, OFF), OFF, 'coop_hand')).toBe(MH + CH);
    expect(resumes(st({ ...base, coinsCents: MH + CH - 1 }, OFF), OFF, 'coop_hand')).toBe(false);
    expect(resumes(st({ ...base, coinsCents: MH + CH }, OFF), OFF, 'coop_hand')).toBe(true);
  });
});
