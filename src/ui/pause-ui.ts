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
/** Rule 1: the toggle (and banner, and every pause UI string) exists only with m4.enabled, m4.flags.pause and farm ≥ tc_pause_unlock_farm.
 *  HoP D-HOP-2026-11-10-20 (G0 §9): the direct card toggle exists ONLY with m4.flags.rc2Refill = 0 (it then emits worker_paused /
 *  worker_resumed, sim-owned). With rc2Refill = 1 the card has no toggle; Rest lives in the Features Shift sheet (card Manage → sheet, entry 'card'). */
export const pauseUiOn = (s: GameState, b: Balance): boolean =>
  flagOn(b, 'pause') && !flagOn(b, 'rc2Refill') && s.farmLevel >= tcNum(b, 'pause_unlock_farm');
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
 *  `nowMs` is the UI clock (performance.now()). The window runs from the last tap that CHANGED the state: `ready()` checks, `mark()` is
 *  called only after a successful dispatch, so a refused dispatch (game held, below unlock) never starts a window. */
export class PauseDebounce {
  private last = new Map<WorkerId, number>();
  ready(id: WorkerId, nowMs: number, b: Balance): boolean {
    const prev = this.last.get(id);
    return prev === undefined || nowMs - prev >= tcNum(b, 'pause_toggle_debounce_s') * 1000;
  }
  mark(id: WorkerId, nowMs: number) { this.last.set(id, nowMs); }
  /** ready() + mark() in one call (tests / callers that dispatch unconditionally). */
  accept(id: WorkerId, nowMs: number, b: Balance): boolean { if (!this.ready(id, nowMs, b)) return false; this.mark(id, nowMs); return true; }
}
/** B5 / AC-P9 / G0 §7.5: Market Hand call lockout after ANY resume (toggle, manage, auto_full). The sim sets callLockoutS from
 *  tc_pause_call_lockout_s and counts it down in sim seconds; the UI only reads it. For the Rush/Shout buttons (abilities UI, #116):
 *  null when no lockout; otherwise the button text "0:ss" (rounded up, never "0:00") and its describedby "Ready in 0:ss after a break". */
export function callLockoutView(s: GameState, b: Balance): { left: number; text: string; describedBy: string } | null {
  if (!flagOn(b, 'pause')) return null;
  const v = s.workers.market_hand?.callLockoutS;
  if (typeof v !== 'number' || !(v > 0)) return null;
  const left = Math.ceil(v - 1e-9); if (left <= 0) return null;
  const text = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return { left, text, describedBy: `Ready in ${text} after a break` };
}
