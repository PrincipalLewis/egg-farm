# PR #83 static pre-review @ 4eb220f (NOT the verdict)

- **Head:** 4eb220f6fb74d1947b733ef72f74e2057e804979 (fix/m41-p2, on origin/fix/m41-p2). Parent chain contains P2_HEAD 76390f2834b98e981ef52a3e165436acd9170654 (`git merge-base --is-ancestor` OK).
- **Range 76390f2..4eb220f, 4 commits:** 1befa17 (AC-R17 count-0 test, Upgrades name v1, Art-c2 RM flash), 166bc34 (Art-c1 as ruled, D-HOP-10 addendum tests, full-motion shake), 65bf759 (nav-compare script, cooldown axe → INFO), 4eb220f (badge anchored to flex static position).
- **Reviewer:** UI/Layout QA executor, 2026-10-30 ~08:55 CET. Read-only: git show/diff/ls-tree, Read, sha256sum. No browser, server, vitest or checkout.
- **Status:** a static pre-review only. The runtime verdict comes from our own harness run after the harness delta clears; HoQ issues the verdict.
- **Rulings used:**
  - (a) Art-c1 / V5ULANE (4a).
  - (b) D-HOP-2026-10-29-10 plus the 00:22 addendum. product/decisions.md L1436–1440, section sha1 bcbb977c (matches the case-index pin).
  - **New since the brief:** D-HOP-2026-10-30-02 (decisions.md L1450, 08:55 CET).
  - (c) Art-c2.
  - (d) The count-0 and cooldown tests.

## Summary
| # | Finding | Result | Sev |
|---|---|---|---|
| F1 | (a) Upgrades name and badge DOM: implemented to the ruling | PASS (static) | — |
| F2 | (b) Cooldown nav Refill. The visible text is only the countdown "0:20" (docked: "Ready in 20s"), which is aria-hidden. The word "Refill" is not visible. The name "Refill, cooling down" does not start with what a sighted user sees. This conflicts with the addendum and with D-HOP-2026-10-30-02 option (b), which needs "Refill" visible next to the countdown. 4eb220f does not implement that. | FAIL (static, vs ruling) | Major |
| F3 | (b) The developer's cooldown "starts with visible text" check passes vacuously. Visible text after aria-hidden filtering is "", and `name.startsWith('')` is always true. | CONCERN (evidence weakness) | Major (evidence) |
| F4 | (c) The reduced-motion refusedFlash and the full-motion shake fix are keyed on `.btn.manage.shake`, so they cover only the **worker-card** Refill. The nav/header Refill (`button.manage.nav-manage`, no `.btn`) still gets the plain `.shake`. With the duration at `var(--t-med)` = 0 ms under reduced motion, a refused nav-Refill tap in cooldown shows **no visual refusal** in RM. It does shake in full motion. Fine if Art-c2 is card-scoped (its comment says "Unpaid"); a gap if (c) covers every Refill. | CONCERN (scope ruling needed) | Minor |
| F5 | (d) Tests for count 0 (not rendered, not focusable, no "Refill…" name, nav order Market → Upgrades → Farm), cooldown (visible, aria-disabled, tap is a no-op) and cooldown end (leaves the nav, no positive tabindex) are present in vitest and m41-p2-browser.mjs | PASS (static) | — |
| F6 | The developer shots `nav-upgrades-n1/n2-{360,390}` in all 3 engines (12 files) do **not** show the bottom nav or the Upgrades badge. They show the Upgrades sheet's Hawker card Refill, because the sheet covers the nav when the clip is taken. The manifest labels are wrong for all 12. The correct visual evidence is in nav-compare/head-4eb220f/*.png. | FAIL (evidence mismatch) | Minor |
| F7 | Shot coverage: widths 360/390/1280 only. No 375 or 430, and no docked 1024x474, 1280x720 or 1366x768. No nav Refill shots at all (count 0, active, cooldown, reduced motion) and no refusedFlash shot. | CONCERN (coverage gap; our run fills it) | Minor |
| F8 | Out-of-scope changes: none in src. All src hunks map to (a) or (c). Scripts and tests are QA tooling. JSDoc nit: the new `upgradesNavName` doc block was inserted below the AC-R9 doc comment, so the AC-R9 comment no longer sits on `refillTiredLabel` (workers-ui.ts ~L66–70). | PASS / INFO | Trivial |
| F9 | The branch is behind rc/v5. The developer's 12-diff-stat-vs-rc-v5 shows rc/v5-side sim/save/config files (clock, rng, timers, m5-state, flags, …) as deletions relative to #83. That is base drift, not #83 scope. The runtime verdict must be on the rc/v5 merge result or RC SHA, not on bare 4eb220f. | INFO | — |
| F10 | The nav-compare baseline is 1befa17 (in-range), not 76390f2 or v5-base 22eac98. Its badge DOM and CSS equal 76390f2 for the badge (1befa17's CSS hunk only adds refusedFlash), so it is acceptable for "position unchanged". Our r17base still compares against 22eac98. | INFO | — |

## 1. Diff 76390f2..4eb220f mapped to rulings
`git diff --stat`: 7 files, +258/−16. Files: scripts/m41-p2-browser.mjs (+74), scripts/m41-p2-nav-compare.mjs (new, 50), src/ui/app.ts (17), src/ui/styles.css (+12), src/ui/workers-ui.ts (+3), tests/m41-p2-ui-dom.test.ts (82), tests/m41-p2-ui-minors.test.ts (+36).

**(a) Upgrades accessible name and badge (app.ts L598–621, workers-ui.ts `upgradesNavName`, styles.css L637–641)**
- Name: `n > 0 ? \`Upgrades, ${n} ${n===1?'worker needs':'workers need'} attention\` : 'Upgrades'`. This matches the ruling exactly for N = 0, 1 and ≥2.
- Badge DOM: `ensure(nav.querySelector('[data-nav=upgrades]'), true)` appends `' '` plus `<span class="asleep-badge num" aria-hidden="true">` as the button's last child, after `.nav-lbl`. That gives DOM order icon → label → badge, and the badge is aria-hidden. The `:scope >` selector stops it from picking up an old in-icon badge.
- Position: `nav [data-nav=upgrades]>.asleep-badge{top:auto;right:calc(50% - 14px - 6px);margin-bottom:calc(28px + 2px + 12px*1.2 - 6px)}`. This relies on the abspos static position inside the flex-column button. The developer's nav-compare shows identical badge rects vs 1befa17 in Cr/FF/WK at 360/390. WebKit was 0.5 px low at 65bf759 and is fixed at 4eb220f.
- No generated content.
- Static PASS. The engine-dependent geometry is runtime-pending.

**(b) D-HOP-10 addendum (nav Refill)**
- No src change in range. Behaviour comes from `navManageView`, which is unchanged:
  - Cooldown: label = `0:NN` (docked `Ready in Ns`), `hideLabel:true`, so `.nav-lbl` is aria-hidden. The `.count-badge` is hidden. aria = `REFILL_COOLDOWN_ARIA` "Refill, cooling down". `setDisabled` sets aria-disabled="true".
  - Count 0 with no cooldown: hidden (farmMAShown).
- Visible text in cooldown is therefore **only the countdown digits** (see F2). The tests and browser checks for hidden/visible/not-actionable/Tab order are present (F5).

**(c) Art-c2 refused feedback (styles.css L44–50)**
- `.btn.manage.shake{animation:shake}` beats `.btn[aria-disabled=true]{animation:none}`.
- RM: `@media (prefers-reduced-motion)` and `.reduced-motion` / `.rm` → `refusedFlash 300ms steps(1,end) 1`, a static 2px inset `--c-danger` ring with no transform. The app toggles `.reduced-motion` on html and `.rm` on root (app.ts L62), so both hooks match.
- Scope covers worker-card Refill only (see F4).

**(d) Tests**
- tests/m41-p2-ui-dom.test.ts:
  - AC-R17 scenes rewritten for Art-c1 (badge parent, aria-hidden, after `.nav-lbl`, not in `.nav-ic`, exact names).
  - New: count 0 not rendered with Tab order; upgradesNavName plural; cooldown visible/aria-disabled/no-op; cooldown end hides with no positive tabindex.
- tests/m41-p2-ui-minors.test.ts: CSS-string assertions for Art-c2 and Art-c1.
- m41-p2-browser.mjs: browser equivalents, including a real Tab / Shift+Tab after the cooldown ends with focus on Refill.

## 2. Developer evidence (artifacts/m41-p2/results-4eb220f/), developer's own and not QA's
- SHA256SUMS: 149 entries, `sha256sum -c` rc 0. MANIFEST.sha256 is byte-identical.
- Every gate log header is `@ 4eb220f6fb74…`. summary.tsv shows all 17 steps rc 0 at 4eb220f.
- Steps run:
  - npm ci, sync-economy --check, tsc
  - vitest full: 123 files / 1673 tests passed, `--minWorkers=1 --maxWorkers=2`, 08:12–08:15 CET
  - golden flag-off AC7 and golden m4on
  - build, build:html, build:qa
  - check-globals
  - rc0-browser Cr/FF/WK: 394/394 each
  - m41-p2-browser Cr/FF/WK: 232/232 gate checks each, plus 3 INFO findings each (the cooldown axe row at 360/390/1280)
  - nav-compare vs 1befa17 (2 "DIFF" rows: chromium 360 N=1/2, 5 px in the yard strip above the nav; the badge area is identical per NOTE.md)
- Build-id: check-release-build reports `m4.1+4eb220f matches HEAD`, with the meta and data-build-id equal. results-{chromium,firefox,webkit}.json and manifest.json: head 4eb220f6…, buildId `m4.1+4eb220f`. **SHA matches.**
- The developer's browser runs used their own serve-own free ports (33475/35185/41161/44555), not :4173.

## 3. Shots (/workspace/wt-ui-shots/m41-p2-4eb220f/)
- **Count:** 93 PNG plus manifest.json plus 3 results-*.json. The manifest has 93 entries: no duplicates, none missing on disk, none on disk without an entry. **All 93 sha256 values match the manifest.** 31 per engine (Cr/FF/WK).
- **Viewports:** 360 (33), 390 (33), 1280 (27). **Missing:** 375, 430, 1024x474, 1280x720, 1366x768 (F7). Views: cards-asleep, cards-ch-unpaid, cards-mh-unpaid, coop-tip, hud-warn-neg, hud-pos, disabled-buy, focus-under-refill-bar, refund-pop-vs-rate (9 each), nav-upgrades-n1 and n2 (6 each).
- **No nav Refill shots** (count 0, active, cooldown, RM) and no refused-flash shot exist (F7).
- **Opened (21 shots + 3 nav-compare):** all 12 nav-upgrades files plus 9 others, at least 1 per width per engine.

| file | manifest says | seen | match |
|---|---|---|---|
| {chromium,firefox,webkit}-nav-upgrades-n{1,2}-{360,390} (12 files, 12/12 opened) | Bottom nav, Upgrades badge N after label | Upgrades sheet, Hawker card "Energy 30%" + Refill pill; **no nav, no badge** | **MISMATCH ×12** (F6) |
| nav-compare/head-4eb220f/chromium-nav-n1-390, firefox-nav-n1-360, webkit-nav-n2-360 | nav with badge | Market / Upgrades [badge 1 or 2 at icon top-right] / Refill [badge] / Farm; no clipping | OK |
| chromium-cards-mh-unpaid-360 | MH unpaid card | Workers tab active (badge 1), red banner, "Unpaid ⚠", "Resumes at $7.50", Refill aria-disabled grey | OK |
| chromium-disabled-buy-390 | Disabled Buy, Farm tab | Farm tab active, grey $73.00/$50.00 | OK (a toast "Coop upgraded! +1 customer slot" is visible, which is harmless) |
| chromium-cards-asleep-1280 | cards asleep | docked; Workers tab, MH "Asleep ☾", header "Refill 2 tired workers" | OK |
| firefox-focus-under-refill-bar-360 | focus below sticky bar | focus ring on MH Refill, below "Refill 3 tired workers" bar | OK |
| firefox-cards-ch-unpaid-390 | CH unpaid card | Workers tab, CH "Unpaid", "Resumes at $15.00" | OK |
| firefox-cards-mh-unpaid-1280 | MH unpaid | docked, Workers tab, MH Unpaid | OK |
| webkit-cards-mh-unpaid-360 | MH unpaid | as Cr | OK |
| webkit-coop-tip-390 | Coop tip | tip shown; nav Market/Upgrades/Farm (no Refill: count 0), which is incidental count-0 evidence. The tip overlaps the goal strip, which is the known V51-UI-1 Minor. | OK |
| webkit-focus-under-refill-bar-1280 | focus below sticky bar | docked, focus ring on MH Refill fully visible below the bar | OK |

- The nav-upgrades views (N=1 and N=2, 2 widths, 3 engines) are 12 files (manifest count 6+6). All 12 were opened and all 12 mismatch.
- No clipping was seen in the OK shots.
- **44px Need-state height:** no Need-state button is visible in any sampled shot, so it was NOT CHECKED. Refill and Hire pills look about 44–48 px but were not measured.

## 4. Axe `label-content-name-mismatch` on cooldown (INFO in the developer run)
- axe 4.14 flags the cooldown Refill (`.manage` at phone widths, `.nav-manage` docked) in all 3 engines at 360/390/1280.
- The developer's INFO text says axe "counts the aria-hidden 0:NN countdown as visible text". Whatever axe's internals, the conclusion is the same.
- Ruling (b) says the name must START with the visible text. A sighted user sees only "0:20" or "Ready in 20s"; "Refill" is not on screen during the cooldown. The name "Refill, cooling down" does not start with that, so this is a real WCAG 2.5.3 gap. It **conflicts with ruling (b)** and is not an axe false positive.
- **D-HOP-2026-10-30-02 (08:55 CET) now settles it.** It picks option (b): "Refill" must be visible next to the countdown, the name stays "Refill, cooling down", and the timer stays aria-hidden. That needs a code change that 4eb220f does not have. If Art finds it does not fit at 360, the fallback is (a): a documented exception logged INFO, with the SR check passing.
- **Assessment:** the INFO classification is not acceptable for the gate on 4eb220f. A new head carrying option (b) is needed, or a recorded (a) exception from Art's 360 check. Major. It goes to HoQ and HoE.
- Our harness agrees. `lib/qa-page.mjs startsWithVisible` requires a non-empty visible (non-aria-hidden) text, and AXE-R17 requires 0 violations including the cooldown. On 4eb220f, **TP1-R17c (cooldown) and AXE-R17 are expected to FAIL.** On an option-(b) head they can pass.

## 5. Runtime checks our harness run must cover (case IDs from artifacts/v5-ui/plan.md def407b0 and case-index.md b00ee481)
| Case | What on the #83 head (prefer the option-(b) head, else 4eb220f), at V 360x640, 375x667, 390x844, 1280x800 (+430x932) × Cr/FF/WK |
|---|---|
| TP1-R17a | Exact Upgrades name for N = 0, 1, 2, 3+ across the 7 scenes and N=0. Badge after the label, aria-hidden. Badge rect vs r17base (22eac98) within ±1 px in every engine (the abspos static-position CSS is engine-sensitive). Docked: N/A. |
| TP1-R17b | Workers tab "Workers N, N asleep or unpaid" / "Workers" (unchanged). |
| TP1-R17c | Active N=1/2 names. Cooldown (0,20) and (1,20): visible, name starts with **non-empty** visible text ("Refill" must be on screen; expected FAIL on 4eb220f), aria-disabled, click/Enter/Space no-op. (0,0) not rendered or focusable, no name. Cooldown end at count 0: Tab walk with no gap or trap, focus-from-Refill recorded. Docked header copy too. |
| TP1-R17d | `#rate` suffix (unchanged). |
| TP1-R17e | No sim change (module graph / isolation / GOLDEN1). Re-run because the range touches src/ui/app.ts and workers-ui.ts. |
| AXE-R17 | label-content-name-mismatch = 0 on Upgrades, Workers tab, nav Refill and header Refill, **including the cooldown** (expected FAIL on 4eb220f). |
| TP1-U2 / TP1-R11 + **NEW (not in plan): Art-c2** | Refused Unpaid card Refill: full motion `animationName` shake; RM (emulated and in-app `.rm`) refusedFlash 0.3 s with transform none. **Add a case** for the nav/header Refill refused in cooldown under RM, pending the F4 scope ruling. |
| P2-3 (WCAG 2.4.11) | Sticky Refill bar focus, unchanged. Re-shoot. |
| UI-M5-*/UI-WARN-*/UI-M6/M8/M9/M10 regression | As in plan (cards, HUD, coop tip, disabled Buy). |
| Screenshot set (screenshot-set.md) | Fill the developer's gaps: 375, 430, 1024x474, 1280x720, 1366x768. Nav with the Upgrades badge **with the sheet closed**. Nav Refill count-0 / active / cooldown / RM-refused. 44px Need-state height. |
| Build-id | Runtime build-id `m4.1+<head7>` asserted on every load. Own ports, never :4173. |

**Does p2/r17-rules.mjs (sha1 859869d0) cover the new name rules?** Mostly yes.
- `upgradesWant` matches `upgradesNavName` exactly (N≥2 / 1 / 0).
- `badgeDomOk` checks after-label, aria-hidden and text; `badgePosOk` checks against the baseline.
- `refillShouldRender`, `refillPresenceOk`, `refillCooldownOk` and `tabWalkOk` cover the D-HOP-10 addendum.
- The cooldown starts-with check (through qa-page `startsWithVisible`, non-empty text) is strict enough to catch F2.
- Gaps:
  - (i) Art-c2 refused-feedback (shake / refusedFlash, RM) is not in r17 and has no plan or case-index row. Add it.
  - (ii) r17 does not pin D-HOP-2026-10-30-02. TP1-R17c's pin is L1436–1440 only and should be extended to L1450–1453, along with its (a)-exception path (INFO plus SR check).
  - (iii) badgePosOk returns UNVERIFIED with no baseline, so the r17base must run first.
  - These are harness and plan edits for the harness workstream. Nothing here was edited.

## NOT RUN
All runtime and engine checks are pending: no browser, server, vite, vitest, playwright, axe or npm was run by QA. Specifically pending: TP1-R17a–e, AXE-R17, the Art-c2 RM/full-motion animation checks, the nav Refill count-0/cooldown/Tab walk, badge geometry vs 22eac98, the 44px Need state, docked sizes 1024x474/1280x720/1366x768, widths 375/430, the build-id at runtime, and the screenshot set. Every PASS above is static (source and diff reading) or a reading of the developer's evidence, which is not QA evidence. Not reviewed: the full m41-p2-browser.mjs beyond the diffed sections, and the rc0 logs beyond their summaries.

## Evidence paths
- Repo: /workspace/egg-farm-studio/game (`git diff 76390f2..4eb220f`)
- Dev evidence: /workspace/egg-farm-studio/artifacts/m41-p2/results-4eb220f/ (SHA256SUMS verified rc 0)
- Shots: /workspace/wt-ui-shots/m41-p2-4eb220f/ (manifest.json, 93/93 sha OK)
- Correct nav visuals: artifacts/m41-p2/results-4eb220f/nav-compare/head-4eb220f/
- Rulings: product/decisions.md L1436–1440 (sha1 bcbb977c) and L1450–1453 (D-HOP-2026-10-30-02); file sha256 4578635e…
- Harness (read only): artifacts/v5-ui/harness/p2/r17-rules.mjs 859869d0, harness/lib/qa-page.mjs b056bb83
