/**
 * Activate-all UI (abilities v1.3.11 sha1 12fec4b0 / Art Q8 fc1ca17d).
 * Cross-map: AC-M5A-9b = AB-UI-7 = AC-M5A-8 docked+Refill + AC-M5A-10 compact name.
 * No sim fire — callers supply eligibility; tap wiring waits on Features fireAbility.
 */
export type ActivateAllKind = 'ready' | 'next' | 'none';

export interface ActivateAllState {
  kind: ActivateAllKind;
  /** Eligible ready count when kind=ready. */
  n?: number;
  /** Ceiling countdown "m:ss" when kind=next (visible compact uses same digits via data-cd). */
  cd?: string;
  /** Docked + Refill visible → compact visible labels N / 4:51 / —. */
  compact: boolean;
}

export const ACTIVATE_ALL_TESTID = 'activate-all';

/** Format focus/sim seconds as m:ss for data-cd (ceil). Never "0:00". */
export function fmtCd(seconds: number): string {
  const s = Math.max(1, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function activateAllState(input: {
  readyCount: number;
  /** Smallest remaining cooldown among non-blocked workers; undefined if none. */
  nextCdS?: number;
  docked: boolean;
  refillVisible: boolean;
}): ActivateAllState {
  const compact = input.docked && input.refillVisible;
  if (input.readyCount >= 1) return { kind: 'ready', n: input.readyCount, compact };
  if (input.nextCdS !== undefined && input.nextCdS > 0)
    return { kind: 'next', cd: fmtCd(input.nextCdS), compact };
  return { kind: 'none', compact };
}

/** Exact accessible names (AC-M5A-10). Digits only allowed in ready count. */
export function activateAllName(st: ActivateAllState): string {
  if (st.kind === 'ready') return `Shift calls (${st.n ?? 0})`;
  if (st.kind === 'next') return 'Next call';
  return 'No calls ready';
}

function bolt(src: string): string {
  return `<img class="act-bolt" src="${src}" width="20" height="20" alt="" aria-hidden="true">`;
}

/**
 * Button inner HTML + attrs. Names from content + .sr-in; no aria-label.
 * Compact docked (Refill visible): visible N / 4:51 / — with full name in .sr-in.
 * Full (≥132 px when Refill hidden): visible Shift calls (N) / Next call + data-cd / No calls ready.
 */
export function activateAllHtml(st: ActivateAllState, boltSrc: string): string {
  const name = activateAllName(st);
  const disabled = st.kind !== 'ready';
  const compactCls = st.compact ? ' is-compact' : '';
  let body: string;
  let describedby = '';
  if (st.kind === 'ready') {
    const n = st.n ?? 0;
    const vis = st.compact ? String(n) : `Shift calls (${n})`;
    const sr = st.compact ? `<span class="sr-in">Shift calls (${n})</span>` : '';
    // When full, visible text IS the name; when compact, .sr-in carries the full name after visible N.
    // Compact: visible "N" + sr-in "Shift calls (N)" → name "NShift calls (N)" would be wrong.
    // Art: full names via inline .sr-in; compact visible is bolt+N only.
    // Pattern: visible compact digit is aria-hidden; .sr-in holds exact name.
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

/** 8±1 px gap to Refill when both visible in docked header (AB-UI-7). */
export const ACTIVATE_ALL_GAP_PX = 8;

import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { flagOn } from '../config/flags';
import { WORKERS, mood } from '../sim/workers';
import { wallRemainingMs } from '../sim/clock';

/** True when Activate-all / call chrome should render (flag + F10+). */
export function abilitiesUiOn(s: GameState, b: Balance): boolean {
  return flagOn(b, 'abilities') && s.farmLevel >= 10 && WORKERS.some(id => !!s.workers[id]);
}

/** Count ready calls and nearest cooldown from saved AbilityState (no fire API). */
export function abilityEligibility(s: GameState, b: Balance, nowMs: number): { ready: number; nextCdS?: number } {
  if (!abilitiesUiOn(s, b)) return { ready: 0 };
  const cdCap = (b.m4?.tc?.ability_cd_s ?? 300) * 1000;
  let ready = 0;
  let nextMs = Infinity;
  for (const id of WORKERS) {
    if (!s.workers[id]) continue;
    const ab = s.abilities?.[id];
    if (ab?.activeS !== undefined && ab.activeS > 0) continue; // active — not eligible for Activate-all
    // Blocked moods: asleep / unpaid / paused
    const w = s.workers[id]!;
    const m = mood(w, b);
    if (m === 'asleep' || m === 'unpaid' || w.paused) continue;
    const rem = wallRemainingMs(ab?.readyAt, nowMs, cdCap);
    if (rem <= 0) ready++;
    else nextMs = Math.min(nextMs, rem);
  }
  return ready > 0 ? { ready } : { ready: 0, nextCdS: Number.isFinite(nextMs) ? nextMs / 1000 : undefined };
}
