// VER-1a (CCR R1 on #71): the save verify hands to the browser must load back as the run's end state. It is checked with
// src/save/save.ts validate(), the validator the game uses on load, so a missing tracksV7 marker (QA-D-1027-GOALPILL) or
// any other load-time migration fails verify (exit 4) instead of putting a different farm in verify.png.
import type { Balance } from '../../src/config/balance';
import type { GameState } from '../../src/sim/state';
import { validate, SAVE_VERSION } from '../../src/save/save';

export const ROUNDTRIP_FIELDS = ['farmLevel', 'hensLevel', 'eggValueLevel', 'collectionLevel', 'graderTier', 'workers', 'coinsCents'] as const;
export interface RoundTrip { pass: boolean; validator: string; ok: boolean; reason: string | null; migrated: boolean; tracksMigrated: boolean; version: number | null; mismatches: { field: string; saved: unknown; end: unknown }[] }

const canon = (x: unknown): unknown => x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x as object).sort().map(k => [k, canon((x as any)[k])])) : x;

export function saveRoundTrip(raw: string, end: GameState, b: Balance): RoundTrip {
  const r = validate(raw, b);
  const base = { validator: 'src/save/save.ts validate(raw, balance)' };
  if (!r.ok) return { ...base, pass: false, ok: false, reason: r.reason, migrated: false, tracksMigrated: false, version: null, mismatches: [] };
  let version: number | null = null; try { version = JSON.parse(raw).version; } catch { /* validate parsed it */ }
  const tracksMigrated = !!r.file.tracksMigrated, migrated = tracksMigrated || version !== SAVE_VERSION || r.file.version !== SAVE_VERSION;
  const mismatches = ROUNDTRIP_FIELDS
    .map(f => ({ field: f, saved: (r.file.state as any)[f], end: (end as any)[f] }))
    .filter(m => JSON.stringify(canon(m.saved)) !== JSON.stringify(canon(m.end)));
  return { ...base, pass: !migrated && mismatches.length === 0, ok: true, reason: null, migrated, tracksMigrated, version, mismatches };
}
