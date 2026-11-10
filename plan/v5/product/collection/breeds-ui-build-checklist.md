# Breeds UI build checklist (M5.1 Flock) · PMC · 2026-11-10 00:20 CET
**Source:** `product/m5.1-breeds-spec.md` v0.2 rev 3.8.9, sha1 `ea922eb8574740f15c1998cf534689d1259c12a7` (verified on disk; HoQA QA-D-1110-BR389 PASS). `L###` = line in that file. **Flag:** `m4.flags.breeds`, a 0/1 number, default 0; `bc_*` columns are read only when it is on (L683-687). **Ships at 1** (HoP 2026-11-10; ship-set L9; manifest L109: a missing UI means the RC slips, not flag 0; gate Card #3 L121). **Visuals:** the Art UI doc `art-ux/m5.1-breeds-ui.md` v0.2.7 `f349f29f` wins on visuals and measurements (L299, L445). This sheet covers behaviour only. Task: HoP/breeds-ui-support. Scope questions go to HoP; design questions go to PMC.

## 1. Surfaces and entry points
| Surface | Spec | Build notes |
|---|---|---|
| **Flock button** | BR-R1 L299, L301; BR-AC3 L768, BR-AC3b L767 | Secondary 44 px button in the Upgrades panel header, right-aligned. It is not a 4th tab and not a coop tap. Shown at F ≥ `bc_unlock_farm`. Its new-feature highlight waits until the Shift-calls intro is dismissed, with a fallback at the next session start. It moves the scene and Collect by 0 px |
| **Flock sheet** | L300; BR-AC3 L768 | **Phone:** replaces the Upgrades sheet in the same rect; it is a menu, so set `Game.menuOpen` and the focus clock is held (L398, L435). **Docked:** an overlay over the whole docked column that covers Market, with a ≥ 44 px Close and Esc; it is NOT a menu, so focus keeps running (L435, Q-UI-10 L1089) |
| **Slots ×3** | BR-R2/R3/R4 L302-307; BR-AC4/4b L769-770 | One breed per slot. Placing a breed that is already slotted moves it. An empty slot is allowed. Swaps are free with no cooldown. A newly placed breed shows "Settling m:ss" with a static draining ring and no loop. A moved breed keeps its settle state |
| **Hatch button + sub-line** | BR-R6/R7 L319-320; BR-BB3 L531-534; BR-AC31 L917 | `Hatch · ` + `fmtMoney(costCents)`, with the accessible name containing `fmtMoneyAria`. The sub-line is "Ready in 1:00". No ★, payback, "best" or "of income" text (L533-534) |
| **Incubator disc** | BR-R8/R9 L337-338; L385; BR-AC31 L917 | Shows the silhouette `char-breed-silhouette.svg` at 0.55 opacity until the reveal. The roll is already stored, so never show the breed early |
| **Reveal card** | BR-R11 L346-348; BR-AC32 L918 | One card with ≤ 400 ms of motion; under reduced motion, a crossfade with no crack. On reveal, a new breed is auto-slotted into the first empty slot |
| **Album (8 breeds, stars 0-2)** | §3 L292; §4.3 L353-362; L385; BR-AC31 L917 | Unrevealed cells use the silhouette at 0.55. The layout comes from the UI doc (see OQ-1) |
| **Farm-soon note** | BR-R7b L321-336; BR-AC31c/31e L907-915 | One line, exactly "Needs next Farm upgrade", shown under the Hatch sub-line. It is a note only and never blocks |
| **Present HUD chip + slot mirror** | BR-R12c L445-473; BR-AC52/52b/52c L827-855 | The chip sits right of `#rate`. Each Present slot card mirrors its state as plain text. See §2 |
| **Best-buy strip target** | BR-BB4 L535-540; BR-AC23b/23c L900-901 | "Hatch · $X" or "Hatch · in Xs", only in BB-5's fallback branch. It depends on BBv2 (#100, unmerged). Never ★ |
| **Sprites** | §4.3b L373-392; BR-AC33-35 L920-922 | Map with `id.replaceAll('_','-')`. If a sprite is inlined, prefix its `cm-*`/`lb-*` clip ids |

## 2. States (check each)
- [ ] **Flag off:** no Flock entry. Saved breed data is left untouched (E11 L568; BR-AC1 L760; gate BRD-AC1 L129).
- [ ] **F < 10:** no entry. **F10 / F14 / F20:** 1 / 2 / 3 slots, and slots never shrink (BR-R2 L302; BR-AC3 L768). Locked-slot visuals: OQ-2.
- [ ] **Empty slot** is allowed (BR-R3 L303). **Settling:** ring plus "Settling m:ss"; the trait gives 0 until it reaches 0 (BR-R4 L304; BR-AC32 L918).
- [ ] **Free hatch available** (`freeHatchUsed` 0, F ≥ 10): "Hatch · Free" is enabled whatever the coins, with "Ready in 1:00". After the press, "Free" never returns, including after a reload (BR-R6 L319; BR-AC31a L905; BR-AC5 L773).
- [ ] **Affordable:** `Hatch · $X` (BR-AC31 L917). **Can't afford:** the standard dimmed Buy state with `aria-disabled="true"`, no `.affordable` glow, **no lock icon** and no on-screen ETA. A press does nothing. The state flips on the frame coins cross the cost (BR-AC31b L906; E1/E2 L558-559).
- [ ] **Incubating:** Hatch is disabled because the single incubator is busy. The silhouette shows and the timer counts down `remainingMs` (BR-R7 L320; BR-R8 L337; "Ready in m:ss" L538). Label and rounding: OQ-3.
- [ ] **Ready / revealed:** the reveal happens on the first tick where `remainingMs` ≤ 0. A new breed gets 0★ and a duplicate gets +1★ (BR-R11 L346; BR-AC8 L776, BR-AC11 L779).
- [ ] **Offline-complete:** `Game.pendingReveal` is set in `applyOffline`. Show the card **after the welcome-back modal closes**. It is not a notify event (BR-R18 L547; BR-AC25 L925).
- [ ] **Pity:** sim-only, with no UI string defined (BR-R10 L344; E6 L563). See OQ-4.
- [ ] **"More breeds at Farm 14":** shown when only Commons are eligible below F14 and all are at 2★; nothing can start (E5 L562; BR-AC10 L778).
- [ ] **Flock complete:** "Flock complete" replaces the Hatch button, and slots still work. The note and strip are off (BR-R10 L345; E4 L561; L335; BR-AC11 L779).
- [ ] **Family over its clamp:** the Flock sheet shows "max" on that family (E8 L565; clamps L365-368). The exact family % has 2 decimals (L448).
- [ ] **Farm-soon note:** shows iff the Farm track isn't maxed and `secondsToAffordSteady(next step)` (default income, breed-neutral) ≤ `2 × bc_hatch_cost_s`. It is off for the free hatch, a maxed Farm or a complete flock. Exactly 1 DOM node, never re-animated (L321-336; BR-AC31c L907).
- [ ] **Chip states:** hidden with no settled Present breed. **Active:** solid border, name "+X% active", describedby "Breed bonus +X.XX% active". **Pending:** dashed border, strike, no ring or animation, name "+X% paused", describedby "Breed bonus paused while you tap fast. Returns when you tap slower." Tooltip "Bonus returns when you tap slower" (1.6 s, 8 px below the HUD). Return pop ≤ 1 per 10 s on `performance.now()`. No pop on load or settle. No aria-label and no live region. k = 0 never shows pending (L446-468).

## 3. Tunables: read them, never hard-code (§5 L631-654)
| Key | Spec value | UI use |
|---|---|---|
| `bc_unlock_farm` / `bc_slot2_farm` / `bc_slot3_farm` | 10 / 14 / 20 | Entry visibility and slot count (L633-635) |
| `bc_rare_farm` / `bc_legendary_farm` | 14 / 24 | Eligibility; the "Farm 14" copy (L636-637; E5) |
| `bc_hatch_time_s` | 60 | "Ready in 1:00" and the timer (L641; BR-R8) |
| `bc_settle_s` | 300 | "Settling m:ss" (L642) |
| `bc_hatch_cost_s` | 45 | Note threshold `2 ×` (L638; L322) |
| `bc_star_cap`, `bc_star_bonus_bp`, `bc_trait_<id>_bp` | 2, 2500, §4.3 | Stars, Flock-panel % (L646-647, L652, L364) |
| `bc_lay_cap_bp_lt18` / `bc_lay_cap_bp` / `bc_away_cap_bp` / `bc_broody_cap_bp` | 700 / 1500 / 3000 / 2000 | "max" display (L648-651; E8/E9) |
| `bc_present_calm_w_s` / `bc_present_calm_k` | 10 / 6 | Chip gate, read from the sim (L653-654) |
- **Cost:** display the sim's `hatchCostCents` (BR-R5 L310-318, unchanged at 3.8.9), recomputed **every frame**. A press charges the cost of its own frame (BR-R7 L320). Never compute the cost in the UI.
- **Blocker:** `bc()` reads `BC_SPEC_DEFAULTS`, not the CSV; the shipped CSV has no `bc_*` columns (manifest row 27 L56 "#95 M1"; drift audit row 19; spec RC-PIN-2/2b L8-9).

## 4. Edge cases the UI must handle
- [ ] **E10** (L567): an unknown id in an unlocked slot renders **empty** at runtime, but the raw id is saved back unless the player changes that slot. An unknown id in `owned` is not shown (it is ignored). An E10-only load emits no event (BR-AC26 L927).
- [ ] **E12 sanitised saves** (L569): render the post-sanitise state. Stars are clamped to 0-2. A duplicate slot or a slot ≥ the unlocked count becomes null. An unknown incubator breed is dropped and refunded, leaving the incubator idle. A bad root is re-created with defaults. The UI emits nothing; `save_migrated` is the sim's.
- [ ] **Q6** (L569): a non-finite, null or non-number `remainingMs` becomes **60,000**, so the timer shows a full 1:00. A finite value is clamped to [0, 60,000] and rounded.
- [ ] **Q7** (L569): a missing `freeHatchUsed` reads as 0, so "Hatch · Free" shows. A present but invalid value reads as 1.
- [ ] **Hidden tab < 60 s:** the incubator and settling run; Present adds nothing (BR-R19 L552; L307). **Hidden ≥ 60 s:** hide-snapshot restore, then `applyOffline`; the hatch may complete via `pendingReveal`; the tap ring empties, so the chip is active (L429; E22b L579; BR-AC49 L815-820).
- [ ] **Reload mid-incubation:** the same breed resumes with the saved `remainingMs`, with no re-roll and no `breed_revealed` (BR-R20 L553; L695; BR-AC8 L776). **Reload with the gate closed:** the chip is active with no pop (E22 L581; BR-AC50 L821).
- [ ] **Tampered or future `savedAt`:** no catch-up. **Throttled visible frame ≥ 60 s:** only 60 s of ticks (L548-549; BR-AC25b L926).
- [ ] **E15** (L572): a hatch completing on the F18/F20 frame reveals first, then unlocks the slot, then auto-slots into the empty new slot.
- [ ] **E9** (L566): the Present clamp shown goes 700 → 1500 at F18 on the next frame.
- [ ] **Chip tap:** must call `stopPropagation()` and never dispatch `collect`. Flock-sheet taps are never credited taps (L408; BR-R17b L500; BR-AC52 L834).
- [ ] **E16** reduced motion: a crossfade with no motion (L573). **E3** (L560): a sleeping Market Hand doesn't change the cost.

## 5. Telemetry (§8 L689-716): every event goes through the SimEvent sink, so the UI calls sim actions and never emits directly (L547)
| Event | Fields (exact) | UI trigger |
|---|---|---|
| `hatch_started` (pinned) | `breed_id`, `rarity`, `cost`, `coinsBefore`, `pity_before`, `free` (bool), `farm_level`. Never `track`/`cost_cents`. A failed press emits **nothing** | Hatch press (L694) |
| `breed_revealed` (ring) | `breed_id`, `rarity`, `dupe`, `stars_after`, `offline`, `wait_ms`. Fires at completion, **not** when the card is shown | none (sim) (L695) |
| `breed_slotted` (ring) | `slot`, `prev_slot`, `breed_id`, `prev_breed_id`, `cause` `manual`\|`auto_reveal`\|`move`, `loadout` e.g. `"P2A1B0"`, `settling`, `count`. A move is 1 event; a no-op is 0; coalesced to ≤ 1 per slot per 1,000 sim ms | Place / move (L696) |
| `flock_complete` (pinned) | `hatches`, `farm_level`, `elapsed_since_unlock_s`, `backfilled` | none (L697) |
| `save_migrated` | `migration:"breeds_sanitise"`, `from:6`, `to:6`, `reason` `'invalid_root'`\|`'invalid_values'`, `refund_cents`, `farm_level`, `backup_stores:[]` | none (L698) |
| `offline_grant` +`away_bp`; `session_end` + the breed fields and `present_active_s` / `present_lost_count` | as in L699-705; absent with the flag off | none |
- **Enums (L694):** `breed_id` ∈ `leghorn`, `sussex`, `orpington`, `rhode_island_red`, `brahma`, `ayam_cemani`, `cochin`, `cream_legbar`. `rarity` ∈ `Common`\|`Rare`\|`Epic`\|`Legendary`. Unknown ids are never emitted.

## 6. ACs QA grades that touch the UI (spec §11; gate Card #3 L120-177, read-only)
- [ ] **BR-AC3 / BRD-AC3** (L768 / L131): no entry at F9; at F10 the entry is in the header with 3 tabs and 1 slot; F14 gives 2 and F20 gives 3; docked Close/Esc restores Market.
- [ ] **BR-AC3b** (L767): highlight sequencing and fallback; the highlight never repeats once the sheet has been opened.
- [ ] **BR-AC4 / 4b** (L769-770): a move nulls the source slot on the next frame; settling lasts 300 s.
- [ ] **BR-AC5 / 7** (L773, L775): the free Common costs 0¢; at cost − 1¢, nothing is charged and nothing starts.
- [ ] **BR-AC10 / 11** (L778-779): the "More breeds at Farm 14" copy; "Flock complete" after 24 hatches.
- [ ] **BR-AC31 / BRD-AC4** (L917 / L132): Hatch label and aria name; "Ready in 1:00" only; silhouette at 0.55.
- [ ] **BR-AC31a / 31b** (L905-906): "Hatch · Free"; unaffordable is dimmed with no lock and no ETA.
- [ ] **BR-AC31c / 31e** (L907-915): note boundaries at 90 s (shows) and 91 s (doesn't); the `eggfarmQa.breeds.hatchEstimate` iff cases in $/s.
- [ ] **BR-AC32** (L918): reveal ≤ 400 ms; reduced-motion crossfade; static settling ring.
- [ ] **BR-AC33 / 34 / 35** (L920-922): inline ids are unique; y47 feet; greyscale 9/9.
- [ ] **BR-AC49 / 50** (L815-821): the phone sheet holds focus and the docked overlay runs; after a reload the chip is active with no pop.
- [ ] **BR-AC52 / 52b / 52c = BRD-AC7b-g** (L827-855 / L137-156): chip format, states, a11y names, the 2-pop script and the tooltip.
- [ ] **BR-AC23b / 23c / BRD-AC6** (L900-901 / L134): strip target; byte-identical to BB-5 with the flag off or the flock complete.
- [ ] **BR-AC25** (L925): an offline reveal shows after the welcome-back modal. **BR-AC27** (L930-938): telemetry event counts for a scripted UI session.
- [ ] **BRD-AC1** (L129): no Flock entry with the flag off. **BRD-UI1** (L159-161): screenshots at 360×640, 390×844 and 1280×800 in 3 engines match v0.2.7 for the entry, the sheet (affordable, unaffordable, incubating), the album and the badge.
- Other gate rows that cite breeds: L16 (Art f349f29f), L659 (§8 L689-700), L747, L760-761, and L772. L772 cites §8 "L693-694" for `breed_revealed`/`breed_slotted`; at 3.8.9 those rows are L695-696 (OQ-7).

## 7. Open code drifts the UI depends on (drift audit `drift-audit-rc-v5-f20b9183-20261110.md`)
- [ ] **D2 Major** (audit L100-109): a null breeds root kills the feature for that save; an array or primitive root throws on **every frame**. The UI can't be tested on such saves until this is fixed.
- [ ] **D1 Major** (L91-99): the `save_migrated` shape fails the schema. **D6 Minor** (L130-135): the schema's `rarity` enum is C/R/E/L, and the emitter must map to the spec strings.
- [ ] **D3 Minor** (L110-118): a missing `freeHatchUsed` reads as 1, so "Hatch · Free" is wrongly hidden. **D4 Minor** (L119-123): an unknown id in a locked slot is kept raw. **D5 Minor** (L124-129): no `1000 % tickHz` guard, which the timer math relies on.
- [ ] **Unbuilt** (audit rows 32-34 L61-63): the traits (the chip needs Present) and the breeds emitters. `actions.ts:115-116` calls `startHatch`/`placeBreed` with no event sink.

## 8. Open questions for PMC (the spec is silent; I'll answer or route to Art/HoP)
- **OQ-1** Album layout and interactions (grid, star display, what a tap on an owned breed does) aren't in the spec. Use UI doc v0.2.7 (L299, L445)?
- **OQ-2** Locked slots below F14/F20: hidden, or shown locked with an unlock level? The spec gives only the counts (L302) and says `.lock` means level-locked (L906).
- **OQ-3** While incubating, what are the Hatch button's label and the timer format? "Ready in m:ss" is named at L538, but m:ss rounding (ceil or floor of `remainingMs`) and the disabled label aren't specified. The same rounding question applies to "Settling m:ss" (L304).
- **OQ-4** Pity: is any pity indicator shown? None is specified (L344).
- **OQ-5** The online reveal card when the Flock sheet is closed: where does it show, and how is it dismissed? L347 says only "one reveal card". Also, on a hidden ≥ 60 s return with no welcome-back modal, when is `pendingReveal` shown (L547)?
- **OQ-6** The slot-assignment gesture (tap-to-pick, drag, how to remove to empty) isn't specified. BR-R3 (L303) gives only the rules.
- **OQ-7** The gate L772 cite is stale (L693-694 → L695-696). This is HoP's to re-cite; I won't edit the gate.
- **OQ-8** BR-AC23b/BR-BB4 needs BBv2 (#100, unmerged; ship-set L19 bestBuyV2 = 1). Until #100 merges, the strip leg can't be built or tested (L539).
