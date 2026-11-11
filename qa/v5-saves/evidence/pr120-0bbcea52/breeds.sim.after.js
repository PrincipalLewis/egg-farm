import { flagOn } from '../config/flags';
import { BREED_IDS, BREEDS_RNG_SALT, BREEDS_SANITISE_EVENT, SLOT_IDX, bc, isBreedId, unlockedSlots } from '../config/breeds';
import { mixSeed } from './state';
import { isRngState } from './rng';
export const on = (s, b) => flagOn(b, 'breeds') && !!s.breeds;
const int0 = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);
export function ensureBreeds(s, b) {
    if (!flagOn(b, 'breeds') || 'breeds' in s)
        return s;
    const br = { owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0], flockCompleteLogged: 0,
        hatches: 0, pity: 0, rng: mixSeed((s.rng ^ BREEDS_RNG_SALT) >>> 0), freeHatchUsed: 0 };
    if (s.farmLevel >= bc(b, 'unlock_farm'))
        br.sinceUnlockBackfilled = 1;
    return { ...s, breeds: br };
}
export const isFlockComplete = (br, b) => BREED_IDS.every(id => (br.owned[id]?.stars ?? -1) >= bc(b, 'star_cap'));
export function revealHatch(br, b, slotsOpen) {
    const inc = br.incubator;
    if (!inc || inc.remainingMs > 0 || !isBreedId(inc.breed))
        return { br, revealed: null };
    const id = inc.breed, prev = br.owned[id];
    const owned = { ...br.owned, [id]: { stars: prev ? Math.min(bc(b, 'star_cap'), prev.stars + 1) : 0 } };
    const slots = [...br.slots], settleMs = [...br.settleMs];
    if (!slots.includes(id)) {
        const i = slots.findIndex((x, k) => x === null && k < slotsOpen);
        if (i >= 0) {
            slots[i] = id;
            settleMs[i] = bc(b, 'settle_s') * 1000;
        }
    }
    return { br: { ...br, owned, slots, settleMs, incubator: null }, revealed: id };
}
export function breedsOffline(s, awayMs, b) {
    const o = b.offline;
    if (!on(s, b) || !Number.isFinite(awayMs) || awayMs < o.offlineMinSeconds * 1000)
        return { state: s, reveal: null };
    const ms = Math.floor(Math.min(awayMs, o.offlineCapSeconds * 1000)), br0 = s.breeds;
    let br = br0, reveal = null;
    if (br.incubator) {
        br = { ...br, incubator: { ...br.incubator, remainingMs: Math.max(0, br.incubator.remainingMs - ms) } };
        const r = revealHatch(br, b, unlockedSlots(s.farmLevel, b));
        br = r.br;
        reveal = r.revealed;
    }
    if (br !== br0 && s.breedsRawSlots)
        s = dropRawSlots(s, br0.slots, br.slots);
    if (s.farmLevel >= bc(b, 'unlock_farm') && br.flockCompleteLogged !== 1)
        br = { ...br, sinceUnlockMs: int0(br.sinceUnlockMs) + ms };
    return br === br0 ? { state: s, reveal } : { state: { ...s, breeds: br }, reveal };
}
export function sanitizeBreedsOnLoad(s, b, ev) {
    if (!on(s, b))
        return s;
    const br0 = s.breeds, cap = bc(b, 'star_cap'), maxMs = bc(b, 'hatch_time_s') * 1000, open = unlockedSlots(s.farmLevel, b);
    if (typeof br0 !== 'object' || Array.isArray(br0))
        return s;
    const owned = {};
    for (const [k, v] of Object.entries(br0.owned ?? {})) {
        const st = v?.stars;
        owned[k] = isBreedId(k) ? { stars: Number.isFinite(st) ? Math.min(cap, Math.max(0, Math.floor(st))) : 0 } : v;
    }
    const seen = new Set(), slots = SLOT_IDX.map(i => {
        const x = br0.slots?.[i];
        if (!isBreedId(x) || i >= open || seen.has(x))
            return null;
        seen.add(x);
        return x;
    });
    let incubator = br0.incubator ?? null, coinsCents = s.coinsCents;
    if (incubator && !isBreedId(incubator.breed)) {
        coinsCents += int0(incubator.costCents);
        incubator = null;
    }
    else if (incubator) {
        const r = incubator.remainingMs;
        incubator = { ...incubator, remainingMs: Number.isFinite(r) ? Math.min(maxMs, Math.max(0, Math.round(r))) : maxMs };
    }
    const settleMs = SLOT_IDX.map(i => Math.min(bc(b, 'settle_s') * 1000, int0(br0.settleMs?.[i])));
    const br = { ...br0, owned, slots, incubator, settleMs };
    if ('sinceUnlockMs' in br0 && int0(br0.sinceUnlockMs) !== br0.sinceUnlockMs)
        br.sinceUnlockMs = 0;
    for (const k of ['hatches', 'pity'])
        if (int0(br0[k]) !== br0[k])
            br[k] = 0;
    if (br0.freeHatchUsed !== 0 && br0.freeHatchUsed !== 1)
        br.freeHatchUsed = 1;
    if (!isRngState(br0.rng))
        br.rng = mixSeed((s.rng ^ BREEDS_RNG_SALT) >>> 0);
    if (br0.flockCompleteLogged !== 0 && br0.flockCompleteLogged !== 1)
        br.flockCompleteLogged = isFlockComplete(br, b) ? 1 : 0;
    if ('sinceUnlockBackfilled' in br0 && br0.sinceUnlockBackfilled !== 0 && br0.sinceUnlockBackfilled !== 1)
        br.sinceUnlockBackfilled = 1;
    const raw = SLOT_IDX.map(i => { const x = br0.slots?.[i]; return typeof x === 'string' && !isBreedId(x) ? x : null; });
    const out = { ...s, breeds: br, coinsCents, ...(raw.some(x => x !== null) && { breedsRawSlots: raw }) };
    if (JSON.stringify(breedsSaveView(out)) === JSON.stringify(br0) && coinsCents === s.coinsCents)
        return out;
    ev.push({ ...BREEDS_SANITISE_EVENT });
    return out;
}
export function dropRawSlots(s, before, after, also = -1) {
    const raw0 = s.breedsRawSlots;
    if (!raw0)
        return s;
    const raw = raw0.map((v, i) => (i === also || before[i] !== after[i] ? null : v));
    return raw.every((v, i) => v === raw0[i]) ? s : { ...s, breedsRawSlots: raw };
}
export function breedsSaveView(s) {
    const x = s.breeds, raw = s.breedsRawSlots;
    if (!x || !raw)
        return x;
    const slots = x.slots.map((v, i) => (v === null && raw[i] ? raw[i] : v));
    return slots.every((v, i) => v === x.slots[i]) ? x : { ...x, slots };
}
