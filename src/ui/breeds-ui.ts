/**
 * M5.1 Flock sheet presentational helpers (PR-A). Markup builders stay free of Game.
 * Art: art-ux/m5.1-breeds-ui.md v0.2.7; checklist c9d8b631.
 */
import type { Balance } from '../config/balance';
import { fmtMoney } from './format';
import {
  type BreedsSave, type HatchEstimate, breedAsset, SILHOUETTE_ASSET, SILHOUETTE_OPACITY,
  freeHatchAvailable, flockComplete, eligible, hatchCostCents, openSlotCount, fmtRemainMs,
  ROSTER, BREED_IDS, bc, familyWord, familyTraitWord, slotTraitBp, starBp, isBreedId,
  familyClampState, presentMirror, type FamilyClampState, type Family, type BreedId,
} from './breeds-adapter';
import type { GameState } from '../sim/state';

const A = (f: string) => `${import.meta.env.BASE_URL}assets/${f}`;

/** Accessible name = visible `label` (no aria-label). Time / hint lives in `sub` → aria-describedby. */
export type HatchUiState =
  | { kind: 'free'; label: string; sub: string; disabled: false }
  | { kind: 'affordable'; label: string; sub: string; disabled: false; cost: number }
  | { kind: 'unaffordable'; label: string; sub: string; disabled: true; cost: number; desc?: string }
  | { kind: 'hatching'; label: string; sub: string; disabled: true; remainMs: number }
  | { kind: 'gate'; label: string; sub: string; disabled: true } // More breeds at Farm 14
  | { kind: 'complete'; label: string; sub: string; disabled: true };

export function hatchUi(s: GameState, b: Balance, br: BreedsSave): HatchUiState {
  const subReady = 'Ready in 1:00';
  if (flockComplete(br, b)) {
    return { kind: 'complete', label: 'Flock complete', sub: 'All 8 breeds at 2★ · slots still work', disabled: true };
  }
  if (br.incubator && br.incubator.remainingMs > 0) {
    const rem = br.incubator.remainingMs;
    // ceil via fmtRemainMs (PMC OQ-3) — same string shown + describedby
    const sub = `Ready in ${fmtRemainMs(rem)}`;
    return { kind: 'hatching', label: 'Hatching…', sub, disabled: true, remainMs: rem };
  }
  if (freeHatchAvailable(br)) {
    return { kind: 'free', label: 'Hatch · Free', sub: subReady, disabled: false };
  }
  const elig = eligible(br, s.farmLevel, b);
  if (elig.length === 0) {
    const need = s.farmLevel < bc(b, 'rare_farm') ? bc(b, 'rare_farm') : bc(b, 'legendary_farm');
    const label = `More breeds at Farm ${need}`;
    // Art §2.1 E5 row: "All Commons at 2★" (F < rare_farm). The F14–23 Legendary gate has no Art sub-line → idle line kept.
    const sub = need === bc(b, 'rare_farm') ? 'All Commons at 2★' : subReady;
    return { kind: 'gate', label, sub, disabled: true };
  }
  const cost = hatchCostCents(s, b);
  const label = `Hatch · ${fmtMoney(cost)}`;
  if (s.coinsCents < cost) {
    return { kind: 'unaffordable', label, sub: subReady, disabled: true, cost };
  }
  return { kind: 'affordable', label, sub: subReady, disabled: false, cost };
}

/** BR-AC31c/31e: show note iff hatchEstimate.show (sim already encodes free/complete/maxed Farm). */
export function farmSoonVisible(est: HatchEstimate): boolean {
  return !!est.show;
}

export const FARM_SOON_TEXT = 'Needs next Farm upgrade';

/** Settling label for a slot. */
export function settleLabel(remainMs: number): string {
  return `Settling ${fmtRemainMs(remainMs)}`;
}

export function silhouetteImg(extraClass = ''): string {
  return `<img class="breed-sil ${extraClass}" src="${A(SILHOUETTE_ASSET)}" alt="" style="opacity:${SILHOUETTE_OPACITY}">`;
}

export function breedImg(id: string, extraClass = ''): string {
  return `<img class="breed-spr ${extraClass}" src="${A(breedAsset(id))}" alt="">`;
}

/** Album cell markup (OQ-1 → Art v0.2.7): owned = name + stars; unowned = ??? / silhouette. */
export function albumCellHtml(br: BreedsSave, id: (typeof BREED_IDS)[number]): string {
  const owned = br.owned[id];
  if (!owned) {
    return `<div class="album-cell locked" data-breed="${id}">${silhouetteImg()}<span class="album-q" aria-hidden="true">???</span><span class="sr">Unknown breed, not hatched yet</span></div>`;
  }
  const stars = owned.stars ?? 0;
  const slotted = br.slots.findIndex(x => x === id);
  const slotNote = slotted >= 0 ? `<span class="sr"> Slot ${slotted + 1}</span>` : '';
  // Art §2 / BR-UI-19: 2 star glyphs (star_cap 2), aria-hidden; "n of 2 stars" is the hidden text.
  const starSvgs = [0, 1].map(i =>
    `<span class="star${i < stars ? ' on' : ''}" aria-hidden="true">★</span>`).join('');
  // §7b: name = "Leghorn" (+ " Slot n"); "n of 2 stars" is the description (node outside the button, absolutely positioned .sr).
  const descId = `album-desc-${id}`;
  return `<button type="button" class="album-cell owned" data-breed="${id}" aria-describedby="${descId}">${breedImg(id)}<span class="album-name">${rosterName(id)}</span>${slotNote}<span class="album-stars" aria-hidden="true">${starSvgs}</span></button><span id="${descId}" class="sr">${stars} of 2 stars</span>`;
}

function rosterName(id: string): string {
  // Display: Rhode Island Red etc. from id
  return id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export { rosterName };

/** Slot card body (PR-A; Present mirror chip is PR-B — show exact % text only). */
export function slotCardHtml(s: GameState, br: BreedsSave, b: Balance, slot: number, open: number): string {
  if (slot >= open) {
    const need = slot === 1 ? bc(b, 'slot2_farm') : bc(b, 'slot3_farm');
    // Art §2 L53 / v0.2.7 DB-1: visible "Slot 2 · Farm 14", not a control; 🔒︎ aria-hidden (§7b).
    return `<div class="slot locked" data-slot="${slot}"><span class="slot-lock-ico" aria-hidden="true">🔒︎</span><span class="slot-lock">Slot ${slot + 1} · Farm ${need}</span></div>`;
  }
  const id = br.slots[slot];
  const settle = br.settleMs[slot] ?? 0;
  if (!isBreedId(id)) {
    return `<button type="button" class="slot empty" data-slot="${slot}" aria-describedby="slot-empty-desc-${slot}"><span class="slot-empty">Empty</span></button><span id="slot-empty-desc-${slot}" class="sr">Slot ${slot + 1}</span>`;
  }
  const [ , fam ] = ROSTER[id];
  const stars = br.owned[id]?.stars ?? 0;
  if (settle > 0) {
    const lab = settleLabel(settle);
    return `<button type="button" class="slot settling" data-slot="${slot}" data-breed="${id}">${breedImg(id)}<span class="slot-name">${rosterName(id)}</span> <span class="slot-meta">${traitPctTrim(starBp(id, stars, b))} ${familyTraitWord(fam)} · inactive</span><span class="settle-ring" aria-hidden="true"></span> <span class="settle-lab">${lab}</span></button>`;
  }
  const bp = slotTraitBp(br, slot, b);
  // Present mirror: gate stub OPEN until Saves calm-gate lands (same as PR-B STUB_PRESENT_GATE).
  const mir = fam === 'present' ? presentMirror(bp, true) : null;
  // Art §6: trailing zeros trimmed ("+15% away"); the Present mirror keeps PR-B's presentMirror text.
  const pct = mir ? mir.html : traitPctTrim(bp);
  const descAttr = mir ? ` aria-describedby="slot-desc-${slot}"` : '';
  const descNode = mir ? `<span id="slot-desc-${slot}" class="sr">${mir.description}</span>` : '';
  // E8: familyClampState delegates to the sim familyClamp (#126); "max" iff rawBp > clampedBp.
  const clamp = familyClampState(fam, s, b);
  const maxLab = clamp && clamp.rawBp > clamp.clampedBp ? 'max' : '';
  const maxSpan = maxLab ? `<span class="slot-max" data-testid="breeds-slot-max">${maxLab}</span>` : '';
  // OQ-6: album select → tap slot to place; Remove clears (not tap-on-filled).
  const remDescId = `slot-remove-desc-${slot}`;
  const remDesc = `<span id="${remDescId}" class="sr">${rosterName(id)}, slot ${slot + 1}</span>`;
  // §7b / BR-AC52c: the slot control is a button whose name IS its visible text ("Leghorn +3.12% lay Present");
  // no aria-label. Remove is a sibling button (never nested → nested-interactive 0), 44px hit (§7).
  return `<div class="slot filled" data-slot="${slot}" data-breed="${id}"><button type="button" class="slot-main" data-testid="breeds-slot-main" data-slot="${slot}"${descAttr}>${breedImg(id)}<span class="slot-name">${rosterName(id)}</span> <span class="slot-meta">${pct} ${familyTraitWord(fam)} ${familyWord(fam)}${maxSpan ? ` ${maxSpan}` : ''}</span></button>${descNode}<button type="button" class="slot-remove" data-testid="breeds-slot-remove" data-slot="${slot}" aria-describedby="${remDescId}">Remove</button>${remDesc}</div>`;
}

/** Trait % per Art §6: bp/100, ≤ 2 decimals, trailing zeros trimmed (312 → "+3.12%", 1500 → "+15%", 0 → "+0%"). */
export const traitPctTrim = (bp: number) => `+${Number((bp / 100).toFixed(2))}%`;

type ClampFn = (f: Family, s: GameState, b: Balance) => FamilyClampState | undefined;
const FAMS: readonly Family[] = ['present', 'away', 'broody'];
const TOTAL_LABEL: Record<Family, string> = { present: 'Lay', away: 'Away', broody: 'Nest' };

/**
 * Art §2 "Active totals" line (BR-UI-06/16): applied (clamped, settled-only) values per family, " (max)" when clamped (E8).
 * Nothing settled → "Active: none yet · a breed works once it has settled (5:00)".
 * `clamp` defaults to the adapter's familyClampState (sim familyClamp view; undefined ⇒ raw sum, no "(max)").
 */
export function activeTotalsText(s: GameState, b: Balance, br: BreedsSave, clamp: ClampFn = familyClampState): string {
  const open = openSlotCount(s, b);
  const raw: Record<Family, number> = { present: 0, away: 0, broody: 0 };
  let settled = 0;
  for (let i = 0; i < open; i++) {
    const id = br.slots[i];
    if (!isBreedId(id) || (br.settleMs[i] ?? 0) > 0) continue;
    settled++;
    raw[ROSTER[id][1]] += slotTraitBp(br, i, b);
  }
  if (settled === 0) return `Active: none yet · a breed works once it has settled (${fmtRemainMs(bc(b, 'settle_s') * 1000)})`;
  const sv = s.breeds === br ? s : ({ ...s, breeds: br } as GameState);
  return 'Active: ' + FAMS.map(f => {
    const c = clamp(f, sv, b);
    const v = c ? c.clampedBp : raw[f];
    const max = c && c.rawBp > c.clampedBp ? ' (max)' : '';
    return `${TOTAL_LABEL[f]} ${traitPctTrim(v)}${max}`;
  }).join(' · ');
}

const RARITY_WORD = { C: 'Common', R: 'Rare', E: 'Epic', L: 'Legendary' } as const;
const REVEAL_TRAIT: Record<Family, string> = {
  present: 'laying while the farm is open', away: 'eggs while you are away', broody: 'Broody nest fill',
};

/**
 * Art §4 reveal-card copy (UI-BR-8 / BR-UI-21), read after the grant (stars/slot already applied by the sim).
 * kicker: "New breed!" (stars 0) or "Star up! ★ +1" (duplicate). placement: "Added to slot n · settling m:ss" when the
 * breed sits in a settling slot, "Not slotted · place it from the album" when in no slot; a duplicate already settled
 * in a slot has no Art line → null (no placement line rendered).
 */
export function revealCopy(br: BreedsSave, id: BreedId, b: Balance): {
  kicker: string; name: string; meta: string; stars: number; trait: string; placement: string | null;
} {
  const [rar, fam] = ROSTER[id];
  const stars = br.owned[id]?.stars ?? 0;
  const slot = br.slots.findIndex(x => x === id);
  const settle = slot >= 0 ? (br.settleMs[slot] ?? 0) : 0;
  const placement = slot < 0 ? 'Not slotted · place it from the album'
    : settle > 0 ? `Added to slot ${slot + 1} · settling ${fmtRemainMs(settle)}` : null;
  return {
    kicker: stars > 0 ? 'Star up! ★ +1' : 'New breed!',
    name: rosterName(id),
    meta: `${RARITY_WORD[rar]} · ${familyWord(fam)}`,
    stars,
    trait: `${traitPctTrim(starBp(id, stars, b))} ${REVEAL_TRAIT[fam]}`,
    placement,
  };
}
