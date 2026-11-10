// Hire2/v5-pause-ui: Pause toggle + "All workers paused" line (product/workers/m5-worker-pause-spec.7536acfa.md v1.3.17 §5 rules 1–2, §8;
// AC-P1 DOM part, AC-P2, AC-P7, AC-P15 aria part, AC-P17 copy part). Pure markup + the UI debounce; layout/pixel ACs are browser checks.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/tick';
import { workersHtml } from '../src/ui/workers-ui';
import { pauseUiOn, pauseToggleLabel, pausedSubline, allWorkersPaused, allPausedHtml, PauseDebounce, PAUSE_COPY, pauseAnnouncement } from '../src/ui/pause-ui';

const tc = b.m4!.tc!;
const withPause = (pause: number, enabled = 1, tcOver: Record<string, number> = {}) =>
  ({ ...b, m4: { ...b.m4!, enabled, flags: { ...b.m4!.flags, pause }, tc: { ...tc, ...tcOver } } }) as typeof b;
const P = withPause(1);
const UNLOCK = tc.pause_unlock_farm, DEB_MS = tc.pause_toggle_debounce_s * 1000;
const W = (energy: number, o: Record<string, unknown> = {}) => ({ energy, cdS: 0.7, ...o });
const st = (o: Partial<GameState> = {}): GameState => ({ ...initialState(b, 1), customers: [], nextCustomerInS: 1e9, farmLevel: UNLOCK, coinsCents: 1e6, graderTier: 1, ...o }) as GameState;
const crew = (o: Record<string, unknown> = {}) => ({ market_hand: W(80, o), coop_hand: W(60, o), hawker: W(40, o), grader: W(25, o) });
const card = (h: string, id: string) => h.match(new RegExp(`<div class="wk [^"]*" data-w="${id}">[\\s\\S]*?(?=<div class="wk |$)`))![0];
const toggles = (h: string) => h.match(/<button class="btn pz-toggle"[^>]*>/g) ?? [];

describe('[AC-P1] flag off: no pause markup, byte-identical card', () => {
  it('shipped balance has pause = 0 and pauseUiOn is false', () => { expect(b.m4!.flags!.pause).toBe(0); expect(pauseUiOn(st({ workers: crew() }), b)).toBe(false); });
  it('pause = 0 / m4.enabled = 0: workersHtml identical with and without a stray paused:true, and no pz- markup', () => {
    for (const bb of [b, withPause(0), withPause(1, 0)]) {
      const plain = workersHtml(st({ workers: crew() }), bb), stray = workersHtml(st({ workers: crew({ paused: true }) }), bb);
      expect(stray).toBe(plain);
      expect(plain).not.toMatch(/pz-|data-act="pause"|All workers paused|Paused/);
    }
  });
  it('flag off output equals the shipped-balance output (no pause branch reached)', () => {
    const s = st({ workers: crew() });
    expect(workersHtml(s, withPause(0))).toBe(workersHtml(s, b));
  });
});

describe('[AC-P2] unlock: no toggle below tc_pause_unlock_farm, one per hired worker at it', () => {
  it(`F${UNLOCK - 1}: none; F${UNLOCK}: exactly one per hired worker`, () => {
    expect(toggles(workersHtml(st({ farmLevel: UNLOCK - 1, workers: crew() }), P))).toHaveLength(0);
    expect(toggles(workersHtml(st({ workers: crew() }), P))).toHaveLength(4);
    expect(toggles(workersHtml(st({ workers: { market_hand: W(80), coop_hand: W(60) } }), P))).toHaveLength(2);
  });
  it('below the unlock: no all-paused line either', () => { expect(allPausedHtml(st({ farmLevel: UNLOCK - 1, workers: crew({ paused: true }) }), P)).toBe(''); });
});

describe('[AC-P15 aria] toggle markup', () => {
  it('working: icon-pause, aria-label "Pause {role}", aria-pressed=false; first item of the action row', () => {
    const c = card(workersHtml(st({ workers: crew() }), P), 'market_hand');
    const t = c.match(/<button class="btn pz-toggle"[^>]*>[\s\S]*?<\/button>/)![0];
    expect(t).toContain('aria-label="Pause Market Hand"'); expect(t).toContain('aria-pressed="false"'); expect(t).toContain('icon-pause.svg');
    expect(t).toContain('type="button"'); expect(t).not.toMatch(/[\u23F8\u25B6]/);
    expect(c).toMatch(/<div class="wk-refill has-pz"><button class="btn pz-toggle"/); // leftmost, before Refill
  });
  it('paused: icon-resume, aria-label "Resume {role}", aria-pressed=true', () => {
    const c = card(workersHtml(st({ workers: crew({ paused: true }) }), P), 'grader');
    expect(c).toContain('aria-label="Resume Egg Grader"'); expect(c).toContain('aria-pressed="true"'); expect(c).toContain('icon-resume.svg');
  });
  it('label helper', () => { expect(pauseToggleLabel('Hawker', false)).toBe('Pause Hawker'); expect(pauseToggleLabel('Hawker', true)).toBe('Resume Hawker'); });
});

describe('[AC-P17 copy] paused card', () => {
  it('pill "Paused", sub-line "On break · no wage · recovering" at 40%, no yawn cue at <= yawn_at_pct', () => {
    const e = Math.min(40, b.workers.energy.yawn_at_pct);
    const c = card(workersHtml(st({ workers: { market_hand: W(e, { paused: true }) } }), P), 'market_hand');
    expect(c).toContain('<span class="pz-pill">Paused</span>');
    expect(c).toContain(`<div class="meta pz-sub">${PAUSE_COPY.recovering}</div>`);
    expect(c).not.toContain('yawn-ov'); expect(c).not.toMatch(/class="wk [^"]*\byawn\b/);
    expect(c).toMatch(/class="wk [^"]*\bpaused\b/);
  });
  it('sub-line variants: 100% rested; rest_recovery_mult = 0 -> no "recovering"', () => {
    expect(pausedSubline(W(100, { paused: true }), P)).toBe('Paused · Rested 100%');
    expect(pausedSubline(W(40, { paused: true }), P)).toBe('On break · no wage · recovering');
    expect(pausedSubline(W(40, { paused: true }), withPause(1, 1, { rest_recovery_mult: 0 }))).toBe('On break · no wage');
  });
  it('paused at 0% shows no asleep banner; an Unpaid paused worker keeps its unpaid banner (G3)', () => {
    expect(card(workersHtml(st({ workers: { market_hand: W(0, { paused: true }) } }), P), 'market_hand')).not.toContain('wk-banner');
    expect(card(workersHtml(st({ workers: { market_hand: W(60, { paused: true, unpaid: true }) } }), P), 'market_hand')).toContain('wk-banner unpaid');
  });
  it('an unpaused card with the flag on keeps its rc1 state word', () => {
    expect(card(workersHtml(st({ workers: crew() }), P), 'market_hand')).toContain('<span class="st">Working</span>');
  });
});

describe('"All workers paused" line', () => {
  it('shows only when every hired worker is paused', () => {
    expect(allWorkersPaused(st({ workers: {} }), P)).toBe(false);
    expect(allWorkersPaused(st({ workers: { ...crew({ paused: true }), hawker: W(40) } }), P)).toBe(false);
    const h = workersHtml(st({ workers: crew({ paused: true }) }), P);
    expect(h).toContain('<div class="pz-all">All workers paused</div>');
    expect(h.match(/pz-all/g)).toHaveLength(1);
    expect(h).not.toMatch(/<div class="pz-all"[^>]*(tabindex|data-act)/);
  });
  it('announcement copy', () => {
    expect(pauseAnnouncement('Coop Hand', true, false)).toBe('Coop Hand paused.');
    expect(pauseAnnouncement('Coop Hand', true, true)).toBe('Coop Hand paused. All workers paused.');
    expect(pauseAnnouncement('Coop Hand', false, false)).toBe('Coop Hand back to work.');
  });
});

describe('[AC-P7] debounce (UI, tc_pause_toggle_debounce_s)', () => {
  it('two taps 1.5 s apart -> 1 accepted; 2.1 s apart -> 2; per worker', () => {
    const d = new PauseDebounce();
    expect(d.accept('market_hand', 0, P)).toBe(true); expect(d.accept('market_hand', 1500, P)).toBe(false);
    expect(d.accept('coop_hand', 1500, P)).toBe(true); // independent per worker
    const d2 = new PauseDebounce();
    expect(d2.accept('market_hand', 0, P)).toBe(true); expect(d2.accept('market_hand', 2100, P)).toBe(true);
  });
  it('the window follows the tunable', () => {
    const d = new PauseDebounce(), B3 = withPause(1, 1, { pause_toggle_debounce_s: 3 });
    expect(d.accept('hawker', 0, B3)).toBe(true); expect(d.accept('hawker', DEB_MS + 500, B3)).toBe(false); expect(d.accept('hawker', 3000, B3)).toBe(true);
  });
});

describe('pause / resume actions (dispatch path the toggle uses)', () => {
  it('flag on: pause then resume in the same tick; Market Hand resume starts the call lockout', () => {
    const s0 = st({ workers: crew() });
    const s1 = apply(s0, { type: 'pause', worker: 'market_hand' }, P);
    expect(s1.workers.market_hand!.paused).toBe(true);
    const s2 = apply(s1, { type: 'resume', worker: 'market_hand' }, P);
    expect(s2.workers.market_hand!.paused).toBe(false); expect(s2.workers.market_hand!.callLockoutS).toBe(tc.pause_call_lockout_s);
    expect(s2.workers.market_hand!.cdS).toBe(0.7); // G4: cdS untouched
  });
  it('flag off / below unlock / not hired / already paused: same state object (tap guard refuses, no dispatch)', () => {
    const s0 = st({ workers: crew() });
    expect(apply(s0, { type: 'pause', worker: 'market_hand' }, b)).toBe(s0);
    expect(apply(s0, { type: 'resume', worker: 'market_hand' }, P)).toBe(s0);
    const low = st({ farmLevel: UNLOCK - 1, workers: crew() });
    expect(apply(low, { type: 'pause', worker: 'market_hand' }, P)).toBe(low);
    const none = st({ workers: {} });
    expect(apply(none, { type: 'pause', worker: 'hawker' }, P)).toBe(none);
  });
  it('a paused card renders after a sim step (recovering, toggle still Resume)', () => {
    let s = apply(st({ workers: { market_hand: W(20) } }), { type: 'pause', worker: 'market_hand' }, P);
    for (let i = 0; i < 10; i++) s = step(s, 0.1, P);
    const c = card(workersHtml(s, P), 'market_hand');
    expect(c).toContain('aria-label="Resume Market Hand"'); expect(c).toContain(PAUSE_COPY.recovering);
  });
});

// HoP D-HOP-2026-11-10-20 (G0 §9) and G0 §7.5 (B5 lockout on every resume).
import { callLockoutView } from '../src/ui/pause-ui';
import { routeCardManage, setShiftSheetOpener } from '../src/ui/card-manage-route';
const withRc2 = (pause: number, rc2: number) => ({ ...b, m4: { ...b.m4!, enabled: 1, flags: { ...b.m4!.flags, pause, rc2Refill: rc2 } } }) as typeof b;
describe('[D-HOP-2026-11-10-20] card toggle only with rc2Refill = 0', () => {
  it('pause = 1, rc2Refill = 1: no toggle, no all-paused line, markup equals pause = 0', () => {
    const R = withRc2(1, 1), s = st({ workers: crew({ paused: true }) });
    expect(pauseUiOn(s, R)).toBe(false); expect(toggles(workersHtml(s, R))).toHaveLength(0); expect(workersHtml(s, R)).not.toContain('pz-all');
    expect(pauseUiOn(s, withRc2(1, 0))).toBe(true);
  });
  it('card Manage routes to the Shift sheet with entry "card" only at rc2Refill = 1 and only once an opener is registered', () => {
    const calls: unknown[] = [];
    expect(routeCardManage('market_hand', withRc2(1, 1))).toBe(false); // no opener yet (Features dependency)
    setShiftSheetOpener((w, e) => calls.push([w, e]));
    try {
      expect(routeCardManage('market_hand', withRc2(1, 0))).toBe(false); expect(routeCardManage('coop_hand', b)).toBe(false);
      expect(routeCardManage('coop_hand', withRc2(0, 1))).toBe(true); expect(calls).toEqual([['coop_hand', 'card']]);
    } finally { setShiftSheetOpener(null); }
  });
});
describe('[AC-P9 / B5] call lockout view (read from state set by tc_pause_call_lockout_s)', () => {
  it('after a Market Hand resume the view counts from the tunable; null when none, flag off or Coop Hand', () => {
    const s = apply(apply(st({ workers: crew() }), { type: 'pause', worker: 'market_hand' }, P), { type: 'resume', worker: 'market_hand' }, P);
    const L = tc.pause_call_lockout_s, v = callLockoutView(s, P)!;
    expect(v.left).toBe(L); expect(v.text).toBe(`${Math.floor(L / 60)}:${String(L % 60).padStart(2, '0')}`); expect(v.describedBy).toBe(`Ready in ${v.text} after a break`);
    expect(callLockoutView(s, b)).toBeNull(); expect(callLockoutView(st({ workers: crew() }), P)).toBeNull();
    const c = apply(apply(st({ workers: crew() }), { type: 'pause', worker: 'coop_hand' }, P), { type: 'resume', worker: 'coop_hand' }, P);
    expect(callLockoutView(c, P)).toBeNull();
  });
  it('rounds up, never "0:00": 0.05 s left -> "0:01"; 10 s of sim -> L - 10', () => {
    const one = st({ workers: { market_hand: W(80, { callLockoutS: 0.05 }) } });
    expect(callLockoutView(one, P)!.text).toBe('0:01');
    let s = apply(apply(st({ workers: { market_hand: W(80) } }), { type: 'pause', worker: 'market_hand' }, P), { type: 'resume', worker: 'market_hand' }, P);
    for (let i = 0; i < 100; i++) s = step(s, 0.1, P);
    expect(callLockoutView(s, P)!.left).toBe(tc.pause_call_lockout_s - 10);
  });
});

// QA-D-1030-ACP1-B: the committed tracksV7 fixture with hired workers (tests/fixtures/saves/m5-pause-committed-hired.json, Saves 8e7532e)
// booted through the real Game path, then rendered: AC-P2 one toggle per hired worker; pause/resume round-trip through the UI actions.
import { readFileSync } from 'node:fs';
import { Game } from '../src/game';
import { SAVE_KEY } from '../src/save/save';
import { mem } from './helpers';
describe('[AC-P2/P13 UI] committed fixture with hired workers', () => {
  const fx = JSON.parse(readFileSync(new URL('./fixtures/saves/m5-pause-committed-hired.json', import.meta.url), 'utf8'));
  const raw: string = fx.ls[SAVE_KEY], t0 = JSON.parse(raw).savedAt as number;
  const boot = (bb: typeof b) => { const kv = mem(); kv.setItem(SAVE_KEY, raw); return Object.assign(new Game(bb, kv, () => t0 + 1000, 7, 'dev', null, null, { newId: () => '0123456789abcdef' }), { store: kv }); };
  it('flag on: one toggle per hired worker (MH, CH), none for unhired; flag off: none and identical to shipped', () => {
    const g = boot(P), h = workersHtml(g.state, P);
    expect(toggles(h)).toHaveLength(2);
    expect(h).toContain('aria-label="Pause Market Hand"'); expect(h).toContain('aria-label="Pause Coop Hand"');
    const g0 = boot(b); expect(toggles(workersHtml(g0.state, b))).toHaveLength(0);
  });
  it('pause both via the UI actions → all-paused line; resume MH → lockout view from the tunable; save keeps paused', () => {
    const g = boot(P);
    g.dispatch({ type: 'pause', worker: 'market_hand' }); g.dispatch({ type: 'pause', worker: 'coop_hand' });
    expect(workersHtml(g.state, P)).toContain(PAUSE_COPY.all);
    g.dispatch({ type: 'resume', worker: 'market_hand' });
    expect(callLockoutView(g.state, P)!.left).toBe(tc.pause_call_lockout_s);
    expect(workersHtml(g.state, P)).not.toContain(PAUSE_COPY.all);
    g.save(); const saved = JSON.parse(g.store.getItem(SAVE_KEY)!).state.workers;
    expect(saved.coop_hand.paused).toBe(true); expect(saved.market_hand.paused).toBe(false); expect(saved.market_hand.callLockoutS).toBe(tc.pause_call_lockout_s);
  });
});
describe('[AC-P7] debounce window starts only on a real change', () => {
  it('ready() does not start a window; mark() does', () => {
    const d = new PauseDebounce();
    expect(d.ready('grader', 0, P)).toBe(true); expect(d.ready('grader', 100, P)).toBe(true);
    d.mark('grader', 100); expect(d.ready('grader', 100 + DEB_MS - 1, P)).toBe(false); expect(d.ready('grader', 100 + DEB_MS, P)).toBe(true);
  });
});

import type { SimEvent } from '../src/sim/events';
describe('[#119 merge] card Resume goes through resumeWorker(ev, "manual")', () => {
  const s0 = (): GameState => ({ ...initialState(b, 1), farmLevel: Math.max(12, P.m4!.tc!.pause_unlock_farm), workers: { market_hand: { energy: 60, cdS: 1, paused: true } } } as GameState);
  it('rc2Refill = 0: one worker_resumed{cause:"manual"}, MH gets the B5 call lockout from balance', () => {
    const ev: SimEvent[] = []; const s = apply(s0(), { type: 'resume', worker: 'market_hand' }, P, ev);
    expect(s.workers.market_hand!.paused).toBeFalsy();
    expect(ev.filter(e => e.type === 'worker_resumed')).toEqual([expect.objectContaining({ type: 'worker_resumed', worker: 'market_hand', cause: 'manual' })]);
    expect(s.workers.market_hand!.callLockoutS).toBe(P.m4!.tc!.pause_call_lockout_s);
  });
  it('rc2Refill = 1: no worker_resumed (exclusive emission, G0 §8)', () => {
    const R = { ...P, m4: { ...P.m4!, flags: { ...P.m4!.flags, rc2Refill: 1 } } } as typeof b;
    const ev: SimEvent[] = []; apply(s0(), { type: 'resume', worker: 'market_hand' }, R, ev);
    expect(ev.some(e => e.type === 'worker_resumed')).toBe(false);
  });
});
