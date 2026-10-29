/** M2 PLACEHOLDER UI (no Art & UX layout yet): Workers tab rows (hire, energy bar, state, Manage), Coop Hand tip.
 *  Final visuals come with the Art & UX M2 layout; keep logic here, swap markup later. */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { fmtMoney } from './format';
import { WARN_SVG, MOON_SVG } from './icons';
export { WARN_SVG, MOON_SVG }; // m5: card state-word icons (one copy, src/ui/icons.ts)
import { WORKERS, WorkerId, Worker, canManageWorker, mood, isYawning, showManageAll, hireCostCents, unlockFarm, graderTierCostCents, resumeNeedCents } from '../sim/workers';
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
const manageIcon = (s: GameState, b: Balance, icon: string, px = 22) =>
  `<span class="manage-ico"><img src="${ASSET(icon)}" width="${px}" height="${px}" alt="">${ringHtml(s, b)}</span>`;
/** B5 (Product, Oct 15): a worker "needs" Manage only at energy <= manage_prompt_threshold (balance). */
export const needsPrompt = (w: Worker | undefined, b: Balance) => canManageWorker(w, b);
/** Workers counted by "Manage all (N need it)". P2b (rc1-asleep v1.0.8 rule 4, AC-R15): an Unpaid worker is never counted, since Refill
 *  doesn't fix Unpaid. UI only: the sim's needManage (what Manage all refills) is unchanged, so traces and saves stay byte-identical. */
export const promptManage = (s: GameState, b: Balance) => WORKERS.filter(id => needsPrompt(s.workers[id], b) && !s.workers[id]?.unpaid);
/** P2b (rc1-asleep v1.0.8 rule 1, AC-R10/R14): the coins at which the tick resumes an Unpaid worker, X = reserved + need, mirroring
 *  sim/tick.ts workerActions: reserved = 1 min of wage for every paid MH/CH (not Unpaid, energy > 0) plus every Unpaid one resumed
 *  earlier in the same check (Market Hand first, then Coop Hand). null when the worker isn't Unpaid or pays no wage. */
export function resumeAtCents(s: GameState, b: Balance, id: WorkerId): number | null {
  if (id !== 'market_hand' && id !== 'coop_hand' || !s.workers[id]?.unpaid) return null;
  const order = ['market_hand', 'coop_hand'] as const;
  let reserved = 0;
  for (const k of order) { const w = s.workers[k]; if (w && !w.unpaid && w.energy > 0) reserved += resumeNeedCents(k, s.farmLevel, b); }
  for (const k of order) {
    if (!s.workers[k]?.unpaid) continue;
    const need = resumeNeedCents(k, s.farmLevel, b);
    if (k === id) return reserved + need;
    reserved += need;
  }
  return null;
}
/** P2b copy (rc1-asleep v1.0.9, Art-final): visible caption + the aria-describedby sentence on the disabled Refill. */
export const unpaidCaption = (x: number) => `Resumes at ${fmtMoney(x)}`;
export const unpaidDescription = (id: WorkerId, x: number) => `${WORKER_NAMES[id]} is unpaid. Work resumes automatically when you have ${fmtMoney(x)}. Sell eggs to earn coins.`;
/** Farm View Manage-all button (§4.4): >= manage_all_min_workers hired (D-HOP-2026-10-17-05, main) and N > 0 (hidden when N is 0, B5). */
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
/** AC-R9 plural: "Refill 1 tired worker" / "Refill N tired workers" (never "1 tired workers"). */
export const refillTiredLabel = (n: number) =>
  n === 1 ? 'Refill 1 tired worker' : `Refill ${n} tired workers`;

/** D-HOP-2026-10-17-05 (main wins): 0 below manage_all_min_workers hired (no bar, no nav Refill), else every hired worker <= manage_prompt_threshold. */
export function refillCount(s: GameState, b: Balance): number { return showManageAll(s.workers, b) ? promptManage(s, b).length : 0; }
export function manageAllHtml(s: GameState, b: Balance): string {
  if (!showManageAll(s.workers, b)) return '';
  const n = refillCount(s, b), cd = Math.ceil(s.manageCdS);
  if (n === 0) return ''; // AC-R9: hidden when N=0
  const glow = WORKERS.some(id => isYawning(s.workers[id], b));
  const label = refillTiredLabel(n);
  return `<div class="refill-wrap"><button class="btn manage manage-all${glow && cd === 0 ? ' glow' : ''}${cd > 0 ? ' is-cooldown' : ''}" data-act="manageAll" aria-disabled="${cd > 0}" aria-label="${label}"${cd > 0 ? ' aria-describedby="refillCap"' : ''}>${manageIcon(s, b, 'icon-manage.svg')}<span>${label}</span></button>${cd > 0 ? `<div class="wk-cap num" id="refillCap">Ready in ${cd}s</div>` : ''}</div>`;
}
/** Caption under a greyed per-worker Refill. Precedence (rc1-asleep v1.0.12 rule 2): Unpaid "Resumes at $X" > "Rested, refill below T%"
 *  (above manage_prompt_threshold) > "Ready in Ns" (shared cooldown) > none. `resumeCents` = resumeAtCents() for an Unpaid worker. */
export const manageCaption = (w: Worker | undefined, cdS: number, b: Balance, resumeCents: number | null = null) =>
  w?.unpaid && resumeCents !== null ? unpaidCaption(resumeCents) : !needsPrompt(w, b) ? `Rested, refill below ${Math.round(b.workers.energy.manage_prompt_threshold * 100)}%` : cdS > 0 ? `Ready in ${Math.ceil(cdS)}s` : '';
/** art-ux/rc2-workers-copy.md §6 (signed off 07:19): role first, colon, effect; 14px SVG icon (moon = asleep, warning = unpaid), no emoji.
 *  Nunito 700 12px, one line; `short` drops the role name (360 fallback); aria always has the role.
 *  The effect comes ONLY from the role itself and its own state (HoE ruling, Oct 24): never from the global salesStopped(). */
export const BANNER_ROLE: Record<WorkerId, string> = { market_hand: 'Market Hand', coop_hand: 'Coop Hand', hawker: 'Hawker', grader: 'Grader' };
/** The ONE place the banner icons are named (Art ruling (A), Oct 24: icon-moon.svg / icon-warning.svg byte-identical to rc1 8a49d35,
 *  14px, aria-hidden; not overlay-asleep.svg, which is the worker-card Zzz overlay). */
export const BANNER_ICON = { asleep: 'icon-moon.svg', unpaid: 'icon-warning.svg' } as const;
/** The ONE Market Hand copy switch. 'slowed' = the rc1 spec rule (PM Workers ruling (a)); 'stopped' = D-HOP-2026-10-24-14:
 *  a hired Market Hand that is Asleep/Unpaid serves nobody, so its banner always reads "Market Hand asleep: sales stopped"
 *  ("Market Hand unpaid: sales stopped"). */
export type MarketHandCopy = 'slowed' | 'stopped';
export const MARKET_HAND_COPY: MarketHandCopy = 'stopped'; // D-HOP-2026-10-24-14, amended by -17 (Unpaid)
export interface WorkerBanner { kind: 'asleep' | 'unpaid'; text: string; short: string; aria: string; icon: string }
/** CCR #70 n2: no GameState parameter; the banner reads only the role, its mood and balance (no global-state coupling). */
export function workerBanner(id: WorkerId, m: string | null, b: Balance, copy: MarketHandCopy = MARKET_HAND_COPY): WorkerBanner | null {
  if (m !== 'asleep' && m !== 'unpaid') return null;
  const role = BANNER_ROLE[id], st = m, pct = Math.round(b.workers.grader.asleep_bonus_share * 100);
  const [eff, effAria] = id === 'grader' ? [`bonus down to ${pct}%`, `Bonus down to ${pct} percent.`]
    : id === 'market_hand' && copy === 'stopped' ? ['sales stopped', 'Auto-sales have stopped.'] // art-ux/rc2-workers-copy.md §6 (amended 16:52)
    : id === 'coop_hand' ? ['collecting stopped', 'Auto-collecting has stopped.'] // rc1-asleep-state-spec v1.0.6 / art-ux §6 (amended 16:57): auto-collect is 0 while Asleep/Unpaid
    : ['sales slowed', 'Sales are slowed.'];
  const short = `${st[0].toUpperCase()}${st.slice(1)}: ${eff}`;
  return { kind: m, text: `${role} ${st}: ${eff}`, short, aria: `${role} is ${st}. ${effAria}`, icon: BANNER_ICON[m] };
}
/** Visible banner text (full form); kept for callers/tests. */
export const workerBannerText = (id: WorkerId, m: string | null, b: Balance) => workerBanner(id, m, b)?.text ?? '';
export const workerBannerHtml = (wb: WorkerBanner | null) => !wb ? '' :
  `<div class="wk-banner ${wb.kind}" role="status"><img class="wb-ico" src="${ASSET(wb.icon)}" width="14" height="14" alt="" aria-hidden="true"><span class="bt" aria-hidden="true" data-full="${wb.text}" data-short="${wb.short}">${wb.text}</span><span class="sr">${wb.aria}</span></div>`;
/** 360 rule: if the full banner doesn't fit on one line, drop the role name (never wrap or ellipsise). Call after layout. */
export function fitBanners(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('.wk-banner .bt').forEach(t => {
    const full = t.dataset.full ?? '', short = t.dataset.short ?? '';
    if (t.textContent !== full) t.textContent = full;
    if (t.clientWidth && t.scrollWidth > t.clientWidth + 0.5) t.textContent = short;
  });
}
export function workersHtml(s: GameState, b: Balance): string {
  return manageAllHtml(s, b) + WORKERS.map(id => {
    const w = s.workers[id], m = mood(w, b), F = s.farmLevel;
    if (!w) {
      const locked = F < unlockFarm(id, b), cost = hireCostCents(id, b), can = !locked && s.coinsCents >= cost;
      return `<div class="wk" data-w="${id}"><h3>${WORKER_NAMES[id]}</h3><div class="meta">${WHAT[id]}</div>
        ${locked ? `<div class="hint">Unlocks at Farm L${unlockFarm(id, b)}</div>` : `<button class="btn buy ${can ? 'affordable' : ''}" data-act="hire" data-w="${id}" aria-disabled="${!can}">Hire ${fmtMoney(cost)}</button>`}</div>`;
    }
    // B5: enabled only <= threshold. P2b (AC-R10/R11/U2): never for an Unpaid worker (Refill doesn't fix Unpaid), whatever the energy/cooldown.
    const x = resumeAtCents(s, b, id), unpaid = x !== null;
    const e = Math.ceil(w.energy), cd = Math.ceil(s.manageCdS), canManage = cd === 0 && needsPrompt(w, b) && !w.unpaid;
    const cap = manageCaption(w, cd, b, x);
    // Unpaid: the button's name stays "Refill {Role}" (WCAG 2.5.3); the full resume sentence is its description (never aria-label).
    const desc = unpaid ? `capd-${id}` : cap ? `cap-${id}` : '';
    const off = m === 'asleep' || m === 'unpaid';
    const label = m === 'working' ? 'Working' : m === 'tired' ? 'Tired' : m === 'unpaid' ? 'Unpaid' : 'Asleep'; // m5: no emoji / text pictograph; the icon is the inline SVG after the word
    const banner = workerBannerHtml(workerBanner(id, m, b));
    const yawn = isYawning(w, b);
    let extra = '';
    if (id === 'grader') {
      const tiers = b.workers.grader.tiers, i = s.graderTier;
      extra = `<div class="meta">Grade ×${tiers[i - 1].mult}</div>` + (i < tiers.length
        ? F < tiers[i].farm ? `<div class="hint">Next grade ×${tiers[i].mult} at Farm L${tiers[i].farm}</div>`
          : `<button class="btn buy ${s.coinsCents >= graderTierCostCents(i, b) ? 'affordable' : ''}" data-act="tier" aria-disabled="${s.coinsCents < graderTierCostCents(i, b)}">Grade ×${tiers[i].mult} ${fmtMoney(graderTierCostCents(i, b))}</button>` : '');
    }
    const body = `<h3>${WORKER_NAMES[id]} · <span class="st">${label}${m === 'unpaid' ? WARN_SVG : m === 'asleep' ? MOON_SVG : ''}</span></h3>
      <div class="ebar" role="meter" aria-valuenow="${e}" aria-valuemin="0" aria-valuemax="100" aria-label="Energy"><i style="width:${e}%"></i></div>
      <div class="meta">Energy ${e}%</div>${extra}`;
    const refill = `<button class="btn secondary manage${cd > 0 ? ' is-cooldown' : ''}" aria-label="Refill ${WORKER_NAMES[id]}" data-act="manage" data-w="${id}" aria-disabled="${!canManage}"${desc ? ` aria-describedby="${desc}"` : ''}>${manageIcon(s, b, 'icon-manage-all.svg', 28)}<span>Refill</span></button>${cap ? `<div class="wk-cap num" id="cap-${id}">${cap}</div>` : ''}${unpaid ? `<span class="sr" id="capd-${id}">${unpaidDescription(id, x!)}</span>` : ''}`;
    return `<div class="wk ${m}${yawn ? ' yawn' : ''}${off ? ' is-off' : ''}" data-w="${id}">${banner}${yawn ? `<img class="yawn-ov" src="${ASSET('overlay-yawn.svg')}" width="28" height="28" alt="">` : ''}<div class="wk-body">${body}</div><div class="wk-refill">${refill}</div></div>`;
  }).join('');
}
/** Coop Hand tip: coop full for >= tip_full_s, Farm >= min_farm, no Coop Hand. Once per session (page load). */
export function shouldShowCoopTip(s: GameState, b: Balance, shownThisSession: boolean): boolean {
  const t = b.workers.tips;
  return !shownThisSession && !s.workers.coop_hand && s.farmLevel >= t.coop_hand_tip_min_farm && s.coopFullS >= t.coop_hand_tip_full_s;
}
export const COOP_TIP_TEXT = 'Coop full! Hire a Coop Hand to collect eggs for you.';
/** S2-5 (session2-ui-triage (b)): Farm View Manage button copy. Nav (Art & UX 08:47, v1.3 copy): "Refill" / "0:28" + N badge; docked header: "Refill tired (N)" /
 *  "Ready in Ns". aria-label "Refill N tired workers" / "Refill, cooling down" during the cooldown (countdown label aria-hidden, review 23a3798 #1); the cooldown aria text changes at most every 5 s. */
export interface NavAria { text: string; at: number }
/** Pure nav/docked Refill state from the game state (what app.ts renders); same count as the Refill bar (refillCount). */
export const navRefillState = (s: GameState, b: Balance, docked: boolean, prev: NavAria, nowMs: number) => navManageView(refillCount(s, b), s.manageCdS, docked, prev, nowMs);
export const REFILL_COOLDOWN_ARIA = 'Refill, cooling down';
export function navManageView(n: number, cdS: number, docked: boolean, prev: NavAria, nowMs: number): { label: string; badge: string; aria: NavAria; hideLabel: boolean } {
  const cd = Math.ceil(cdS - 1e-9);
  if (cd > 0) {
    const label = docked ? `Ready in ${cd}s` : `0:${String(cd).padStart(2, '0')}`;
    // review 23a3798 #1: the countdown is a visual-only, aria-hidden label; the name is stable for the whole cooldown, so it never goes stale
    return { label, badge: '', hideLabel: true, aria: prev.text === REFILL_COOLDOWN_ARIA ? prev : { text: REFILL_COOLDOWN_ARIA, at: nowMs } };
  }
  return { hideLabel: false, label: docked ? refillTiredLabel(n) : 'Refill', badge: docked || n < 1 ? '' : String(n), aria: { text: refillTiredLabel(n), at: nowMs } };
}
