/** M2 PLACEHOLDER UI (no Art & UX layout yet): Workers tab rows (hire, energy bar, state, Manage), Coop Hand tip.
 *  Final visuals come with the Art & UX M2 layout; keep logic here, swap markup later. */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { fmtMoney } from './format';
import { WORKERS, WorkerId, mood, isYawning, showManageAll, needManage, hireCostCents, unlockFarm, graderTierCostCents } from '../sim/workers';
export const WORKER_NAMES: Record<WorkerId, string> = { market_hand: 'Market Hand', coop_hand: 'Coop Hand', hawker: 'Hawker', grader: 'Egg Grader' };
const WHAT: Record<WorkerId, string> = { market_hand: 'Serves customers for you', coop_hand: 'Collects eggs for you', hawker: 'Customers buy more', grader: 'Eggs sell for more' };
const ASSET = (f: string) => `${import.meta.env.BASE_URL}assets/${f}`;
/** §4.6 ring: --ring-offset = 100 x (1 - remaining / manage_cooldown_s); 0 = full ring, 100 = emptied. */
export const ringOffset = (remainingS: number, cooldownS: number) =>
  cooldownS <= 0 ? 100 : Math.round(Math.min(100, Math.max(0, 100 * (1 - remainingS / cooldownS))) * 10) / 10;
/** ring-cooldown.svg inlined (CSS reaches .ring-progress), driven by the shared cooldown. Whole seconds, so it steps 1/s. */
export function ringHtml(s: GameState, b: Balance): string {
  const rem = Math.ceil(s.manageCdS);
  return `<svg class="ring-cooldown" viewBox="0 0 48 48" aria-hidden="true" style="--ring-offset:${ringOffset(rem, b.workers.energy.manage_cooldown_s)}"><circle cx="24" cy="24" r="21" fill="none" stroke="#CFC6BA" stroke-width="3"/><circle class="ring-progress" cx="24" cy="24" r="21" fill="none" stroke="#6BBF59" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="100" transform="rotate(-90 24 24)"/></svg>`;
}
/** 44px icon area of a Manage / Manage all button; the ring wraps it while the shared cooldown runs. */
const manageIcon = (s: GameState, b: Balance, icon: string) =>
  `<span class="manage-ico"><img src="${ASSET(icon)}" width="22" height="22" alt="">${ringHtml(s, b)}</span>`;
/** Farm View Manage-all button (§4.4): >= manage_all_min_workers hired and any worker yawning (<= yawn_at_pct). */
export const showFarmManageAll = (s: GameState, b: Balance) => showManageAll(s.workers, b) && WORKERS.some(id => isYawning(s.workers[id], b));
/** Visibility of the Farm View button(s): show rule, and stay visible (with ring) while the cooldown it started runs. */
export const farmManageAllVisible = (s: GameState, b: Balance, wasShown: boolean) =>
  showFarmManageAll(s, b) || (wasShown && s.manageCdS > 1e-9);
/** Yawn sfx (§4.6): one global 6 s throttle; only the FIRST yawning worker in card order; never Asleep/Unpaid
 *  (isYawning excludes both). Returns the worker that "yawns" now, or null. SFX toggle is applied by Audio.enabled. */
export class YawnSfx {
  private last = -Infinity;
  constructor(public periodMs = 6000) {}
  pick(s: GameState, b: Balance, nowMs: number): WorkerId | null {
    if (nowMs - this.last < this.periodMs) return null;
    const id = WORKERS.find(w => isYawning(s.workers[w], b)) ?? null;
    if (id) this.last = nowMs;
    return id;
  }
}
/** v1.1 Manage all pill (layout §4.4): hidden < manage_all_min_workers; "All rested" (disabled) when nobody is below 100%. */
export function manageAllHtml(s: GameState, b: Balance): string {
  if (!showManageAll(s.workers, b)) return '';
  const n = needManage(s.workers).length, cd = Math.ceil(s.manageCdS), glow = n > 0 && WORKERS.some(id => isYawning(s.workers[id], b));
  const label = cd > 0 ? `Manage all 0:${String(cd).padStart(2, '0')}` : n === 0 ? 'All rested' : `Manage all <small>(${n} need it)</small>`;
  return `<button class="btn manage manage-all${glow && cd === 0 ? ' glow' : ''}${cd > 0 ? ' is-cooldown' : ''}" data-act="manageAll" aria-disabled="${cd > 0 || n === 0}">${manageIcon(s, b, 'icon-manage-all.svg')}<span>${label}</span></button>`;
}
export function workersHtml(s: GameState, b: Balance): string {
  return manageAllHtml(s, b) + WORKERS.map(id => {
    const w = s.workers[id], m = mood(w, b), F = s.farmLevel;
    if (!w) {
      const locked = F < unlockFarm(id, b), cost = hireCostCents(id, b), can = !locked && s.coinsCents >= cost;
      return `<div class="wk" data-w="${id}"><h3>${WORKER_NAMES[id]}</h3><div class="meta">${WHAT[id]}</div>
        ${locked ? `<div class="hint">Unlocks at Farm L${unlockFarm(id, b)}</div>` : `<button class="btn buy ${can ? 'affordable' : ''}" data-act="hire" data-w="${id}" aria-disabled="${!can}">Hire ${fmtMoney(cost)}</button>`}</div>`;
    }
    const e = Math.ceil(w.energy), cd = Math.ceil(s.manageCdS), canManage = cd === 0 && w.energy < 100;
    const label = m === 'working' ? 'Working' : m === 'tired' ? 'Tired' : m === 'unpaid' ? 'Unpaid ⚠' : 'Asleep 💤';
    const yawn = isYawning(w, b); // v1.1 yawn cue at <= yawn_at_pct: amber ring + overlay-yawn.svg (layout §4.1)
    let extra = '';
    if (id === 'grader') {
      const tiers = b.workers.grader.tiers, i = s.graderTier;
      extra = `<div class="meta">Grade ×${tiers[i - 1].mult}</div>` + (i < tiers.length
        ? F < tiers[i].farm ? `<div class="hint">Next grade ×${tiers[i].mult} at Farm L${tiers[i].farm}</div>`
          : `<button class="btn buy ${s.coinsCents >= graderTierCostCents(i, b) ? 'affordable' : ''}" data-act="tier" aria-disabled="${s.coinsCents < graderTierCostCents(i, b)}">Grade ×${tiers[i].mult} ${fmtMoney(graderTierCostCents(i, b))}</button>` : '');
    }
    return `<div class="wk ${m}${yawn ? ' yawn' : ''}" data-w="${id}">${yawn ? `<img class="yawn-ov" src="${ASSET('overlay-yawn.svg')}" width="28" height="28" alt="">` : ''}<h3>${WORKER_NAMES[id]} · <span class="st">${label}</span></h3>
      <div class="ebar" role="meter" aria-valuenow="${e}" aria-valuemin="0" aria-valuemax="100" aria-label="Energy"><i style="width:${e}%"></i></div>
      <div class="meta">Energy ${e}%</div>${extra}
      <button class="btn secondary manage${cd > 0 ? ' is-cooldown' : ''}" data-act="manage" data-w="${id}" aria-disabled="${!canManage}">${manageIcon(s, b, 'icon-manage.svg')}<span>${cd > 0 ? `Manage 0:${String(cd).padStart(2, '0')}` : 'Manage'}</span></button></div>`;
  }).join('');
}
/** Coop Hand tip: coop full for >= tip_full_s, Farm >= min_farm, no Coop Hand. Once per session (page load). */
export function shouldShowCoopTip(s: GameState, b: Balance, shownThisSession: boolean): boolean {
  const t = b.workers.tips;
  return !shownThisSession && !s.workers.coop_hand && s.farmLevel >= t.coop_hand_tip_min_farm && s.coopFullS >= t.coop_hand_tip_full_s;
}
export const COOP_TIP_TEXT = 'Coop full! Hire a Coop Hand to collect eggs for you.';
