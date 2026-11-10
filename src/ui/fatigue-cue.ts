/**
 * #11 Rule 2 HUD fatigue cue (sales-stopped-spec cfff3817 §4.8 Rule 2 + short-viewport variant; Art fatigue-ux v1.3.1 ffb13c19 §1, FC-SV1-16).
 * >= 740 px viewport height: the signed sub-line pill in a slot under the HUD rate, reserved at all times (flag on only).
 * <= 739 px: an icon-only chip in .hud after the basket plus a non-modal popover (role=group) with the cue text and Manage.
 * CSS alone picks the variant: the (max-height) query is emitted from FATIGUE_SUBLINE_MIN_H, defined once here.
 * UI only: reads fatigueCueView() every frame, shows only when shown && !suppressedByStall, calls note* hooks; emits no telemetry.
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { WORKERS, mood, type WorkerId } from '../sim/workers';
import { isPaused } from '../sim/pause';
import { fmtMoneyShort, spellShort } from './format';
import { fatigueCueView, costliestAtRisk, workersAtRisk, noteFatigueCueShown, noteFatigueCueTap } from './stall-api';
import { fatigueLossCents } from './fatigue-bubble';
import { openShiftSheet } from './shift-sheet';

/** Art ruling 12:58 / D-HOP-2026-10-30-24: the ONE definition of the sub-line breakpoint (CSS query + telemetry bucketing read it). */
export const FATIGUE_SUBLINE_MIN_H = 740;
export const shortViewportQuery = () => `(max-height: ${FATIGUE_SUBLINE_MIN_H - 1}px)`;
const MINUS = '\u2212';
export interface CueCopy { asleep: boolean; x: string; short: string; chipName: string; subDesc: string }
/** Pure copy (FC-SV14). x = compact money, floored; the sentences use the HUD aria formatter (spellShort). */
export function cueCopy(lossCents: number, asleep: boolean): CueCopy {
  const x = fmtMoneyShort(lossCents, { round: 'floor' }), spoken = spellShort(x);
  const lead = asleep ? 'Asleep and tired workers are costing' : 'Tired workers are costing';
  return { asleep, x, short: `Tired ${MINUS}${x}/s`, chipName: `${lead} ${spoken} per second. Show details.`, subDesc: `${lead} ${spoken} per second. Open workers.` };
}
/** Any hired, non-Paused worker Asleep (Paused > Unpaid > Asleep precedence, spec §4.1). */
export const anyAsleep = (s: GameState, b: Balance) => WORKERS.some(id => { const w = s.workers[id]; return !!w && !isPaused(w, b) && mood(w, b) === 'asleep'; });

/** Workers sorted by costliest ($/s at risk, descending; ties keep code order: Array.prototype.sort is stable). fatigue-ux §1 L50. */
export function costliestOrder(s: GameState, b: Balance): WorkerId[] {
  const r = workersAtRisk(s, b); return WORKERS.slice().sort((x, y) => r[y] - r[x]);
}
export interface CueDeps {
  g: { state: GameState }; b: Balance; A: (f: string) => string;
  openWorkers: () => void; stallChipEl: () => HTMLElement | null;
}
const WARN = (A: (f: string) => string) => `<img class="fc-warn" src="${A('icon-warning.svg')}" width="16" height="16" alt="" aria-hidden="true">`;
export class FatigueCue {
  readonly chip: HTMLButtonElement; readonly pop: HTMLElement; readonly sub: HTMLButtonElement; readonly slot: HTMLElement; private manage: HTMLButtonElement;
  private shown = false; private key = ''; private ep: string | null = null; private mq: MediaQueryList;
  constructor(private hud: HTMLElement, private farm: HTMLElement, private d: CueDeps) {
    const t = document.createElement('template');
    t.innerHTML = `<button class="fchip" id="fchip" type="button" aria-expanded="false" aria-controls="fpop" aria-describedby="fchipDesc" hidden><span class="fchip-pill"><img class="fc-ic" width="20" height="20" alt="" aria-hidden="true"></span><span class="sr fchip-name"></span></button>`
      + `<div class="fpop" id="fpop" role="group" aria-labelledby="fpopT" hidden><span class="fpop-t" id="fpopT">${WARN(d.A)}<span class="fpop-x"></span></span><button class="fpop-m" type="button">Manage</button></div>`
      + `<span class="sr" id="fchipDesc"></span>`;
    const [chip, pop, desc] = [...t.content.children] as HTMLElement[];
    hud.querySelector('.pill.basket')!.after(chip, pop, desc); // FC-SV15: popover = next DOM sibling, so Manage is the next tab stop
    const t2 = document.createElement('template');
    t2.innerHTML = `<div class="fslot" data-testid="fatigue-slot"><button class="fsub" type="button" aria-describedby="fsubDesc" hidden>${WARN(d.A)}<span class="fsub-t">Tired<span class="fw"> workers</span> <span class="fsub-x"></span></span></button><span class="sr" id="fsubDesc"></span></div>`;
    this.slot = t2.content.firstElementChild as HTMLElement; farm.prepend(this.slot); farm.classList.add('fc-on');
    this.chip = chip as HTMLButtonElement; this.pop = pop; this.sub = this.slot.querySelector('.fsub')!; this.manage = pop.querySelector('.fpop-m')!;
    const st = document.createElement('style'); st.id = 'fc-mq'; // the breakpoint, emitted from the single constant
    st.textContent = `@media ${shortViewportQuery()}{.fslot{display:none}.farm.fc-on{grid-template-rows:auto 1fr auto}}`
      + `@media (min-height: ${FATIGUE_SUBLINE_MIN_H}px){.hud .fchip,.hud .fpop{display:none!important}}`;
    document.head.append(st);
    for (const el of [this.chip, this.pop, this.sub]) el.addEventListener('pointerdown', e => e.stopPropagation());
    this.chip.addEventListener('click', e => { e.stopPropagation(); noteFatigueCueTap(d.g.state, 'hud_chip'); this.setOpen(!this.isOpen); }); // every chip tap logs (incl. the closing tap)
    this.sub.addEventListener('click', e => { e.stopPropagation(); noteFatigueCueTap(d.g.state, 'hud_chip'); d.openWorkers(); });
    this.manage.addEventListener('click', e => { e.stopPropagation(); const id: WorkerId | null = costliestAtRisk(d.g.state, d.b); if (id) openShiftSheet(id, this.manage, 'fatigue_chip'); });
    // Outside tap closes AND passes through (never swallowed): capture listener, no preventDefault / stopPropagation.
    document.addEventListener('pointerdown', e => { if (this.isOpen && !this.chip.contains(e.target as Node) && !this.pop.contains(e.target as Node)) this.setOpen(false); }, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && this.isOpen) { this.setOpen(false); this.chip.focus(); } });
    this.mq = matchMedia(shortViewportQuery());
    this.mq.addEventListener?.('change', () => this.crossed());
  }
  get isOpen() { return !this.pop.hidden; }
  get isShown() { return this.shown; }
  private focusInCue() { const a = document.activeElement; return !!a && (a === this.chip || this.pop.contains(a) || a === this.sub); }
  /** Crossing 739/740: an open popover closes (no event; the episode continues); focus moves to the counterpart only if it was on the cue. */
  private crossed() {
    const had = this.focusInCue(); if (this.isOpen) this.setOpen(false);
    if (had && this.shown) (this.mq.matches ? this.chip : this.sub).focus({ preventScroll: true });
  }
  private setOpen(open: boolean) {
    if (open === this.isOpen) return;
    this.pop.hidden = !open; this.chip.setAttribute('aria-expanded', String(open));
    if (open) this.place();
  }
  /** position: fixed under the HUD (bottom + 6), right-aligned to the chip, clamped 8 px from the viewport edges. */
  private place() {
    const gap = 6, edge = 8, c = this.chip.getBoundingClientRect(), hb = this.hud.getBoundingClientRect().bottom, w = this.pop.offsetWidth;
    const left = Math.max(edge, Math.min(c.right - w, innerWidth - edge - w));
    this.pop.style.top = `${hb + gap}px`; this.pop.style.left = `${left}px`; // unrounded: right edge = chip right exactly (Art §1: 260.4 at 360x640)
  }
  update(): void {
    const s = this.d.g.state, v = fatigueCueView(s, this.d.b), want = v.shown && !v.suppressedByStall;
    if (!want) {
      if (this.shown) {
        const had = this.focusInCue(), stall = v.suppressedByStall ? this.d.stallChipEl() : null;
        this.shown = false; this.ep = null; this.setOpen(false); this.chip.hidden = true; this.sub.hidden = true; this.key = ''; this.chip.classList.remove('fc-in'); this.sub.classList.remove('fc-in');
        if (had) (stall ?? this.d.stallChipEl() ?? document.getElementById('collect'))?.focus({ preventScroll: true }); // never to body
      }
      return;
    }
    const c = cueCopy(fatigueLossCents(s, this.d.b), anyAsleep(s, this.d.b)), key = `${c.short}|${c.chipName}|${c.asleep}`;
    if (key !== this.key) {
      this.key = key;
      this.chip.querySelector('.fchip-name')!.textContent = c.chipName; (document.getElementById('fchipDesc') as HTMLElement).textContent = c.short;
      const ic = this.chip.querySelector('.fc-ic') as HTMLImageElement, src = this.d.A(c.asleep ? 'ico_fatigue_zzz.svg' : 'ico_fatigue_sweat.svg'); if (ic.getAttribute('src') !== src) ic.src = src; // Art final d4709f93 / cbc1665d
      this.chip.dataset.tone = this.pop.dataset.tone = this.sub.dataset.tone = c.asleep ? 'asleep' : 'tired';
      this.pop.querySelector('.fpop-x')!.textContent = c.short;
      this.sub.querySelector('.fsub-x')!.textContent = `${MINUS}${c.x}/s`; (this.slot.querySelector('#fsubDesc') as HTMLElement).textContent = c.subDesc;
    }
    if (!this.shown) { this.shown = true; this.chip.hidden = false; this.sub.hidden = false; this.chip.classList.add('fc-in'); this.sub.classList.add('fc-in'); } // appear: 150 ms fade + 1.05 pop (fade only in reduced motion), CSS
    if (v.episodeId !== this.ep) { this.ep = v.episodeId; noteFatigueCueShown(s, 'hud_chip'); } // sim dedupes per (episodeId, surface) anyway (FC-SV11)
    if (this.isOpen) this.place();
  }
}
