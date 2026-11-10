# Broody yard UI build checklist (M5.0 B1 nest) · PMC · 2026-11-10 01:10 CET
**Sources (sha1 on disk):** broody spec `product/collection/m5-broody-hen-spec.md` v1.3.2 `f180c3ff2535088e7d748fff4947fe9de56e70ee` (`L###` = that file). Art `art-ux/m5-broody-hen-art.md` header v0.1 / signed v0.2 `4169c17b664c656912c3c07f066bf88fa986d6bd` (gate Card #8 L186: header cosmetic). Gate Card #8 L179–220 `product/m5-gate-acs.md` `e485f7624b9760a0b8a54b2472dd2b955b20077e`. Breeds BR-AC34 `product/m5.1-breeds-spec.md` rev 3.8.9 `ea922eb8574740f15c1998cf534689d1259c12a7` L392, L921. Wireframes `art-ux/wireframes/m5-broody-{360x640,1280x800}.{svg,png}` sha1s `3d5b44fb` / `a3e031b3` / `e1cd6c1a` / `971de065`. **Flag:** `balance.m4.flags.broody` (R14b L149), default 0; ships **1** (D-CEO-20261110-07: Broody yard UI build approved; merges after freeze, before RC verdict; built after `gen/breeds-telemetry`). Also D-CEO-20261030-09/-10 / gate L180. Task: HoP Broody-yard UI checklist (Generalist sizing). Scope changes → HoP; design Qs → PMC. UI reads sim only (no invent).

## 1. Layers / surfaces and states
Layers back→front inside the yard slot (Art §3 L36; all `pointer-events:none`): `glow` (CSS) → `ring` (CSS) → nest `back` → coins → hen sprite → nest `front`. Tap button lives in the golden-egg **overlay** layer, positioned from the live slot `<img>` rect (R3 L55; Art §1 L9).

| State | Visuals | Tappable | Spec |
|---|---|---|---|
| (none) | not unlocked / no eligible slot: no nest/glow/ring; normal bob | no button | Art §3 L39; R5 L73; BH-AC1 L259 |
| unlock → `brooding` | nest pops in 300 ms `--ease-pop` (200 ms delay after payout) | button present, `pointer-events:none`, `aria-hidden` | Art §3 L40; R11 L120 |
| `brooding` | small nest under hen; coins by fill (`data-fill` 0/<25%, coin-1 ≥25%); **no glow/ring** | no (`pointer-events:none`; tap falls through to Collect) | R11 L120; Art §3 L41; BH-AC5 L271 |
| `ready` | coin-1+2; 60 px yolk glow pulse 1.6 s; **one** 54 px / 2 px ring; wobble 2.4 s | yes; focusable; `stopPropagation()` | R11 L121; Art §3 L42; R12 L127–128 |
| `full` | coin-1..3; glow pulse 3.2 s; **double** ring (62 px); hen still (bob off) | yes | R11 L122; Art §3 L43 |
| `frozen` | current visuals; `animation-play-state:paused`; button `inert` | no | R11 L123; Art §3 L44; BH-AC9 L277 |
| collected | coins clear; nest fade 150 ms → pop at new slot; hen squash 150 ms; feather puff from `full` only | removed, re-created at new slot | Art §3 L45–47; R13–R14 L130–139 |
| reduced motion | no bob/wobble/pulse/fly/puff; glow static .7; ready = solid single ring; full = double; nest swaps instantly | Enter/Space still collect | Art §3 L50; R11 L125; BH-AC17 L303 |
| flag off | no hen, no nest, no layers | — | R14b L149; BH-AC25 L314; BRO-AC1 L191 |

## 2. Assets (where they are; missing = game `public/assets/`)
| Asset | Source on disk | Dest / notes |
|---|---|---|
| **`overlay-broody-nest.svg`** | `art-ux/assets/overlay-broody-nest.svg` sha1 `7de37176b852f3ff92ee339952f7aecd69cb4864` (Art §5 L59–67 FINAL; groups `broody-nest-back`, `broody-coin-1..3`, `broody-nest-front`; viewBox 0 0 56 24 → 56×24 CSS px) | **MISSING from game repo:** not in `public/assets/` on `origin/rc/v5` or any checked branch (HoE). Dest per Art §5: `public/assets/overlay-broody-nest.svg`. Gate L187 FINAL. |
| `overlay-broody-nest@2x.png` | `art-ux/assets/` sha1 `15798919…` | raster companion; SVG is the ship asset |
| mock | `art-ux/mocks/m5-broody-nest-360.png` `2ab63649…` | reference only |
| wireframes | `art-ux/wireframes/m5-broody-{360x640,1280x800}.{svg,png}` | Art §6 L69–72; eligible (green) / ineligible (red) slots |
| SFX `sfx-broody-ready-01`, `sfx-broody-collect-{01,02,03}` (.mp3/.ogg) | `art-ux/assets/sfx/` (on disk) | Art §3 L51; **not** in game `public/assets/audio/` on `rc/v5`. Mute-respecting. Ready is one-shot, never on `restored:true`. |
| Glow / ring / wobble | CSS only (Art §3 L36–43; tokens `--c-yolk`, `--c-text`, `--c-cream`) | no asset |

## 3. Behaviour rules (UI)
- [ ] **One hen, takes a drawn slot** — never an extra sprite; count stays `min(hens[H],12)` (R3 L53–54; Art §1 L7).
- [ ] **Eligible slot (R4 L58–71):** 56×56 CSS px hit box on rest centre; ≥16 px from tap targets/toast; ≥8 px from readouts + viewport; live `getBoundingClientRect` every 500 ms focus + on layout change. UI passes eligible ids; sim picks via `brRng`. Never place outside the yard / on coop / nest / Collect (R5 L73–78).
- [ ] **No eligible:** unmarked, nest accrues invisibly, never lowered (R5 L76–77; BH-AC14 L300).
- [ ] **Rebuild re-apply (R2 L49–50; Art §1 L10; BH-AC20 L306–308):** after every `yard.innerHTML` rebuild (or land #69 m1 build-once), re-apply `.is-broody`, nest, glow, ring, `data-broody-state`; re-position the overlay button on any yard change or resize (R19 L157).
- [ ] **Tap (R12 L127–129):** ready/full only; grace `tc_spawn_grace_ms` 250; keyboard focusable only when ready; aria `"Collect broody hen nest, $X"` (`fmtMoneyAria`); `stopPropagation()` so no Collect / no credited tap (BH-AC27 L316–321).
- [ ] **Feedback (R14 L135–142):** short-money popup `fmtMoneyShort`, clamped 8 px inside screen; no `!`; no popup at 0¢. First-ready toast once/session (R14a L144–147; BH-AC24 L313). Live region "Broody hen ready, $X" once/episode (R11 L126).
- [ ] **Workers never collect** (R10 L113; BH-AC10 L278). Coop Hand walk-past is Art flavour only.
- [ ] **Breeds feet (BR-AC34 L921; L392):** when Brahma/Cochin is the broody hen, nest overlay covers feet (no foot pixels below nest top edge).

## 4. ACs QA grades (yard / UI / a11y / RM / rebuild / flag-off)
| AC | Pass check (one line) | Gate |
|---|---|---|
| **BH-AC1** | no Coop Hand → no `data-broody-state`, nest 0, no broody events | BRO-AC3 L193 |
| **BH-AC2** | first hire → 1 eligible slot `brooding`, nest 0, ≤1 tick | BRO-AC3 L193 |
| **BH-AC4** | tap ready → pay `floor(nest)`, nest 0, hen moves, one `collectible_collected` | BRO-AC4 L194 |
| **BH-AC5** | tap brooding → no nest pay; falls through as Collect | (UI) L271 |
| **BH-AC6** | double/multi touch → exactly one payout | L272 |
| **BH-AC9** | menu 60 s → nest +0, `frozen`, taps inert | BRO-AC5 L195 |
| **BH-AC10** | workers never empty nest | BRO-AC5 L195 |
| **BH-AC13 / 13b** | each matrix viewport: 56×56 + margins; eligible set = Art §2 / §C; ≥1 with ≥5 hens | BRO-AC6 L196 |
| **BH-AC14** | 0 eligible → unmarked, accrues, never lowered; mark within 500 ms when eligible | L300 |
| **BH-AC15** | 200 payouts reproducible; never re-pick same if ≥2; `brRng` isolated | BRO-AC7 L197 |
| **BH-AC16** | popup `+$61.87` / `+$1.2K` / `+$1.2M`; aria exact; ≥8 px inside edges | L302 |
| **BH-AC17** | reduced motion: solid/double ring, Enter collects, live region once | L303 |
| **BH-AC20** | without #69+m1 flag can't enable; after Hens buy, layers + nest value survive 1 frame | BRO-AC2 L192; L210 |
| **BH-AC24** | first-ready toast once/session with 0 collects | L313 |
| **BH-AC25** | flag 0 / `m4.enabled` false → no hen/accrual/events; save bytes unchanged | BRO-AC1 L191 |
| **BH-AC27** | ready tap: 1 payout, coop unchanged, streak/taps unchanged, `stopPropagation` | L316–321 |
| **BRO-UI1** | screenshots 360×844 / 390×844 / 1280×800 ×3 engines match Art + nest SVG + rects §C (6 states) | L199–201 |
| **BR-AC34** part 2 | Brahma/Cochin broody: nest covers feet | breeds L921 |

## 5. Dependencies (sim/save already on `rc/v5`; UI reads only)
- Save/sim fields on `origin/rc/v5`: `broodyNestCents`, `broodyHenIdx` (`src/sim/m5-state.ts`, `src/save/m5-fields.ts`; R20 L160–168). UI does not invent accrual or pick logic.
- #69 yard sprites in rc/v5; **m1 follow-up still open** (gate L210; R2 L48–50) — land before or with this UI.
- Golden-egg overlay framework F6 `ui/overlay.ts`, focus clock, short-money popup, `evRngState` → `brRng` (spec §7 L234–237).
- Tunables from balance: `tc_broody_*`, `tc_spawn_grace_ms` (spec §5 L192–198); never hard-code.
- Build order: after `gen/breeds-telemetry` (HoP); merges post-freeze, pre-RC verdict (D-CEO-20261110-07).

## 6. Open questions (spec silent — do not invent)
- **OQ-1** Spec §11 Q1 L331 still says nest "Still to draw"; Art §5 L59–67 + changelog L82 + gate L187 mark `overlay-broody-nest.svg` FINAL on disk under `art-ux/assets/`. Who copies it (and the SFX) into game `public/assets/` for this PR is not named.
- **OQ-2** R2 L50 allows either #69 m1 "build 12 once" **or** re-apply after every rebuild. Which path this PR takes is not pinned (gate L210: UI owns m1 before broody UI).
- **OQ-3** BR-AC34 part 2 needs Brahma/Cochin yard sprites present. Order vs the Breeds UI PR for that check is not stated in the Broody yard scope.
