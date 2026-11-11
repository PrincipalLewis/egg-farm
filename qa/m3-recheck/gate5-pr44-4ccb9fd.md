# Gate 5, PR #44 (T3 RC) @ 4ccb9fde8251b371c6ee6444b735990e488e2aae · 2026-10-19 · QA Engineer (UI/Layout & Gameplay)
**Verdict: PASS on everything that ran, with 1 open item for a ruling: the M4 tracks explainer is not in the build (G1/G3).** Every shot and probe passed; no Blocker or Critical. The explainer gap is a proposed Major because of scope (see F1).

Setup: fresh worktree /tmp/qa-g5-4ccb9fd with its own `npm ci`. Release build served on 127.0.0.1:4419; rc0 used `vite preview` of dist-qa on :4919. Lane 1 lock only, timeout 600 per hold, one engine at a time. I stopped only my own PIDs.
- Box repair (shared machine): the Firefox/WebKit Playwright binaries and the WebKit system libraries had disappeared from the box. I reinstalled them with `npx playwright-core install firefox webkit` and `sudo playwright-core install-deps webkit`. No product code was touched.

## Build and smoke
| Check | Result |
|---|---|
| check-release-build (in `npm run build`) | ok: `m3-rc1-pre+4ccb9fd`, release hooks/globals/externals ok (`logs/build-release.log`) |
| `npm run check-globals` | exit 0 (`logs/check-globals.log`) |
| rc0 smoke, chromium / firefox / webkit | **249/249, 249/249, 249/249** (`logs/rc0-*.log`, `rc0-shots-*`) |
| Build label | Settings `.version` = `Egg Farm m3-rc1-pre+4ccb9fd`, asserted in all 36 Settings shots, plus runtime `meta[name=build-id]` asserted for every state = short form of the SHA |
| #43 PL-1 guard included | yes (48bdb09 is an ancestor) |

## Shot set: 253 shots, manifest `qa/m3-recheck/gate5-pr44-4ccb9fd/shots/manifest.json`
- States fresh, L10 (re-tuned: Hens 13 capped at F+3, Egg value 9, 2 workers at 45%) and migrated-acdbedc (real acdbedc v6 save).
- Sizes 360x800, 375x800, 390x844, 1280x800 docked.
- Screens farm, market, upgrades-collection/-farm/-workers, upgrades-farm-tracks (M4), settings.
- Counts: 84 per engine plus 1 W2 shot (Chromium, type `w2-asleep`) = 253.
- Manifest: full SHA, pushed:true, build_label_checked:true, per-shot asserted_tab/asserted_panel/checks, not_run list.
- **Programmatic check of every entry: 0 failures** (file exists; PNG size equals the viewport; fields present; asserted_tab on all Upgrades shots; docked flag correct; 0 missing, 0 orphans).
- 0 assert failures, 0 page overflow, 0 NaN/undefined/1000K text, no element clipping. The only console error is the favicon 404 caused by my own injection step.
- **Visual check:** 28 shots (11%) via `contact/{webkit-1,webkit-2,chromium-1,firefox-1}.png`, plus 1 full-size 1280 webkit shot. Each matches its manifest entry: file name, state, size, active tab, label.

## Behaviour probes (Chromium, `shots/probes/*.jsonl`)
| Probe | Result |
|---|---|
| PL-1 (#43): Esc / Enter / Space / Enter held 2 s / Space held 2 s, at 390 and 1280 | **10/10 PASS** (0,1,1,1,1). Focus after a buy = BODY (known a11y Minor) |
| M1 / M4-A highlight: hint vs Farm-tab highlight, 12 samples × 500 ms | **PASS**. fresh: goal "Hens L1" = highlight hens (matches the Eng example); L10: "Egg value L10: Large" = highlight eggValue; 0 mismatches, stable over 6 s |
| V2 grade toast / B1 balanced toast | **PASS**: "Egg value L5: Grade A ×1.1", "Egg value L10: Large ×1.25", "Balanced farm 1/5: +10% income" |
| H6 Hens L10 toast | **Not observed**. The fixture starts above L10 (H13) and the cap blocks Hens buys at F10. Needs an H9/F≥7 fixture, so it's on the not-run list |
| G3 explainer once / migration toasts | Explainer N/A (absent). Migrated load showed **no milestone toasts** before or after reload (TR-MIG-MS ok). Values carried over: $5,000, F4, C6 → H4, V5 |
| W2 asleep | **SHOT**: both hired workers "Asleep 💤" after 403 s of natural clock, no injection after load (`chromium/w2-asleep-L10-390x844.png`), label 70 px, no overflow |

## Findings
- **F1 (proposed Major, needs a ruling): M4 tracks explainer not implemented.**
  - No "Upgrades got an upgrade!" coach mark and no `seenTracksExplainer` anywhere in `src/` at 4ccb9fd.
  - The archived decision (archive/decisions/2026-10-18.md:140, :184) puts a one-time non-blocking explainer in M4 scope (m4-tracks-explainer.md).
  - Repro: load an acdbedc v6 save on the build. The M4 track UI shows (G1 core OK, input not blocked), but there is no explainer.
  - Checklist G1's own Major test (M4 UI absent or input blocked) is **not** met. So this is Major only if the explainer is still in scope for this RC; Minor if it was descoped.
  - 24 explainer frames are not run.
- **F2 (Minor, worse than the logged T2):** the Upgrades tab buttons are **26 px tall (Chromium/Firefox) and 29 px (WebKit)** on phones (360–390), down from the 36 px logged for dd52bfd. Repro: 360x800, open Upgrades, measure `[data-tab]` heights. Seen in fresh, L10 and migrated, on the Collection, Farm and Workers tabs. Visible in `chromium/L10-upgrades-farm-360x800.png`. Tabs stay tappable, so no hold.
- **F3 (Minor, M2):** the highlighted row has the yolk outline only. There is no "★ Best buy" chip (`styles.css:474` `.tracks .up.best` outline; no chip markup in src).
- **F4 (Minor/copy, M3):** next-goal label reads "Egg value L10: Large" / "Hens L1", not the specced "★ {Track} L{n} · +X% income".
- Known, not new: T2/T3 Minors and the focus loss after a buy (a11y Minor).

## Not run
- L30+ state (skipped until the L30+ pack is merged; this also leaves H4/N1/N3 at L30 open).
- Explainer shown/dismissed frames (absent, F1).
- H6 toast (fixture).
- Contrast ratios (C1), done by eye only.
- D1 coach-mark anchoring (no coach mark).
Evidence: `gate5-pr44-4ccb9fd/` (logs/, rc0-shots-*/, shots/ with manifest.json, entries-*.jsonl, probes/, skipped-*.txt, contact/). Scripts: `gate5-pr44/` (README updated; gate5-pr41/README-pr44-update.md).
