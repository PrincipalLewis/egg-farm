/** v5 Hire2/v5-pause-ui: the Pause/Resume toggle, paused card copy and the "All workers paused" line
 *  (product/workers/m5-worker-pause-spec.7536acfa.md v1.3.17 §5 rules 1–2, §8 UI, AC-P2/P7/P15/P17).
 *  Toggle and banner only: Rest lives in the Features Shift sheet. The sim (pauseWorker/resumeWorker, sim/pause.ts) owns the state;
 *  this module is pure markup + the UI-only debounce. Everything here is gated by pauseUiOn(), so with m4.flags.pause = 0 (or below
 *  tc_pause_unlock_farm) no pause markup, class or announcement exists (AC-P1/AC-P2). Tunables come only from balance (m4.tc). */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
import { tcNum } from '../config/formulas';
import { isPaused, ENERGY_FULL } from '../sim/pause';
import type { GameState } from '../sim/state';
import { WORKERS, type Worker, type WorkerId } from '../sim/workers';

const ASSET = (f: string) => `${import.meta.env.BASE_URL}assets/${f}`;
/** §8 Labels: icon-pause.svg while working, icon-resume.svg while paused (art-ux/assets, sha1 97291783 / 0b6a5faa). No emoji. */
export const PAUSE_ICON = { pause: 'icon-pause.svg', resume: 'icon-resume.svg' } as const;
/** Rule 1: the toggle (and banner, and every pause UI string) exists only with m4.enabled, m4.flags.pause and farm ≥ tc_pause_unlock_farm. */
export const pauseUiOn = (s: GameState, b: Balance): boolean => flagOn(b, 'pause') && s.farmLevel >= tcNum(b, 'pause_unlock_farm');
/** §8 / AC-P15: icon-only button, so the accessible name is "Pause {role}" / "Resume {role}" (WCAG 2.5.3). */
export const pauseToggleLabel = (role: string, paused: boolean) => `${paused ? 'Resume' : 'Pause'} ${role}`;
/** The toggle: 44×44 (CSS), first item of the card's action row, aria-pressed = paused. */
export function pauseToggleHtml(id: WorkerId, role: string, paused: boolean): string {
  const icon = paused ? PAUSE_ICON.resume : PAUSE_ICON.pause;
  return `<button class="btn pz-toggle" type="button" data-act="pause" data-w="${id}" aria-pressed="${paused}" aria-label="${pauseToggleLabel(role, paused)}"><img src="${ASSET(icon)}" width="24" height="24" alt=""></button>`;
}
/** §8 Sub-line (Art Q6.3, AC-P17): "Paused · Rested 100%" at a full tank; "On break · no wage" when rest_recovery_mult = 0; otherwise recovering. */
export const PAUSE_COPY = { recovering: 'On break · no wage · recovering', noRecovery: 'On break · no wage', rested: 'Paused · Rested 100%', pill: 'Paused', all: 'All workers paused' } as const;
export function pausedSubline(w: Worker, b: Balance): string {
  if (w.energy >= ENERGY_FULL) return PAUSE_COPY.rested;
  return tcNum(b, 'rest_recovery_mult') > 0 ? PAUSE_COPY.recovering : PAUSE_COPY.noRecovery;
}
/** §3 / AC-P15: true when at least one worker is hired and every hired worker is paused. */
export function allWorkersPaused(s: GameState, b: Balance): boolean {
  const hired = WORKERS.filter(id => s.workers[id]);
  return hired.length > 0 && hired.every(id => isPaused(s.workers[id], b));
}
/** "All workers paused" line (§8: 12 px, ink-2, non-interactive; no tabindex or handler). Announced through the persistent pause live region
 *  (app.ts), not here, because #uRow is re-rendered wholesale. Empty unless the pause UI is on and every hired worker is paused. */
export const allPausedHtml = (s: GameState, b: Balance) => pauseUiOn(s, b) && allWorkersPaused(s, b) ? `<div class="pz-all">${PAUSE_COPY.all}</div>` : '';
/** Polite announcement after a toggle (live region): "Market Hand paused" / "Market Hand back to work", plus the all-paused line. */
export const pauseAnnouncement = (role: string, paused: boolean, all: boolean) => `${role} ${paused ? 'paused' : 'back to work'}.${all ? ` ${PAUSE_COPY.all}.` : ''}`;
/** Rule 2 / AC-P7: per-worker debounce of tc_pause_toggle_debounce_s (UI-only). A tap inside the window is refused (M1 disabled shake).
 *  `nowMs` is the UI clock (performance.now()); the window is measured from the last ACCEPTED tap. */
export class PauseDebounce {
  private last = new Map<WorkerId, number>();
  /** True = accept the tap (and start a new window). */
  accept(id: WorkerId, nowMs: number, b: Balance): boolean {
    const winMs = tcNum(b, 'pause_toggle_debounce_s') * 1000, prev = this.last.get(id);
    if (prev !== undefined && nowMs - prev < winMs) return false;
    this.last.set(id, nowMs);
    return true;
  }
}
