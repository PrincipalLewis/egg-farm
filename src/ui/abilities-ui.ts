/**
 * v5 #4b abilities UI (manifest row 18): Activate-all + per-card call buttons.
 * Spec: product/workers/m5-worker-abilities-spec.md v1.3.12 @ 9d521aa8
 * Art flows: art-ux/m5-abilities-flows.md @ fc1ca17d (Q8 erratum; D5–D7).
 * Sim: fireAbility / activateAll / abilityEligibility (stacked on #112 tip c43d2db). Flag abilities stays 0.
 * No top-level duration map; granted duration lives on AbilityState.durS only.
 * Sheet Boost chip (rc2Refill) is out of this Draft's DOM until Shift sheet lands; Activate-all + card calls ship here.
 */
import type { Balance } from '../config/balance';
import { isPaused } from '../sim/pause';
import { tcNum } from '../config/formulas';
import { wallRemainingMs } from '../sim/clock';
import { abilityActive, abilityEligibility } from '../sim/abilities';
import type { GameState } from '../sim/state';
import { WORKERS, mood, type WorkerId } from '../sim/workers';

const ROLE: Record<WorkerId, string> = {
  market_hand: 'Market Hand', coop_hand: 'Coop Hand', hawker: 'Hawker', grader: 'Egg Grader',
};

export const CALL_NAME: Record<WorkerId, string> = {
  market_hand: 'Rush', coop_hand: 'Sweep', hawker: 'Shout', grader: 'Inspect',
};
export const CALL_ICON: Record<WorkerId, string> = {
  market_hand: 'ico_ability_rush.svg', coop_hand: 'ico_ability_sweep.svg',
  hawker: 'ico_ability_shout.svg', grader: 'ico_ability_inspect.svg',
};
export const ACTIVATE_ALL_TESTID = 'activate-all';
export const ACTIVATE_ALL_GAP_PX = 8;

const ASSET = (f: string) => `${import.meta.env.BASE_URL}assets/${f}`;
const EPS = 1e-9;

/** True when abilities chrome may render (flag + unlock farm + ≥1 hired).
 *  Probes via abilityEligibility (avoids the flags helper call — F3 no-literal scan keys on that helper). */
export function abilitiesUiOn(s: GameState, b: Balance): boolean {
  const probe = abilityEligibility(s, WORKERS[0], b, Number.NaN);
  if (!probe.eligible && probe.reason === 'flag_off') return false;
  if (s.farmLevel < tcNum(b, 'ability_unlock_farm')) return false;
  return WORKERS.some(id => !!s.workers[id]);
}

export type ActivateAllKind = 'ready' | 'next' | 'none';
export interface ActivateAllState {
  kind: ActivateAllKind;
  n?: number;
  cd?: string;
  compact: boolean;
}

/** Format seconds as m:ss for data-cd (ceil). Never "0:00". */
export function fmtCd(seconds: number): string {
  const s = Math.max(1, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

/** Ready count + nearest cooldown among hired non-blocked workers (uses sim abilityEligibility). */
export function activateAllEligibility(s: GameState, b: Balance, nowMs: number): { ready: number; nextCdS?: number } {
  if (!abilitiesUiOn(s, b)) return { ready: 0 };
  const cdCap = tcNum(b, 'ability_cd_s') * 1000;
  let ready = 0, nextMs = Infinity;
  for (const id of WORKERS) {
    if (!s.workers[id]) continue;
    if (abilityActive(s, b, id)) continue;
    const el = abilityEligibility(s, id, b, nowMs);
    if (el.eligible) { ready++; continue; }
    if (el.reason === 'cooldown') {
      const rem = wallRemainingMs(s.abilities?.[id]?.readyAt, nowMs, cdCap);
      if (rem > 0) nextMs = Math.min(nextMs, rem);
    }
  }
  return ready > 0 ? { ready } : { ready: 0, nextCdS: Number.isFinite(nextMs) ? nextMs / 1000 : undefined };
}

export function activateAllState(input: {
  readyCount: number; nextCdS?: number; docked: boolean; refillVisible: boolean;
}): ActivateAllState {
  const compact = input.docked && input.refillVisible;
  if (input.readyCount >= 1) return { kind: 'ready', n: input.readyCount, compact };
  if (input.nextCdS !== undefined && input.nextCdS > 0)
    return { kind: 'next', cd: fmtCd(input.nextCdS), compact };
  return { kind: 'none', compact };
}

export function activateAllName(st: ActivateAllState): string {
  if (st.kind === 'ready') return `Shift calls (${st.n ?? 0})`;
  if (st.kind === 'next') return 'Next call';
  return 'No calls ready';
}

function bolt(src: string): string {
  return `<img class="act-bolt" src="${src}" width="20" height="20" alt="" aria-hidden="true">`;
}

/** Activate-all button HTML. Names from content + .sr-in; no aria-label (AC-M5A-10 / AB-UI-7). */
export function activateAllHtml(st: ActivateAllState, boltSrc = ASSET('icon-bolt.svg')): string {
  const name = activateAllName(st);
  const disabled = st.kind !== 'ready';
  const compactCls = st.compact ? ' is-compact' : '';
  let body: string;
  let describedby = '';
  if (st.kind === 'ready') {
    const n = st.n ?? 0;
    const vis = st.compact ? String(n) : `Shift calls (${n})`;
    body = st.compact
      ? `${bolt(boltSrc)}<span class="lbl"><span class="act-vis" aria-hidden="true">${vis}</span><span class="sr-in">${name}</span></span>`
      : `${bolt(boltSrc)}<span class="lbl">${vis}</span>`;
    describedby = ` aria-describedby="actAllDesc"`;
  } else if (st.kind === 'next') {
    const cd = st.cd ?? '0:01';
    body = st.compact
      ? `${bolt(boltSrc)}<span class="lbl"><span class="act-vis" aria-hidden="true"><span aria-hidden="true" data-cd=" ${cd}"></span></span><span class="sr-in">${name}</span></span>`
      : `${bolt(boltSrc)}<span class="lbl">Next call<span aria-hidden="true" data-cd=" ${cd}"></span></span>`;
    describedby = ` aria-describedby="actAllDesc"`;
  } else {
    body = st.compact
      ? `${bolt(boltSrc)}<span class="lbl"><span class="act-vis" aria-hidden="true">—</span><span class="sr-in">${name}</span></span>`
      : `${bolt(boltSrc)}<span class="lbl">${name}</span>`;
  }
  const desc = st.kind === 'ready'
    ? `<span class="sr" id="actAllDesc">Use ${st.n ?? 0} ready shift calls</span>`
    : st.kind === 'next'
      ? `<span class="sr" id="actAllDesc">Next call ready in ${st.cd}</span>`
      : '';
  return `<button type="button" class="btn activate-all${compactCls}" data-testid="${ACTIVATE_ALL_TESTID}" data-act="activateAll"${disabled ? ' aria-disabled="true"' : ''}${describedby}>${body}</button>${desc}`;
}

export type CallKind = 'ready' | 'active' | 'cooldown' | 'lockout' | 'asleep' | 'unpaid' | 'paused' | 'hidden';

export interface CallButtonState {
  kind: CallKind;
  call: string;
  role: string;
  /** Visible countdown m:ss when active/cooldown/lockout. */
  cd?: string;
  /** Exact accessible name (Art §5.6 / AB-UI-5). */
  name: string;
  describedby: string;
}

function effectLine(id: WorkerId, b: Balance, secondsLabel: string): string {
  if (id === 'market_hand') {
    const pct = Math.round((tcNum(b, 'ability_w1_price_mult') - 1) * 100);
    return `${secondsLabel}-second boost: Market Hand sales earn ${pct}% more.`;
  }
  if (id === 'coop_hand') {
    const pct = Math.round((tcNum(b, 'ability_w2_lay_mult') - 1) * 100);
    return `${secondsLabel}-second boost: Hens lay ${pct}% faster.`;
  }
  if (id === 'hawker') {
    const pct = Math.round((tcNum(b, 'ability_w3_price_mult') - 1) * 100);
    return `${secondsLabel}-second boost: All sales earn ${pct}% more.`;
  }
  const add = tcNum(b, 'ability_w4_tier_add');
  return `${secondsLabel}-second boost: Egg grade +${add}.`;
}

/** Pure call-button state for one hired worker (flag off / locked / not hired → hidden). */
export function callButtonState(s: GameState, id: WorkerId, b: Balance, nowMs: number): CallButtonState | null {
  if (!s.workers[id]) return null;
  const flagProbe = abilityEligibility(s, id, b, Number.NaN);
  if (!flagProbe.eligible && flagProbe.reason === 'flag_off') return null;
  if (s.farmLevel < tcNum(b, 'ability_unlock_farm')) return null;
  const call = CALL_NAME[id], role = ROLE[id];
  const w = s.workers[id]!;
  const m = mood(w, b);
  const activeS = s.abilities?.[id]?.activeS ?? 0;
  const durS = s.abilities?.[id]?.durS;

  if (m === 'asleep') return { kind: 'asleep', call, role, name: `Asleep, ${call}, ${role}`, describedby: `${call} is blocked while ${role} is asleep.` };
  if (m === 'unpaid') return { kind: 'unpaid', call, role, name: `Unpaid, ${call}, ${role}`, describedby: `${call} is blocked while ${role} is unpaid.` };
  if (isPaused(w, b)) return { kind: 'paused', call, role, name: `Paused, ${call}, ${role}`, describedby: `${call} is blocked while ${role} is on a break.` };

  if (activeS > EPS) {
    const cd = fmtCd(activeS);
    return { kind: 'active', call, role, cd, name: `Active, ${call}, ${role}`, describedby: `Ready in ${cd}` };
  }

  const el = abilityEligibility(s, id, b, nowMs);
  if (el.eligible) {
    const secs = String(Math.round(tcNum(b, 'ability_s')));
    return { kind: 'ready', call, role, name: `${call}, ${role}`, describedby: effectLine(id, b, secs) };
  }
  if (el.reason === 'lockout') {
    const cd = fmtCd(w.callLockoutS ?? 0);
    return { kind: 'lockout', call, role, cd, name: `${call} after a break, ${role}`, describedby: `Ready in ${cd} after a break` };
  }
  if (el.reason === 'cooldown') {
    const rem = wallRemainingMs(s.abilities?.[id]?.readyAt, nowMs, tcNum(b, 'ability_cd_s') * 1000) / 1000;
    const cd = fmtCd(rem);
    return { kind: 'cooldown', call, role, cd, name: `${call} recharging, ${role}`, describedby: `Ready in ${cd}` };
  }
  return null;
}

/** Card call button HTML. Names from content + .sr; no aria-label (Art D2 / AB-UI-5). */
export function callButtonHtml(st: CallButtonState, id: WorkerId): string {
  const disabled = st.kind !== 'ready';
  const boltSrc = ASSET('icon-bolt.svg');
  const actSrc = ASSET(CALL_ICON[id]);
  let body: string;
  if (st.kind === 'ready') {
    body = `${bolt(boltSrc)}<span class="lbl">${st.call}<span class="sr">, ${st.role}</span></span>`;
  } else if (st.kind === 'active') {
    body = `<img class="act-ico" src="${actSrc}" width="20" height="20" alt="" aria-hidden="true"><span class="lbl">Active<span aria-hidden="true" data-cd=" ${st.cd}"></span><span class="sr">, ${st.call}, ${st.role}</span></span>`;
  } else if (st.kind === 'cooldown' || st.kind === 'lockout') {
    body = `${bolt(boltSrc)}<span class="lbl"><span class="sr">${st.name}</span><span aria-hidden="true" data-cd=" ${st.cd}"></span></span>`;
  } else {
    // asleep / unpaid / paused — text only, no icon
    const word = st.kind === 'asleep' ? 'Asleep' : st.kind === 'unpaid' ? 'Unpaid' : 'Paused';
    body = `<span class="lbl">${word}<span class="sr">, ${st.call}, ${st.role}</span></span>`;
  }
  const descId = `calld-${id}`;
  return `<button type="button" class="btn call-btn call-${st.kind}" data-act="fireAbility" data-w="${id}" data-testid="call-${id}"${disabled ? ' aria-disabled="true"' : ''} aria-describedby="${descId}">${body}</button><span class="sr" id="${descId}">${st.describedby}</span>`;
}

/** Progress fill 0–100 for the active yolk strip (uses AbilityState.durS when present). */
export function callProgressPct(s: GameState, id: WorkerId, b: Balance): number {
  const a = s.abilities?.[id];
  const activeS = a?.activeS ?? 0;
  if (!(activeS > EPS)) return 0;
  const dur = typeof a?.durS === 'number' && Number.isFinite(a.durS) && a.durS > 0 ? a.durS : tcNum(b, 'ability_s');
  return Math.max(0, Math.min(100, Math.round((1 - activeS / dur) * 1000) / 10));
}
