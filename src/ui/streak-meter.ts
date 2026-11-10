/**
 * v5 #2/#3 streak meter, A2 tier pops and the tapCoins +$ pop: the DOM feature. Spec product/collection/m5-streak-tap-coins-spec.md
 * v1.3.3 sha1 b315dea1 (§3.3, §3.5, R16, ST-AC9/10/10b/17/17b/21/24-27/29); art art-ux/m5-combo-tiers.md v0.3 sha1 ed4ded1d
 * (§0-§6). Mounts as an F6 overlay feature (see ui/streak-f6-stub.ts for the seam; one registerFeature line once F6 lands).
 *  - Flags: m4.flags.streak -> meter row + tier pill + #streak-live; m4.flags.tapCoins -> coin pop + #coin-live. Both off (or
 *    m4.enabled off): mount adds NOTHING (no DOM, no class, no listener), so flag-off DOM and goldens are byte-identical.
 *  - Reads only sim state (streakS / streakHoldS) and the sim `collect` event (credited, bonus_cents). Writes no game state.
 *  - Tunables: balance.m4.tc only (via ui/streak-view.ts). Art layout/timing constants live in streak.css / tap-coin-pop.ts.
 *  - a11y: role=meter + aria-valuetext; polite atomic live regions (#streak-live >= 2 s apart, coin <= 1/s, both latest-wins,
 *    silent while frozen); pill / pops aria-hidden; no new tap targets (row pointer-events:none); reduced motion = opacity only.
 */
import './streak.css';
import { LiveThrottle, StreakTiers, COOLING_ARIA, meterView, pillCopy, streakParams, streakUiOn, tapCoinUiOn, tierAria, type MeterView } from './streak-view';
import { POP, coinPopAria, coinPopBox, coinPopText, pillBox } from './tap-coin-pop';
import { tcNum } from '../config/formulas';
import { FOCUS_DT_MAX_S } from '../sim/clock';
import type { Game } from '../game';
import type { Balance } from '../config/balance';
import type { OverlayCtx, OverlayFeature } from './streak-f6-stub';

/** What the streak UI reads from the F6 OverlayCtx (structural, so F6's real ctx and the stub both satisfy it). `audio` is F6's
 *  [draft] phase-2 hook player, absent in API v0.2: optional, the stings are silent until it exists. */
export interface StreakCtx {
  g: Pick<Game, 'state' | 'on'>; b: Balance; root: HTMLElement;
  layer(): HTMLElement; rm(): boolean; dialogOpen(): boolean; asset(f: string): string;
  fx: { admit(el: HTMLElement): void; release(el: HTMLElement): void };
  registerZone(name: string, rect: () => { left: number; top: number; right: number; bottom: number } | DOMRect | null, clear?: number): void;
  audio?: { play(hook: string, opts?: { semi?: number; minGapMs?: number }): boolean };
  /** F6 v1.0 (Features, answer Q3): `pops.active()` = a golden collect / Frenzy pop-up is live (CT-AC10). Optional until v1.0. */
  pops?: { set(id: string, on: boolean): void; active(): boolean };
}

/** Audio hooks -> files (art-ux/assets/sfx; m5-sound-spec §2, combo-tiers §11 1:1 mapping). Registered with F6 registerAudioHook. */
export const STREAK_SFX = { streakTier1: 'sfx-streak-tier-01', streakTier2: 'sfx-streak-tier-02', streakTier3: 'sfx-streak-tier-03',
  streakMax: 'sfx-streak-max-01', streakCool: 'sfx-streak-cool-01' } as const;
/** combo-tiers §6 / R16 live-region gaps and §2 / R16 lifetimes (ms), Art constants. */
export const STREAK_UI_MS = { streakLiveGap: 2000, coinLiveGap: 1000, pill: 900, coinPop: 800, tierUp: 400 } as const;
/** Golden-egg no-spawn clearance around the meter box (golden R14 / ST-AC21: box + 16 px). */
const METER_ZONE_PX = 16;
/** Spark dots per tier-up: k for tiers 1..3, 6 at MAX (combo-tiers §2). */
const MAX_SPARKS = 6;
/** app.ts floatText places the egg-collect pop's top at Collect's centre y - 40 (same-frame +20 px rule, R16). */
const EGG_POP_ABOVE_CENTRE_PX = 40;

export interface StreakUiOpts { /** CT-AC10: true while a golden collect / Frenzy pop-up is live (pill dropped, rest plays). Default: ctx.pops.active(). */ pillSuppressed?: () => boolean; random?: () => number; doc?: Document }

export interface StreakUi { render(now: number): void; destroy(): void; readonly row: HTMLElement | null }
export function mountStreakUi(ctx: StreakCtx, o: StreakUiOpts = {}): StreakUi | null {
  const { b, g, root } = ctx, streak = streakUiOn(b), coins = tapCoinUiOn(b);
  if (!streak && !coins) return null;
  const doc = o.doc ?? root.ownerDocument ?? document, rnd = o.random ?? Math.random;
  const $ = <T extends HTMLElement>(sel: string) => doc.querySelector<T>(sel);
  const el = (html: string) => { const t = doc.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };
  const fxHost = () => $('#fx-layer') ?? ctx.layer();
  const nowMs = () => performance.now();
  const added: Element[] = [];
  const frozen = () => ctx.dialogOpen() || doc.visibilityState === 'hidden';

  // ---------- meter row (streak) ----------
  let row: HTMLElement | null = null, fill: HTMLElement | null = null, edge: HTMLElement | null = null, label: HTMLElement | null = null, ticks: HTMLElement[] = [];
  let streakLive: HTMLElement | null = null;
  const tiers = new StreakTiers(), sLive = new LiveThrottle(STREAK_UI_MS.streakLiveGap), cLive = new LiveThrottle(STREAK_UI_MS.coinLiveGap);
  if (streak) {
    const n = streakParams(b).count;
    row = el(`<div id="streak" class="streak-row" role="meter" aria-label="Streak" aria-valuemin="0" aria-hidden="true">
      <div class="streak-bar"><div class="streak-fill"><i class="streak-gold"></i><i class="streak-stripes"></i><i class="streak-sheen"></i></div><i class="streak-edge"></i>
      ${Array.from({ length: n }, (_, i) => `<i class="streak-tick" data-k="${i + 1}" style="left:${((i + 1) / n) * 100}%"></i>`).join('')}</div>
      <span class="streak-label num"></span></div>`);
    fill = row.querySelector('.streak-fill'); edge = row.querySelector('.streak-edge'); label = row.querySelector('.streak-label');
    ticks = [...row.querySelectorAll<HTMLElement>('.streak-tick')];
    streakLive = el(`<div class="sr" id="streak-live" aria-live="polite" aria-atomic="true"></div>`);
    const collect = $('#collect'); if (collect) collect.after(row); else root.append(row);
    row.after(streakLive); added.push(row, streakLive);
    root.classList.add('m5-streak');
    ctx.registerZone('streak-meter', () => (row?.isConnected ? row.getBoundingClientRect() : null), METER_ZONE_PX);
  }
  let coinLive: HTMLElement | null = null;
  if (coins) { coinLive = el(`<div class="sr" id="coin-live" aria-live="polite" aria-atomic="true"></div>`); ($('.collectbar') ?? root).append(coinLive); added.push(coinLive); }

  // ---------- one-shots ----------
  const spawn = (node: HTMLElement, ms: number) => { fxHost().append(node); ctx.fx.admit(node); setTimeout(() => { node.remove(); ctx.fx.release(node); }, ms); };
  const anchor = () => {
    const c = $('#collect')?.getBoundingClientRect(), m = $('#meter')?.getBoundingClientRect(), vw = doc.documentElement.clientWidth || innerWidth;
    return { cx: c ? c.left + c.width / 2 : vw / 2, meterTop: m ? m.top : c ? c.top : 0, vw, collectCy: c ? c.top + c.height / 2 : 0 };
  };
  const place = (node: HTMLElement, box: { left: number; top: number }) => { node.style.left = `${Math.round(box.left)}px`; node.style.top = `${Math.round(box.top)}px`; };
  const retrigger = (node: Element | null, cls: string) => { if (!node) return; node.classList.remove(cls); void (node as HTMLElement).offsetWidth; node.classList.add(cls); };
  const rmClass = () => (ctx.rm() ? ' rm' : '');

  function tierUp(k: number) {
    const n = streakParams(b).count, max = k >= n;
    ctx.audio?.play(max ? 'streakMax' : (`streakTier${k}` as keyof typeof STREAK_SFX));
    const say = sLive.push(tierAria(k, b), nowMs(), frozen()); if (say && streakLive) streakLive.textContent = say;
    if (row) { // meter part of §2: tab k, sheen, label pop, spark dots (motion <= 400 ms; reduced motion: opacity only)
      retrigger(ticks[k - 1] ?? null, 'up'); retrigger(row.querySelector('.streak-sheen'), 'go'); retrigger(label, 'pop');
      if (!ctx.rm()) { const t = ticks[k - 1]?.getBoundingClientRect(); if (t) for (let i = 0; i < (max ? MAX_SPARKS : k); i++) {
        const a = (-150 + (120 * (i + 0.5)) / (max ? MAX_SPARKS : k)) * (Math.PI / 180), d = 12 + rnd() * 8;
        spawn(el(`<i class="streak-spark" style="left:${t.left + t.width / 2}px;top:${t.top}px;--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d).toFixed(1)}px"></i>`), STREAK_UI_MS.tierUp); } }
    }
    if ((o.pillSuppressed ?? (() => ctx.pops?.active() ?? false))()) return null; // CT-AC10: F6 v1.0 ctx.pops.active()
    fxHost().querySelectorAll('.streak-pill').forEach(p => p.remove()); // at most one live pill; a new one replaces it
    const pips = Array.from({ length: n }, (_, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('');
    const pill = el(`<div class="streak-pill${max ? ' max' : ''}${rmClass()}" aria-hidden="true"><span class="pips">${pips}</span><span>${pillCopy(k, b)}</span></div>`);
    spawn(pill, STREAK_UI_MS.pill);
    const a = anchor(), box = pillBox(a, pill.offsetWidth, pill.offsetHeight); place(pill, box);
    return box;
  }
  function coinPop(cents: number, aboveTop: number | undefined, eggs: number) {
    const text = coinPopText(cents); if (!text) return; // R15 / ST-AC17b: no node, no $0 announcement
    const pop = el(`<div class="coin-pop num${rmClass()}" aria-hidden="true"><img src="${ctx.asset('icon-coin.svg')}" alt=""><span></span></div>`);
    pop.querySelector('span')!.textContent = text;
    spawn(pop, STREAK_UI_MS.coinPop);
    const a = anchor(), eggTop = eggs > 0 ? a.collectCy - EGG_POP_ABOVE_CENTRE_PX : undefined;
    place(pop, coinPopBox(a, pop.offsetWidth, pop.offsetHeight, { drift: ctx.rm() ? 0 : (rnd() * 2 - 1) * POP.driftPx, aboveTop, eggTop }));
    const say = cLive.push(coinPopAria(cents)!, nowMs(), frozen()); if (say && coinLive) coinLive.textContent = say;
  }

  // ---------- meter render ----------
  let lastKey = '', prevS = 0;
  function sync(fromTap = false) {
    if (!row) return;
    const s = g.state.streakS ?? 0, v: MeterView = meterView(s, g.state.streakHoldS ?? 0, b, { rm: ctx.rm() });
    const r = tiers.update(s, v.cooling, b, fromTap);
    if (r.coolStart) { ctx.audio?.play('streakCool'); const say = sLive.push(COOLING_ARIA, nowMs(), frozen()); if (say && streakLive) streakLive.textContent = say; }
    const reset = !v.shown && prevS > tcNum(b, 'streak_decay_per_s') * FOCUS_DT_MAX_S; prevS = s; // FOCUS_DT_MAX_S = max focus s one frame applies (sim/clock): a bigger drop in one frame is a reset, not decay
    const key = `${v.scale}|${v.label}|${v.cooling}|${v.max}|${v.lit.join()}|${ctx.rm()}`;
    if (r.tierUp) { const box = tierUp(r.tierUp); pendingPill = box ? box.top : undefined; }
    if (key === lastKey) return; lastKey = key;
    row.classList.toggle('instant', reset); row.classList.toggle('on', v.shown); row.classList.toggle('cooling', v.cooling); row.classList.toggle('max', v.max);
    row.classList.toggle('rm', ctx.rm());
    fill!.style.transform = `scaleX(${v.scale})`; edge!.style.left = `calc(${(v.scale * 100).toFixed(3)}% - 2px)`;
    ticks.forEach((t, i) => t.classList.toggle('lit', v.lit[i]));
    if (v.shown) { label!.textContent = v.label; row.setAttribute('aria-valuemax', String(v.valueMax)); row.setAttribute('aria-valuenow', String(v.valueNow));
      row.setAttribute('aria-valuetext', v.valueText); row.removeAttribute('aria-hidden'); }
    else { row.setAttribute('aria-hidden', 'true'); row.removeAttribute('aria-valuetext'); row.setAttribute('aria-valuenow', '0'); }
  }
  let pendingPill: number | undefined;

  const off = g.on(e => {
    if (e.type !== 'collect' || e.credited !== true) return;
    pendingPill = undefined; sync(true); // a tier-up on this tap spawns the pill first, so the coin pop can sit above it
    if (coins && typeof e.bonus_cents === 'number') coinPop(e.bonus_cents, pendingPill, e.eggs);
    pendingPill = undefined;
  });
  sync();
  return {
    row,
    render: (t: number) => {
      sync();
      const fz = frozen(), a = sLive.poll(t, fz), c = cLive.poll(t, fz);
      if (a && streakLive) streakLive.textContent = a; if (c && coinLive) coinLive.textContent = c;
    },
    destroy: () => { off(); added.forEach(n => n.remove()); root.classList.remove('m5-streak'); fxHost().querySelectorAll('.streak-pill,.coin-pop,.streak-spark').forEach(n => n.remove()); },
  };
}

/** The F6 feature. No `flag` (F6 API v0.2 example uses flag 'streak'): it must also mount for m4.flags.tapCoins alone (ST-AC29),
 *  and its mount adds NO DOM, class or listener when both flags are off, so the flag-off #app hash is unchanged. */
let live: StreakUi | null = null;
export const streakMeter: OverlayFeature = {
  id: 'streak',
  mount(ctx: OverlayCtx) { live = mountStreakUi(ctx); const ui = live; return () => { ui?.destroy(); if (live === ui) live = null; }; },
  render(_ctx, t) { live?.render(t); },
};
