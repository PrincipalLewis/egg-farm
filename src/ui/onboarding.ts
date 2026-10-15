/**
 * Onboarding (core-loop-spec Q4, layout-spec §3.7): 3 steps collect -> sell -> buy first upgrade; skippable; once.
 * `OnboardingFlow` is the pure state machine (unit-tested); `mountOnboarding` is the DOM overlay.
 */
import type { GameEvent } from '../game';
export const STEPS = [
  { name: 'collect', caption: 'Tap Collect to gather eggs from the coop.' },
  { name: 'sell', caption: 'A customer is waiting! Tap them, then Sell your eggs.' },
  { name: 'upgrade', caption: 'Spend your coins: open Upgrades and buy your first one.' },
] as const;
export interface OnboardingHooks { step(n: number, name: string): void; skip(atStep: number): void; done(): void }
export class OnboardingFlow {
  /** 0-based current step; STEPS.length = finished. */
  step = 0; finished = false;
  constructor(private hooks: OnboardingHooks) {}
  start() { this.hooks.step(1, STEPS[0].name); }
  onEvent(e: GameEvent) {
    if (this.finished) return;
    const want = STEPS[this.step].name;
    const hit = (want === 'collect' && e.type === 'collect' && e.eggs > 0) || (want === 'sell' && e.type === 'sell' && e.by === 'player') || (want === 'upgrade' && e.type === 'upgrade');
    if (!hit) return;
    this.step++;
    if (this.step >= STEPS.length) { this.finished = true; this.hooks.done(); }
    else this.hooks.step(this.step + 1, STEPS[this.step].name);
  }
  skip() { if (this.finished) return; this.finished = true; this.hooks.skip(this.step + 1); }
}
/** DOM overlay: spotlight ring around the step target + caption bubble + Skip. Re-positions every frame. */
/** m3-ftue-spec §1: coach mark with ui-pointer-hand.svg (40px, bobs toward the target), step dots, Skip (Esc = Skip). */
export const dots = (step: number) => STEPS.map((_, i) => (i === step ? '●' : '○')).join(' ');
export function mountOnboarding(flow: OnboardingFlow, target: (step: number) => Element | null, caption: (step: number) => string = st => STEPS[st].caption, handSrc = '') {
  const layer = document.createElement('div'); layer.className = 'onb';
  layer.innerHTML = `<div class="onb-ring"></div><img class="onb-hand" aria-hidden="true" alt="" src="${handSrc}" width="40" height="40"><div class="onb-cap" role="dialog" aria-live="polite"><span class="onb-txt"></span><span class="onb-dots" aria-hidden="true"></span></div><button class="onb-skip">Skip</button>`;
  document.body.append(layer);
  const ring = layer.querySelector('.onb-ring') as HTMLElement, cap = layer.querySelector('.onb-cap') as HTMLElement, hand = layer.querySelector('.onb-hand') as HTMLElement;
  layer.querySelector('.onb-skip')!.addEventListener('click', () => { flow.skip(); });
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !flow.finished && !document.querySelector('#modal-layer.open')) { e.stopImmediatePropagation(); flow.skip(); } };
  document.addEventListener('keydown', esc, true);
  const txt = layer.querySelector('.onb-txt') as HTMLElement, dotEl = layer.querySelector('.onb-dots') as HTMLElement;
  let last = '';
  return function update() {
    if (flow.finished) { layer.remove(); document.removeEventListener('keydown', esc, true); return false; }
    const el = target(flow.step);
    const text = caption(flow.step); if (text !== last) { txt.innerHTML = text; dotEl.textContent = dots(flow.step); last = text; }
    if (!el) { ring.style.display = hand.style.display = 'none'; cap.style.cssText = 'left:50%;top:40%;transform:translateX(-50%)'; return true; }
    const r = el.getBoundingClientRect(), pad = 6;
    ring.style.display = hand.style.display = '';
    Object.assign(ring.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    const above = r.top > innerHeight / 2;
    Object.assign(hand.style, { left: `${r.left + r.width / 2 - 20}px`, top: above ? `${r.top - pad - 44}px` : `${r.bottom + pad + 4}px` });
    hand.classList.toggle('down', above);
    cap.style.cssText = above ? `left:50%;transform:translateX(-50%);bottom:${innerHeight - r.top + pad + 44}px` : `left:50%;transform:translateX(-50%);top:${r.bottom + pad + 44}px`;
    return true;
  };
}
