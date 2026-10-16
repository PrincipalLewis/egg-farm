/**
 * B-1 coop-full UI (spec v0.3). The flag itself is Game.checkCoopFull()'s check, exposed as isCoopFull() so the UI
 * and Game read the SAME expression. All copy lives in COOP_FULL_COPY.
 */
import type { Balance } from '../config/balance';
import { coopCapacity, type GameState } from '../sim/state';
import { mood, unlockFarm } from '../sim/workers';
import { fmtMoney } from './format';
export const WARN = '\u26A0\uFE0E'; // text presentation, aria-hidden in markup
/** Art & UX b1-coop-full-copy.md v1.0 (final; pending Head of Art & UX sign-off). Visible text excludes the ⚠ glyph. */
export const COOP_FULL_COPY = {
  badge: 'Full!', badgeAria: 'Coop full',
  rateChip: 'Full!',
  hintCollect: 'Collect eggs', hintHire: 'Collect or hire Coop Hand', hintRefill: 'Collect or refill Coop Hand',
  hintAria: { collect: 'Collect eggs.', hire: 'Collect eggs or hire a Coop Hand.', refill: 'Collect eggs or refill your Coop Hand.' },
};
/** The one coop-full check (same as Game.checkCoopFull). */
export const isCoopFull = (s: GameState, b: Balance) => s.coop >= coopCapacity(s.farmLevel, b);
export type CoopHandState = 'none' | 'working' | 'tired' | 'asleep' | 'unpaid';
export const coopHandState = (s: GameState, b: Balance): CoopHandState => mood(s.workers.coop_hand, b) ?? 'none';
export type HintVariant = 'collect' | 'hire' | 'refill';
export function coopFullHintVariant(s: GameState, b: Balance): HintVariant {
  const st = coopHandState(s, b);
  if (st === 'asleep' || st === 'unpaid') return 'refill';
  if (st === 'none' && s.farmLevel >= unlockFarm('coop_hand', b)) return 'hire';
  return 'collect';
}
/** Hint text while full, '' otherwise (clears on the next render after the coop drops below cap). */
export function coopFullHint(s: GameState, b: Balance): string {
  if (!isCoopFull(s, b)) return '';
  const v = coopFullHintVariant(s, b);
  return v === 'refill' ? COOP_FULL_COPY.hintRefill : v === 'hire' ? COOP_FULL_COPY.hintHire : COOP_FULL_COPY.hintCollect;
}
const SUFFIX: Record<string, string> = { K: 'thousand', M: 'million', B: 'billion', T: 'trillion' };
/** Aria money: the visible fmtMoney value with the suffix spelled out ("$12.3K" -> "$12.3 thousand"). */
export const spokenMoney = (cents: number) => fmtMoney(cents).replace(/([KMBT])$/, (_, k) => ` ${SUFFIX[k]}`);
/** Copy doc §5: "Net income minus $1.25 per second. Coop full." / "... zero per second." Amount = fmtMoney of |net| rounded to cents. */
export function rateAria(netCents: number, full: boolean) {
  const c = Math.round(netCents);
  const amt = c === 0 ? 'zero' : `${c < 0 ? 'minus' : 'plus'} ${spokenMoney(Math.abs(c))}`;
  return `Net income ${amt} per second.${full ? ' Coop full.' : ''}`;
}
