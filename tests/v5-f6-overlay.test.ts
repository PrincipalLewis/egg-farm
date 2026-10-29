// @vitest-environment jsdom
// v5 F6: src/ui/overlay.ts extraction + app.ts split (m5.0-sizing.md §2 row F6; v5-f1-f3-api-sheet.md; art-ux/m4-timed-collectible.md v1.1 §2).
// ACs (QA-D-1029-V5SCAP trace; F6 defines them, listed in the PR body):
//  F6-AC1 layout keys (§2.1)                      F6-AC2 spot centres reproduce the v1.1 §2.2/§2.3 tables
//  F6-AC3 live-rect validation (16px, ×N pill 0px, viewport, open sheet/modal, registered zones)
//  F6-AC4 dialogOpen(): modal/explainer/Upgrades yes, Market sheet NO (Q-F1c-1)
//  F6-AC5 Market-sheet sales attended => Frenzy+streak with the F6 wiring; Upgrades sheet / modal => suspended
//  F6-AC6 audio hook log contract {hook,file,tMs,semi}, only started sounds, semi 0 default, sfx-sell-coin kept
//  F6-AC7 reduced motion (same semantics)          F6-AC8 one-line registration API (flag-gated mount, per-frame render, zones)
//  F6-AC9 eggfarmQa seam build:qa only; check-release rejects it   F6-AC10 hens pill data-testid
//  F6-AC11 no behaviour change (FX budget unchanged here; snapshots/rc0/goldens/diff in the PR artifacts)
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance, type Balance } from '../src/config/balance';
import type { M5Flag } from '../src/config/flags';
import { initialState, type GameState } from '../src/sim/state';
import { saleValueCents } from '../src/sim/payout';
import { salePriceCents } from '../src/sim/tracks';
import { graderMult } from '../src/sim/workers';
import { SALE_EFFECTS, type SaleEffect } from '../src/sim/effects';
import { SFX, Audio } from '../src/ui/audio';
import { Game } from '../src/game';
import { mem } from './helpers';
import {
  layoutKey, spotCentres, validSpots, domZones, DOM_ZONES, DOCKED_1280x800, makeDialogOpen, wireAttended, AudioHooks, AUDIO_HOOKS,
  registerAudioHook, reducedMotion, FxBudget, registerFeature, registeredFeatures, clearFeatures, mountOverlay, type Box, type Zone, type LayoutKey,
} from '../src/ui/overlay';
import { installQaSeam } from '../src/ui/qa-seam';

const B = (flags?: Partial<Record<M5Flag, number>>) => ({ ...balance, m4: { ...balance.m4!, enabled: 1, ...(flags ? { flags: { ...(balance.m4 as any).flags, ...flags } } : {}) } }) as Balance;
const frenzy: SaleEffect = { id: 'frenzy', flag: 'golden', factor: () => 2 };
const streak: SaleEffect = { id: 'streak', flag: 'streak', factor: () => 1.28 };
const farm = (b: Balance): GameState => ({ ...initialState(b, 3), farmLevel: 12, hensLevel: 12, eggValueLevel: 12, graderTier: 2, basket: 500, coinsCents: 0,
  workers: { grader: { energy: 100, cdS: 0 }, market_hand: { energy: 100, cdS: 0 } },
  customers: [{ id: 1, demand: 10, filled: 0, waitedS: 0 }, { id: 2, demand: 7, filled: 0, waitedS: 0 }] });
const bx = (l: number, t: number, r: number, b: number): Box => ({ left: l, top: t, right: r, bottom: b });
const pts = (s: { id: string; x: number; y: number }[]) => Object.fromEntries(s.map(p => [p.id, [p.x, p.y]]));
const near = (got: Record<string, number[]>, want: Record<string, number[]>, tol = 1) => {
  expect(Object.keys(got).sort()).toEqual(Object.keys(want).sort());
  for (const k of Object.keys(want)) { expect(Math.abs(got[k][0] - want[k][0]), `${k} x ${got[k]} vs ${want[k]}`).toBeLessThanOrEqual(tol); expect(Math.abs(got[k][1] - want[k][1]), `${k} y ${got[k]} vs ${want[k]}`).toBeLessThanOrEqual(tol); }
};
const row = (s: string) => Object.fromEntries(s.split(' ').map((v, i) => [`S${i + 1}`, v]).filter(([, v]) => v !== '-').map(([k, v]) => [k, v.split(',').map(Number)]));

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
  (Element.prototype as any).animate ??= () => ({ finished: Promise.resolve(), cancel() {}, onfinish: null, addEventListener() {} });
});
afterEach(() => { SALE_EFFECTS.length = 0; clearFeatures(); document.body.innerHTML = ''; document.documentElement.className = ''; vi.restoreAllMocks(); delete (window as any).eggfarmQa; });
const setDoc = (vis: DocumentVisibilityState, focus: boolean) => { vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(vis); vi.spyOn(document, 'hasFocus').mockReturnValue(focus); };

describe('F6 layout keys (Art v1.1 §2.1)', () => {
  it('F6-AC1: phone = not docked; phone-360 for vw < 368 else phone-375 (incl. portrait vw >= 960)', () => {
    expect(layoutKey(360, 640, false)).toBe('phone-360'); expect(layoutKey(367, 844, false)).toBe('phone-360');
    expect(layoutKey(368, 844, false)).toBe('phone-375'); expect(layoutKey(430, 844, false)).toBe('phone-375'); expect(layoutKey(1024, 1366, false)).toBe('phone-375');
  });
  it('F6-AC1: docked iff FW = vw-400 >= 880 and vh >= 700, else docked-compact', () => {
    expect(layoutKey(1280, 800, true)).toBe('docked'); expect(layoutKey(1280, 720, true)).toBe('docked'); expect(layoutKey(1366, 768, true)).toBe('docked');
    expect(layoutKey(1024, 474, true)).toBe('docked-compact'); expect(layoutKey(1279, 800, true)).toBe('docked-compact'); expect(layoutKey(1280, 699, true)).toBe('docked-compact');
  });
});

describe('F6 spot centres reproduce the v1.1 tables', () => {
  it('F6-AC2: 360×640 phone-360 from the measured #scene rect (§2.2, ±1 for sub-px rects)', () => {
    near(pts(spotCentres('phone-360', 360, 640, { scene: bx(8, 156, 352, 414) })), row('50,239 50,286 50,332 50,378 310,239 310,286 310,332 310,378'));
  });
  it('F6-AC2: 375×667 phone-375 from the measured #scene rect (§2.2)', () => {
    near(pts(spotCentres('phone-375', 375, 667, { scene: bx(8, 164, 367, 434) })), row('50,251 50,299 50,347 50,396 325,251 325,299 325,347 325,396'));
  });
  const docked: [number, number, string][] = [
    [1280, 800, '110,240 230,330 110,440 230,540 680,240 770,330 650,440 770,560'],
    [1280, 720, '110,220 230,301 110,399 230,488 680,220 770,301 650,399 770,506'],
    [1366, 768, '153,232 273,318 153,423 273,519 723,232 813,318 693,423 813,538'],
  ];
  for (const [vw, vh, want] of docked) it(`F6-AC2: ${vw}×${vh} docked reproduces the §2.3 QA matrix exactly`, () => {
    const got = pts(spotCentres('docked', vw, vh, { scene: bx(0, 0, 0, 0) })); near(got, row(want), 0);
  });
  it('F6-AC2: 1280×800 docked table is the v1.1 table (S4 230,540; S5 680,240)', () => {
    expect(DOCKED_1280x800.map(p => p.join(','))).toEqual('110,240 230,330 110,440 230,540 680,240 770,330 650,440 770,560'.split(' '));
  });
  it('F6-AC2: 1024×474 docked-compact from live scene/queue/meter, S4/S8 unused (§2.2/§2.3)', () => {
    const got = pts(spotCentres('docked-compact', 1024, 474, { scene: bx(32, 153, 592, 310), queue: bx(12, 68, 612, 141), meter: bx(32, 322, 592, 338) }));
    near(got, row('90,189 90,232 90,274 - 548,189 548,232 548,274 -'), 0);
  });
  it('F6-AC2: safe-area insets are added after rounding (§2.1 rule 1)', () => {
    const a = spotCentres('docked', 1280, 800, { scene: bx(0, 0, 0, 0) }), b = spotCentres('docked', 1280, 800, { scene: bx(0, 0, 0, 0) }, { left: 20, top: 44 });
    b.forEach((p, i) => { expect(p.x).toBe(a[i].x + 20); expect(p.y).toBe(a[i].y + 44); });
  });
});

describe('F6 live-rect validation (§2 runtime rule 2)', () => {
  const z = (name: string, l: number, t: number, r: number, b: number, clear = 16): Zone => ({ name, box: bx(l, t, r, b), clear });
  const zones360 = (pill: boolean) => [z('hud', 0, 0, 360, 56), z('queue', 8, 66, 352, 139), z('toast', 47, 147, 313, 179), z('coop', 101, 158, 259, 316), z('nest', 144, 265, 216, 337),
    z('full', 257, 172, 297, 191), ...(pill ? [z('henpill', 12, 390, 91, 410, 0)] : []), z('meter', 8, 432, 328, 448), z('goal', 8, 456, 328, 500), z('collect', 8, 504, 328, 568), z('nav', 0, 576, 360, 640)];
  const spots360 = spotCentres('phone-360', 360, 640, { scene: bx(8, 156, 352, 414) });
  it('F6-AC3: 360×640 measured zones: 8/8 valid with the ×N pill hidden, 7/8 (S4 dropped) with it shown (§2.2)', () => {
    expect(validSpots(spots360, zones360(false), 360, 640).length).toBe(8);
    expect(validSpots(spots360, zones360(true), 360, 640).map(s => s.id)).toEqual(['S1', 'S2', 'S3', 'S5', 'S6', 'S7', 'S8']);
  });
  it('F6-AC3: 1280×800 docked measured zones incl. the docked column: 8/8 valid (§2.2)', () => {
    const zs = [z('hud', 0, 0, 1280, 56), z('queue', 12, 68, 868, 149), z('toast', 507, 64, 773, 96), z('coop', 311, 191, 569, 449), z('nest', 404, 410, 476, 482), z('full', 591, 214, 630, 233),
      z('henpill', 164, 584, 243, 604, 0), z('meter', 160, 648, 720, 664), z('goal', 160, 672, 720, 716), z('collect', 160, 724, 720, 788), z('docked-column', 880, 56, 1280, 800)];
    expect(validSpots(spotCentres('docked', 1280, 800, { scene: bx(0, 0, 0, 0) }), zs, 1280, 800).length).toBe(8);
  });
  it('F6-AC3: 1024×474 docked-compact: 6/6 pill hidden, 5/6 (S3 dropped) pill shown (§2.2)', () => {
    const base = [z('hud', 0, 0, 1024, 56), z('queue', 12, 68, 612, 141), z('coop', 183, 56, 441, 250), z('nest', 276, 191, 348, 263), z('full', 463, 162, 502, 181),
      z('meter', 32, 322, 592, 338), z('goal', 32, 346, 592, 390), z('collect', 32, 398, 592, 462), z('docked-column', 624, 56, 1024, 474)];
    const sp = spotCentres('docked-compact', 1024, 474, { scene: bx(32, 153, 592, 310), queue: bx(12, 68, 612, 141), meter: bx(32, 322, 592, 338) });
    expect(validSpots(sp, base, 1024, 474).length).toBe(6);
    expect(validSpots(sp, [...base, z('henpill', 36, 285, 115, 306, 0)], 1024, 474).map(s => s.id)).toEqual(['S1', 'S2', 'S5', 'S6', 'S7']);
  });
  it('F6-AC3: 16px clearance boundary (15px dropped, 16px kept); ×N pill 0px (touching kept, 1px overlap dropped); viewport inset 16px', () => {
    const p = [{ id: 'S1' as const, x: 100, y: 100 }]; // hit box 72..128
    expect(validSpots(p, [z('a', 144, 0, 200, 300)], 400, 400).length).toBe(1);
    expect(validSpots(p, [z('a', 143, 0, 200, 300)], 400, 400).length).toBe(0);
    expect(validSpots(p, [z('henpill', 128, 0, 200, 300, 0)], 400, 400).length).toBe(1);
    expect(validSpots(p, [z('henpill', 127, 0, 200, 300, 0)], 400, 400).length).toBe(0);
    expect(validSpots([{ id: 'S1', x: 44, y: 100 }], [], 400, 400).length).toBe(1);
    expect(validSpots([{ id: 'S1', x: 43, y: 100 }], [], 400, 400).length).toBe(0);
    expect(validSpots([{ id: 'S1', x: 356, y: 356 }], [], 400, 400).length).toBe(1);
    expect(validSpots([{ id: 'S1', x: 357, y: 356 }], [], 400, 400).length).toBe(0);
  });
  it('F6-AC3: an open phone sheet/modal (full-screen zone) blocks every spot => defer', () => {
    expect(validSpots(spots360, [z('sheet', 0, 160, 360, 640)], 360, 640).length).toBeLessThan(8);
    expect(validSpots(spots360, [z('modal', 0, 0, 360, 640)], 360, 640)).toEqual([]);
  });
  it('F6-AC3: domZones reads the §2 list from the DOM: hidden/zero-size skipped, coop clipped to .farm, sheet only while open, docked column only docked', () => {
    document.body.innerHTML = `<header class="hud"></header><div class="toast"></div><div id="queue"></div><div class="farm"><img id="coop"></div><div id="henpill" hidden></div>
      <div id="panel-layer"></div><div id="modal-layer"></div>`;
    const rects: Record<string, Box> = { 'header.hud': bx(0, 0, 360, 56), '.toast': bx(47, 147, 313, 179), '#queue': bx(8, 66, 352, 139), '.farm': bx(0, 150, 360, 420), '#coop': bx(101, 140, 259, 316),
      '#henpill': bx(12, 390, 91, 410), '#panel-layer': bx(0, 0, 360, 640), '#modal-layer': bx(0, 0, 360, 640) };
    for (const [sel, r] of Object.entries(rects)) { const el = document.querySelector(sel) as HTMLElement; el.getBoundingClientRect = () => ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON() {} }) as DOMRect; }
    (document.querySelector('.toast') as HTMLElement).style.opacity = '0'; // the toast strip is a zone even while transparent
    const names = (zs: Zone[]) => zs.map(x => x.name);
    expect(names(domZones(document))).toEqual(['hud', 'toast', 'queue', 'coop']);
    expect(domZones(document).find(x => x.name === 'coop')!.box).toEqual(bx(101, 150, 259, 316));
    document.getElementById('henpill')!.hidden = false; expect(domZones(document).find(x => x.name === 'henpill')!.clear).toBe(0);
    document.getElementById('panel-layer')!.classList.add('open'); document.getElementById('modal-layer')!.classList.add('open');
    expect(names(domZones(document))).toEqual(expect.arrayContaining(['sheet', 'modal']));
    document.getElementById('panel-layer')!.classList.remove('open');
    expect(names(domZones(document))).not.toContain('sheet'); expect(names(domZones(document, true))).toContain('docked-column');
    expect(DOM_ZONES.map(x => x.name)).toEqual(['hud', 'toast', 'queue', 'coop', 'nest', 'full', 'henpill', 'meter', 'goal', 'collect', 'nav', 'sheet', 'modal']);
  });
});

describe('F6 dialogOpen() (Q-F1c-1, D-HOP-2026-10-29-06)', () => {
  it('F6-AC4: Market sheet open => NOT a dialog; Upgrades sheet => dialog; nothing open => false', () => {
    let sheet: 'market' | 'upgrades' | null = null; const dlg = makeDialogOpen({ sheet: () => sheet });
    expect(dlg()).toBe(false); sheet = 'market'; expect(dlg()).toBe(false); sheet = 'upgrades'; expect(dlg()).toBe(true);
  });
  it('F6-AC4: modal / recovery / rotate prompt / alertdialog / tracks explainer => dialog, even with the Market sheet open', () => {
    const dlg = makeDialogOpen({ sheet: () => 'market' });
    for (const html of ['<div id="modal-layer" class="open"></div>', '<div class="recovery-layer"></div>', '<div id="rotate-prompt"></div>', '<div role="alertdialog"></div>', '<div class="tracks-exp"></div>']) {
      document.body.innerHTML = html; expect(dlg(), html).toBe(true);
    }
    document.body.innerHTML = '<div id="modal-layer"></div><div id="rotate-prompt" hidden></div><div role="alertdialog" class="onb-cap"></div>'; expect(dlg()).toBe(false);
  });
  it('F6-AC4: wireAttended probe = visible && focused && !dialogOpen()', () => {
    let probe: () => boolean = () => false; let dlg = false; const d = { visibilityState: 'visible' as DocumentVisibilityState, focus: true };
    wireAttended({ setAttendedProbe: fn => { probe = fn; } }, () => dlg, { get visibilityState() { return d.visibilityState; }, hasFocus: () => d.focus });
    expect(probe()).toBe(true); dlg = true; expect(probe()).toBe(false); dlg = false; d.focus = false; expect(probe()).toBe(false);
    d.focus = true; d.visibilityState = 'hidden'; expect(probe()).toBe(false);
  });
});

async function mountWith(flags: Partial<Record<M5Flag, number>> = { golden: 1, streak: 1 }, audio: any = { enabled: false, play() {}, unlock() {} }) {
  SALE_EFFECTS.push(frenzy, streak);
  const b = B(flags), s0 = farm(b);
  const g = new Game(b as any, mem() as any, () => Date.UTC(2026, 9, 29, 12), 3, 'test'); g.state = { ...s0 };
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, audio, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  const settle = async () => { ui.render(); await new Promise(r => setTimeout(r, 30)); ui.render(); await new Promise(r => setTimeout(r, 30)); ui.render(); };
  return { g, b, s0, ui, settle };
}
const sellRow = (id: number) => { const bt = document.querySelector<HTMLButtonElement>(`#mRows button[data-id="${id}"]`); expect(bt, `no sell button ${id}`).toBeTruthy(); return bt!; };

describe('F6 Market sheet is a play surface (Q-F1c-1) with the F6 wiring in mountApp', () => {
  it('F6-AC5 / Q-F1c-1: Market sheet open + visible/focused: player sale gets Frenzy and streak (credit == boosted preview), sheet not a dialog, not suspended', async () => {
    setDoc('visible', true);
    const { g, b, s0, ui, settle } = await mountWith(); ui.openPanel('market'); await settle();
    expect(document.getElementById('panel-layer')!.classList.contains('open')).toBe(true);
    expect((g as any).attendedNow()).toBe(true); // the UI's probe; sheet sales never pass suspended
    sellRow(1).click();
    const base = salePriceCents(s0, b), gm = graderMult(s0.workers, s0.graderTier, b);
    expect(g.state.coinsCents - s0.coinsCents).toBe(Math.round(10 * base * gm * 2 * 1.28));
    expect(g.state.coinsCents - s0.coinsCents).toBe(saleValueCents(s0, 10, b));
  });
  it('F6-AC5: Upgrades sheet open or a modal open => attended probe false (dialogOpen)', async () => {
    setDoc('visible', true);
    const { g, ui, settle } = await mountWith(); ui.openPanel('upgrades'); await settle();
    expect((g as any).attendedNow()).toBe(false);
    ui.openPanel('market'); await settle(); expect((g as any).attendedNow()).toBe(true);
    document.getElementById('modal-layer')!.classList.add('open'); expect((g as any).attendedNow()).toBe(false);
  });
  it('F6-AC5: the UI never passes suspended:true for sheet sales (no "suspended" literal in ui/ sources)', () => {
    for (const f of ['app.ts', 'overlay.ts', 'attended.ts']) expect(readFileSync(`src/ui/${f}`, 'utf8')).not.toMatch(/suspended\s*:\s*true/);
  });
});

describe('F6 audio hooks (decisions.md 2026-10-29 23:07)', () => {
  const fakeAudio = () => {
    const a = new Audio('/a/'); const started: { rate: number }[] = [];
    (a as any).ctx = { destination: {}, createBufferSource: () => { const s = { buffer: null, playbackRate: { value: 1 }, connect() {}, start() { started.push({ rate: s.playbackRate.value }); } }; return s; } };
    for (const f of Object.values(SFX)) (a as any).buffers.set(f, {});
    return { a, started };
  };
  it('F6-AC6: one {hook, file, tMs, semi} per sound actually started; semi 0 default; sell stays sfx-sell-coin', () => {
    const { a, started } = fakeAudio(); a.qaLog = []; const h = new AudioHooks(a);
    expect(h.play('sell')).toBe(true); expect(h.play('sell')).toBe(false); // within minGap: not started, not logged
    expect(a.qaLog).toHaveLength(1); expect(a.qaLog[0]).toMatchObject({ hook: 'sell', file: 'sfx-sell-coin', semi: 0 }); expect(typeof a.qaLog[0].tMs).toBe('number');
    expect(started).toEqual([{ rate: 1 }]); expect(SFX.sell).toBe('sfx-sell-coin');
  });
  it('F6-AC6: semi=+2 sets playbackRate 2^(2/12) and logs semi 2; unknown hook / muted / missing buffer => nothing logged', () => {
    const { a, started } = fakeAudio(); a.qaLog = []; const h = new AudioHooks(a);
    expect(h.play('collect', { semi: 2 })).toBe(true); expect(started[0].rate).toBeCloseTo(2 ** (2 / 12), 10); expect(a.qaLog![0]).toMatchObject({ hook: 'collect', semi: 2 });
    expect(h.play('nope')).toBe(false); a.enabled = false; expect(h.play('upgrade')).toBe(false); a.enabled = true;
    registerAudioHook('golden-spawn', 'sfx-golden-spawn'); expect(h.play('golden-spawn')).toBe(false); // buffer not loaded => not started
    expect(a.qaLog).toHaveLength(1); AUDIO_HOOKS.delete('golden-spawn');
  });
  it('F6-AC6: registered feature hook plays its file once loaded; release Audio keeps qaLog null', () => {
    const { a } = fakeAudio(); expect(a.qaLog).toBeNull(); registerAudioHook('golden-collect', 'sfx-golden-collect'); (a as any).buffers.set('sfx-golden-collect', {});
    a.qaLog = []; expect(new AudioHooks(a).play('golden-collect')).toBe(true); expect(a.qaLog[0]).toMatchObject({ hook: 'golden-collect', file: 'sfx-golden-collect', semi: 0 });
    AUDIO_HOOKS.delete('golden-collect');
  });
  it('F6-AC6: test doubles without playFile still get built-in hooks via play(name)', () => {
    const calls: string[] = []; new AudioHooks({ play: (n: any) => { calls.push(n); return true; } }).sfx('upgrade'); expect(calls).toEqual(['upgrade']);
  });
});

describe('F6 reduced motion + FX budget', () => {
  it('F6-AC7: rm = in-game toggle OR prefers-reduced-motion; apply sets html.reduced-motion and root.rm', () => {
    const root = document.createElement('div'); let flag = false; const mq = { matches: false };
    const { rm, apply } = reducedMotion(() => flag, root, mq);
    apply(); expect(rm()).toBe(false); expect(document.documentElement.classList.contains('reduced-motion')).toBe(false); expect(root.classList.contains('rm')).toBe(false);
    flag = true; apply(); expect(document.documentElement.classList.contains('reduced-motion')).toBe(true); expect(root.classList.contains('rm')).toBe(true);
    flag = false; mq.matches = true; expect(rm()).toBe(true); mq.matches = false; apply(); expect(root.classList.contains('rm')).toBe(false);
  });
  it('F6-AC11: FX budget unchanged: max 30, oldest recycled, release untracks', () => {
    const fx = new FxBudget(); expect(fx.max).toBe(30); const els = Array.from({ length: 32 }, () => { const e = document.createElement('i'); document.body.append(e); return e; });
    els.forEach(e => fx.admit(e)); expect(fx.count).toBe(30); expect(els[0].isConnected).toBe(false); expect(els[1].isConnected).toBe(false); expect(els[2].isConnected).toBe(true);
    fx.release(els[31]); expect(fx.count).toBe(29);
  });
});

describe('F6 feature registration API', () => {
  const deps = (b: Balance) => { document.body.innerHTML = '<div id="root"><div id="scene"></div></div>';
    return { g: { setAttendedProbe() {} } as any, b, root: document.getElementById('root')!, scene: document.getElementById('scene')!, docked: { matches: false }, rm: () => false,
      audio: new AudioHooks({}), fx: new FxBudget(), dialogOpen: () => false, asset: (f: string) => `/a/${f}` }; };
  it('F6-AC8: registerFeature is one line; flag-gated features mount only with their M5 flag on; always-on ones always mount', () => {
    const mounted: string[] = [];
    registerFeature({ id: 'golden-egg', flag: 'golden', mount: () => { mounted.push('golden-egg'); } });
    registerFeature({ id: 'always', mount: () => { mounted.push('always'); } });
    expect(mountOverlay(deps(B())).features).toEqual(['always']);
    expect(mountOverlay(deps(B({ golden: 1 }))).features).toEqual(['golden-egg', 'always']);
    expect(mounted).toEqual(['always', 'golden-egg', 'always']);
  });
  it('F6-AC8: re-registering an id replaces it; render(t) runs per frame; destroy runs unmounts; layer() created lazily inside #scene', () => {
    const seen: number[] = []; let un = 0;
    registerFeature({ id: 'x', mount: () => {} }); registerFeature({ id: 'x', mount: ctx => { ctx.layer().textContent = 'hi'; return () => { un++; }; }, render: (_c, t) => { seen.push(t); } });
    expect(registeredFeatures()).toHaveLength(1);
    const o = mountOverlay(deps(B())); o.render(1); o.render(2); o.destroy();
    expect(seen).toEqual([1, 2]); expect(un).toBe(1); expect(document.querySelector('#scene > .overlay-layer')!.textContent).toBe('hi');
  });
  it('F6-AC8: no registered features => mountOverlay adds nothing to the DOM (F6 is inert)', () => {
    const d = deps(B({ golden: 1, streak: 1 })); const before = document.body.innerHTML; const o = mountOverlay(d); o.render(0);
    expect(o.features).toEqual([]); expect(document.body.innerHTML).toBe(before); expect(document.querySelector('.overlay-layer')).toBeNull();
  });
  it('F6-AC8: ctx.registerZone feeds validSpots; ctx.layout/spots follow the live viewport', () => {
    let ctx: any; registerFeature({ id: 'probe', mount: c => { ctx = c; } }); const d = deps(B()); mountOverlay(d);
    const scene = d.scene; scene.getBoundingClientRect = () => ({ left: 8, top: 156, right: 352, bottom: 414, width: 344, height: 258, x: 8, y: 156, toJSON() {} }) as DOMRect;
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(360); vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(640);
    expect(ctx.layout() as LayoutKey).toBe('phone-360'); expect(ctx.spots()).toHaveLength(8); expect(ctx.validSpots()).toHaveLength(8);
    ctx.registerZone('broody', () => bx(282, 200, 340, 420)); expect(ctx.validSpots().map((s: any) => s.id)).toEqual(['S1', 'S2', 'S3', 'S4']);
    ctx.registerZone('gone', () => null); expect(ctx.validSpots()).toHaveLength(4);
  });
  it('F6-AC8: app.ts mounts registered features (ui/features.ts import) and renders them each frame, without editing app.ts', async () => {
    const frames: number[] = []; let got: any = null;
    registerFeature({ id: 'probe-app', flag: 'golden', mount: ctx => { got = ctx; }, render: (_c, t) => { frames.push(t); } });
    const { ui } = await mountWith({ golden: 1 }); ui.render();
    expect(got).toBeTruthy(); expect(got.scene.id).toBe('scene'); expect(frames.length).toBeGreaterThan(0); expect(typeof got.fx.admit).toBe('function');
  });
});

describe('F6 eggfarmQa seam (build:qa only)', () => {
  it('F6-AC9: installQaSeam exposes audio.log, fx.setMax, menu.open/close, sheet.stepClose under IOS_FLAG_ENABLED', () => {
    const audio = { qaLog: null as any }, fx = new FxBudget(), calls: string[] = [];
    const qa = installQaSeam({ audio, fx, menu: { open: () => calls.push('open'), close: () => calls.push('close') }, sheet: { stepClose: () => { calls.push('step'); return 'market'; } } }, window)!;
    expect((window as any).eggfarmQa).toBe(qa); expect(qa.audio.log).toBe(audio.qaLog); expect(qa.audio.log).toEqual([]);
    qa.fx.setMax(5.7); expect(fx.max).toBe(5); expect(qa.fx.max).toBe(5); qa.menu.open(); qa.menu.close(); expect(qa.sheet.stepClose()).toBe('market');
    expect(calls).toEqual(['open', 'close', 'step']);
  });
  it('F6-AC9: mountApp installs window.eggfarmQa in a qa/test build; menu.open opens Settings, sheet.stepClose closes modal then sheet', async () => {
    const { ui, settle } = await mountWith({}); const qa = (window as any).eggfarmQa; expect(qa).toBeTruthy();
    ui.openPanel('market'); await settle(); qa.menu.open(); await settle();
    expect(document.getElementById('modal-layer')!.classList.contains('open')).toBe(true);
    expect(qa.sheet.stepClose()).toBe('modal'); expect(document.getElementById('modal-layer')!.classList.contains('open')).toBe(false);
    expect(qa.sheet.stepClose()).toBe('market'); expect(document.getElementById('panel-layer')!.classList.contains('open')).toBe(false);
    expect(qa.sheet.stepClose()).toBe(null);
  });
  it('F6-AC9: check-release-build.mjs hook list rejects eggfarmQa (Architect-owned test, list extended by F6)', () => {
    const src = readFileSync('scripts/check-release-build.mjs', 'utf8'); const line = src.split('\n').find(l => l.startsWith('const hooks = ['))!;
    expect(line).toContain("'eggfarmQa'");
  });
  it('F6-AC9: qa-seam is reachable only behind IOS_FLAG_ENABLED in app.ts', () => {
    const app = readFileSync('src/ui/app.ts', 'utf8'); expect(app).toMatch(/if \(IOS_FLAG_ENABLED\) installQaSeam\(/);
    expect(readFileSync('src/ui/qa-seam.ts', 'utf8')).toMatch(/if \(!IOS_FLAG_ENABLED\) return null/);
  });
});

describe('F6 hens pill testid', () => {
  it('F6-AC10: the ×N hens pill has a stable data-testid="hens-pill"', async () => {
    await mountWith({}); const p = document.querySelector('[data-testid="hens-pill"]'); expect(p).toBeTruthy(); expect(p!.id).toBe('henpill');
  });
});
