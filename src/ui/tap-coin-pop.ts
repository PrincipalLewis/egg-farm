/**
 * v5 tapCoins +$ pop and the A2 tier pill: pure text and placement (no DOM). Spec product/collection/m5-streak-tap-coins-spec.md
 * v1.3.3 sha1 b315dea1 R15/R16, §3.3 position, K14, ST-AC10b/17/17b; art art-ux/m5-combo-tiers.md v0.3 sha1 ed4ded1d §2 (pill
 * position), §4.2 (coin pop on a tier-up tap). The px values are Art & UX layout constants from those sections, not economy
 * tunables (no balance.json column exists or is proposed for them).
 */
import { fmtMoneyAria, fmtMoneyShort } from './format';

export const POP = {
  /** bottom edge above the coop fill meter top (#meter.top - 8), and above the pill top on a tier-up tap */ gapPx: 8,
  /** clamp inset from both screen edges (golden R25a) */ edgePx: 8,
  /** cosmetic random x drift, +/- */ driftPx: 8,
  /** rise over the pop's life */ risePx: 32,
  /** same-frame offset above the egg-collect pop */ eggSepPx: 20,
} as const;

/** `+$0.38` / `+$812.40` / `+$1.2K` (fmtMoneyShort, no "!"). null when nothing is paid: no floater, never `+$0.00` (ST-AC17b). */
export const coinPopText = (cents: number): string | null => (cents >= 1 ? `+${fmtMoneyShort(cents)}` : null);
/** Live-region text: exactly fmtMoneyAria (R16, ST-AC17), null for a zero payout (no $0 announcement). */
export const coinPopAria = (cents: number): string | null => (cents >= 1 ? fmtMoneyAria(cents) : null);

export interface PopAnchor { /** Collect's centre x */ cx: number; /** the coop fill meter's top (#meter) */ meterTop: number; /** viewport width */ vw: number }
export interface PopBox { left: number; top: number; right: number; bottom: number }
const clampX = (x: number, w: number, vw: number) => Math.max(POP.edgePx, Math.min(x, vw - POP.edgePx - w));
const boxAt = (left: number, bottom: number, w: number, h: number): PopBox => ({ left, top: bottom - h, right: left + w, bottom });

/** Tier pill (§3.3): bottom = #meter.top - 8, centred on Collect's x, clamped 8 px inside the screen. */
export const pillBox = (a: PopAnchor, w: number, h: number): PopBox => boxAt(clampX(a.cx - w / 2, w, a.vw), a.meterTop - POP.gapPx, w, h);

/** Coin pop spawn box (R16): bottom = #meter.top - 8 (or 8 px above the live pill's top on a tier-up tap), at most 20 px above a
 *  same-frame egg pop's top, x = Collect centre + drift (|drift| <= 8), clamped 8 px inside the screen. */
export function coinPopBox(a: PopAnchor, w: number, h: number, o: { drift?: number; aboveTop?: number; eggTop?: number } = {}): PopBox {
  const drift = Math.max(-POP.driftPx, Math.min(POP.driftPx, o.drift ?? 0));
  let bottom = (o.aboveTop ?? a.meterTop) - POP.gapPx;
  if (o.eggTop !== undefined) bottom = Math.min(bottom, o.eggTop - POP.eggSepPx);
  return boxAt(clampX(a.cx + drift - w / 2, w, a.vw), bottom, w, h);
}
