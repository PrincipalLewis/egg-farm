/**
 * M5.1 Breeds UI PR-B — Present HUD chip (BR-R12c; BR-AC52 / 52b / 52c). The slot-card mirror (`presentMirror`) and the shared
 * chip/mirror copy live in PR-A's breeds-adapter.ts (seams 3d40e76e §2); this module imports them.
 * Spec of record: product/m5.1-breeds-spec.md rev 3.8.9 (ea922eb8) L445-473, L827-855; Art UI doc v0.2.7 (f349f29f) §7a/§7b,
 * UI-BR-16..21, UI-BR-23. Seams: engineering/design/breeds-ui-seams.md (PR-B owns the `breeds-hud-*` prefix).
 *
 * The chip lives right of `#rate` inside the coins pill. With the flag off, or with no settled Present breed, the HUD markup
 * is exactly rc/v5's (the mount adds nothing, and removes everything it added when the chip hides).
 * The gate comes from a `PresentGateSource` (adapter); until Saves ships the sim gate the production stub is always open.
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import {
  breedsFlagOn, breedsOf, familyClampState, familyRawBp, familyCapBp, clampFamilyBp, traitPctExact, traitPctFloor, STUB_PRESENT_GATE, CHIP_PAUSED_DESC, chipActiveDesc, type FamilyClampState, type PresentGateSource,
} from './breeds-adapter';

// ---- Copy (FINAL, Head of Art & UX 23:31 / 23:40; spec L455-466). Describedby copy is PR-A's adapter export (shared with the mirror). ----
export { CHIP_PAUSED_DESC, chipActiveDesc };
export const CHIP_TIP_TEXT = 'Bonus returns when you tap slower';
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
export interface ChipModel { bp: number; atCap: boolean; label: string; exact: string; state: ChipState; description: string; }

/**
 * Present clamp view for the chip, in PR-A's `FamilyClampState` shape. Reads PR-A's `familyClampState('present', …)` first (the
 * clamp-bind follow-up delegates it to the sim). While PR-A's stub returns undefined, falls back to the PR-B stand-in built from
 * the kept getters (familyRawBp / familyCapBp / clampFamilyBp; Saves `atCap` = raw ≥ cap && cap > 0). TODO(Saves #126): drop the
 * fallback once familyClampState is bound (clamp-bind 29edfc8, after Saves #126 commit 1). undefined = flag off / no breeds root (returns
 * before familyClampState or the fallback run, so the flag-0 path is untouched).
 */
export function presentClampView(s: GameState, b: Balance): FamilyClampState | undefined {
  const br = breedsOf(s, b); if (!br) return undefined;
  const bound = familyClampState('present', br, b, s.farmLevel); if (bound !== undefined) return bound; // fallback ONLY on the undefined stub (Architect ruling 03:2x)
  const rawBp = familyRawBp(s, b, 'present'), cap = familyCapBp('present', s.farmLevel, b);
  return { rawBp, clampedBp: clampFamilyBp(rawBp, 'present', s.farmLevel, b), atCap: rawBp >= cap && cap > 0 };
}

/** Pure model from PR-A's Present family clamp view (`familyClampState('present', …)`, Saves `familyClamp` shape): the chip shows
 *  `clampedBp` (what income pays) and carries `atCap`. null when there's no settled Present bp (no chip). */
export function presentChipModel(v: FamilyClampState | undefined, gateOpen: boolean): ChipModel | null {
  const bp = v?.clampedBp ?? 0; if (!v || !(bp > 0)) return null;
  const state: ChipState = gateOpen ? 'active' : 'paused', exact = traitPctExact(bp);
  return { bp, atCap: v.atCap, label: traitPctFloor(bp), exact, state, description: state === 'active' ? chipActiveDesc(exact) : CHIP_PAUSED_DESC };
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
  /** Reduced motion: the registry passes PR-A's `ctx.reducedMotion` (same source as reveal / glow). Default: full motion. */
  rm?: () => boolean;
  /** Presentation clock; performance.now() by default (pop cap is wall time, not the focus clock: spec L468). */
  now?: () => number;
  setTimer?: (f: () => void, ms: number) => number;
  clearTimer?: (id: number) => void;
}

/** Mount the Present chip. Flag off → null and nothing is touched. */
export function mountPresentChip(o: PresentChipOpts): PresentChipMount | null {
  if (!breedsFlagOn(o.b)) return null;
  const doc = o.doc, gate = o.gate ?? STUB_PRESENT_GATE;
  const now = o.now ?? (() => performance.now());
  const rm = o.rm ?? (() => false); // production: ctx.reducedMotion (PR-A's opts.rm(): settings + prefers-reduced-motion)
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
    if (row && rate && rate.parentElement === row && row.parentElement) row.parentElement.insertBefore(rate, row); // only our own wrap
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
      const m = presentChipModel(presentClampView(s, o.b), gate.open(s, o.b));
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

// ---- PR-B registration through PR-A's leaf registry (seams §1; zero app.ts edits; loaded by breeds-ext-b.ts) ----------------
import { registerBreedsExt, breedsExtList, type BreedsExt, type BreedsExtCtx } from './breeds-ext-registry';
import { mountBbStrip, type BbStripMount } from './breeds-strip';
import { mountYard, type YardMount } from './breeds-yard';

let hud: PresentChipMount | null = null, strip: BbStripMount | null = null, yard: YardMount | null = null;
/** The ctx of the onSync in progress: chip/strip read reducedMotion, rollingIncomeRate() and openFlock() from it (PR-A seams). */
let cur: BreedsExtCtx | null = null;
/** The `.hud` the mounts were built on. A new app DOM (remount without dispose) drops the old mounts unrun: their nodes are
 *  detached, and running their teardown would write stale snapshots into the new DOM. */
let anchor: Element | null = null;
/** Injectables: the Saves sim gate and the #100 fallback predicate plug in here when they land (tests/harness use them now). */
export interface PrBOptions { gate?: PresentGateSource; fallback?: (s: GameState, b: Balance) => boolean; }
let prbOpts: PrBOptions = {};
/** The single PR-B extender: chip + strip + yard, mounted lazily on PR-A's first onSync (flag-off: PR-A never calls it). */
export const PRB_EXT: BreedsExt = {
  onSync(ctx) {
    cur = ctx;
    const live = document.querySelector('.hud');
    if (anchor !== live) { hud = strip = yard = null; anchor = live; }
    if (!hud && !strip && !yard) {
      hud = mountPresentChip({ doc: document, b: ctx.b, gate: prbOpts.gate, rm: () => cur?.reducedMotion ?? false });
      // Hatch tap → ctx.openFlock() (same path as the Flock entry button); countdown rate → ctx.rollingIncomeRate() (¢/s, the
      // same app IncomeRate BB-5's time-to-afford uses; seams ctx table). Not ctx.incomeRate() (steady-state sim rate).
      strip = mountBbStrip({ doc: document, b: ctx.b, rate: () => cur?.rollingIncomeRate() ?? 0, onOpenFlock: () => cur?.openFlock(), fallback: prbOpts.fallback });
      yard = mountYard({ doc: document, b: ctx.b });
    }
    hud?.sync(ctx.s); strip?.sync(ctx.s); yard?.sync(ctx.s);
  },
  onDispose() { hud?.dispose(); strip?.dispose(); yard?.dispose(); hud = strip = yard = cur = anchor = null; },
};
/** Register PR-B once (idempotent). STABLE SIGNATURE: `registerBreedsPrB(opts?: PrBOptions): BreedsExt`. Called by
 *  breeds-ext-b.ts, which PR-A's mountBreeds eager-globs behind the m4.flags.breeds guard. No import-time side effect here. */
export function registerBreedsPrB(opts?: PrBOptions): BreedsExt {
  if (opts) prbOpts = opts; // a later no-arg call (breeds-ext-b) keeps injected gate / fallback
  if (!breedsExtList().includes(PRB_EXT)) registerBreedsExt(PRB_EXT); return PRB_EXT;
}
/** Live PR-B mounts (harness / QA observability; null until PR-A's first onSync). */
export const prbMounts = () => ({ hud, strip, yard });
