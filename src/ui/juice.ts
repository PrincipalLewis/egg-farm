/** Juice v1 keyframe plans (juice-spec v1, number-pop-spec v1.0). Pure: unit-testable; reduced motion = opacity only. */
export const EASE_POP = 'cubic-bezier(.34,1.56,.64,1)', EASE_OUT = 'cubic-bezier(.22,1,.36,1)', EASE_IN = 'cubic-bezier(.55,0,1,.45)';
export interface Plan { keyframes: Keyframe[]; duration: number; easing?: string }
export function tapSquash(rm: boolean): Plan {
  return rm ? { keyframes: [{ opacity: 1 }, { opacity: 0.75 }, { opacity: 1 }], duration: 120 }
    : { duration: 200, keyframes: [{ transform: 'scale(1,1)' }, { transform: 'scale(1.08,.90)', offset: .25, easing: EASE_OUT }, { transform: 'scale(.96,1.05)', offset: .55, easing: EASE_POP }, { transform: 'scale(1,1)' }] };
}
export function coopBump(rm: boolean): Plan | null {
  return rm ? null : { duration: 240, keyframes: [{ transform: 'scale(1)' }, { transform: 'scale(1.05)', offset: 1 / 3, easing: EASE_POP }, { transform: 'scale(1)' }], easing: EASE_OUT };
}
export function counterLand(rm: boolean): Plan {
  return rm ? { keyframes: [{ opacity: .4 }, { opacity: 1 }], duration: 150 }
    : { duration: 240, keyframes: [{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: .5 }, { transform: 'scale(1)' }], easing: EASE_POP };
}
export type PopKind = 'tap' | 'collect' | 'sell';
export const POP_PX: Record<PopKind, number> = { tap: 18, collect: 22, sell: 26 };
/** Shared number-pop timing: 0.6→1.1→1.0 in 120 ms, rise 32px to 500 ms, fade 500–800 ms. RM: fade 150 / hold / fade 200 (650 ms). */
export function numberPop(rm: boolean, driftX = 0): Plan {
  if (rm) return { duration: 650, keyframes: [{ opacity: 0 }, { opacity: 1, offset: 150 / 650 }, { opacity: 1, offset: 450 / 650 }, { opacity: 0 }] };
  return { duration: 800, keyframes: [
    { transform: 'translate(0,0) scale(.6)', opacity: 1, easing: EASE_POP },
    { transform: `translate(${driftX * .2}px,-8px) scale(1.1)`, opacity: 1, offset: .1 },
    { transform: `translate(${driftX * .3}px,-10px) scale(1)`, opacity: 1, offset: .15, easing: 'ease-out' },
    { transform: `translate(${driftX}px,-32px) scale(1)`, opacity: 1, offset: .625, easing: EASE_IN },
    { transform: `translate(${driftX}px,-32px) scale(1)`, opacity: 0 }] };
}
/** Particles: tap crumbs (3, 120° up cone, 18–28px, 260 ms). None under reduced motion. */
export function crumbs(rm: boolean, rand: () => number, n = 3): { dx: number; dy: number; ms: number }[] {
  if (rm) return [];
  return Array.from({ length: n }, (_, i) => { const a = (-90 + (i - (n - 1) / 2) * (120 / Math.max(1, n - 1))) * Math.PI / 180, d = 18 + rand() * 10; return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, ms: 260 }; });
}
/** Median of last 20 sales (or current order value if <5 sales). */
export class SaleMedian { private s: number[] = []; isBig(v: number, orderValue = v) { const med = this.s.length < 5 ? orderValue : [...this.s].sort((a, b) => a - b)[Math.floor(this.s.length / 2)]; const big = v > 10 * med; this.s.push(v); if (this.s.length > 20) this.s.shift(); return big; } }
/** Can't-afford v1.2: shake (4px x3 / 240 ms), disabled state and 'Need $X more' ALWAYS show; sound may be in cooldown. */
export const SHAKE_V1: Plan = { duration: 240, keyframes: [0, -4, 4, -4, 4, -4, 4, 0].map(x => ({ transform: `translateX(${x}px)` })) };
export function cantAffordFeedback(el: HTMLElement, needText: string | null, playSound: () => boolean, rm: boolean): { sound: boolean } {
  el.setAttribute('aria-disabled', 'true'); el.classList.add('cant');
  if (needText !== null) { let n = el.querySelector<HTMLElement>('.need-more'); if (!n) { n = el.ownerDocument.createElement('span'); n.className = 'need-more'; el.append(n); } n.textContent = needText; }
  // reduced motion keeps the cue but as an opacity blink (juice-spec §0: opacity only)
  try { el.animate(rm ? [{ opacity: 1 }, { opacity: .6 }, { opacity: 1 }] : SHAKE_V1.keyframes, { duration: 240 }); } catch { el.classList.add('shake'); }
  return { sound: playSound() };
}
