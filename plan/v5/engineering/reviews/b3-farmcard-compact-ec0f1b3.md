# Code review: B-3 compact Farm card (b3-farmcard-compact @ ec0f1b3)

Reviewer: Code Reviewer · Scope: cd9b313..ec0f1b3 (e9c0987, 9690b9d, ec0f1b3) on top of PR #3
Spec: art-ux/rc2-notes-b2-b3.md §B-3 + mocks/rc2-farmcard.html · Worktree: /workspace/review-ec0f1b3 (not modified)

## Review limits (read first)
In this session Bash denied `git diff cd9b313..ec0f1b3`, `npx vitest ...`, `npx tsc --noEmit` and a `.gitattributes`/`core.autocrlf` check. Only grep/sed-style reads worked. So:
- I reviewed the **post-change files** (app.ts:447-514, upgrade-card.ts, styles.css:597-617, tests/farmcard-compact.test.ts, rc0-browser.mjs farmCompact section) against the spec and mock. I did not read the literal diff. Changes outside those files (e.g. pre-existing rules the diff did not touch) are inferred from the file state.
- **No test or type-check result is claimed.** The tests and `tsc` still have to be run.
- No browser was run (as instructed), so every height and width claim below is derived from CSS and the mock, not measured.

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| Blocker | 0 |
| Major | 1 |
| Minor | 3 |
| Nit | 3 |

Overall: the implementation matches the mock's structure (title row with `L{n}/{max}`, tier line, wrapping flex fx in the order Hens/Every/Coop/Price/Demand, one chip row with short payback and full SR text, ETA above Buy, limiter below Buy with a 16px margin and `::before` hit area, no negative margins). The one concrete risk to the numeric AC (260/282) is finding 1.

## Findings

### 1. Major (PLAUSIBLE): `.chips{margin:2px 0}` is not reset in the compact card, so the card may be about 4px taller than the mock
- Evidence: `src/ui/styles.css:542` has `.chips{display:flex;flex-wrap:wrap;gap:4px;margin:2px 0}`. The B-3 block (`styles.css:608`) is `.up .chips{display:flex;flex-wrap:wrap;gap:4px}` and does not zero the margin. The mock's `.chips` (mocks/rc2-farmcard.html) has no margin. `.col` is a flex column, and flex-item margins do not collapse with the gap, so 2px above and 2px below add to the 6px gaps.
- Impact: mock-measured heights of 260 (no ETA) and 282 (ETA) would become about 264 and 286 in the real build. rc0 `farmCompact` asserts `|h - target| <= 2` at 360, 375 and 390 (rc0-browser.mjs ~1050), so it would fail. If it is not failing, my reading of the cascade is wrong, which is why this is PLAUSIBLE and not CONFIRMED. I could not measure it.
- Fix: add `.up .chips{margin:0}` to the B-3 block. This is a one-line change. Run `rc0 farmCompact` (360/375/390/1280) to confirm.

### 2. Minor: unit test cannot catch a broken implementation
- File: `tests/farmcard-compact.test.ts:6-31`.
- Evidence:
  - Tests 1-4 exercise the pure helpers (`FARM_FX_LABELS`, `customerEveryAria`, `paybackChip`, `levelTag`). They would still pass if `upRowHtml` stopped using them, or used them wrongly: for example dropping the `.every` li, losing the aria wiring, or putting Hens after Coop in the output. Only the label constant order is checked, not the rendered order.
  - The markup test is a source-text regex over `app.ts`. It checks the relative position of `${hint}`, `btn buy` and `${limit}` (ETA before Buy, limiter after) but not that chips precede the ETA, that the tier line is under the title, or that `.lv` sits inside `.t`.
  - The CSS test only checks that strings exist somewhere after the `/* B-3 compact Farm card` marker. A later rule could override `.up .hint.limit{margin-top:16px}` and the test would still pass. The `[hidden]` rule it asserts is dead code (finding 5).
  - `upRowHtml` is a closure inside `app.ts` and is not exported, so no unit test renders it.
- Impact: the only real guard for the AC (heights, Buy 48px/full width, no clipping, L6/30) is the rc0 browser section. That is fine only if rc0 runs in CI or on every RC cut, and it covers one state (finding 3).
- Fix: extract `upRowHtml` (or the fx/chips builders) as a pure function and add a jsdom-free string assertion on the rendered output. For example: the `li.every` aria-label, the max-level `Every 3.49s` form, and that the payback chip carries `aria-label="Pays back in about …"`. Alternatively, state in the test header that rc0 is the AC gate.

### 3. Minor: only the L6 fixture state is measured; other common card states are not covered by the 260/282 target
- Evidence: the rc0 check (rc0-browser.mjs ~1040-1050) uses one fixture save. At the 360 column width (about 236px per the spec), the chip row `+N% income` (~84) + short payback (~94) + `★ Best buy` (~78) + gaps is about 264px, so it wraps to a second row (+~24px) whenever `isBest`. Best buy is a common state (app.ts:475-486).
  - The unshortened chip variants "With next buys: ~…" (app.ts:483) and "Unlocks more customers" (app.ts:484) are wider than the short payback and will also wrap.
  - When `slotLines` is set (coop-tier steps and queue_max changes, app.ts:452), the `li.slot/.coopnew/.orders` items are `flex-basis:100%` (styles.css:606) and add rows.
- Impact: in these states the card exceeds the 260/282 target at 360. The mock and spec do not define them, so they are neither a regression nor a defect against the spec. They do mean "≤ 260" holds only for the sampled state.
- Fix: ask Art & UX whether the target applies to best-buy and slot states. Add rc0 samples for best-buy and a slot-step level (F4 → F5), at least as height-logged (non-gating) data. Consider shortening the other payback variants (e.g. "Next buys ~3 min") to stay on one row.

### 4. Minor: level tag uses `aria-label` on a generic `<span>`
- File: `src/ui/app.ts:505` `<span class="lv" aria-label="Level ${L} of ${b.maxLevel}">L6/30</span>`.
- Evidence: ARIA 1.2 prohibits `aria-label` on elements with no role (generic). Many screen readers ignore it and read the visible text, "L 6 slash 30". The `.up` wrapper's own `aria-label` (line 503, also on a plain div) has the same problem, but that is older code.
- Impact: the level can be announced as "L six slash thirty". Low severity, since the level is secondary info.
- Fix: render `<span class="lv"><span aria-hidden="true">L6/30</span><span class="sr">Level 6 of 30</span></span>` using the existing visually-hidden utility. Alternatively give it `role="text"`, which has patchy support. The same applies to the `<li class="every" aria-label>` case. That is valid on a listitem but replaces its content, which is intended here.

### 5. Nit: dead `[hidden]` CSS and its assertion
- File: `src/ui/styles.css:614` and `tests/farmcard-compact.test.ts:29`.
- Evidence: the ETA hint is rendered conditionally (app.ts:489-495) and never carries the `hidden` attribute, so `.up .hint[hidden]{display:none!important}` never applies. The test asserts the string exists. The spec asked for this because the mock toggles `hidden`.
- Fix: keep the rule as a harmless guard but drop the test regex. Alternatively note in the CSS comment that the build renders the line conditionally.

### 6. Nit: in-band `\u0001` signalling for the aria label of the Every line
- File: `src/ui/app.ts:461` and `:508`.
- Evidence: the aria text is smuggled through the `fx` string array as `\u0001<aria>\u0001<html>` and parsed back with a regex. The `ia === iz` check also duplicates the "unchanged line is not rendered" rule from `changedLine`.
- Impact: works (values are numbers, so no escaping issue) but is fragile. Any future filter or reformat of `fx` strings will silently drop the aria label.
- Fix: have `fx` return `{html, aria?}` items, or build the Every `<li>` outside the string pipeline.

### 7. Nit: process and scope notes
- The shared renderer means the Collection card (`Collect per tap`) also gets the title-row `L{n}/{max}`, the removed `.meta` line and the gap/padding changes. The spec describes Farm only. This is probably intended (same component), but neither the commit message nor the tests say so, and no Collection-card sample is in rc0.
- e9c0987 accidentally touched `tests/fixtures/product/economy.csv` (CRLF normalization) and 9690b9d restored it, so the net diff cd9b313..ec0f1b3 stats show no fixture change (good). The worktree still lists `M tests/fixtures/product/economy.csv` in `git status`, so the line-ending normalization recurs on checkout. I could not verify whether `.gitattributes` or `core.autocrlf` is configured. Fix: add `tests/fixtures/product/* -text` (or `eol=crlf`) to `.gitattributes`, and consider squashing e9c0987 + 9690b9d on merge to keep history clean.

## Checked and found OK (from the code, not run)
- Order and DOM: title → tier → fx → chips → ETA → Buy → limiter (app.ts:503-513). Tab order is Buy then link.
- Limiter geometry: `.hint.limit` margin-top 16px (styles.css:612) with col gap 6px gives 22px; the 14px `::before` overhang leaves 8px clear of Buy. The link is `position:relative` with padding and margins 0 (styles.css:577), so no negative margins and no overlap with the chip. The old `.hint.coop` / `.coop{position:absolute}` bug is gone.
- Buy: 48px min-height and height, `width:100%` and `align-self:stretch` at all widths, which satisfies the designer Minor (full width at 1280 docked). Focus ring on Buy and link.
- Phones: `.up{padding:12px}` at ≤390 (so 360, 375 and 390 use it; 391+ is 16px). `.up .col{gap:6px}`.
- Max level: `Every 3.49s` and the aria `Customers arrive every 3.49 s` follow the max branch.
- Title row at 360: h3 can ellipsize and `.lv` is `flex:none`, so "Collect per tap" + "L4/30" fits in about 236px.
- Fx wrapping: the Hens + Every row is about 220px, which fits at 236px. `li` has `min-width:0;max-width:100%` plus the existing ellipsis, so there is no overflow.
- `uRow.querySelector('.lv')` (app.ts:607) and the rc0 S2-10 `#uRow .lv` read still resolve to the new element. `.up .t .lv` resets the badge `position:absolute` from styles.css:126, and the pop animation works because the span is a flex item.
- Payback chip: `fmtTimeToAfford` always returns `~…` or `—` (format.ts:32), and the chip is only built when `og.gain > 0`, so `paybackChip` never receives `—` here.

## What I ran
- Read: spec rc2-notes-b2-b3.md §B-3, mocks/rc2-farmcard.html, src/ui/app.ts:440-520, src/ui/upgrade-card.ts, src/ui/styles.css (B-3 block and the rules it overrides), tests/farmcard-compact.test.ts, scripts/rc0-browser.mjs (S2-10, Cut A v3 and farmCompact sections), src/ui/format.ts:28-42.
- grep across src/tests/scripts for `.meta`, `.hint.coop`, `.lv`, and old fx labels. No stale references to `.hint.coop`, and the old "Customers every / Coop capacity / Customer demand" labels survive only in unrelated tests (`upgrade-card.test.ts` for `changedLine`).
- Denied and therefore NOT run: `git diff`, `npx vitest run … tests/farmcard-compact.test.ts tests/rc1-ui.test.ts tests/rc2-cuta-followups.test.ts`, `npx tsc --noEmit`. Please run them before merge.
