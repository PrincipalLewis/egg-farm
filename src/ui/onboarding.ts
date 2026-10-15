/**
 * Onboarding (core-loop-spec Q4, layout-spec §3.7): 3 steps collect -> sell -> buy first upgrade; skippable; once.
 * `OnboardingFlow` is the pure state machine (unit-tested); `mountOnboarding` is the DOM overlay.
 * Pointer anchoring follows art-ux/m3-ftue-spec.md §1 (no CSS rotate/mirror; up/down asset variants).
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

/** Display size of the pointer hand (matches CSS / img width). */
export const HAND_SIZE = 40;
/** Min fingertip→edge gap at the furthest point of the bob (m3-ftue-spec §1). */
export const TIP_CLEARANCE = 8;
/** Bob amplitude toward the target (px). */
export const BOB = 6;
/** Rest fingertip gap from the target edge (= clearance + bob). */
export const REST_GAP = TIP_CLEARANCE + BOB;
/** Tip in display px for the up asset (viewBox tip (24,0) of 48 → 40). */
export const TIP_UP = { x: 20, y: 0 } as const;
/** Tip in display px for the down asset (viewBox tip (24,48) of 48 → 40). */
export const TIP_DOWN = { x: 20, y: 40 } as const;

export type Rect = { left: number; top: number; right: number; bottom: number };
export type HandDir = 'up' | 'down';
export type HandPlacement = { left: number; top: number; dir: HandDir; tipX: number; tipY: number };

export const rectOverlaps = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
export const handRect = (left: number, top: number): Rect => ({ left, top, right: left + HAND_SIZE, bottom: top + HAND_SIZE });

/**
 * Place the pointer so the fingertip sits at the target's edge with ≥ REST_GAP clearance at rest
 * (≥ TIP_CLEARANCE at the peak of the bob). Prefer `prefer` at REST_GAP; if the rest hand box would
 * cover any `avoid` rect (meter/label text) or leave the viewport, switch up/down or shift sideways
 * at REST_GAP first, then grow the gap as a last resort. Never mirror or CSS-rotate.
 */
export function placeHand(
  target: Rect,
  prefer: HandDir,
  avoid: Rect[] = [],
  viewport?: { width: number; height: number },
): HandPlacement {
  const cx = (target.left + target.right) / 2;
  /** Rest and bob-peak boxes must stay on-screen and clear avoid text (bob moves toward the target). */
  const invalid = (left: number, top: number, dir: HandDir) => {
    const rest = handRect(left, top);
    const peak = handRect(left, dir === 'down' ? top + BOB : top - BOB);
    for (const box of [rest, peak]) {
      if (viewport && (box.left < 0 || box.right > viewport.width || box.top < 0 || box.bottom > viewport.height)) return true;
      // 1px pad so bob-peak tip doesn't kiss the meter/label box edge.
      if (avoid.some(r => rectOverlaps(box, { left: r.left, top: r.top - 1, right: r.right, bottom: r.bottom + 1 }))) return true;
    }
    return false;
  };
  const atGap = (dir: HandDir, shiftX: number, gap: number): HandPlacement => {
    const tipX = cx + shiftX;
    if (dir === 'down') {
      const tipY = target.top - gap;
      return { left: tipX - TIP_DOWN.x, top: tipY - TIP_DOWN.y, dir, tipX, tipY };
    }
    const tipY = target.bottom + gap;
    return { left: tipX - TIP_UP.x, top: tipY - TIP_UP.y, dir, tipX, tipY };
  };
  const other: HandDir = prefer === 'down' ? 'up' : 'down';
  const shifts = [0, 24, -24, 48, -48, 72, -72, 96, -96];
  // Phase 1: keep tip close (REST_GAP) — switch side / shift before growing the gap.
  for (const shift of shifts) {
    for (const dir of [prefer, other] as HandDir[]) {
      const p = atGap(dir, shift, REST_GAP);
      if (!invalid(p.left, p.top, p.dir)) return p;
    }
  }
  // Phase 2: grow gap so the hand clears avoid rects that sit on the approach path.
  for (const shift of shifts) {
    for (const dir of [prefer, other] as HandDir[]) {
      for (let gap = REST_GAP + 2; gap <= REST_GAP + 160; gap += 2) {
        const p = atGap(dir, shift, gap);
        if (!invalid(p.left, p.top, p.dir)) return p;
      }
    }
  }
  return atGap(prefer, 0, REST_GAP);
}

/** Peak-of-bob fingertip Y (toward the target). Used by tests to assert ≥ TIP_CLEARANCE. */
export const tipAtBobPeak = (p: HandPlacement) => p.dir === 'down' ? p.tipY + BOB : p.tipY - BOB;

/** m3-ftue-spec §1: coach mark with ui-pointer-hand.svg (40px, bobs toward the target), step dots, Skip (Esc = Skip). */
export const dots = (step: number) => STEPS.map((_, i) => (i === step ? '●' : '○')).join(' ');
export function mountOnboarding(
  flow: OnboardingFlow,
  target: (step: number) => Element | null,
  caption: (step: number) => string = st => STEPS[st].caption,
  handSrc = '',
  handSrcDown = '',
) {
  const layer = document.createElement('div'); layer.className = 'onb';
  layer.innerHTML = `<div class="onb-ring"></div><img class="onb-hand" aria-hidden="true" alt="" src="${handSrc}" width="40" height="40"><div class="onb-cap" role="dialog" aria-live="polite"><span class="onb-txt"></span><span class="onb-dots" aria-hidden="true"></span></div><button class="onb-skip">Skip</button>`;
  document.body.append(layer);
  const ring = layer.querySelector('.onb-ring') as HTMLElement, cap = layer.querySelector('.onb-cap') as HTMLElement, hand = layer.querySelector('.onb-hand') as HTMLImageElement;
  layer.querySelector('.onb-skip')!.addEventListener('click', () => { flow.skip(); });
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !flow.finished && !document.querySelector('#modal-layer.open')) { e.stopImmediatePropagation(); flow.skip(); } };
  document.addEventListener('keydown', esc, true);
  const txt = layer.querySelector('.onb-txt') as HTMLElement, dotEl = layer.querySelector('.onb-dots') as HTMLElement;
  let last = '';
  /** Avoid meter/label *text* only (m3-ftue-spec §1); full-width bars would force a distant tip. */
  const avoidRects = (exclude: Element | null): Rect[] => {
    const out: Rect[] = [];
    for (const sel of ['#meterText', '.goal-label', '.goal-status', 'nav button']) {
      document.querySelectorAll(sel).forEach(node => {
        const el = node as HTMLElement;
        if (el === exclude || el.contains(exclude) || exclude?.contains(el)) return;
        if (el.hidden || (el.closest('#goal') as HTMLElement | null)?.hidden) return;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
      });
    }
    return out;
  };
  return function update() {
    if (flow.finished) { layer.remove(); document.removeEventListener('keydown', esc, true); return false; }
    const el = target(flow.step);
    const text = caption(flow.step); if (text !== last) { txt.innerHTML = text; dotEl.textContent = dots(flow.step); last = text; }
    if (!el) { ring.style.display = hand.style.display = 'none'; cap.style.cssText = 'left:50%;top:40%;transform:translateX(-50%)'; return true; }
    const r = el.getBoundingClientRect(), pad = 6;
    ring.style.display = hand.style.display = '';
    Object.assign(ring.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    const prefer: HandDir = r.top > innerHeight / 2 ? 'down' : 'up';
    const p = placeHand(
      { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
      prefer,
      avoidRects(el),
      { width: innerWidth, height: innerHeight },
    );
    hand.classList.toggle('down', p.dir === 'down');
    if (handSrc && handSrcDown) hand.src = p.dir === 'down' ? handSrcDown : handSrc;
    Object.assign(hand.style, { left: `${p.left}px`, top: `${p.top}px` });
    const above = p.dir === 'down';
    const handBottom = p.top + HAND_SIZE, handTop = p.top;
    cap.style.cssText = above
      ? `left:50%;transform:translateX(-50%);bottom:${innerHeight - handTop + 8}px`
      : `left:50%;transform:translateX(-50%);top:${handBottom + 8}px`;
    return true;
  };
}
