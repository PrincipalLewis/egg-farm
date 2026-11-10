/**
 * M5.1 Flock sheet presentational helpers (PR-A). Markup builders stay free of Game.
 * Art: art-ux/m5.1-breeds-ui.md v0.2.7; checklist c9d8b631.
 */
import type { Balance } from '../config/balance';
import { fmtMoney } from './format';
import {
  type BreedsSave, type HatchEstimate, breedAsset, SILHOUETTE_ASSET, SILHOUETTE_OPACITY,
  freeHatchAvailable, flockComplete, eligible, hatchCostCents, openSlotCount, fmtRemainMs,
  ROSTER, BREED_IDS, bc, traitPctExact, familyWord, familyTraitWord, slotTraitBp, starBp, isBreedId,
  familyClampState, presentMirror,
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
    return { kind: 'complete', label: 'Flock complete', sub: 'Slots still work', disabled: true };
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
    return { kind: 'gate', label, sub: subReady, disabled: true };
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
  const slotNote = slotted >= 0 ? `<span class="sr">Slot ${slotted + 1}</span>` : '';
  const starSvgs = [0, 1, 2].map(i =>
    `<span class="star${i < stars ? ' on' : ''}" aria-hidden="true">★</span>`).join('');
  return `<button type="button" class="album-cell owned" data-breed="${id}">${breedImg(id)}<span class="album-name">${rosterName(id)}</span><span class="album-stars" aria-hidden="true">${starSvgs}</span><span class="sr">${stars} of 2 stars</span>${slotNote}</button>`;
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
    return `<div class="slot locked" data-slot="${slot}"><span class="sr">Slot ${slot + 1} Farm ${need}</span><span aria-hidden="true">🔒︎</span><span class="slot-lock">Farm ${need}</span></div>`;
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
    return `<button type="button" class="slot settling" data-slot="${slot}" data-breed="${id}">${breedImg(id)}<span class="slot-name">${rosterName(id)}</span><span class="slot-meta">${traitPctExact(starBp(id, stars, b))} ${familyTraitWord(fam)} · inactive</span><span class="settle-ring" aria-hidden="true"></span><span class="settle-lab">${lab}</span></button>`;
  }
  const bp = slotTraitBp(br, slot, b);
  // Present mirror: gate stub OPEN until Saves calm-gate lands (same as PR-B STUB_PRESENT_GATE).
  const mir = fam === 'present' ? presentMirror(bp, true) : null;
  const pct = mir ? mir.html : traitPctExact(bp);
  const descAttr = mir ? ` aria-describedby="slot-desc-${slot}"` : '';
  const descNode = mir ? `<span id="slot-desc-${slot}" class="sr">${mir.description}</span>` : '';
  // E8: familyClampState stub → undefined (no label). Bind follow-up delegates to sim familyClamp.
  const clamp = familyClampState(fam, s, b);
  const maxLab = clamp && clamp.rawBp > clamp.clampedBp ? 'max' : '';
  const maxSpan = maxLab ? `<span class="slot-max" data-testid="breeds-slot-max">${maxLab}</span>` : '';
  // OQ-6: album select → tap slot to place; Remove clears (not tap-on-filled).
  const remDescId = `slot-remove-desc-${slot}`;
  const remDesc = `<span id="${remDescId}" class="sr">${rosterName(id)}, slot ${slot + 1}</span>`;
  return `<div class="slot filled" data-slot="${slot}" data-breed="${id}" role="group" aria-label="Slot ${slot + 1}, ${rosterName(id)}"${descAttr}>${breedImg(id)}<span class="slot-name">${rosterName(id)}</span><span class="slot-meta">${pct} ${familyTraitWord(fam)} ${familyWord(fam)}${maxSpan ? ` ${maxSpan}` : ''}</span>${descNode}<button type="button" class="slot-remove" data-testid="breeds-slot-remove" data-slot="${slot}" aria-describedby="${remDescId}">Remove</button>${remDesc}</div>`;
}
