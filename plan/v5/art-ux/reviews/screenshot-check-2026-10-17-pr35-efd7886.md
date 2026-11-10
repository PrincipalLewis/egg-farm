# Screenshot check — PR #35 rc2-minors-2 @ efd7886 (head now 3fa3781) — 2026-10-17 10:40 CEST
**Verdict: PASS. No Blocker, Critical or Major findings.** (Feature freeze: hold only on Major or worse.)

## Manifest / build label
- manifest.json: pr 35, branch fix/rc2-minors-2, sha efd78860ce11ba6b7cf39653a0e1041eb0f0eb6b (40 chars), pushed true, build_label_checked true, rev 1. One entry per shot, covering chromium, firefox and webkit.
- The HUD reads "build efd7886" on every shot I opened (WebKit and Firefox), which matches the manifest SHA.

## Heads
- efd7886 is a different head from 1827a27. 1827a27 is its ancestor, and it adds 2 commits (0356ac6 and efd7886): 4 files, +19/−7.
  - UI: src/ui/orders.ts adds the pure `orderLineText(fe,val)`. src/ui/order-list.ts `vText` now calls it. The output is the same string as before (a refactor), so nothing renders differently.
  - No changes to CSS, index.html or the copy strings. The rest is rc0-browser.mjs and tests.
- The new head 3fa3781 sits on top of efd7886. `git diff --stat efd7886 3fa3781` shows only scripts/rc0-browser.mjs (+2/−2, the rc0 test assertion that accepts either exact §9 form). Nothing in src/ui, styles or copy changed. **The efd7886 verdict stands for head 3fa3781.**

## §9 / §9.1 Wants line
- 3.98M at 360, Firefox and WebKit: the row shows "$9.94M" alone. That is the §9.1 value-alone step, so the value is never cut and there's no stray "· " or "0/". Spec-compliant, so it passes. Note: the efd7886 commit message expected Firefox to show the full Wants form. 3fa3781 relaxes the test to accept either form on every engine, and that matches §9.1.
- "Wants 13 · $15.34" at 375 in WebKit fits on one line, and the No-eggs button is about 44px or taller.

## Toast hold (rc2 Minors M-Toast-layer)
- Welcome-open 360x420, WebKit, "during": no toast shows over or under the Welcome-back modal. After close, "Coop upgraded!" shows above the content. Passes.

## Tutorial copy (FM-AC4)
- Step 3 at 375, WebKit: "Buy your first upgrade: more eggs per tap." That's verbatim. The Upgrades tab is highlighted and Skip is about 44px. Passes.

## Minors / Nits (logged, not holding)
- Nit: at 360 with large balances (the after-close 360x420 shot), the widened egg pill (2,685) sits over the start of the "build efd7886" label. The label is still readable. It's a debug label, so this is cosmetic only.
- Nit: in the step-3 shot, the floating "+$3.00" coin text overlaps the coop roof. It's a transient animation frame.
- N3 (hens vs HUD at 360x420) is still parked, as ruled.

Coverage: I opened a sample of the shots (WebKit and Firefox at 360 and 375, toast and tutorial) and checked the git diff. I didn't re-render.
