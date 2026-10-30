/**
 * v5 F6: the Art & UX layout numbers the overlay uses (m4-timed-collectible.md v1.1 §2.1-§2.3, layout-spec §6), named in one
 * non-M5 module. They are layout geometry ruled by Art, not CSV tunables (sizing §1 F3, §12.2), so they live here as named code
 * constants (same convention as toast-safe.ts / onboarding.ts / pick-hysteresis.ts) and ui/overlay.ts (an M5 module: it calls
 * flagOn) carries no bare numeric literal (tests/v5-f3-config.test.ts "no literal tunables").
 */
/** §2 spawn hit box (visual 40). */
export const SPAWN_HIT_PX = 56;
/** §2 clearance from every no-spawn zone and from the viewport edge (0 px only for the ×N hens pill). */
export const SPAWN_CLEAR_PX = 16;
/** Halving factor for a centred box / midpoint. */
export const HALF = 2;
/** §2.2 1280×800 docked reference centres S1..S8 (px, viewport coordinates). */
export const DOCKED_REF_CENTRES: readonly (readonly [number, number])[] = [[110, 240], [230, 330], [110, 440], [230, 540], [680, 240], [770, 330], [650, 440], [770, 560]];
/** §2.1 phone spots: vertical fractions of the scene height for S1-S4 (left column) and S5-S8 (right column). */
export const PHONE_SPOT_FRACTIONS: readonly number[] = [0.32, 0.50, 0.68, 0.86];
/** §2.1 phone spots: column inset from the scene's left / right edge. */
export const PHONE_COLUMN_INSET_PX = 42;
/** §2.1 phone-360 below this viewport width, phone-375 from it. */
export const PHONE_375_MIN_VW = 368;
/** §2.1 docked: the market column width, the play-area width of the 1280 reference, the docked-compact height bound. */
export const DOCKED_COLUMN_PX = 400;
export const DOCKED_PLAY_REF_PX = 880;
export const DOCKED_COMPACT_MAX_VH = 700;
/** §2.2 docked: the HUD height and the reference scene height (800 − 56) used to scale y. */
export const DOCKED_HUD_PX = 56;
export const DOCKED_SCENE_REF_PX = 744;
/** §2.3 docked-compact: left / right column insets and the gap below the queue / above the meter. */
export const COMPACT_LEFT_INSET_PX = 58;
export const COMPACT_RIGHT_INSET_PX = 44;
export const COMPACT_ROW_GAP_PX = 48;
/** Audio hook default retrigger gap (the existing Audio.play default, unchanged). */
export const AUDIO_MIN_GAP_MS = 60;
/** layout-spec §6 FX budget: ≤ 30 live FX elements (QA-settable via eggfarmQa.fx.setMax). */
export const FX_MAX_LIVE = 30;
