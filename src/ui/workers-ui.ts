/** M2 PLACEHOLDER UI (no Art & UX layout yet): Workers tab rows (hire, energy bar, state, Manage), Coop Hand tip.
 *  Final visuals come with the Art & UX M2 layout; keep logic here, swap markup later. */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { fmtMoney } from './format';
import { WORKERS, WorkerId, Worker, canManageWorker, mood, isYawning, showManageAll, hireCostCents, unlockFarm, graderTierCostCents } from '../sim/workers';
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
/** B5 (Product, Oct 15): a worker "needs" Manage only at energy <= manage_prompt_threshold (0.4 = Yawning). */
export const needsPrompt = (w: Worker | undefined, b: Balance) => canManageWorker(w, b);
/** Workers counted by "Manage all (N need it)". */
export const promptManage = (s: GameState, b: Balance) => WORKERS.filter(id => needsPrompt(s.workers[id], b));
/** Farm View Manage-all button (§4.4): >= manage_all_min_workers hired and N > 0 (hidden when N is 0, B5). */
export const showFarmManageAll = (s: GameState, b: Balance) => showManageAll(s.workers, b) && promptManage(s, b).length > 0;
/** Visibility of the Farm View button: B5 hides it whenever N is 0 (including the cooldown right after Manage all). */
/** PT1-10 (Product final): during the shared cooldown it always shows (greyed, M2 ring), whatever the energies; after it,
 *  hidden when N is 0, active otherwise. */
export const farmManageAllVisible = (s: GameState, b: Balance, _wasShown: boolean) =>
  showManageAll(s.workers, b) && (s.manageCdS > 1e-9 || promptManage(s, b).length > 0);
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
/** Manage all pill (layout §4.4): hidden < manage_all_min_workers, and hidden when N (workers <= threshold) is 0 (B5). */
export function manageAllHtml(s: GameState, b: Balance): string {
  if (!showManageAll(s.workers, b)) return '';
  const n = promptManage(s, b).length, cd = Math.ceil(s.manageCdS); if (n === 0 && cd === 0) return ''; // PT1-10
  const glow = n > 0 && WORKERS.some(id => isYawning(s.workers[id], b));
  // v1.3 (m2-workers-layout §4.4): "Refill tired (N)"; during the shared cooldown greyed + ring + "Ready in Ns" caption.
  return `<div class="refill-wrap"><button class="btn manage manage-all${glow && cd === 0 ? ' glow' : ''}${cd > 0 ? ' is-cooldown' : ''}" data-act="manageAll" aria-disabled="${cd > 0}" aria-label="Refill ${n} tired workers"${cd > 0 ? ' aria-describedby="refillCap"' : ''}>${manageIcon(s, b, 'icon-manage.svg')}<span>Refill tired (${n})</span></button>${cd > 0 ? `<div class="wk-cap num" id="refillCap">Ready in ${cd}s</div>` : ''}</div>`;
}
/** v1.3 §4.4: caption under a greyed per-worker Manage: "Ready in Ns" during the shared cooldown, else "Not tired yet" above 40%. */
export const manageCaption = (w: Worker | undefined, cdS: number, b: Balance) => cdS > 0 ? `Ready in ${cdS}s` : !needsPrompt(w, b) ? 'Not tired yet' : '';
export function workersHtml(s: GameState, b: Balance): string {
  return manageAllHtml(s, b) + WORKERS.map(id => {
    const w = s.workers[id], m = mood(w, b), F = s.farmLevel;
    if (!w) {
      const locked = F < unlockFarm(id, b), cost = hireCostCents(id, b), can = !locked && s.coinsCents >= cost;
      return `<div class="wk" data-w="${id}"><h3>${WORKER_NAMES[id]}</h3><div class="meta">${WHAT[id]}</div>
        ${locked ? `<div class="hint">Unlocks at Farm L${unlockFarm(id, b)}</div>` : `<button class="btn buy ${can ? 'affordable' : ''}" data-act="hire" data-w="${id}" aria-disabled="${!can}">Hire ${fmtMoney(cost)}</button>`}</div>`;
    }
    const e = Math.ceil(w.energy), cd = Math.ceil(s.manageCdS), canManage = cd === 0 && needsPrompt(w, b); // B5: enabled only <= threshold
    const cap = manageCaption(w, cd, b); // v1.3: greyed Manage explains why
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
      <button class="btn secondary manage${cd > 0 ? ' is-cooldown' : ''}" data-act="manage" data-w="${id}" aria-disabled="${!canManage}"${cap ? ` aria-describedby="cap-${id}"` : ''}>${manageIcon(s, b, 'icon-manage.svg')}<span>Manage</span></button>${cap ? `<div class="wk-cap num" id="cap-${id}">${cap}</div>` : ''}</div>`;
  }).join('');
}
/** Coop Hand tip: coop full for >= tip_full_s, Farm >= min_farm, no Coop Hand. Once per session (page load). */
export function shouldShowCoopTip(s: GameState, b: Balance, shownThisSession: boolean): boolean {
  const t = b.workers.tips;
  return !shownThisSession && !s.workers.coop_hand && s.farmLevel >= t.coop_hand_tip_min_farm && s.coopFullS >= t.coop_hand_tip_full_s;
}
export const COOP_TIP_TEXT = 'Coop full! Hire a Coop Hand to collect eggs for you.';
/** S2-5 (session2-ui-triage (b)): Farm View Manage button copy. Nav: "Manage" / "0:28" + N badge; docked header: "Refill tired (N)" /
 *  "Ready in Ns". aria-label "Manage tired workers, N tired" / "..., available in N seconds"; the cooldown aria text changes at most every 5 s. */
export interface NavAria { text: string; at: number }
export function navManageView(n: number, cdS: number, docked: boolean, prev: NavAria, nowMs: number): { label: string; badge: string; aria: NavAria } {
  const cd = Math.ceil(cdS - 1e-9);
  if (cd > 0) {
    const label = docked ? `Ready in ${cd}s` : `0:${String(cd).padStart(2, '0')}`;
    const fresh = prev.text.includes('available in') && nowMs - prev.at < 5000;
    return { label, badge: '', aria: fresh ? prev : { text: `Manage tired workers, available in ${cd} seconds`, at: nowMs } };
  }
  return { label: docked ? `Refill tired (${n})` : 'Manage', badge: docked || n < 1 ? '' : String(n), aria: { text: `Manage tired workers, ${n} tired`, at: nowMs } };
}
