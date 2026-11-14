/**
 * #5b V51-SS-1 "Sales stopped" chip (product/market/sales-stopped-spec.md cfff3817 §4.4-§4.7, SS-36; Art fatigue-ux ffb13c19).
 * UI only: it READS stallView() every frame and calls noteStallChipTap(); the sim owns triggers, holds, timers and all telemetry.
 * Mounted by app.ts only when m4.flags.salesStopped = 1, so flag-off markup is untouched.
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import type { WorkerId } from '../sim/workers';
import { flagOn } from '../config/flags';
import { tcNum } from '../config/formulas';
import { resumeAtCents } from './workers-ui';
import { stallView, noteStallChipTap, type StallCause, type StallView } from './stall-api';
import { openShiftSheet } from './shift-sheet';

/** The #5b release flag (m4.flags.salesStopped); app.ts mounts the chip only when this is true. */
export const stallChipOn = (b: Balance) => flagOn(b, 'salesStopped');
export const rc2RefillOn = (b: Balance) => flagOn(b, 'rc2Refill');
export type ChipAction = 'refill' | 'sell_all' | 'collect' | 'manage';
export type ChipIcon = 'zzz' | 'warning' | 'pause' | 'nest';
export interface ChipCopy { text: string; verb: string; action: ChipAction; icon: ChipIcon; tone: 'tired' | 'danger'; desc: string; worker: WorkerId | null }
/** NBSP on both sides of the middle dot (art-ux/copy conventions, spec §4.4). */
export const DOT = '\u00a0\u00b7\u00a0';
const ROLE = { market_hand: 'Market Hand', coop_hand: 'Coop Hand' } as const;
/** Cause -> worker the chip acts on (Manage / Refill target). */
export const CAUSE_WORKER: Record<StallCause, WorkerId | null> = {
  mh_asleep: 'market_hand', mh_paused: 'market_hand', mh_unpaid: 'market_hand', no_mh: null, ch_asleep: 'coop_hand', ch_unpaid: 'coop_hand', other: null,
};
export interface CopyCtx { rc2Refill: boolean; cooldown: boolean; /** {Y} for mh_unpaid: dollars still needed, cents (>= 0) */ needCents: number }
const VERB: Record<ChipAction, string> = { refill: 'Refill', sell_all: 'Sell all', collect: 'Collect', manage: 'Manage' };
const TAP: Record<ChipAction, string> = { refill: 'Tap to refill.', sell_all: 'Tap to sell all.', collect: 'Tap to collect.', manage: 'Tap to manage.' };
/** §4.4 table + §4.6 cooldown swap + SS-36 (rc2Refill = 1: asleep causes read "Manage" and never swap on cooldown). Pure.
 *  D-HOP-2026-11-10-22: §4.4 is canonical for text/icon/verb/action; describedby (SS-20) = rc2 §6 aria sentence + " Tap to {verb}." (no "Needs {Y}"). */
export function chipCopy(cause: StallCause, c: CopyCtx): ChipCopy {
  const asleepAct = (alt: ChipAction): ChipAction => c.rc2Refill ? 'manage' : c.cooldown ? alt : 'refill';
  const mk = (lead: string, action: ChipAction, icon: ChipIcon, tone: 'tired' | 'danger', sentence: string): ChipCopy =>
    ({ text: `${lead}${DOT}${VERB[action]}`, verb: VERB[action], action, icon, tone, desc: `${sentence} ${TAP[action]}`, worker: CAUSE_WORKER[cause] });
  switch (cause) {
    case 'mh_asleep': return mk(`${ROLE.market_hand} asleep`, asleepAct('sell_all'), 'zzz', 'tired', 'Market Hand is asleep. Auto-sales have stopped.');
    case 'mh_paused': return mk(`${ROLE.market_hand} on break`, 'sell_all', 'pause', 'tired', 'Market Hand is on break. Auto-sales have stopped.');
    case 'mh_unpaid': return mk(`${ROLE.market_hand} unpaid`, 'sell_all', 'warning', 'danger', 'Market Hand is unpaid. Auto-sales have stopped.');
    case 'no_mh': return mk('Eggs waiting', 'sell_all', 'nest', 'danger', 'Customers are waiting and eggs are ready.');
    case 'ch_asleep': return mk(`${ROLE.coop_hand} asleep`, asleepAct('collect'), 'zzz', 'tired', 'Coop Hand is asleep. Auto-collecting has stopped.');
    case 'ch_unpaid': return mk(`${ROLE.coop_hand} unpaid`, 'collect', 'warning', 'danger', 'Coop Hand is unpaid. Auto-collecting has stopped.');
    default: return mk('Sales stopped', 'sell_all', 'warning', 'danger', 'Sales have stopped.');
  }
}
/** Copy for the live state (cooldown = shared manageCdS, {Y} = resume-at - coins, same sum as tick.ts). */
export function chipCopyFor(cause: StallCause, s: GameState, b: Balance): ChipCopy {
  const at = resumeAtCents(s, b, 'market_hand');
  return chipCopy(cause, { rc2Refill: flagOn(b, 'rc2Refill'), cooldown: s.manageCdS > 1e-9, needCents: at === null ? 0 : at - s.coinsCents });
}
/** Icons: all four ship in public/assets (ico_fatigue_zzz d4709f93, icon-pause 97291783 copied verbatim from art-ux/assets). Decorative: alt="" + aria-hidden. */
const CHIP_ICON: Record<ChipIcon, string> = { warning: 'icon-warning.svg', nest: 'icon-nest.svg', zzz: 'ico_fatigue_zzz.svg', pause: 'icon-pause.svg' };
export const chipIconHtml = (icon: ChipIcon, A: (f: string) => string) =>
  `<img class="ss-ic" src="${A(CHIP_ICON[icon])}" width="16" height="16" alt="" aria-hidden="true">`;

/** '0.15s' / '150ms' (first value) -> ms. */
const cssMs = (v: string) => { const x = parseFloat(v) || 0; return /ms/.test(v.split(',')[0]) ? x : x * 1000; };
export interface ChipDeps {
  g: { state: GameState }; b: Balance; A: (f: string) => string; now: () => number; rm: () => boolean;
  /** dispatch through tap-guard (app.ts act); returns whether it applied */
  act: (a: { type: 'manage'; worker: WorkerId } | { type: 'sellAll' } | { type: 'collect' }) => boolean;
}
/** Chip controller. One <button> laid over the #goal slot (absolute, 0 px layout shift), crossfading with the goal bubble. */
export class StallChip {
  readonly el: HTMLButtonElement; private desc: HTMLElement; private live: HTMLElement; private txt: HTMLElement; private ic: HTMLElement;
  private shown = false; private copyKey = ''; private announced: number | null = null; private liveAt = -Infinity; private liveT = 0;
  private guardUntil = -Infinity; private hideT = 0; private view: Readonly<StallView> | null = null; private copy: ChipCopy | null = null;
  private readonly guardMs: number;
  constructor(private bar: HTMLElement, private goal: HTMLElement, private d: ChipDeps) {
    this.guardMs = tcNum(d.b, 'stall_tap_guard_ms');
    bar.classList.add('ss-on');
    const t = document.createElement('template');
    t.innerHTML = `<button class="stall-chip" id="stallChip" type="button" aria-describedby="stallDesc" hidden><span class="ss-pill"><span class="ss-icw"></span><span class="ss-txt"></span></span></button>`
      + `<div class="sr" id="stallDesc" aria-hidden="true"></div><div class="sr" role="status" aria-live="polite" id="stallLive"></div>`;
    const [btn, desc, live] = [...t.content.children] as HTMLElement[];
    goal.after(btn, desc, live);
    this.el = btn as HTMLButtonElement; this.desc = desc; this.live = live; this.txt = btn.querySelector('.ss-txt')!; this.ic = btn.querySelector('.ss-icw')!;
    // SS-G4 / SS-35: a chip tap never reaches #scene (no Collect, no credited tap, no streak step).
    for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'mousedown'] as const) this.el.addEventListener(ev, e => e.stopPropagation());
    this.el.addEventListener('click', e => { e.stopPropagation(); this.tap(); });
  }
  get isShown() { return this.shown; }
  /** The role the chip names while shown (§5 dedupe for the Rule 3 banner). */
  get coveredWorker(): WorkerId | null { return this.shown && this.view?.cause ? CAUSE_WORKER[this.view.cause] : null; }
  /** Called every render frame. `visible` = UI gates (farm view active, onboarding done, no sheet over the farm). */
  update(visible: boolean): void {
    const s = this.d.g.state, v = stallView(s, this.d.b); this.view = v;
    const want = visible && v.shown && v.cause !== null;
    if (want) {
      const c = chipCopyFor(v.cause!, s, this.d.b); this.copy = c;
      const key = `${c.text}|${c.desc}|${c.icon}|${c.tone}`;
      if (key !== this.copyKey) { // cause / cooldown swap: text changes in place, no re-animation (§4.4, §4.6)
        this.copyKey = key; this.txt.textContent = c.text; this.desc.textContent = c.desc; this.ic.innerHTML = chipIconHtml(c.icon, this.d.A);
        this.el.dataset.tone = c.tone; this.el.dataset.cause = v.cause!;
      }
      this.place();
      if (!this.shown) this.show();
      if (v.stallId !== this.announced) { this.announced = v.stallId; this.announce(c.desc); } // once per show (new stall_id)
    } else if (this.shown) this.hide();
  }
  private place() {
    const g = this.goal, st = this.el.style, px = (n: number) => `${n}px`;
    const top = px(g.offsetTop), left = px(g.offsetLeft), width = px(g.offsetWidth);
    if (st.top !== top) st.top = top; if (st.left !== left) st.left = left; if (st.width !== width) st.width = width;
  }
  private show() {
    this.shown = true; clearTimeout(this.hideT);
    this.el.hidden = false; this.el.classList.remove('ss-hiding'); this.el.classList.toggle('ss-pop', !this.d.rm());
    void this.el.offsetWidth; this.el.classList.add('ss-in');
    // §4.7: the chip replaces the goal bubble in the same slot; the bubble stays laid out (0 px shift) but is not seen or focusable.
    this.goal.classList.add('ss-covered'); this.goal.setAttribute('aria-hidden', 'true'); this.goal.tabIndex = -1;
  }
  private hide() {
    this.shown = false; this.announced = null;
    const hadFocus = document.activeElement === this.el;
    this.el.classList.remove('ss-in'); this.el.classList.add('ss-hiding');
    this.goal.classList.remove('ss-covered'); this.goal.removeAttribute('aria-hidden'); this.goal.removeAttribute('tabindex');
    // §4.6: until the chip tap's guard ends, the slot swallows taps (they don't reach the incoming bubble or #scene).
    const left = this.guardUntil - this.d.now();
    if (left > 0) { this.goal.classList.add('ss-swallow'); window.setTimeout(() => this.goal.classList.remove('ss-swallow'), left); }
    const done = () => { if (!this.shown) { this.el.hidden = true; this.el.classList.remove('ss-hiding'); } };
    // the crossfade length lives in CSS only (150 ms, spec §4.5); reduced motion: instant swap
    if (this.d.rm()) done(); else this.hideT = window.setTimeout(done, cssMs(getComputedStyle(this.el).transitionDuration));
    if (hadFocus) this.goal.focus({ preventScroll: true }); // focus never drops to body
  }
  private announce(text: string) {
    clearTimeout(this.liveT);
    const wait = Math.max(0, this.liveAt + 1000 - this.d.now()); // MK-40: throttled >= 1000 ms
    const go = () => { this.liveAt = this.d.now(); this.live.textContent = text; };
    if (wait > 0) this.liveT = window.setTimeout(go, wait); else go();
  }
  /** §4.6: one tap = one action; repeats within tc.stall_tap_guard_ms are ignored. The sim is told first, so it can attribute the fix. */
  tap(): void {
    const t = this.d.now(); if (!this.shown || !this.copy || t < this.guardUntil) return;
    this.guardUntil = t + this.guardMs;
    const c = this.copy, s = this.d.g.state;
    noteStallChipTap(s, c.action);
    if (c.action === 'manage' && c.worker) openShiftSheet(c.worker, this.el, 'stall_chip');
    else if (c.action === 'refill' && c.worker) this.d.act({ type: 'manage', worker: c.worker });
    else if (c.action === 'collect') this.d.act({ type: 'collect' });
    else this.d.act({ type: 'sellAll' });
  }
}
