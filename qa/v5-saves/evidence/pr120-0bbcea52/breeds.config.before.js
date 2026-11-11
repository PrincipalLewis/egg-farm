export const ROSTER = {
    leghorn: ['C', 'present', 250], sussex: ['C', 'away', 1500], orpington: ['C', 'broody', 1000],
    rhode_island_red: ['R', 'present', 300], brahma: ['R', 'away', 2000], ayam_cemani: ['E', 'present', 350],
    cochin: ['E', 'broody', 1500], cream_legbar: ['L', 'present', 400],
};
export const BREED_IDS = Object.keys(ROSTER);
export const isBreedId = (x) => typeof x === 'string' && Object.prototype.hasOwnProperty.call(ROSTER, x);
export const BC_SPEC_DEFAULTS = {
    unlock_farm: 10, slot2_farm: 14, slot3_farm: 20, rare_farm: 14, legendary_farm: 24, hatch_cost_s: 45, hatch_farm_share_bp: 10000,
    hatch_min_cents: 50000, hatch_time_s: 60, settle_s: 300, incubators: 1, w_common: 70, w_rare: 22, w_epic: 7, w_legendary: 1,
    pity_rare_after: 8, star_cap: 2, star_bonus_bp: 2500,
};
export const bc = (_b, k) => BC_SPEC_DEFAULTS[k];
export const BREEDS_RNG_SALT = 0x62726473;
export const unlockedSlots = (F, b) => F >= bc(b, 'slot3_farm') ? 3 : F >= bc(b, 'slot2_farm') ? 2 : F >= bc(b, 'unlock_farm') ? 1 : 0;
export const SLOT_IDX = [0, 1, 2];
export const BREEDS_SANITISE_EVENT = { type: 'save_migrated', migration: 'breeds_sanitise', from: 6, to: 6 };
export const CENTS_PER_DOLLAR = 100;
export const BP_ONE = 10000;
export const BP_HALF = 5000;
export const RARITY_WEIGHT = { C: 'w_common', R: 'w_rare', E: 'w_epic', L: 'w_legendary' };
export const FARM_SOON_HATCH_MULT = 2;
