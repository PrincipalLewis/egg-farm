/**
 * M5.1 Breeds UI PR-B — Present HUD chip (BR-R12c; BR-AC52 / 52b / 52c) and the slot-card mirror helper for PR-A.
 * Spec of record: product/m5.1-breeds-spec.md rev 3.8.9 (ea922eb8) L445-473, L827-855; Art UI doc v0.2.7 (f349f29f) §7a/§7b,
 * UI-BR-16..21, UI-BR-23. Seams: engineering/design/breeds-ui-seams.md (PR-B owns the `breeds-hud-*` prefix).
 *
 * The chip lives right of `#rate` inside the coins pill. With the flag off, or with no settled Present breed, the HUD markup
 * is exactly rc/v5's (the mount adds nothing, and removes everything it added when the chip hides).
 * The gate comes from a `PresentGateSource` (adapter); until Saves ships the sim gate the production stub is always open.
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { breedsFlagOn, presentActiveBp, traitPctExact, traitPctFloor, STUB_PRESENT_GATE, type PresentGateSource } from './breeds-adapter';

// ---- Copy (FINAL, Head of Art & UX 23:31 / 23:40; spec L455-466) ----
export const CHIP_TIP_TEXT = 'Bonus returns when you tap slower';
export const CHIP_PAUSED_DESC = 'Breed bonus paused while you tap fast. Returns when you tap slower.';
export const chipActiveDesc = (exact: string) => `Breed bonus ${exact} active`;
/** Hidden state words (leading space: the name reads "+3% active" / "+3% paused"). */
export const SR_WORD = { active: ' active', paused: ' paused' } as const;

// ---- Presentation timings (UI doc §7a; not tunables: Art-owned motion/tooltip spec) ----
/** Return pop may start iff no previous pop or performance.now() − lastPopStart ≥ this (BR-AC52b, rev 3.8.3 R-B2). */
export const POP_CAP_MS = 10000;
/** Pop length and peak: 1 → 1.08 (150 ms) → 1 (UI doc §7a "Return" row). */
export const POP_MS = 300;
export const POP_PEAK_SCALE = 1.08;
export const POP_EASE = 'cubic-bezier(.34,1,.64,1)';
/** Tooltip shows for 1.6 s (touch), 8 px below the HUD, clamped 8 px inside the viewport (UI-BR-21). */
export const TIP_MS = 1600;
export const TIP_GAP_PX = 8;
export const TIP_EDGE_PX = 8;

export type ChipState = 'active' | 'paused';
export interface ChipModel { bp: number; label: string; exact: string; state: ChipState; description: string; }

/** Pure model: null when there's no settled Present bp (no chip). */
export function presentChipModel(bp: number, gateOpen: boolean): ChipModel | null {
  if (!(bp > 0)) return null;
  const state: ChipState = gateOpen ? 'active' : 'paused', exact = traitPctExact(bp);
  return { bp, label: traitPctFloor(bp), exact, state, description: state === 'active' ? chipActiveDesc(exact) : CHIP_PAUSED_DESC };
}

/**
 * Slot-card mirror for PR-A's Present slot cards (spec L449; UI doc §7a/§7b): plain, non-interactive text INSIDE the slot-card
 * button (no role, tabindex, tooltip or describedby of its own), struck when paused. PR-A puts `html` where the slot's exact
 * `+X.XX%` goes and points the slot card's own `aria-describedby` at a node holding `description`.
 * `bp` = the slot's own settled bp (exact, 2 decimals); the gate state is the same read the HUD chip uses on that tick.
 */
export function presentMirror(bp: number, gateOpen: boolean): { text: string; paused: boolean; html: string; description: string } | null {
  if (!(bp > 0)) return null;
  const text = traitPctExact(bp), paused = !gateOpen;
  return { text, paused, html: `<span class="breeds-hud-mirror${paused ? ' paused' : ''}">${text}</span>`, description: paused ? CHIP_PAUSED_DESC : chipActiveDesc(text) };
}

export interface PresentChipMount {
  /** Per-tick sync (called from PR-A's mountBreeds onSync). `nowMs` defaults to the mount's clock (performance.now()). */
  sync(s: GameState, nowMs?: number): void;
  dispose(): void;
  readonly chip: HTMLElement | null;
  /** Return pops started so far (test/harness observability; in-memory only). */
  readonly pops: number;
  /** Last ChipState rendered (null = no chip). */
  readonly state: ChipState | null;
}

export interface PresentChipOpts {
  doc: Document; b: Balance;
  gate?: PresentGateSource;
  rm?: () => boolean;
  /** Presentation clock; performance.now() by default (pop cap is wall time, not the focus clock: spec L468). */
  now?: () => number;
  setTimer?: (f: () => void, ms: number) => number;
  clearTimer?: (id: number) => void;
}

const sysReducedMotion = (doc: Document) =>
  doc.documentElement.classList.contains('reduced-motion') || !!doc.querySelector('.rm') ||
  !!doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Mount the Present chip. Flag off → null and nothing is touched. */
export function mountPresentChip(o: PresentChipOpts): PresentChipMount | null {
  if (!breedsFlagOn(o.b)) return null;
  const doc = o.doc, gate = o.gate ?? STUB_PRESENT_GATE;
  const now = o.now ?? (() => performance.now());
  const rm = o.rm ?? (() => sysReducedMotion(doc));
  const setTimer = o.setTimer ?? ((f, ms) => window.setTimeout(f, ms)), clearTimer = o.clearTimer ?? ((id) => window.clearTimeout(id));
  let row: HTMLElement | null = null, chip: HTMLElement | null = null, pt: HTMLElement | null = null, sr: HTMLElement | null = null,
    descEl: HTMLElement | null = null, tip: HTMLElement | null = null, tipTimer = 0;
  let shown: ChipState | null = null, lastPopStart: number | null = null, pops = 0;

  const toastVisible = () => !!doc.querySelector('.toast.show');
  const hideTip = () => { if (tip) tip.hidden = true; if (tipTimer) { clearTimer(tipTimer); tipTimer = 0; } };
  const showTip = () => {
    if (!tip || !chip || toastVisible()) { hideTip(); return; }
    tip.hidden = false;
    const hud = doc.querySelector('.hud'), vw = doc.defaultView?.innerWidth ?? 0;
    const top = Math.round((hud?.getBoundingClientRect().bottom ?? 0) + TIP_GAP_PX);
    const w = tip.getBoundingClientRect().width, left = chip.getBoundingClientRect().left;
    tip.style.top = `${top}px`;
    tip.style.left = `${Math.round(Math.max(TIP_EDGE_PX, vw ? Math.min(left, vw - TIP_EDGE_PX - w) : left))}px`;
    if (tipTimer) clearTimer(tipTimer); tipTimer = setTimer(hideTip, TIP_MS);
  };
  // A chip tap is never a counted tap (BR-R17b, checklist §4 "Chip tap"): swallow it before it reaches any app handler.
  const swallow = (e: Event) => { e.stopPropagation(); };
  const onClick = (e: Event) => { e.stopPropagation(); showTip(); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); showTip(); } };

  const build = () => {
    const rate = doc.getElementById('rate'); if (!rate || !rate.parentElement) return false;
    row = doc.createElement('span'); row.className = 'breeds-hud-row';
    rate.parentElement.insertBefore(row, rate); row.append(rate);
    chip = doc.createElement('span'); chip.className = 'breeds-hud-chip pchip'; // .pchip/.pt = Art markup names (UI-BR-16), kept as aliases for QA selectors
    chip.setAttribute('data-testid', 'breeds-hud-chip'); chip.setAttribute('role', 'button'); chip.tabIndex = 0;
    chip.setAttribute('aria-describedby', 'breeds-hud-state');
    pt = doc.createElement('span'); pt.className = 'breeds-hud-pt pt';
    sr = doc.createElement('span'); sr.className = 'sr';
    chip.append(pt, sr);
    descEl = doc.createElement('span'); descEl.className = 'sr'; descEl.id = 'breeds-hud-state'; descEl.setAttribute('data-testid', 'breeds-hud-state');
    tip = doc.createElement('div'); tip.className = 'breeds-hud-tip'; tip.setAttribute('data-testid', 'breeds-hud-tip');
    tip.setAttribute('aria-hidden', 'true'); tip.hidden = true; tip.textContent = CHIP_TIP_TEXT;
    row.append(chip, descEl); doc.body.append(tip);
    for (const t of ['pointerdown', 'pointerup', 'mousedown', 'touchstart', 'touchend']) chip.addEventListener(t, swallow);
    chip.addEventListener('click', onClick); chip.addEventListener('keydown', onKey);
    chip.addEventListener('mouseenter', showTip); chip.addEventListener('focus', showTip);
    chip.addEventListener('mouseleave', hideTip); chip.addEventListener('blur', hideTip);
    doc.querySelector('.hud')?.classList.add('has-pchip');
    return true;
  };
  const teardown = () => {
    hideTip();
    const rate = doc.getElementById('rate');
    if (row && rate && row.parentElement) row.parentElement.insertBefore(rate, row);
    row?.remove(); tip?.remove(); doc.querySelector('.hud')?.classList.remove('has-pchip');
    row = chip = pt = sr = descEl = tip = null; shown = null;
  };
  const pop = (t: number) => {
    lastPopStart = t; pops++;
    chip?.animate?.([{ transform: 'scale(1)', easing: POP_EASE }, { transform: `scale(${POP_PEAK_SCALE})`, offset: 0.5, easing: POP_EASE }, { transform: 'scale(1)' }],
      { duration: POP_MS, iterations: 1 });
  };
  const setText = (el: Element, v: string) => { if (el.textContent !== v) el.textContent = v; };

  return {
    sync(s, nowMs) {
      const t = nowMs ?? now();
      if (tip && !tip.hidden && toastVisible()) hideTip(); // a toast takes y = HUD + 8: the tooltip yields (UI-BR-21)
      const m = presentChipModel(presentActiveBp(s, o.b), gate.open(s, o.b, t));
      if (!m) { if (chip) teardown(); return; }
      const appeared = !chip; if (appeared && !build()) return;
      setText(pt!, m.label); setText(sr!, SR_WORD[m.state]); setText(descEl!, m.description);
      chip!.dataset.state = m.state; chip!.classList.toggle('paused', m.state === 'paused');
      // Return: paused → active on this frame. No pop on load / settle (appeared) or under reduced motion; cap on wall time.
      if (!appeared && shown === 'paused' && m.state === 'active' && !rm() && (lastPopStart === null || t - lastPopStart >= POP_CAP_MS)) pop(t);
      if (m.state === 'paused') chip!.getAnimations?.().forEach(a => a.cancel()); // nothing animates while paused (UI-BR-18)
      shown = m.state;
    },
    dispose() { if (chip) teardown(); },
    get chip() { return chip; },
    get pops() { return pops; },
    get state() { return shown; },
  };
}
