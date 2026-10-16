/** L30-19b hire nudge (product/farm/l30plus-spec.md L30-19b; copy: rc2-workers-copy.md). Pure helpers, unit-tested.
 *  The rc2 F3 first-hire nudge component is NOT on this base, so this is the minimal shared version: New dot
 *  (data-testid="new-dot") + pulse on the Upgrades nav button and the Workers tab, and one hint line.
 *  The trigger level is data (balance.workers.tips.hire_nudge_farm_level, CSV hire_nudge_farm_level / economy-config fallback). */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { WORKERS, unlockFarm } from '../sim/workers';
import type { WorkerId } from '../sim/workers';
const NB = '\u00a0';
/** Final copy (rc2-workers-copy.md); swap here only. */
export const HIRE_NUDGE_TEXT = `Busy farm!${NB}·${NB}Hire a worker`;
export const HIRE_NUDGE_CHEVRON = '›';
export const HIRE_NUDGE_ARIA = 'Your farm is busy. Hire a worker. Opens Workers.';
export const NEW_DOT_ARIA = 'New: workers can be hired';
export const HIRE_NUDGE_DISMISS_ARIA = 'Dismiss';
export type HireNudgeSource = 'f3' | 'l25';
export const hireNudgeLevel = (b: Balance) => b.workers.tips.hire_nudge_farm_level;
export const hasWorker = (s: GameState) => WORKERS.some(id => !!s.workers[id]);
/** Eligible while Farm >= level, no worker hired and never cleared (own trigger: independent of the coop-full hint and the
 *  F3 nudge's dismissals). Dismissal is session-only, held by Game (HoP 00:04). */
export const hireNudgeEligible = (s: GameState, b: Balance) => !s.hireNudgeDone && !hasWorker(s) && s.farmLevel >= hireNudgeLevel(b);
/** The worker to highlight in Workers: first unlocked, unhired worker in roster order. */
export const nextHire = (s: GameState, b: Balance): WorkerId | null => WORKERS.find(id => !s.workers[id] && s.farmLevel >= unlockFarm(id, b)) ?? null;
/** One hint line at a time: coop-full > hire nudge > UC25 > M4 hints. */
export const HINT_ORDER = ['coop_full', 'hire_nudge', 'uc25', 'm4'] as const;
export type HintKey = typeof HINT_ORDER[number];
export const pickHint = (on: Partial<Record<HintKey, boolean>>): HintKey | null => HINT_ORDER.find(k => on[k]) ?? null;
export const hireNudgeHtml = (icon: string) =>
  `<button class="hire-nudge" data-testid="hire-nudge" aria-label="${HIRE_NUDGE_ARIA}"><img src="${icon}" alt="" aria-hidden="true">${HIRE_NUDGE_TEXT}<span class="chev" aria-hidden="true">${HIRE_NUDGE_CHEVRON}</span></button>`;
export const hireNudgeDismissHtml = () => `<button class="hire-nudge-x" data-testid="hire-nudge-dismiss" aria-label="${HIRE_NUDGE_DISMISS_ARIA}">×</button>`;
export const newDotHtml = () => `<span class="new-dot" data-testid="new-dot" role="img" aria-label="${NEW_DOT_ARIA}"></span>`;
