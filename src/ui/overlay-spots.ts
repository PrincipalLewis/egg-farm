/**
 * v5 F6: spawn-spot geometry for overlay features (Art & UX m4-timed-collectible.md v1.1 §2.1-§2.3). Pure apart from domZones(),
 * which only READS live rects. Ported from #86 (feat/v5-ui-f6-overlay 2b4abf93 / bundle-f6 6307674); the R14 zone test itself is
 * golden-spots.ts validSpotIds (#111), so the rule lives in one place. API: engineering/tasks/v5-f6-rebuild/API.md.
 */
import { validSpotIds } from './golden-spots';
import { COMPACT_LEFT_INSET_PX, COMPACT_RIGHT_INSET_PX, COMPACT_ROW_GAP_PX, DOCKED_COLUMN_PX, DOCKED_COMPACT_MAX_VH, DOCKED_HUD_PX,
  DOCKED_PLAY_REF_PX, DOCKED_REF_CENTRES, DOCKED_SCENE_REF_PX, HALF, PHONE_375_MIN_VW, PHONE_COLUMN_INSET_PX, PHONE_SPOT_FRACTIONS,
  SPAWN_CLEAR_PX, SPAWN_HIT_PX } from './overlay-spec';

export type LayoutKey = 'phone-360' | 'phone-375' | 'docked' | 'docked-compact';
export type SpotId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8';
export interface Box { left: number; top: number; right: number; bottom: number }
export interface Spot { id: SpotId; x: number; y: number }
/** clear = minimum gap in px from the spot's hit box (0 = must not overlap: the ×N hens pill). */
export interface Zone { name: string; box: Box; clear: number }
export const SPOT_IDS: readonly SpotId[] = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];
const COLS = PHONE_SPOT_FRACTIONS.length; // spots per column

/** §2.1 layout key. `dockedMq` = the app's own matchMedia('(min-width:960px) and (orientation:landscape)').matches. */
export function layoutKey(vw: number, vh: number, dockedMq: boolean): LayoutKey {
  if (!dockedMq) return vw < PHONE_375_MIN_VW ? 'phone-360' : 'phone-375';
  return vw - DOCKED_COLUMN_PX < DOCKED_PLAY_REF_PX || vh < DOCKED_COMPACT_MAX_VH ? 'docked-compact' : 'docked';
}
/** §2.1 spot centres (whole px) for a layout from live rects (scene; docked-compact also queue + meter). docked-compact: no S4/S8. */
export function spotCentres(key: LayoutKey, vw: number, vh: number, r: { scene: Box; queue?: Box; meter?: Box }): Spot[] {
  let pts: [number, number][];
  if (key === 'phone-360' || key === 'phone-375') {
    const s = r.scene, h = s.bottom - s.top;
    pts = SPOT_IDS.map((_, i) => [i < COLS ? s.left + PHONE_COLUMN_INSET_PX : s.right - PHONE_COLUMN_INSET_PX, s.top + Math.round(PHONE_SPOT_FRACTIONS[i % COLS] * h)]);
  } else if (key === 'docked') {
    const dx = (vw - DOCKED_COLUMN_PX - DOCKED_PLAY_REF_PX) / HALF, k = (vh - DOCKED_HUD_PX) / DOCKED_SCENE_REF_PX;
    pts = DOCKED_REF_CENTRES.map(([x, y]) => [x + dx, DOCKED_HUD_PX + (y - DOCKED_HUD_PX) * k]);
  } else {
    if (!r.queue || !r.meter) return [];
    const s = r.scene, L = s.left + COMPACT_LEFT_INSET_PX, R = s.right - COMPACT_RIGHT_INSET_PX, yt = r.queue.bottom + COMPACT_ROW_GAP_PX,
      yb = r.meter.top - COMPACT_ROW_GAP_PX, ym = Math.round((yt + yb) / HALF);
    pts = [[L, yt], [L, ym], [L, yb], [NaN, NaN], [R, yt], [R, ym], [R, yb], [NaN, NaN]];
  }
  return pts.map(([x, y], i) => ({ id: SPOT_IDS[i], x: Math.round(x), y: Math.round(y) })).filter(p => Number.isFinite(p.x));
}
/** §2 runtime rule 2: hit box (SPAWN_HIT_PX) ≥ zone.clear from every zone (0 = no overlap) and ≥ SPAWN_CLEAR_PX inside the viewport. */
export function validSpots(spots: readonly Spot[], zones: readonly Zone[], vw: number, vh: number): Spot[] {
  const r = SPAWN_HIT_PX / HALF, inside = spots.filter(p => p.x - r >= SPAWN_CLEAR_PX && p.y - r >= SPAWN_CLEAR_PX && p.x + r <= vw - SPAWN_CLEAR_PX && p.y + r <= vh - SPAWN_CLEAR_PX);
  const ok = new Set(validSpotIds(inside, zones.map(z => ({ rect: z.box, clearance: z.clear })), SPAWN_HIT_PX));
  return inside.filter(p => ok.has(p.id));
}
/** §2 built-in no-spawn zones, read live from the DOM. Features add theirs with OverlayCtx.registerZone, never here. */
export interface DomZone { name: string; sel: string; clear: number; clipTo?: string; /** a zone even while transparent (toast strip) */ always?: boolean }
export const DOM_ZONES: readonly DomZone[] = [
  { name: 'hud', sel: 'header.hud', clear: SPAWN_CLEAR_PX }, { name: 'toast', sel: '.toast', clear: SPAWN_CLEAR_PX, always: true },
  { name: 'queue', sel: '#queue', clear: SPAWN_CLEAR_PX }, { name: 'coop', sel: '#coop', clear: SPAWN_CLEAR_PX, clipTo: '.farm' },
  { name: 'nest', sel: '#scene .nest', clear: SPAWN_CLEAR_PX }, { name: 'full', sel: '#full', clear: SPAWN_CLEAR_PX },
  { name: 'henpill', sel: '#henpill', clear: 0 }, { name: 'meter', sel: '#meter', clear: SPAWN_CLEAR_PX }, { name: 'goal', sel: '#goal', clear: SPAWN_CLEAR_PX },
  { name: 'collect', sel: '#collect', clear: SPAWN_CLEAR_PX }, { name: 'nav', sel: 'nav.actions', clear: SPAWN_CLEAR_PX },
  { name: 'sheet', sel: '#panel-layer.open', clear: SPAWN_CLEAR_PX }, { name: 'modal', sel: '#modal-layer.open', clear: SPAWN_CLEAR_PX },
];
/** Docked only: the docked column (#panel-layer is a fixed full-screen layer at phone widths, so there it is a zone only while open). */
export const DOCKED_COLUMN: DomZone = { name: 'docked-column', sel: '#panel-layer', clear: SPAWN_CLEAR_PX };
const shown = (el: Element | null, always = false): el is HTMLElement => {
  if (!el || (el as HTMLElement).hidden) return false; const r = el.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return false;
  const cs = getComputedStyle(el); return cs.display !== 'none' && (always || (cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0));
};
export const toBox = (r: DOMRect | Box): Box => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
export function domZones(doc: Document = document, docked = false): Zone[] {
  const out: Zone[] = [];
  for (const z of docked ? [...DOM_ZONES, DOCKED_COLUMN] : DOM_ZONES) {
    const el = doc.querySelector(z.sel); if (!shown(el, z.always)) continue; let b = toBox(el.getBoundingClientRect());
    if (z.clipTo) { const c = doc.querySelector(z.clipTo)?.getBoundingClientRect();
      if (c) b = { left: Math.max(b.left, c.left), top: Math.max(b.top, c.top), right: Math.min(b.right, c.right), bottom: Math.min(b.bottom, c.bottom) }; }
    out.push({ name: z.name, box: b, clear: z.clear });
  }
  return out;
}
