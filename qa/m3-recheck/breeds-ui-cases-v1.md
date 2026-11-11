# Breeds UI — QA case set v1 (M5.1 Flock, `m4.flags.breeds` = 1)

TASK hoqa/breeds-ui-cases (owner HoQA 78e99c2d). Write scope: `qa/m3-recheck/breeds-ui-cases-*.md` only. Author: UI/Layout & Gameplay Verification QA (UIQA). Written 2026-11-10 ~00:50 CET (Europe/Belgrade, UTC+1). Due Tue 10 Nov 15:00 CET. Critical path under D-CEO-20261110-02 (`decisions.md` L137–140).
**Case authoring only.** No build, browser or hosted run was made to write this file. No case below has been executed, and none is PASS. **No merge-go from this lane.**

## 0. Source pins (each verified by content on 2026-11-10 ~00:45 CET)
| # | Source | Path | Pin given | Hash method that matched | Rev / date | Lines used |
|---|---|---|---|---|---|---|
| S1 | Art UI spec | `art-ux/m5.1-breeds-ui.md` | sha1 f349f29f | **plain `sha1sum`** = `f349f29f76286983123b77ea0a6b30e40b11a896` (git hash-object would be `aa778400…`; not the pin) | v0.2.7, 2026-10-25 03:41 CET (v0.2.6 SIGNED + text-only amendment) | §1 L5–36, §2 L38–61, §2.1 L63–75, §3 L77–83, §4 L85–95, §5 L97–104, §6 L106–119, §7 L121–139, §7b L141–160, §7a L162–214, §8 UI-BR-1..23 L216–243, v0.2.7 notes L287–296 |
| S2 | Breeds spec | `product/m5.1-breeds-spec.md` | sha1 ea922eb8 | **plain `sha1sum`** = `ea922eb8574740f15c1998cf534689d1259c12a7`; the frozen copy `product/m5.1-breeds-spec.ea922eb8.md` has the same sha1 (git hash-object `7ca323af…`, not the pin) | v0.2 rev. 3.8.9 | BR-R1 L299–301, BR-R2–R4 L302–307, BR-R7/R7b L320–336, BR-R11 L346–348, §4.3b L372–393, BR-R12b(a)/(c) L407–438, BR-R12c L445–473, BR-BB1/BB3/BB4 L526–540, E-table L556–584, §6 L659–681, §7 L683–687, §8 L689–716, ACs §11 L756–938 (exact AC lines in §2 below) |
| S3 | PMC build checklist | `product/collection/breeds-ui-build-checklist.md` | none given ("against breeds 3.8.9 ea922eb8") | Found by search (`breeds` + `checklist` + `ea922eb8`). It cites spec sha1 `ea922eb8…` at L2. Its own plain sha1 = `c9d8b6310e20df918c226a7c6f1821376a077129` (recorded here; there is no pin to match) | PMC, 2026-11-10 00:20 CET | §1 L4–17, §2 L19–33, §3 L35–47, §4 L49–60, §5 L62–71, §6 L73–89, §7 L91–95, §8 OQ-1..8 L97–105 |
| S4 | Gate ACs, Breeds card | `product/m5-gate-acs.md` | e485f7624b9760a0b8a54b2472dd2b955b20077e | **plain `sha1sum` of the working copy** = `e485f7624b9760a0b8a54b2472dd2b955b20077e`. It is **not** a git commit or blob: the studio root is not a git repo, and `git hash-object` of the file is `300e75b0…`. The working copy **is** the pin, so there is no difference to report. Pin of record per D-HOP-2026-11-10-09 (`product/decisions.md` L2475–2478) | 2026-11-10 | Card #3 L120–177 (ship L121, spec L122, Art L127, ACs L128–157, UI check L158–161, AC7 row L162–166, QA L174–177). Other breeds rows: L16, L23, L747, L760–761, L772 |
| S4' | Previous gate pin | `scratch/m5-gate-acs.da3de91c.pre-bg4repin.bak` | da3de91c (old) | plain sha1 = `da3de91cd1dec39c4e1fc290671acabd9a3f720d` | — | **Card #3 (L120–177) is byte-identical** between da3de91c and e485f762 (diff of the card section is empty). The breeds-relevant change is L772 (re-cite §8 L693–694 → L695–696) and L23 (ship-set: bestBuyV2 = 1 REQUIRED) |
| S5 | HoE PR-A/PR-B seams | `engineering/design/breeds-ui-seams.md` | none | plain sha1 = `717ae34eca05c3044a9864a4075ba1d03a40f144` | base rc/v5 f20b9183 | file split L83–90, prefixes L94–105, scope table L129–141, owners L145–147 |
| S6 | Split / owner decisions | `engineering/decisions.md` L641–644 (D-HOE-56 + 00:40/00:42 amendments); `decisions.md` L131–140 (D-CEO-20261110-01/-02) | — | read only | 2026-11-10 | PR-A = Architect, PR-B = Features (HoE 00:42) |
| S7 | Drift audit (context) | `product/collection/drift-audit-rc-v5-f20b9183-20261110.md` | — | plain sha1 `e328cef1…` | 2026-11-10 | rows 28–35 L57–64 |
| S8 | House format | `qa/m3-recheck/a11y-118-fc5fe67.md`, `qa/m3-recheck/abilities-ui-9ee76a0.md` | — | read only | — | probe/guard/axe conventions, flag-0 golden values (a11y-118 L40–45) |

Ship context: the gate says breeds ships at **1** (L121; PMC L2). `src/config/balance.json` on rc/v5 f20b918 still has **every `m4.flags` = 0** (dev defaults; checked in `worktrees/v5-breeds-ui-a`), so every flag-1 case needs the HoQA-authorized flag-on path (see G-2).

## 1. General rules for every case (G-rules)
- **G-1 Screen guard before every measurement, screenshot, AX read or axe run** (the run aborts the case on any guard failure, and the failure is recorded as a guard failure, never as PASS):
  - viewport `innerWidth × innerHeight` = the cell's size; `document.fonts.ready` resolved;
  - the docked state matches the cell: `matchMedia('(min-width:960px) and (orientation:landscape)').matches` is false at 360/375/390/430 and true at 1024×474, 1280×720, 1280×800 (`src/ui/app.ts` L127 on rc/v5);
  - the expected surface is the top one: e.g. Flock sheet open = `[role=dialog][aria-label="Flock"]` visible (phone: in the Upgrades sheet rect; docked: the overlay over the docked column); Upgrades header cases = Upgrades sheet open (phone) or docked panel on screen, with `.tabs [data-tab].active` = the tab the case names; HUD cases = no sheet covering the HUD;
  - no unexpected `#modal-layer.open`, coach card, toast or reveal card (unless the case is about it);
  - the flag value and seeded state read back from the QA handle equal the preconditions (Farm level, coins, breeds save, `freeHatchUsed`).
- **G-2 Build and flag.** QA build only (`npm run build:qa`, dist-qa), which carries the QA handles: `window.eggfarm` (the Game, `src/main.ts` L125, compiled out of release) and `eggfarmQa.breeds.hatchEstimate({defaultPerS, assumeWorkingPerS})` (`src/debug/breeds-qa.ts`, $/s). Flag 1 only through the HoQA-authorized test-only flag-on path (as on the #116 bar: a test-only balance overlay); never edit the ship `balance.json`. Release build is used only for the "hook absent" check (G-6).
- **G-3 Selectors.** Use the spec ids where an AC names them (`#flock-entry`, `#p-flock`, `#hatch-sub`, `#hatch-fs`, `#hatch-basis`, `.pchip`, `#pchip-state`, `.pill.coins`, `#rate`, `#settings`, `.hud.has-pchip`), otherwise the seams testids (`data-testid="breeds-*"`, PR-A `sheet-/slot-/hatch-/album-/reveal-`, PR-B `hud-/strip-/yard-`; seams L94–105). If an id that a UI-BR AC names is missing in the build, that is a finding on the AC, not a selector problem.
- **G-4 Browser discipline.** One engine at a time under `flock` on the browser lock with a 600 s cap, own port (never `:4173`), started only via `/workspace/egg-farm-studio/ops/tools/lane-run.sh uiqa-breeds -- <cmd>`, stopped only via `lane-kill.sh uiqa-breeds <recorded pid>`. Chromium first. Firefox and WebKit only for the cells an AC names (BRD-UI1, UI-BR-10, UI-BR-16, UI-BR-22, BR-AC52c).
- **G-5 Measurement conventions.** Rects are `getBoundingClientRect()` in CSS px, tolerance as the AC says (±0.5 for sizes, ±1 for positions where UI-BR-1/15 say so). "Fits" = `scrollWidth ≤ clientWidth` (and `scrollHeight ≤ clientHeight` for one-line labels) on the element and on each text-bearing child. Tap targets = the hit area (incl. `::before`) ≥ 44×44. "No overlap" = pairwise rect intersection area 0 between interactive controls and between a control and the HUD/queue/nav/sheet header controls. Each FAIL quotes the raw numbers.
- **G-6 Flag-0 parity** runs on every PR (BR-UI-01).
- **G-7 Evidence.** Per case: guard JSON, measurements JSON, AX snapshot (Playwright `accessibility.snapshot` / ariaSnapshot + CDP role/name/description sources), axe JSON (pinned axe-core 4.14.0, `artifacts/v5-ui/tools/axe-core-4.14.0/axe.min.js` sha256 20c09fe1…), screenshots named `<engine>-<WxH>-<case>-<state>.png`, telemetry export JSON (`eggfarmExportTelemetry`) where a case needs it, all in a SHA256SUMS.

## 2. AC inventory and traceability
**Tier G = gate card Breeds rows (S4).** **Tier S = spec ACs the gate card or PMC §6 references with a UI-observable leg (S2).** **Tier A = Art UI ACs (S1 §8).** Every AC maps to ≥ 1 case, and every case maps to ≥ 1 AC (case index in §4).

| AC | Source line | UI-gradeable? | Case(s) | PR |
|---|---|---|---|---|
| BRD-AC1 | S4 L129 | UI leg: "no Flock entry" at flag 0; traces/AC7 = sim | BR-UI-01 | both |
| BRD-AC2 | S4 L130 | **No** (sim traces / AC7 hashes, `s.rng`) | — (not UI; Saves/sim) | — |
| BRD-AC3 | S4 L131 | yes | BR-UI-02, BR-UI-03 | PR-A |
| BRD-AC4 | S4 L132 | yes (label + aria; BR-AC31e iff on the hook) | BR-UI-10, BR-UI-15, BR-UI-34 | PR-A (34 = both) |
| BRD-AC5 | S4 L133 | **No** (sim seeds 1–20) | — (UI-BR-12 is the UI half: BR-UI-23) | — |
| BRD-AC6 | S4 L134 | yes (strip byte-identity, no ★ on hatches) | BR-UI-36, BR-UI-20 | PR-B (20 = PR-A) |
| BRD-AC7a | S4 L136 | **No** (sim/CI: tap ring, detector, goldens) | flag-0 goldens recorded in BR-UI-01 as a check, not a grade of 7a | — |
| BRD-AC7b | S4 L137 | yes | BR-UI-26 | PR-B |
| BRD-AC7c | S4 L138–141 | yes | BR-UI-27 | PR-B |
| BRD-AC7d | S4 L142–146 | yes | BR-UI-28 | PR-B |
| BRD-AC7e | S4 L147 | yes | BR-UI-29 | PR-B |
| BRD-AC7f | S4 L148–152 | yes | BR-UI-30 | both |
| BRD-AC7g | S4 L153–156 | yes | BR-UI-31, BR-UI-33 | PR-B |
| BRD-UI1 | S4 L158–161 | yes | BR-UI-39 (+ flag-off leg in BR-UI-01) | both |
| AC7 row | S4 L162–166 | **No** (Econ/X1/K10) | — | — |
| BR-AC3 | S2 L768 | yes | BR-UI-02, BR-UI-03, BR-UI-06, BR-UI-07 | PR-A |
| BR-AC3b | S2 L767 | yes | BR-UI-04, BR-UI-05, BR-UI-02 | PR-A |
| BR-AC4 | S2 L769 | UI leg (slot cards on the next frame) | BR-UI-17 | PR-A |
| BR-AC4b | S2 L770 | UI leg (settling label/ring 300 s; hidden 50 s counts) | BR-UI-18 | PR-A |
| BR-AC5 | S2 L773 | UI leg (Free press: 0¢ charged, `freeHatchUsed` 1) | BR-UI-09 | PR-A |
| BR-AC7 | S2 L775 | UI leg (press at cost − 1¢ does nothing) | BR-UI-11 | PR-A |
| BR-AC10 | S2 L778 | UI leg (copy "More breeds at Farm 14") | BR-UI-13 | PR-A |
| BR-AC11 | S2 L779 | UI leg (copy "Flock complete"; `flock_complete` once) | BR-UI-13, BR-UI-37 | PR-A (37 = both) |
| BR-AC23b | S2 L900 | yes, **but needs BBv2 (#100, flip HELD)** | BR-UI-36 | PR-B |
| BR-AC23c | S2 L901 | yes | BR-UI-36, BR-UI-01 | PR-B (01 = both) |
| BR-AC25 | S2 L925 | UI leg (reveal after welcome-back closes) | BR-UI-22 | PR-A |
| BR-AC27 | S2 L930–938 | T-sub, observed via the telemetry export | BR-UI-37 | both |
| BR-AC31 | S2 L917 | yes | BR-UI-10, BR-UI-12, BR-UI-19, BR-UI-20 | PR-A |
| BR-AC31a | S2 L905 | yes | BR-UI-09 | PR-A |
| BR-AC31b | S2 L906 | yes | BR-UI-11 | PR-A |
| BR-AC31c | S2 L907 | yes | BR-UI-14 | PR-A |
| BR-AC31e | S2 L908–915 | yes (hook) | BR-UI-15 | PR-A |
| BR-AC32 | S2 L918 | yes | BR-UI-18, BR-UI-21 | PR-A |
| BR-AC33 | S2 L920 | yes | BR-UI-24 | PR-A |
| BR-AC34 | S2 L921 | yes (yard) | BR-UI-25 | PR-B |
| BR-AC35 | S2 L922 | automated IoU part yes; **human 9/9 match no** (reviewer task) | BR-UI-24 | PR-A |
| BR-AC49 | S2 L815–820 | UI leg (chip state across hidden/menu/phone sheet/docked) | BR-UI-32 | both |
| BR-AC50 | S2 L821 | UI leg (after reload chip active, no pop) | BR-UI-32 | both |
| BR-AC52 | S2 L827–835 | yes | BR-UI-26, -27, -28, -29, -31 | PR-B |
| BR-AC52b | S2 L836–843 | yes (`page.clock`) | BR-UI-30 | both |
| BR-AC52c | S2 L844–855 | yes | BR-UI-34, BR-UI-35 | both |
| BR-AC53 | S2 L856–862 | T-sub, observed via the telemetry export | BR-UI-38 | PR-B |
| UI-BR-1 | S1 L217 | yes | BR-UI-02, BR-UI-01 | PR-A (01 = both) |
| UI-BR-2 | S1 L218 | yes | BR-UI-04 | PR-A |
| UI-BR-2b | S1 L219 | yes | BR-UI-05 | PR-A |
| UI-BR-3 | S1 L220 | yes | BR-UI-06, BR-UI-07 | PR-A |
| UI-BR-4 | S1 L221 | yes | BR-UI-10 | PR-A |
| UI-BR-4b | S1 L222 | yes | BR-UI-09 | PR-A |
| UI-BR-4c | S1 L223 | yes | BR-UI-11 | PR-A |
| UI-BR-5 | S1 L224 | yes | BR-UI-12 | PR-A |
| UI-BR-6 | S1 L225 | yes | BR-UI-18 | PR-A |
| UI-BR-7 | S1 L226 | yes | BR-UI-20 | PR-A |
| UI-BR-8 | S1 L227 | yes | BR-UI-21 | PR-A |
| UI-BR-9 | S1 L228 | yes | BR-UI-22 | PR-A |
| UI-BR-10 | S1 L229 | yes (3 engines) | BR-UI-16 | PR-A |
| UI-BR-11 | S1 L230 | yes | BR-UI-35 | both |
| UI-BR-12 | S1 L243 | yes | BR-UI-23, BR-UI-33 | PR-A (33 = PR-B) |
| UI-BR-13 | S1 L231 | yes | BR-UI-07 | PR-A |
| UI-BR-14 | S1 L232 | yes | BR-UI-19 | PR-A |
| UI-BR-15 | S1 L233–234 | yes | BR-UI-08 | PR-A |
| UI-BR-16 | S1 L235 | yes (3 engines) | BR-UI-26 | PR-B |
| UI-BR-17 | S1 L236 | yes | BR-UI-27 | PR-B |
| UI-BR-18 | S1 L237 | yes | BR-UI-28, BR-UI-33 | PR-B |
| UI-BR-19 | S1 L238 | yes | BR-UI-30 | both |
| UI-BR-20 | S1 L239 | yes | BR-UI-27, BR-UI-29 | PR-B |
| UI-BR-21 | S1 L240 | yes | BR-UI-31 | PR-B |
| UI-BR-22 | S1 L241 | yes (3 engines) | BR-UI-14 | PR-A |
| UI-BR-23 | S1 L242 | yes | BR-UI-34 | both |

**Coverage (UI-gradeable ACs): 64 / 64 covered** (Tier G 11/11: BRD-AC1, AC3, AC4, AC6, AC7b–7g, UI1; Tier S 27/27; Tier A 26/26). The inventory has 68 rows: these 64 plus the 4 non-UI gate rows (BRD-AC2, BRD-AC5, BRD-AC7a, the AC7 row). No orphan AC and no orphan case (all 39 cases trace to ≥ 1 AC). D-CEO-20261110-01's "~20 UI ACs" matches the gate card's 11 UI rows plus the spec [UI] ACs; the Art UI-BR set adds the measurement detail.
**Per PR tag (by AC; the tag is the PR that builds the surface; "both" = the AC needs surfaces from both PRs):** PR-A **37**, PR-B **16**, both **11** (= 64). By case: PR-A 23, PR-B 9, both 7 (= 39). Detail in §5.
**Not testable in the UI, with reason:**
- BRD-AC2, BRD-AC5, BRD-AC7a, the AC7 row: sim/CI/Econ harness rows (seed traces, AC7 hashes, K10). UI QA does not grade them; BR-UI-01 only records that the flag-0 golden tests pass at the PR head.
- BR-AC35, reviewer half: "a reviewer matches every unlabelled greyscale sprite … 9/9" needs a human reviewer. BR-UI-24 runs the automated IoU half and produces the 9-sprite greyscale sheet for the reviewer.
- **Conditionally blocked (testable in principle, dependency not in either PR):** BR-AC23b needs BBv2 (#100, flip HELD at flag 0; PMC OQ-8). BR-AC27 / BR-AC53 need the breeds telemetry emitters and the Present rate gate (drift audit rows 32 and 34: "NOT-FOUND (unbuilt)"); BRD-AC7d/e/f, BR-AC52 pending/return, BR-AC52b, UI-BR-18/19 need the Present rate gate in the sim (no `presentOpen`/tap ring on rc/v5 f20b918), and the seams doc forbids PR-A/PR-B from editing `src/sim` (S5 L79). These cases are written and will run; if the dependency is absent at the PR head they are recorded **BLOCKED (dependency)**, not PASS and not FAIL.

## 3. Size matrix and shared preconditions
- **Phone:** 360×640 (primary), 390×844 (gate BRD-UI1, Art rects); 375×667 only where UI-BR-16 names it.
- **Docked (studio desktop docked sizes):** 1280×800 (gate/Art rects), 1280×720 (studio QA standard size; no Art rect table exists for it, so rects there are checked for fit/overlap/44px/no-overflow only, not against a table), 1024×474 (Art docked-compact).
- **Default precondition P0** (every case unless it says otherwise): QA build of the PR head (G-2), `m4.flags.breeds` = 1 via the authorized flag-on path, other M5 flags at the RC ship values (gate L23: all M5 flags 1, `bestBuyV2` 1, `m4.zeroGain.confirm` 0) where the authorized path allows, else recorded as-built; fresh profile; state seeded through `window.eggfarm`; sim frozen for static measurements, `page.clock` for timed ones; reduced motion off unless stated; G-1 guard passes.
- **Seed shorthands:** F*n* = Farm level n; "settled P@312" = Leghorn 1★ (312 bp, S2 L355) in slot 0 with `settleMs[0]` = 0; "settled P@1312" / "P@1500" = a seed whose applied Present bp is exactly 1312 / 1500 (1500 = the F18+ clamp with ≥ 1500 bp slotted, S2 L366; if no roster loadout gives exactly 1312, a QA-handle seed of the applied value, recorded as such); F28 cost 12,508,785¢ (S2 L774).

## 4. Cases

### A. Flag-0 parity
**BR-UI-01 · Flag 0: no Breeds UI anywhere; flag-0 goldens unchanged** · AC: BRD-AC1 (UI leg), BRD-UI1 (flag-off leg, S4 L161), UI-BR-1 (flag-off leg), BR-AC23c (flag-off leg), BR-AC27 (flag-off bullet L937), BR-AC53 (flag-off bullet L860) · **PR: both** (run on each PR head)
- Pre: QA build, `m4.flags.breeds` = 0 (all other flags as in the current flag-0 golden config); seeded F10, F20 and F28 states; one save that already contains a `breeds` object (owned Leghorn 1★ in slot 0, incubator with `remainingMs` 30,000).
- Steps: (1) local `vitest` flag-0 golden tests at the head (same files as a11y-118 L40–45). (2) At 360×640 open Upgrades (each tab), at 1280×800/1280×720/1024×474 read the docked header. (3) DOM scan for any Breeds node: `#flock-entry`, `[data-testid^="breeds-"]`, `.pchip`, `#p-flock`, any `char-breed-*.svg`, text "Flock"/"Hatch". (4) Measure the Upgrades header, tabs, `#scene`, `#goal`, `#collect`, streak row, HUD rects. (5) Run 120 s (`page.clock`), export telemetry, then a reload; re-export the save.
- Expected: 0 Breeds nodes at all 4 cells; header/tab/farm-column/HUD rects equal the base (rc/v5 at the PR's merge base, same build mode) ±0.5; Best-buy strip text/target/★ byte-identical to base on the same seeded states; telemetry: 0 `hatch_started`/`breed_*`/`flock_complete` events and no breed key on `session_end` (incl. `present_active_s`, `present_lost_count`); the `breeds` save object round-trips byte-identical (E11 L568); flag-0 golden values = the known values (GOLDEN1 flag-off `f90d1678…`, GOLDEN1 m4-on `a54c9cf9…`, ZG-FLAGOFF-DOM `9c4b6439…`, GOLDEN2 ×4) unless HoE re-pins them, in which case the re-pinned values.
- Evidence: vitest log, base-vs-head rect JSON, DOM scan JSON, telemetry export, save before/after sha256, 4 screenshots.

### B. Entry point and sheet (PR-A)
**BR-UI-02 · Flock entry: F9 none, F10 present, rects at 4 sizes, 3 tabs, farm column unmoved** · AC: BRD-AC3, BR-AC3, BR-AC3b (44 px, 0 px move), UI-BR-1 · **PR-A**
- Pre: P0; F9 state, then F10 state (`bc_unlock_farm` 10, S2 L633); Refill pill hidden (docked).
- Steps: at 360×640, 390×844, 1280×800, 1024×474 (+1280×720 fit-only): open Upgrades (phone) / show the docked panel; G-1; read `#flock-entry` (or `[data-testid="breeds-entry"]`) rect, computed height, the tablist; measure `#scene`, `#goal`, `#collect`, streak row with and without the entry (toggle F9↔F10 in the same session); label fit; focus ring box.
- Expected: F9 → no entry, header rects = RC. F10 → entry in the Upgrades header, not a tab; tablist has exactly 3 tabs (Collection · Farm · Workers); height 44 ±0.5; rect within ±1 of S1 L19–22: 360×640 **200,168 100×44**; 390×844 **230,219 100×44**; 1280×800 **1164,436 100×44**; 1024×474 **908,273 100×44**; label "Flock" (Fredoka 16/700), icon `char-chicken.svg` with `alt=""`; `aria-haspopup="dialog"`; scene/#goal/Collect/streak-row rects identical with/without the entry; label `scrollWidth ≤ clientWidth`; entry does not overlap h2 or Close (gap 8 px to Close on phone); 3 px focus ring + 2 px offset inside the 56 px header (S1 L36). 1280×720: fits, 44 tall, no overlap, no header overflow.
- Evidence: rect JSON per size, tablist AX, 8 screenshots (F9/F10 × 4).

**BR-UI-03 · Slot count 1/2/3 at F10/F14/F20; locked placeholders** · AC: BRD-AC3, BR-AC3 · **PR-A**
- Pre: P0; F10, F13, F14, F19, F20 states.
- Steps: open the Flock sheet at 360×640 and 1280×800; count unlocked slot buttons; read locked placeholders; try to focus/click a locked placeholder.
- Expected: unlocked = 1 (F10, F13), 2 (F14, F19), 3 (F20); locked placeholders read "Slot 2 · Farm 14" / "Slot 3 · Farm 20" (S1 L53), 2 px dashed `--c-slot-outline` #6B5D52 (v0.2.7 DB-1 L291), not focusable, not a button, `🔒︎` glyph (if any) `aria-hidden`; a click on a locked placeholder changes nothing; slots never shrink across a reload.
- Evidence: AX snapshot of the slots group, screenshots per level, click result JSON.

**BR-UI-04 · New-feature highlight sequencing (calls coach first)** · AC: BR-AC3b, UI-BR-2 · **PR-A**
- Pre: P0 with `m4.flags.abilities` = 1; F10 just reached, `abilitiesCoachSeen` false, `flockHintSeen` false.
- Steps: open Upgrades → observe the entry for 3 s; dismiss the Shift-calls coach with "Got it"; close and reopen Upgrades; record `box-shadow` frames (rAF sampling) and the dot; reload; reopen; open the Flock sheet; reload; reopen Upgrades. Repeat the glow step with reduced motion on.
- Expected: before "Got it": no glow, no dot, entry usable (click opens the sheet in a separate run). After "Got it", next Upgrades open: exactly 2 glows within ≤ 1.2 s, then a static 12 px `--c-barn` dot top-right; dot persists across reload until the sheet opens; after the sheet opens, `flockHintSeen` = true and no glow/dot ever again (incl. after reload). Reduced motion: a static 4 px outline for 1.2 s, then the dot, no animation. Flock never sets the Upgrades nav dot or ★ (S1 L104). Variant: intro dismissed before F10 → highlight on the first Upgrades open at F10.
- Evidence: frame-sampled box-shadow log, `getAnimations()` log, screenshots of glow/dot/seen.

**BR-UI-05 · Highlight fallback at the next session** · AC: UI-BR-2b, BR-AC3b · **PR-A**
- Pre: as BR-UI-04; F10 first reached in session N (`abilities_unlocked` emitted in N).
- Steps: reload within session N → open Upgrades; then start session N+1 (session boundary as the build defines it, e.g. `flags.sessions` +1) with `abilitiesCoachSeen` still false → open Upgrades; open Workers tab.
- Expected: reload within N: no highlight. N+1: first time the entry is visible → 2 glows + dot (as UI-BR-2); `abilitiesCoachSeen` stays false; the calls coach card is still shown in the Workers tab.
- Evidence: state JSON per step, screenshots.

**BR-UI-06 · Phone Flock sheet: rect, header, exits, focus order, Hatch above the fold** · AC: UI-BR-3, BR-AC3 · **PR-A**
- Pre: P0; F20 (3 slots, mixed album).
- Steps: at 360×640 and 390×844 open Upgrades → tap Flock; G-1; measure the sheet, header controls; keyboard Tab through the sheet; press ‹, reopen, press Close, reopen, press Esc, reopen, tap the scrim.
- Expected: `#p-flock` `role="dialog"` `aria-label="Flock"` replaces the Upgrades sheet in place with the same rect (360×640: 0,160 360×480; 390×844: 0,211 390×633); header 56 with ‹ (44×44, `aria-label="Back to Upgrades"`), `h2` "Flock", Close 44×44; Hatch bottom above the sheet's visible bottom (Hatch bottom = sheet y 188 at 360, S1 L45); body order Incubator → Slots → Active totals → Album; focus order ‹ → Close → Hatch → slots L→R → album row-major (S1 L139); ‹ returns to Upgrades; Close/Esc/scrim close it; focus returns to `#flock-entry`; no horizontal scroll (`scrollWidth ≤ clientWidth` on the sheet body).
- Evidence: rect JSON, focus-order log, screenshots.

**BR-UI-07 · Docked Flock overlay: covers docked column, Close/Esc, focus return, sales keep running** · AC: UI-BR-13, UI-BR-3, BR-AC3, BR-AC49 (docked leg) · **PR-A**
- Pre: P0; F20; ≥ 3 customers queued, a Market Hand hired and working; fixed seed.
- Steps: at 1280×800, 1024×474 (and 1280×720 fit-only) open the overlay from the docked header; measure; leave open 30 s (`page.clock`); count sales and coins; close with Close; reopen; close with Esc; compare with a 30 s control run with the overlay closed on the same seed.
- Expected: overlay rect 880,56 400×744 (1280×800) and 624,56 400×418 (1024×474) ±1; Close ≥ 44×44 at 1228,62 / 972,62 (`aria-label="Close"`); Market panel still mounted underneath (node present, not removed); farm-column rects unchanged; same sale count ±0 and same coins credited as the control; Close and Esc restore Market + Upgrades; focus returns to `#flock-entry`; focusClock keeps advancing while open (docked overlay is not a menu, S2 L435).
- Evidence: rect JSON, sale-count JSON (open vs control), DOM presence log, screenshots.

**BR-UI-08 · Icon-only Flock entry while the docked Refill pill shows** · AC: UI-BR-15 · **PR-A**
- Pre: P0 with `rc2Refill` = 1 and a state where the docked Upgrades-header Refill pill ("Refill 3 tired workers") is visible.
- Steps: at 1280×800 and 1024×474: G-1; measure the entry, pill, gap, header overflow, tabs; read the entry's AX name; hide the pill (refill the workers) and measure on the same frame.
- Expected: entry 44×44 ±0.5 at 1228,436 / 972,273 ±1, no visible text, `aria-label="Flock"`, AX name exactly "Flock"; pill 1 line, height 44, `scrollWidth ≤ clientWidth`; gap ≥ 8 px; header `scrollWidth ≤ clientWidth`; tabs rects = RC. When the pill hides, the full 100×44 "Flock" button returns on the same frame at the BR-UI-02 rects.
- Evidence: rect JSON both states, AX names, screenshots.

### C. Hatch control (PR-A)
**BR-UI-09 · Free first hatch** · AC: BR-AC31a, UI-BR-4b, BR-AC5 (UI leg) · **PR-A**
- Pre: P0; F10, `freeHatchUsed` 0, coins 0 (and again with coins ≥ cost).
- Steps: open the sheet; read label, state, sub-line, describedby; press Hatch; read coins, `freeHatchUsed`, incubator; reload; open the sheet after the reveal.
- Expected: label exactly "Hatch · Free", enabled Primary (not `aria-disabled`), whatever the coins; sub-line exactly "Ready in 1:00"; no basis text needed; press charges 0¢, `freeHatchUsed` = 1, incubator starts; afterwards and after reload the label is `Hatch · ${fmtMoney(cost)}` and "Free" never returns. Album all silhouettes and slot 1 "Empty · Hatch to fill" before the press (S1 L68).
- Evidence: state JSON before/after, AX name, screenshots.

**BR-UI-10 · Affordable Hatch label and accessible name (F10 and F28)** · AC: BRD-AC4 (label), BR-AC31, UI-BR-4 · **PR-A**
- Pre: P0; `freeHatchUsed` 1; F10 with build `planRefCents` giving cost 136,800¢; F28 with cost 12,508,785¢ (S2 L774). QA uses the build's own cost (`hatchCostCents`) and checks the formula.
- Steps: open the sheet at 360×640 and 1280×800; read the visible label, AX name, describedby text, sub-line; scan all visible text in the sheet.
- Expected: label exactly `Hatch · ${fmtMoney(cost)}` → "Hatch · $1,368.00" (F10) and "Hatch · $125.1K" (F28); AX name starts with "Hatch · " and contains `fmtMoneyAria(cost)` ("$125,087.85" at F28); no `aria-label` reorders it; sub-line exactly "Ready in 1:00"; no visible text matches `/income|≈|Affordable in/` and none contains "of income"; describedby (`hatch-sub hatch-basis`, + `hatch-fs` when the note shows) may contain "About 45 seconds of income" (optional, BR-BB3). Hatch 48 px tall, full card width (300 at 360, 338 docked), `nowrap`, label fits.
- Evidence: AX snapshot, text scan JSON, rect JSON, screenshots.

**BR-UI-11 · Unaffordable Hatch = the standard unaffordable Buy state; press does nothing** · AC: BR-AC31b, UI-BR-4c, BR-AC7 (UI leg) · **PR-A**
- Pre: P0; F28, `freeHatchUsed` 1, coins = cost − 1¢; an unaffordable track `.buy` on screen in the same build for comparison.
- Steps: open the sheet; read computed background, color, box-shadow, `aria-disabled`, children; compare with the unaffordable `.buy`; press Hatch (click + Enter); then add 1¢ and read on the same frame.
- Expected: `aria-disabled="true"`; computed background, color and box-shadow equal the unaffordable `.buy` (v0.2.7 MT-1: text `--c-muted-strong` #5A4C42 on #CFC6BA, 4.88:1, via the shared rule; grade by equality with `.buy`, not by the superseded `--c-muted` text); no shadow, no `.affordable` glow or pulse, no icon (no `.lock` or glyph inside the button); label and price unchanged; no on-screen ETA; describedby contains "Affordable in about … " + the basis; press → coins unchanged and incubator null; at coins = cost the state flips on the same frame.
- Evidence: computed-style diff JSON, press result JSON, screenshots.

**BR-UI-12 · Hatching state: disabled "Hatching…", countdown, progress meter, silhouette disc** · AC: UI-BR-5, BR-AC31 (incubator silhouette) · **PR-A**
- Pre: P0; F20; hatch just started (`remainingMs` 60,000), `page.clock`.
- Steps: read the button, sub-line, `role="progressbar"` `aria-valuenow`, disc image; advance 18.0 s, 59.0 s, 59.9 s sim time; read each time.
- Expected: button reads "Hatching…" and is disabled; sub-line `Ready in m:ss` ceil seconds ("Ready in 1:00" at start, "Ready in 0:42" at 18.0 s, "Ready in 0:01" at 59.9 s, never "0:00"); `aria-valuenow` = round(100 × (1 − remainingMs/60000)); disc = `char-breed-silhouette.svg` at opacity 0.55; status "Hatching · a surprise breed"; the rolled breed is never shown before the reveal.
- Evidence: per-tick JSON, screenshots at 0/18/59.9 s.

**BR-UI-13 · E5 "More breeds at Farm 14" and "Flock complete"** · AC: BR-AC10 (copy leg), BR-AC11 (copy leg) · **PR-A**
- Pre: P0; (a) F13 with all 3 Commons at 2★; (b) all 8 breeds at 2★ (24 hatches).
- Steps: open the sheet at 360×640 and 1280×800; read the Hatch control, sub-line, describedby; try to press; read slot interactivity; fit check.
- Expected: (a) disabled "More breeds at Farm 14", sub-line "All Commons at 2★", nothing starts, slots work. (b) yolk label pill "Flock complete", not focusable (like `.maxed`), sub-line "All 8 breeds at 2★ · slots still work", nothing starts, no Farm-soon note, slots still work. Both strings fit one line in the 300 px control (`scrollWidth ≤ clientWidth`).
- Evidence: AX snapshot, fit JSON, screenshots.

**BR-UI-14 · Farm-soon note "Needs next Farm upgrade" boundaries and fit** · AC: BR-AC31c, UI-BR-22 · **PR-A**
- Pre: P0; F28, `freeHatchUsed` 1; set the default-income ETA for the next Farm step via `eggfarmQa.breeds.hatchEstimate` (incomes in $/s chosen so `secondsToAffordSteady` = 30, 90, 91 s), plus the F29 61.8 s case, "step affordable now", free hatch, Farm maxed, flock complete.
- Steps: per state open the sheet; count `#hatch-fs` (or `[data-testid="breeds-farmsoon"]`) nodes; read text, font, fit, describedby; press Hatch where the note shows; keep the note visible 10 s and watch for re-creation (MutationObserver) and animations; compare the Best-buy strip and ★ with the note shown vs hidden.
- Expected: note shows (DOM count exactly 1) at 30 s, 90 s, 61.8 s (F29), step affordable now; no note at 91 s, free hatch, Farm maxed, flock complete; text exactly "Needs next Farm upgrade", no ★/"best"/payback/digits; Nunito 700 12 px, 1 line, `scrollWidth ≤ clientWidth` inside the incubator card at 360, 390 and 1280-docked in Chromium/Firefox/WebKit (measured 144.1 px in Art); under `#hatch-sub`; in the Hatch `aria-describedby`; not live; not re-created/re-animated while shown; Hatch stays enabled and a press starts the hatch with no confirm; strip and ★ byte-identical with the note on/off.
- Evidence: per-state JSON (ETAs, count, text), mutation log, fit JSON × 3 engines, screenshots.

**BR-UI-15 · BR-AC31e estimator divergence on `eggfarmQa.breeds.hatchEstimate`** · AC: BRD-AC4 (31e leg), BR-AC31e · **PR-A**
- Pre: P0; F28 not maxed; QA build (hook present: `src/debug/breeds-qa.ts`); a hired worker asleep, then unpaid.
- Steps: (1) Always run the hook cases (default / assumeWorking, ETAs derived from $/s): 85/95, 95/85, 90.0/95, 90.1/85; log both ETAs returned by the hook each time. (2) Natural states: worker asleep, then unpaid; log both ETAs; if no divergence is reachable record "no divergence reachable" with both ETAs. (3) Where the note shows and assumeWorking ETA > 90, press Hatch.
- Expected: note iff default-income ETA ≤ 90 s (2 × `bc_hatch_cost_s`), whatever assumeWorking says: 85/95 → note; 95/85 → no note; 90.0/95 → note; 90.1/85 → no note. Press starts the hatch with no confirm/block (recorded as expected estimator divergence). Note copy/slot/DOM count = BR-UI-14. ★, hint, strip unchanged. Release build: the hook is absent (check-release-build 0 hits).
- Evidence: hook I/O log, per-case DOM JSON, release grep log.

**BR-UI-16 · Big-number and longest-label fit at 360 in 3 engines** · AC: UI-BR-10 · **PR-A**
- Pre: P0; seeded costs giving `Hatch · $999.9Dc` and `Hatch · $1.23e36`; E5 and Flock-complete states; long album names (Rhode Island Red, Cream Legbar, Ayam Cemani); `Slots 1 of 3 · more at Farm 14`; `Album 5 of 8`; Active totals `Active: Lay +15% (max) · Away +30% (max) · Nest +20% (max)` and `Active: none yet · a breed works once it has settled (5:00)`; settling slot `Sussex +15% away · inactive` / `Settling 4:12`.
- Steps: 360×640 in Chromium, then Firefox, then WebKit (one at a time): G-1; for every §6 string, `scrollWidth ≤ clientWidth` and line count.
- Expected: every §6 string on one line, no clip, no ellipsis; album names may wrap to 2 lines, never ellipsis (`text-overflow` none, full text present); all controls keep ≥ 44 px height.
- Evidence: fit JSON × 3 engines, screenshots.

### D. Slots, settling, album, reveal (PR-A)
**BR-UI-17 · Placing, moving and removing a breed** · AC: BR-AC4 (UI leg), S1 §2 placing L56–59 · **PR-A**
- Pre: P0; F20; owned Leghorn (settled), Sussex; Leghorn in slot 0.
- Steps: tap Leghorn's album cell → read "Place here" on unlocked slots; tap slot 2; read slots on the next frame; tap slot 2 → "Remove" appears → tap it; Esc/tap-again cancel paths.
- Expected: selection ring 3 px `--c-focus`; every unlocked slot shows "Place here" (AX name "Place here", description "Slot n"); after placing into slot 2: slot 0 empty and slot 2 = Leghorn on the next frame, settle state kept (no "Settling" restart); Remove empties the slot (44 px hit); cancel paths leave slots unchanged; placing is never a coop/credited tap (counters unchanged).
- Evidence: per-frame slots JSON, AX names, screenshots.

**BR-UI-18 · Settling ring and label** · AC: UI-BR-6, BR-AC32 (settling), BR-AC4b (UI leg) · **PR-A**
- Pre: P0; F20; Sussex owned, not slotted; `page.clock`.
- Steps: place Sussex; read label, `--rem`, `getAnimations()` on the slot subtree; advance 48 s sim; hide the tab 50 s (< 60 s) and show; advance to 299 s and 300 s.
- Expected: "Settling 5:00" and arc at 100% on placement; after 48 s "Settling 4:12" and `--rem` ≈ 0.84 (±1 s); hidden 50 s counts toward settling; label never "0:00"; `getAnimations()` always empty and no infinite CSS animation on the ring; trait line "+15% away · inactive", sprite 60% opacity, no family tag, not counted in Active totals; at 300 s: solid 3 px `--c-meadow-strong` ring, trait `--c-text` 700, family tag shown (150 ms opacity fade, instant under reduced motion), Active totals include the trait, one polite "Sussex settled" announcement.
- Evidence: per-step JSON, animation log, screenshots (5:00, 4:12, 0:01, settled).

**BR-UI-19 · Album cells and silhouette contrast** · AC: BR-AC31 (silhouette), UI-BR-14 · **PR-A**
- Pre: P0; F20; 5 of 8 owned (one slotted, one at 2★).
- Steps: at 360×640 and 1280×800 read the album header, cells, image src/opacity, AX tree; pixel-sample a silhouette pixel vs the cell background.
- Expected: header "Album" + "5 of 8"; 4 columns, cells 76 px (360) / 86 px (docked) wide, min height 100; owned cells: 48 px sprite, name 12/700, 2 star glyphs `aria-hidden`, description "n of 2 stars", "Slot n" when slotted; unowned: `char-breed-silhouette.svg` at opacity 0.55, "???" `aria-hidden`, hidden text "Unknown breed, not hatched yet", dashed 2 px border, not focusable; sampled silhouette vs background ≥ 3:1 (3.33 on white).
- Evidence: AX snapshot, pixel-sample JSON, screenshots.

**BR-UI-20 · No ★, payback or "best" on any Breeds surface** · AC: UI-BR-7, BR-AC31 ("of income"), BRD-AC6 ("hatches never get ★") · **PR-A**
- Pre: P0; states from BR-UI-09..14 and a reveal card.
- Steps: text + AX + `::before/::after` content scan of the sheet and reveal card.
- Expected: no "★" outside the album/reveal star rating, no "payback", no "best", no "of income" in visible text; Flock entry never gets the Upgrades nav dot or ★.
- Evidence: scan JSON.

**BR-UI-21 · Reveal card: size, focus, motion ≤ 400 ms, reduced-motion crossfade** · AC: UI-BR-8, BR-AC32 (reveal) · **PR-A**
- Pre: P0; F20; hatch about to complete online; `page.clock`; once with reduced motion on.
- Steps: complete the hatch; sample animations (`document.getAnimations()`), transforms and opacity per frame for 1 s; read the card rect, focus, copy; press Esc / scrim / "Nice!".
- Expected: 360×640: card 320×371 at 20,135, `role="dialog"`, focus on "Nice!" (276×48); kicker "New breed!" (or "Star up! ★ +1"); trait/placement lines per S1 L87 ("Added to slot n · settling 5:00" or "Not slotted · place it from the album"); crack-to-settled ends ≤ 400 ms after the card appears; no animation after 600 ms; nothing loops; no `#fx-layer` nodes. Reduced motion: no transform animates, only opacity transitions ≤ 200 ms. Esc/scrim/Nice! close it. Never shown over another modal.
- Evidence: animation timeline JSON, screenshots at 0/120/240/400 ms and RM 0/100/200 ms.

**BR-UI-22 · Offline completion: reveal only after the welcome-back modal closes** · AC: UI-BR-9, BR-AC25 (UI leg) · **PR-A**
- Pre: P0; save with an incubating hatch (`remainingMs` 40,000, breed X rolled); `savedAt` 10 min in the past.
- Steps: load; observe the welcome-back modal; check that no reveal card is present; close welcome-back; read the reveal card.
- Expected: welcome-back first; reveal card absent until welcome-back closes, then shows breed X (the one rolled at start); `pendingReveal` consumed once (reload afterwards shows no second card).
- Evidence: DOM timeline, screenshots.

**BR-UI-23 · Taps in the Flock sheet or reveal card are never credited taps** · AC: UI-BR-12 · **PR-A**
- Pre: P0; F20; streak active; `page.clock`.
- Steps: tap every control and empty area in the sheet and reveal card 20 times over 20 s; read streak, focusClock, `credited_taps`, `taps_total` before/after (telemetry export / QA handle).
- Expected: streak, focusClock and credited-tap count unchanged by these taps (phone sheet also holds focusClock as a menu).
- Evidence: counter JSON before/after.

**BR-UI-24 · Sprites: file map, inline ids, greyscale distinctness** · AC: BR-AC33, BR-AC35 (automated half) · **PR-A**
- Pre: P0; all 8 breeds owned and the silhouette visible.
- Steps: list every breed `<img>`/`<svg>` source; check `char-breed-${id.replaceAll('_','-')}.svg` mapping; if any SVG is inlined, check `document.querySelectorAll('[id]')` duplicates and `url(#…)` targets; sha256 each vendored `public/assets/char-breed-*.svg` vs `art-ux/assets/`; render the 9 sprites in greyscale at 1×/2× and compute pairwise alpha-mask IoU.
- Expected: mapping correct for all 8 (+ silhouette); `<img>` use → BR-AC33 passes as is; inlined → no duplicate ids and each clip path renders on its own sprite; vendored files byte-identical to Art's; IoU < 0.95 for every pair. The reviewer 9/9 match is handed to a human (not graded here).
- Evidence: source map JSON, id scan, sha256 table, IoU matrix, greyscale sheet PNG.

### E. Present HUD chip, strip, yard (PR-B)
Common pre for E: P0 plus a settled Present loadout (≥ 1 settled Present breed slotted); counted taps driven by real Collect taps (credited ≤ 1 per sim second) under `page.clock` with wall time = focus time (tab visible, no menu). **Dependency:** the Present rate gate (BR-R12b; W 10 / k 6) must exist in the sim at the PR head. If it doesn't, BR-UI-28..32 and -38 are BLOCKED (dependency).

**BR-UI-25 · Yard: Brahma and Cochin feet and Broody overlay** · AC: BR-AC34 · **PR-B**
- Pre: P0; Brahma and Cochin rendered in yard slots (seams: `breeds-yard`); Cochin as the Broody Hen in the broody state.
- Steps: read sprite bounding boxes in the 48×48 box, slot centre/contact, overlay coverage (pixel scan below the nest top edge).
- Expected: boxes reach y47 without clipping; slot centre x24 and contact y42 identical to the default hen; no foot pixel visible below the nest's top edge in the broody state.
- Evidence: bbox JSON, pixel scan, 2× crops.

**BR-UI-26 · Chip presence, placement and HUD fit** · AC: BRD-AC7b, UI-BR-16, BR-AC52 ("no chip") · **PR-B**
- Pre: E pre; and a no-Present state (Away only; Present settling only).
- Steps: at 360×640, 375×667, 390×844, 1280×800, 1024×474 (+1280×720 fit-only): G-1 (HUD not covered); measure `.pchip`, `#rate`, `.pill.coins`, basket pill, `#settings`, HUD, `#goal`, Collect, scene, meter, queue, nav with and without the chip; at 360/375/390 seed coins `$1,234.06` + rate `⚠︎ ▼ −$0.25/s` and `−$999.99/s` + label `+15%` in Chromium, Firefox, WebKit.
- Expected: no settled Present breed → no `.pchip` in the DOM and no `.has-pchip` (also with Present only settling); with ≥ 1 settled Present: `.pchip` inside `.pill.coins` on the rate row, 4 ±0.5 px right of `#rate`; chip 14 px tall, 33.6 wide for `+3%`, 40.2 for two digits; HUD/#goal/Collect/scene/meter/queue/nav rects identical ±0.5 with and without the chip; `.hud.has-pchip` applies `#settings{flex:none}` and the spacer gap collapse; `#settings` 44×44 at 360/375/390 in all 3 engines with no basket clip (`scrollWidth ≤ clientWidth`); chip ≥ 4 px inside the coins pill; k = 0 → never pending.
- Evidence: rect JSON per size/engine, screenshots.

**BR-UI-27 · Active chip: format, border, name, description** · AC: BRD-AC7c, BR-AC52 (format/active), UI-BR-17, UI-BR-20 · **PR-B**
- Pre: E pre at 312 bp, then 1312 bp, then 1500 bp; gate open.
- Steps: read visible label, border style, attributes, AX name (Chromium AX tree + Playwright snapshot), describedby target text, Flock panel value; repeat at 360 and docked 1280.
- Expected: HUD label exactly `+3%` / `+13%` / `+15%` (floor, no decimal point); Flock panel shows `+3.12%` at 312 bp; solid `--c-meadow-strong` border; no `aria-label` and no `aria-labelledby`; `.sr` text exactly " active"; AX name exactly "+3% active"; `#pchip-state` text exactly "Breed bonus +3.12% active"; `role="button"`, `tabindex="0"`; no ring element (`.pchip .pr` absent); bounding box identical ±0.5 to the paused state for the same label.
- Evidence: AX JSON, attribute dump, screenshots.

**BR-UI-28 · Pending on the 6th counted tap (same frame), static** · AC: BRD-AC7d, UI-BR-18, BR-AC52 (pending) · **PR-B**
- Pre: E pre at 312 bp; empty window (fresh load).
- Steps: counted taps at focus s 0, 1, 2, 3, 4, 5; read the chip state on every frame from s 4 to s 9.9; sample `getAnimations()` on the chip subtree throughout the pending interval; check for `conic-gradient`, progress roles, countdown text, any child whose rect changes.
- Expected: 5 taps → still active; on the frame of the 6th tap: dashed `--c-muted` border, `text-decoration: line-through` on `+3%`; no ring/countdown/progress element; `getAnimations().length === 0` for the whole pending interval; no `aria-label`; AX name "+3% paused"; describedby exactly "Breed bonus paused while you tap fast. Returns when you tap slower."; box unchanged (UI-BR-17).
- Evidence: per-frame state JSON, animation log, screenshots active/pending.

**BR-UI-29 · Greyscale distinction and zero announcements over 10 flips** · AC: BRD-AC7e, UI-BR-20, BR-AC52 · **PR-B**
- Pre: E pre; a tap script producing 10 active↔pending flips.
- Steps: screenshot each state under a greyscale filter; count aria-live regions in the document and CDP accessibility announcements during the run; sample contrast (label 4.9 / 6.34; dashed border ≥ 3:1).
- Expected: active vs pending differ by border style and strike alone in greyscale; 0 aria-live regions, 0 announcements across 10 flips; text ≥ 4.5:1 in both states; dashed border ≥ 3:1 vs white.
- Evidence: greyscale shots, live-region/announcement log, contrast JSON.

**BR-UI-30 · Return pop script under `page.clock` (2 pops), HUD chip and slot mirror** · AC: BRD-AC7f, BR-AC52b, UI-BR-19 · **both** (chip = PR-B; slot-card mirror lives in the PR-A slot card)
- Pre: E pre (W 10 / k 6), Flock sheet visible on docked 1280×800 for the mirror leg (docked overlay doesn't freeze focus), HUD leg also at 360×640 with the sheet closed.
- Steps: counted taps at focus s 0, 1, 2, 3, 4, 5, 10.5, 11.5, 12.5, 13.5, 14.5, then repeat from s 30; on every tick read the HUD chip border/strike/`.sr` word/describedby and the mirror strike; record every animation (start time, duration, peak scale, peak gap to `#rate`); boundary sub-run: pop at t0, returns at t0 + 9,999 ms and t0 + 10,000 ms; second sub-run returns at t0 + 5,000 and t0 + 10,000. Repeat the main script with reduced motion on.
- Expected: gate closed at 5, open at 10; closed at 10.5–14.5 and open at 11–15; same at +30 s (12 returns); chip and mirror match the gate on every tick, no lag; exactly 2 pops (at s 10 and 40), each 300 ±16 ms, peak scale ≤ 1.08, peak gap to `#rate` ≥ 1 px; all other returns instant swaps; ≤ 1 pop start per 10,000 ms; t0 + 9,999 → no pop, t0 + 10,000 → pop; 5,000/10,000 sub-run → 2 pops total; no pop on load or settle; reduced motion → 0 pops; mirror pops only when the HUD chip pops and only while the sheet is visible; 0 aria-live announcements.
- Evidence: per-tick JSON, animation log, video or frame strip.

**BR-UI-31 · Chip tooltip** · AC: BRD-AC7g, UI-BR-21, BR-AC52 (tooltip) · **PR-B**
- Pre: E pre, active and pending states; a `.toast` trigger available.
- Steps: tap the chip (touch), hover/focus (desktop), press Enter/Space; measure the tooltip at 360, 390, 1280×800, 1024×474; time its visibility; trigger a toast while it shows; tap the slot-card mirror text.
- Expected: text exactly "Bonus returns when you tap slower" in both states; `aria-hidden="true"`, not referenced by describedby; top = HUD bottom + 8 (y 64), 1 line, 218.4×28 at 126.2,64 (±1), ≥ 8 px inside the viewport at 360 (right edge ≤ 352); `pointer-events:none`; hides within 1.6 s (touch); not shown while a `.toast` is visible (hides when one appears); hit area ≥ 44×44 inside the HUD, no overlap with settings/nav/queue/sheet header; the mirror shows no tooltip and does the slot card's own action.
- Evidence: rect/timing JSON, screenshots.

**BR-UI-32 · Reload, hidden tab, phone sheet, docked overlay: chip state rules** · AC: BR-AC50 (UI leg), BR-AC49 (UI leg) · **both** (chip = PR-B; phone sheet/docked overlay = PR-A)
- Pre: E pre; gate closed by taps at s 0–5, gap starting at `focusMs` 6,000.
- Steps: (a) save + reload → read chip on the first focus tick; (b) hidden 45 s; (c) hidden 59,999 ms vs 60,000 ms (`Game.now()` injected); (d) phone Flock sheet open 60 s; (e) docked overlay open; read chip state and pop count after each.
- Expected: (a) chip active on the first focus tick, no pop; (b), (c 59,999), (d): stamps held, chip still paused on the first focus tick back, opens 4.0 focus-s later (`focusMs` 10,000); (c 60,000): ring emptied, chip active on the first focus tick back; (e) focus keeps running, chip opens at `focusMs` 10,000 as with nothing open; on phone the slot mirror shows the gate state while the sheet is open.
- Evidence: per-scenario JSON, screenshots.

**BR-UI-33 · Chip taps are never counted taps** · AC: BRD-AC7g (stamps unchanged), UI-BR-18 (last sentence), UI-BR-12 · **PR-B**
- Pre: E pre, gate open with 5 counted taps in the window.
- Steps: tap the chip 10 times over 10 s; read stamps/gate, streak, focusClock, `credited_taps`, `taps_total`; check that no `collect` fires (event listener spy).
- Expected: gate stays open (no 6th stamp); streak, focusClock, `credited_taps`, `taps_total` unchanged; no `collect` dispatched (`stopPropagation`).
- Evidence: counter JSON, event spy log.

**BR-UI-36 · Best-buy strip: hatch target, no ★, byte-identity off/complete** · AC: BRD-AC6, BR-AC23b, BR-AC23c · **PR-B**
- Pre: P0 with `bestBuyV2` = 1 **and BBv2 code on the head's base** (#100); F30, flock incomplete, incubator idle, no meaningful row; coins ≥ cost, then < cost; a state with a meaningful row; flock complete; flag 0 (from BR-UI-01).
- Steps: read the strip text, target, ★/hint/highlight; capture strip outerHTML; compare with BB-5 on the same states with breeds off.
- Expected: affordable → "Hatch · $X"; unaffordable → "Hatch · in Xs" (BB-5 countdown; the in-sheet button never shows a countdown); no ★, hint or highlight on the hatch target; meaningful row present → BB-5's target; flag off or flock complete → strip output (text, target, ★) byte-identical to BB-5. If BBv2 is not in the head's base: BR-AC23b BLOCKED (dependency), BR-AC23c graded on the current strip.
- Evidence: strip HTML diff, screenshots.

### F. Accessibility (both)
**BR-UI-34 · Accessible name starts with visible text: chip, slot cards, album, entry, Hatch** · AC: BR-AC52c, UI-BR-23, BRD-AC4 (aria) · **both**
- Pre: P0; F20; states: chip active and paused at 312 bp; slots empty, placing, settling, owned Present active, owned Present paused, Away, Broody; album owned (slotted) and unowned; Flock entry full and icon-only; Hatch affordable at F28.
- Steps: at 360×640 and docked 1280×800 (and 1280×720), Chromium first, then Firefox, then WebKit: Playwright `accessibility.snapshot` + CDP AX (role, name, description, name source) for every interactive Breeds control; attribute dump (`aria-label`, `aria-labelledby`, `role`, `tabindex`, `aria-describedby`); nested-interactive scan.
- Expected (per S1 §7b L144–160): no `aria-label`/`aria-labelledby` replaces visible text (exempt: icon-only Flock `aria-label="Flock"`, ‹ "Back to Upgrades", Close "Close"); each name starts with the visible text in DOM order with `aria-hidden` glyphs removed: slot empty "Empty Pick a breed"/"Empty Hatch to fill", placing "Place here" (desc "Slot 1"), settling "Sussex +15% away · inactive Settling 4:12", owned Present "Leghorn +3.12% lay Present" (desc = chip sentence; value struck when paused), Away "Sussex +15% away Away", Broody "Cochin +15% nest Broody", album owned "Leghorn" (+ "Slot 1"), desc "1 of 2 stars", entry "Flock", Hatch starts "Hatch · " and contains `fmtMoneyAria(cost)`; chip exactly "+3% active"/"+3% paused" and the name alone separates the states with descriptions ignored; slot mirror has no role, tabindex, tooltip or describedby of its own and is not a nested control; locked slots and `???` cells not focusable; roles: buttons are `button`, sheet `dialog`, meter `progressbar`.
- Evidence: AX JSON per engine/size/state, attribute dump.

**BR-UI-35 · axe 0 violations on Breeds surfaces; hit areas ≥ 44; contrast; no overlap** · AC: UI-BR-11, BR-AC52c (axe) · **both**
- Pre: same states as BR-UI-34 plus the reveal card, Farm-soon note, unaffordable Hatch.
- Steps: axe (pinned 4.14.0) all rules, `include` = the Breeds surfaces (Flock entry, sheet/overlay, reveal card, `.pchip` + tooltip, strip target, yard), at 360×640, 1280×800, 1280×720; separately `label-content-name-mismatch` and `nested-interactive` alone; hit-area measurement of every §7 target; pixel sampling of the §7 contrast pairs; pairwise overlap of all interactive rects.
- Expected: **0 violations** on the Breeds surfaces (any violation outside them is recorded as info with its rule id, not counted); `label-content-name-mismatch` = 0 and `nested-interactive` = 0, and the case lists which Breeds nodes axe actually evaluated (a node axe treats as not applicable is reported as a coverage gap and proven by BR-UI-34 instead, as on #118); hit areas ≥ 44×44 (Flock 100×44, ‹/Close 44×44, Hatch 300×48 / 338×48, slot cards 101×≥127, album cells 76×≥100, Remove 44 hit, Nice! 276×48, docked Close 44×44, chip 44×44); contrast pairs as S1 §7 L122–128 (disabled text per v0.2.7 MT-1 4.88:1); 0 overlaps.
- Evidence: axe JSON per size/state, hit-area JSON, contrast samples, overlap matrix.

### G. Telemetry
**BR-UI-37 · Scripted Flock session: breed events and payloads** · AC: BR-AC27, BR-AC11 (`flock_complete` once) · **both** (UI triggers are PR-A; emitters are sim, not in either PR)
- Pre: P0; F20, slots 0 and 1 full, slot 2 empty, `freeHatchUsed` 0; telemetry export available (`eggfarmExportTelemetry`).
- Steps (through the UI where a UI path exists): free hatch revealed online (auto-slots to slot 2); 1 failed press (coins < cost); 1 paid hatch revealed online; 1 hatch completed in a 10-min offline gap; reload mid-incubation; manual place into slot 0; move slot 2 → slot 1; same-slot no-op; 5 swaps of slot 0 within 0.9 s sim; control: swaps at sim 0.0 s and 1.0 s; then a flock-complete save reloaded twice; export telemetry and validate against `schema.ts`.
- Expected: `hatch_started` = 3 with `breed_id`, `rarity` ∈ Common|Rare|Epic|Legendary, `cost`, `coinsBefore`, `pity_before`, `free`, `farm_level`, and no `track`/`cost_cents`; 0 `upgrade` events for hatches; failed press emits nothing; `breed_revealed` = 3 (offline one `offline:true`, emitted in the grant step before the card shows), 0 after the reload, fields `breed_id`, `rarity`, `dupe`, `stars_after`, `offline`, `wait_ms`; `breed_slotted` = 4 (auto_reveal 1, manual 1, move 1, coalesced swaps 1 with `count` 5, `prev_breed_id` = before the first swap, `breed_id` = after the last), Σ`count` = 8; control gives 2 events; `session_end` breed fields as §8 L700, `breed_spend_cents` = Σ cost; `flock_complete` = 1 across 2 reloads with `hatches`, `farm_level`, `elapsed_since_unlock_s`, `backfilled`; all names/enums pass T-AC9. If the emitters are absent at the head: BLOCKED (dependency; drift audit row 34), with the observed export attached. Known schema drift D6 (`rarity` C/R/E/L in `schema.ts:74`) is graded as FAIL if it is still there.
- Evidence: telemetry export JSON, schema validation log, event count table.

**BR-UI-38 · `session_end.present_active_s` / `present_lost_count`** · AC: BR-AC53 · **PR-B** (sim fields, observed in the chip context)
- Pre: E pre (P settled, W 10 / k 6), session starting on a load.
- Steps: 300 focus-s with no tap; then 3 bursts of 30 counted taps 1 s apart with 120 focus-s between bursts; end 120 focus-s after the third burst (747 focus-s); export; then the no-Present session; then the 12,250 ms / 12,249 ms non-whole sessions.
- Expected: `present_active_s` = 660.0 and `present_lost_count` = 3; no settled Present → both present and 0; flag off → both absent (BR-UI-01); `present_active_s` ×10 is an integer; 12,250 ms → 12.3, 12,249 ms → 12.2, lost 0; chip state during the run matches the gate (closed 29 s per burst). If the gate/fields are absent: BLOCKED (dependency).
- Evidence: telemetry export JSON, per-burst chip log.

### H. Screenshot matrix
**BR-UI-39 · BRD-UI1 screenshot matrix vs Art v0.2.7** · AC: BRD-UI1 · **both** (entry/sheet/album = PR-A cells; Present badge = PR-B cells)
- Pre: P0; F10, F14, F20; states: Flock entry; sheet with hatch affordable, unaffordable, incubating; album; Present badge.
- Steps: 360×640, 390×844, 1280×800 in Chromium, then Firefox, then WebKit (one engine at a time); plus 1280×720 Chromium (studio size); G-1 before each shot; compare against the Art wireframes (`art-ux/wireframes/m5.1-breeds-*`, S1 §9 L245–255) and the signed sprites; reuse BR-UI-02/06/07/26 rect JSON for the numeric part.
- Expected: each of the 5 screens × 9 cells matches breeds-ui v0.2.7 (layout, copy, sprite, state) with the rects inside the AC tolerances; flag off → no Flock entry (BR-UI-01). Visual judgement is written as an observation with the image path and sha256, never as an automatic PASS.
- Evidence: 45 + 5 screenshots with sha256, comparison notes.

## 5. PR tag summary
| Tag | Cases | Count | Primary ACs (by AC, for the coverage count) |
|---|---|---|---|
| PR-A (Architect, Ready ~18:30 Tue) | BR-UI-02..24 | 23 | BRD-AC3, BRD-AC4; BR-AC3, 3b, 4, 4b, 5, 7, 10, 11, 25, 31, 31a, 31b, 31c, 31e, 32, 33, 35; UI-BR-1, 2, 2b, 3, 4, 4b, 4c, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 22 |
| PR-B (Features, Ready 16:00 Tue) | BR-UI-25..29, 31, 33, 36, 38 | 9 | BRD-AC6, BRD-AC7b, 7c, 7d, 7e, 7g; BR-AC23b, 23c, 34, 52, 53; UI-BR-16, 17, 18, 20, 21 |
| both | BR-UI-01, 30, 32, 34, 35, 37, 39 | 7 | BRD-AC1, BRD-AC7f, BRD-UI1; BR-AC27, 49, 50, 52b, 52c; UI-BR-11, 19, 23 |
Split basis: seams doc S5 L129–141 (PR-A: entry + highlight, sheet + docked overlay + Esc, slots + settle, Hatch + Farm-soon + hatchEstimate, album/incubator, reveal + RM + pendingReveal, adapter + 9 sprites; PR-B: Present chip, BB strip, yard, a11y polish beyond the PR-A minimum). "both" where an AC spans a PR-A surface and a PR-B surface (slot-card mirror inside the PR-A slot card; docked overlay + chip; a11y/axe across all surfaces; screenshot matrix), or is a whole-feature check (flag-0 parity, telemetry session).

## 6. Bar execution notes
**Timing rule:** each PR's bar runs within 3 h of its Ready time. PR-B (Features) Ready Tue 10 Nov 16:00 CET → window 16:00–19:00. PR-A (Architect) Ready ~18:30 → window ~18:30–21:30. The windows overlap 18:30–19:00 and there is one browser lock, so PR-B's browser block must finish first; PR-A's local block can run in that overlap. Per D-CEO-20261110-01 (`decisions.md` L135) HoQA runs the PR-A UI checks as soon as PR-A merges, without waiting for PR-B; the same cases apply at the merge.
**Identity first, every PR:** `git ls-remote origin refs/pull/<N>/head` and `refs/heads/rc/v5`; parent(s), tree, `git diff --numstat <base> <head>`; the CI merge SHA vs the tip; file scope vs the seams doc (PR-A: only S5 L87 files; PR-B: only `breeds-hud/strip/yard` + its tests + `breeds-hud-*/strip-*/yard-*` CSS, **no `app.ts` edit, no adapter rename, no `src/sim|save|econ|data` edit**, S5 L18, L77–79). A scope breach is a finding to HoQA before any run. Inherit a bar only across a clean merge-forward (QA-D-1105-RCMOVE).

**PR-B run plan (start at Ready, 16:00):**
1. Identity + seams scope (≈10 min). Confirm PR-B's base. PR-B mounts through `registerBreedsExt` in PR-A's `breeds-mount.ts` (S5 L16), so PR-B must be stacked on PR-A or carry it; see open question Q1.
2. Local (lane `uiqa-breeds`, lane-run): `npm ci`, `tsc --noEmit`, full `vitest --minWorkers=1 --maxWorkers=2` 0 fail, flag-0 golden tests (BR-UI-01 step 1), `build`, `build:html`, `check-release-build` (no `eggfarmQa`/`eggfarm` in release), `build:qa` (≈30 min).
3. Browser, Chromium (flock, own port, 600 s cap per invocation, split into several invocations if needed): BR-UI-01, 25, 26, 27, 28, 29, 31, 33, 36, then 30, 32, 34, 35, 38 (≈60 min).
4. Browser, Firefox then WebKit, only the 3-engine cells: BR-UI-26 (360/375/390), 34 (chip), 39 (badge cells) (≈30 min).
5. Hosted, one look each (no polling): CI gate on Node 20 proven from the completed log (headSha = PR head, Node 20.x line), Chromium check-globals PASS inside the gate; FF/WK release-globals recorded "skipped by design, feature-PR exception, enforced on RC PR" (QA-D-1105-PR105-GO), not PASS and not a blocker; `pacing-x1-stack` 3 shards (optimal, casual, seller15) SUCCESS, aggregate FAIL allowed only when the raw log names row 904 NOT-WIRED, L897 WARN non-blocking; k10 SUCCESS (record whether it ran a real K10 or the no-op). Any run still in progress at the one look = PENDING, not PASS.
6. Report to HoQA: PASS/FAIL/BLOCKED per case and per AC, run conclusions, report sha256 (report file name and scope as HoQA assigns).

**PR-A run plan (start at Ready, ~18:30):**
1. Identity + seams scope (≈10 min); `app.ts` delta limited to the mount lines (S5 L20–51); the 9 vendored SVGs sha256 = `art-ux/assets/`.
2. Local, same as PR-B step 2 (≈30 min; can run 18:30–19:00 while PR-B's browser block finishes).
3. Browser, Chromium: BR-UI-01, 02..24, then 30 (mirror leg), 32 (sheet/overlay legs), 34, 35, 37 (≈90 min).
4. Browser, Firefox then WebKit: BR-UI-14 (fit), 16, 34, 39 (≈40 min).
5. Hosted, one look each: same checks as PR-B step 5.
6. Report to HoQA as above.
**Combined/RC run (after both merge):** re-run BR-UI-01, 30, 32, 34, 35, 37, 39 on the merged tip (the "both" set) plus RC-LAYOUT-118-PILL (§7), unless HoQA rules that a clean merge-forward carries a bar.

## 7. RC layout carry-over (not Breeds)
**RC-LAYOUT-118-PILL · Order-chip count pill fits at narrow phone widths** · Source: HoQA ruling on #118 note (b), relayed to UIQA on 2026-11-10 (~00:45 CET): "no measuring now (not gating). Write it down as an RC layout case (scrollWidth ≤ clientWidth on the chip at 1,500 and 12.3K) and include it in the RC UI evidence run." Not gating #118. Background: #118 shots showed the "1,500" and "12.3K" labels looking wider than their chips at 360 (`qa/m3-recheck/a11y-118-fc5fe67.md` L83–90; observation only, not measured).
- Run in: the RC UI evidence run (RC tip after #111 → #118 merge-forward), not in either Breeds PR bar.
- Pre: QA build of the RC tip; customer queue seeded through `window.eggfarm` with 5 customers of demand 4, 1, 3, 1500, 12345 (filled 0), F30/C20, sim frozen, UI render on (same seed as the #118 probe, a11y-118 L53).
- Sizes: 360×640 (primary), 375×667, 390×844, 430×932; Chromium first, then Firefox and WebKit if HoQA wants all 3.
- Guard (G-1): no `#modal-layer.open`, no sheet open, `#queue` visible, all 5 `.chip.arrive` inside the viewport, visible `.tag .num` text = "4", "1", "3", "1,500", "12.3K".
- Steps: for each chip read `scrollWidth`/`clientWidth` (and height) of the chip button, its count pill `.tag`, and `.tag .num`; rects of all 5 chips; pairwise overlap; AX name of the 1,500 and 12.3K chips.
- Expected: for the 1,500 and 12.3K chips (and all others) `scrollWidth ≤ clientWidth` on the chip and on its pill at every size; the pill text is not clipped (pill rect inside the chip rect); no chip overlaps another or the HUD; tap height ≥ 44 if the chip is interactive at that size (record the value either way); AX names still start with the visible count ("1,500 eggs wanted by customer", "12.3K eggs wanted by customer").
- Evidence: measurement JSON per size, screenshots `<engine>-<WxH>-rc-pill.png`, SHA256SUMS.

## 8. Spec conflicts and pin notes found while authoring
1. **PR-B owner and Ready time.** D-CEO-20261110-01 (`decisions.md` L132) says PR-B = Generalist, Ready Wed ~02:00–08:00. HoE's 00:42 amendment (`engineering/decisions.md` L644) moves PR-B to Features "starting now", and HoQA's brief says PR-B Ready Tue 16:00, PR-A ~18:30. This file follows HoQA/HoE; the CEO entry is stale on this point.
2. **Gate pin.** HoE 00:40 (`engineering/decisions.md` L643) names da3de91c as the gate of record; HoP D-HOP-2026-11-10-09 (`product/decisions.md` L2475–2478) and HoQA name e485f762. The Breeds card is byte-identical in both, so no case changes.
3. **PMC OQ-7 is already fixed in the pinned gate.** The checklist (S3 L89, L104) says gate L772 cites stale §8 L693–694; at e485f762 L772 already cites L695–696 (erratum D-HOP-2026-11-10-07).
4. **Gate BRD-AC7 says its strings are "quoted from the breeds spec rev. 3.8.7"** (S4 L135); the spec pin is 3.8.9. The strings in BR-AC52/52b (S2 L827–843) are the same, so the cases quote 3.8.9.
5. **Art §7a L194** says "The state is read from the chip's aria-label on focus", which contradicts "the chip has NO aria-label in any state" (S1 L164, UI-BR-20 L239; spec L456). Stale v0.2.4 text; graded against UI-BR-20 / BR-AC52c (no aria-label).
6. **Disabled Hatch colours.** S1 §2.1 L70 and UI-BR-4c say `--c-muted` text; v0.2.7 MT-1 (L289–290) supersedes it with `--c-muted-strong` 4.88:1 via the shared `.btn[aria-disabled=true]` rule. BR-UI-11 grades by equality with an unaffordable `.buy` in the same build.
7. **Hatch describedby list.** S1 §2 L50 gives `aria-describedby="hatch-sub hatch-basis"`; §7b L160 gives `hatch-sub hatch-fs hatch-basis`. Read as: `hatch-fs` is included when the Farm-soon note shows (UI-BR-22). Not a blocker.
8. **Incubating label/rounding** (PMC OQ-3) is not in the breeds spec, but Art UI-BR-5 fixes it ("Hatching…", ceil, never 0:00), and the spec says the UI doc wins on visuals (S2 L445). Graded per UI-BR-5.
9. **Gate engines.** BRD-UI1 and BR-AC52c require Chromium, Firefox and WebKit; the studio browser rule is one engine at a time, so the 3-engine cells run serially (≈30–40 min extra per PR).
10. **1280×720** (studio QA size) has no Art rect table; it is graded for fit/overlap/44 px only. The gate's docked size is 1280×800 and Art adds 1024×474.

## 9. Open questions (for HoQA)
- **Q1 PR-B base.** PR-B mounts through PR-A's `registerBreedsExt` (`breeds-mount.ts`, a PR-A file). If PR-B is Ready at 16:00 before PR-A is Ready (~18:30), is PR-B stacked on a Draft PR-A? The #121 precedent (`qa/decisions.md` L1087) gives no bar while the base is a Draft. Should the PR-B bar wait for PR-A Ready, or run on the stacked head?
- **Q2 Present gate and emitters are not built on rc/v5 f20b918** (no `presentOpen`/tap ring in `src/sim`; drift audit rows 32 and 34 "NOT-FOUND (unbuilt)"), and the seams doc forbids PR-A/PR-B from editing `src/sim` (S5 L79). Which PR (Saves?) lands the rate gate, the breed telemetry emitters and `session_end` breed fields before the bars? Without them BRD-AC7d/e/f, BR-AC52 (pending/return), BR-AC52b, UI-BR-18/19, BR-AC27 and BR-AC53 are BLOCKED (dependency).
- **Q3 Flag-on path.** `balance.json` on rc/v5 has `m4.flags.breeds` = 0 (and every other flag 0). Which test-only flag-on path is authorized for the Breeds bars (as on #116), and should the other M5 flags be at the RC ship values (gate L23) for these runs?
- **Q4 BR-AC23b** needs BBv2 (#100, flip HELD at flag 0; gate L23 now says `bestBuyV2` = 1 REQUIRED). Grade BR-AC23b as BLOCKED until #100 merges, or defer it to the RC run?
- **Q5 BR-AC35 reviewer 9/9** needs a human reviewer. Who does it (Art or HoQA), or is the automated IoU half enough for the UI bar?
- **Q6 Known drifts on the save/telemetry side** (PMC §7: D1–D6, #124) affect BR-UI-37 (D1 `save_migrated` shape, D6 `rarity` C/R/E/L). Grade them FAIL in the UI bar if still present, or leave them to the Saves QA bar on #124?
- **Q7 Report file names** for the PR bars (`qa/m3-recheck/breeds-ui-prA-<sha7>.md` / `-prB-<sha7>.md`?) need a write scope from HoQA when the bars are assigned; this task only covers `breeds-ui-cases-*.md`.

## Changelog
- v1 2026-11-10 ~00:50 CET: first version (39 cases + RC-LAYOUT-118-PILL), traced to gate e485f762 Card #3, breeds 3.8.9 ea922eb8, Art v0.2.7 f349f29f, PMC checklist c9d8b631.
