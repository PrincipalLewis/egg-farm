/** L30-19b hire nudge (product/farm/l30plus-spec.md L30-19b; copy: rc2-workers-copy.md). Pure helpers, unit-tested.
 *  The rc2 F3 first-hire nudge component is NOT on this base, so this is the minimal shared version: New dot
 *  (data-testid="new-dot") + pulse on the Upgrades nav button and the Workers tab, and one hint line.
 *  The trigger level is data (balance.workers.tips.hire_nudge_farm_level, CSV hire_nudge_farm_level / economy-config fallback). */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { WORKERS, unlockFarm } from '../sim/workers';
import type { WorkerId } from '../sim/workers';
const NB = '\u00a0';
/** Final copy (art-ux/rc2-workers-copy.md §5 v1.1); swap here only. Lead is dropped first on overflow; the chevron never. */
export const HIRE_NUDGE_LEAD = `Busy farm!${NB}·${NB}`;
export const HIRE_NUDGE_CORE = 'Hire a worker';
export const HIRE_NUDGE_CHEVRON = '\u203a';
export const HIRE_NUDGE_TEXT = `${HIRE_NUDGE_LEAD}${HIRE_NUDGE_CORE}${NB}${HIRE_NUDGE_CHEVRON}`;
export const HIRE_NUDGE_ARIA = 'Your farm is busy. Hire a worker. Opens Workers.';
export const NEW_DOT_ARIA = 'New: workers can be hired';
export const HIRE_NUDGE_DISMISS_ARIA = 'Dismiss hire hint';
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
/** §5: hint line under the Farm card's Buy button. The whole hint is ONE button (opens Workers): 14px Workers icon, 4px gap,
 *  text. §5a: the dismiss × is a separate sibling button, flush right (44x44, 8px gap). */
export const hireNudgeHtml = (icon: string) =>
  `<div class="hire-nudge-line" data-testid="hire-nudge-line"><button type="button" class="hire-nudge" data-testid="hire-nudge" aria-label="${HIRE_NUDGE_ARIA}">`
  + `<img class="hn-ic" src="${icon}" width="14" height="14" alt="" aria-hidden="true"><span class="hn-txt"><span class="hn-lead">${HIRE_NUDGE_LEAD}</span>${HIRE_NUDGE_CORE}${NB}${HIRE_NUDGE_CHEVRON}</span></button>`
  + `<button type="button" class="hire-nudge-x" data-testid="hire-nudge-dismiss" aria-label="${HIRE_NUDGE_DISMISS_ARIA}">×</button></div>`;
/** §5a: after dismiss, focus moves to the Farm card's Buy button. */
export const FARM_BUY_SELECTOR = 'button.btn.buy[data-kind="farm"]';
export const focusAfterDismiss = (root: { querySelector(sel: string): { focus(o?: FocusOptions): void } | null }) => root.querySelector(FARM_BUY_SELECTOR)?.focus({ preventScroll: true });
/** §5a drop rule: reserve the × (44) + gap (8) first; drop the lead if the hint gets < 170px. Mirrors the CSS container query. */
export const DISMISS_RESERVE_PX = 44 + 8, HINT_FULL_MIN_PX = 170;
export const dropLead = (rowWidthPx: number) => rowWidthPx - DISMISS_RESERVE_PX < HINT_FULL_MIN_PX;
export const newDotHtml = () => `<span class="new-dot" data-testid="new-dot" role="img" aria-label="${NEW_DOT_ARIA}"></span>`;
