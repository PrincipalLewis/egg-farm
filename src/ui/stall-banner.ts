/**
 * #5b Rule 3: farm-screen Asleep banner (sales-stopped-spec cfff3817 §4.8 Rule 3, §5 dedupe, SS-12/SS-25; fatigue-ux ffb13c19 §2).
 * Reuses the rc2 §6 banner copy (workerBanner) and the bannerFit rule (role dropped only when the full string doesn't fit).
 * Names the costliest Asleep role not covered by the stall chip, plus "+N more"; Paused workers are never named.
 * rc2Refill = 0: action "Refill" (today's per-worker manage). rc2Refill = 1: "Manage" opens the Shift sheet (no Refill control on the farm).
 * Mounted only with m4.flags.salesStopped = 1. UI only: the sim logs fatigue_cue_* (the UI calls the note* hooks).
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { WORKERS, mood, type WorkerId } from '../sim/workers';
import { isPaused } from '../sim/pause';
import { flagOn } from '../config/flags';
import { workerBanner, type WorkerBanner } from './workers-ui';
import { workersAtRisk, noteFatigueCueShown, noteFatigueCueTap } from './stall-api';
import { openShiftSheet } from './shift-sheet';

export interface FarmBannerPick { id: WorkerId; banner: WorkerBanner; more: number; verb: 'Refill' | 'Manage' }
/** Pure. `covered` = the stall chip's role while the chip shows (§5: the banner never names it). Costliest = max workerAtRisk, ties in code order. */
export function farmBannerPick(s: GameState, b: Balance, covered: WorkerId | null): FarmBannerPick | null {
  const asleep = WORKERS.filter(id => { const w = s.workers[id]; return !!w && id !== covered && !isPaused(w, b) && mood(w, b) === 'asleep'; });
  if (!asleep.length) return null;
  const risk = workersAtRisk(s, b);
  const id = asleep.reduce((a, x) => (risk[x] ?? 0) > (risk[a] ?? 0) ? x : a, asleep[0]);
  return { id, banner: workerBanner(id, 'asleep', b)!, more: asleep.length - 1, verb: flagOn(b, 'rc2Refill') ? 'Manage' : 'Refill' };
}
export const moreText = (n: number) => n > 0 ? `+${n} more` : '';

export interface BannerDeps {
  g: { state: GameState }; b: Balance; A: (f: string) => string;
  act: (a: { type: 'manage'; worker: WorkerId }) => boolean; refused: (el: HTMLElement) => void;
}
export class FarmBanner {
  readonly el: HTMLElement; private bt: HTMLElement; private sr: HTMLElement; private more: HTMLElement; private btn: HTMLButtonElement; private ico: HTMLImageElement;
  private key = ''; private pick: FarmBannerPick | null = null;
  constructor(private farm: HTMLElement, private d: BannerDeps) {
    const t = document.createElement('template');
    t.innerHTML = `<div class="farm-banner" data-testid="farm-asleep-banner" hidden><img class="wb-ico" width="14" height="14" alt="" aria-hidden="true"><span class="fb-msg" role="status"><span class="bt" aria-hidden="true"></span><span class="sr"></span></span><span class="fb-more"></span><button class="fb-act" type="button"></button></div>`;
    this.el = t.content.firstElementChild as HTMLElement; farm.prepend(this.el);
    this.bt = this.el.querySelector('.bt')!; this.sr = this.el.querySelector('.sr')!; this.more = this.el.querySelector('.fb-more')!;
    this.btn = this.el.querySelector('.fb-act')!; this.ico = this.el.querySelector('.wb-ico')!;
    this.btn.addEventListener('pointerdown', e => e.stopPropagation());
    this.btn.addEventListener('click', e => { e.stopPropagation(); this.tap(); });
  }
  update(visible: boolean, covered: WorkerId | null): void {
    const p = visible ? farmBannerPick(this.d.g.state, this.d.b, covered) : null; this.pick = p;
    const on = !!p; if (this.el.hidden === on) this.el.hidden = !on; this.farm.classList.toggle('fb-on', on);
    if (!p) { this.key = ''; return; }
    const key = `${p.id}|${p.banner.text}|${p.more}|${p.verb}`;
    if (key !== this.key) {
      this.key = key; this.bt.dataset.full = p.banner.text; this.bt.dataset.short = p.banner.short; this.bt.textContent = p.banner.text;
      this.sr.textContent = p.banner.aria; this.more.textContent = moreText(p.more); this.btn.textContent = p.verb;
      this.ico.src = this.d.A(p.banner.icon); this.el.dataset.w = p.id;
      noteFatigueCueShown(this.d.g.state, 'banner'); // idempotent per (episodeId, surface) in the sim
    }
    this.fit();
  }
  /** bannerFit (SS-G22): full string unless it overflows at the current width; never by breakpoint. */
  private fit() { const t = this.bt, full = t.dataset.full ?? ''; if (t.textContent !== full) t.textContent = full; if (t.clientWidth && t.scrollWidth > t.clientWidth + Number.EPSILON) t.textContent = t.dataset.short ?? full; }
  private tap() {
    const p = this.pick; if (!p) return;
    noteFatigueCueTap(this.d.g.state, 'banner');
    if (p.verb === 'Manage') openShiftSheet(p.id, this.btn, 'asleep_banner');
    else if (!this.d.act({ type: 'manage', worker: p.id })) this.d.refused(this.btn);
  }
}
