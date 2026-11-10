/**
 * v5 #1 golden egg: the R14 valid-spot test (product/collection/m5-golden-egg-spec.md R14/R15; sizing §12.2). Pure: the caller
 * supplies the spot centres for the live R12 layout key and the live zone rects (getBoundingClientRect), each with its clearance
 * (tc_margin_px for most zones, 0 for the `xN hens` pill), and the hit-box size. No geometry or tunable is defined here:
 * spot formulas and the zone list are the UI owner's (Art v1.1 §2 / spec §9.1), and tc_margin_px / the 56 px hit box are
 * not in balance.json yet (gap reported in the PR body). The result feeds Game.setSpotProbe -> spawnGolden{spots}.
 */
export interface SpotCentre { id: string; x: number; y: number; }
export interface SpotRect { left: number; top: number; right: number; bottom: number; }
export interface SpotZone { rect: SpotRect; clearance: number; }
const overlaps = (a: SpotRect, b: SpotRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
/** Spot ids (in list order) whose hitPx x hitPx box, grown by each zone's clearance, overlaps no zone. [] = R15 defer. */
export function validSpotIds(spots: readonly SpotCentre[], zones: readonly SpotZone[], hitPx: number): string[] {
  const h = hitPx / 2;
  return spots.filter(p => zones.every(z => !overlaps({ left: p.x - h - z.clearance, top: p.y - h - z.clearance, right: p.x + h + z.clearance, bottom: p.y + h + z.clearance }, z.rect))).map(p => p.id);
}
