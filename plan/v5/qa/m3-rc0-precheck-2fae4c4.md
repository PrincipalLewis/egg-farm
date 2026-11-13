# QA rc0 pre-check: `game` m3/rc0 @ 2fae4c4 (2026-10-16 ~01:35 CEST)
Throwaway detached worktrees `/tmp/qa2fae/{rc,b2}`; nothing committed, pushed or tagged. Only local edit in worktrees: `rc0-browser.mjs` port read from `PORT` env (default 4181) so runs use unique ports. Logs: `qa/m3-recheck/precheck-2fae4c4/`.

## 1. B2 check change (737f9a8): **ACCEPT**, with a suggested tightening for rc1
Diff: old pass rule `after.bottom <= 0 && after.vis === 'hidden'`; new `after.vis === 'hidden' && (after.bottom <= 0 || after.op === '0')`.
- Matches Art & UX F1 (`art-ux/reviews/rc0-pt1-13-queue-review.md`): toast sits below the queue strip, so on mobile it fades out in place (`.toast.below`) instead of sliding up across the strip.
- Not always-pass: `visibility:hidden` is still mandatory, and the original B2 bug (pre-3236dfa CSS: hidden state = `translate(-50%,-80px)`, no opacity/visibility) leaves the toast visible.
- **Proof:** in worktree `b2` I restored the pre-3236dfa `.toast` / `.toast.show` hidden-state CSS (F1 `.below` placement kept), `build:qa`, ran rc0-browser: **B2 FAILs at 390 and 1280 in Chromium and WebKit (38/40 each)**. 1280: `after {bottom:16, vis:visible, op:1}` = the original "stuck half off the top" bug. 390: `{bottom:168, vis:visible, op:1}`. Clean 2fae4c4: PASS (390 `{bottom:168,vis:hidden,op:0}`, 1280 `{bottom:-8,vis:hidden,op:0}`).
- Weakness: the OR applies at every width, so at 1280 (docked, no `.below`) a hidden-in-place toast would now pass, and nothing checks F1 placement (toast not over the strip). Suggested assertion (rc1, not a gate):
  ```js
  const qb = await page.locator('#queue').evaluate(e => e.getBoundingClientRect().bottom);
  const below = w < 960;
  ok(..., shown.vis==='visible' && /Coop upgraded/.test(shown.text) && after.vis==='hidden' && after.op==='0'
     && (below ? Math.abs(shown.top - (qb + 8)) <= 1 : (shown.top >= 0 && after.bottom <= 0)));
  ```

## 2. Independent rerun @ 2fae4c4
| Run | Result |
|---|---|
| `vitest run` | **337/337**, 34/34 files (needs `../product` next to the worktree; first run without it failed 2 files on ENOENT, harness only) |
| `rc0-browser.mjs` | **40/40 Chromium** (port 4301), **40/40 WebKit** (4302) |
| `scripts/ac14-browser.mjs` | **17/17 Chromium, 17/17 WebKit, 17/17 Firefox** |
| `qa/m3-scripts/webkit-safari.mjs` | **all PASS** on iphone-15, iphone-se, ipad (10/10 each), mac-webkit (9/9) → `qa/m3-webkit/precheck-2fae4c4/` |
Engineering's numbers reproduced exactly. Not rerun: `recovery-v11-browser.mjs` (checks 6–8; writes into engineering/screenshots), it stays in Sunday's full run. AC14f force-kill is manual, Sunday.

## 3. Defects
None new. Harness note: a stale `vite preview` on port 5207 (cwd = main `game` checkout, not mine) was running after my runs and was killed; my runs used strictPort unique ports so are unaffected.
