# #118 order-chip a11y: Architect review at fc5fe67 (D-HOP-2026-11-09-01)

Date: 2026-11-10 00:14 CET (Europe/Belgrade, UTC+1)  
Lane: architect · Exact tip: `fc5fe67f18085784661b10bc292c67d90a24f8f0` · tree `486193c1e1b13f65a5b2188e721ee8817e40689d`  
Parent / base `rc/v5`: `f20b91839fdf09ba0ed45a890281ccbf7bf2909d`  
Delta: **2 files** `src/ui/app.ts` (+9/−2) + `tests/order-chip-a11y.test.ts` (+87)  
Spec: `product/market/scratch-order-chip-a11y-draft.md` sha1 `82176255315423ec7981444e7766ffcd9ea01821` **MATCH** (verified on main checkout; draft not in PR tree)  
Writes: this note + `engineering/status.md` only. **No** code / PR post / Ready / push / merge / messages. **Not** publishing authority.  
No Playwright / Chromium a11y-tree / axe — **HoQA** owns those (OC-A11Y-1 browser tree + OC-A11Y-3 axe).

## Verdict: **APPROVE** (content)

Bounded a11y fix matches OC-A11Y-1..3 as implemented for jsdom product coverage. No content issues. No leftover readers of chip `aria-label="Customer"`. Do not widen.

## Spec ACs vs implementation

| AC | Claim | Independent check |
|---|---|---|
| **OC-A11Y-1** | name starts with visible `.tag .num` (`fmtCount` string) | `orderChipLabel(n, left)` set from same `n` written to `.num` in one render (`app.ts` ~414–417). Unit: name.startsWith(num) for 1/0/3/1500/12345. Chromium a11y-tree @ 360/1280 → **HoQA**. |
| **OC-A11Y-2** | `<num> egg(s) wanted by customer`; plural from raw `left === 1`; no `aria-label="Customer"` | Helper: `` `${visible} ${raw === 1 ? 'egg' : 'eggs'} wanted by customer` ``. Create path dropped static `aria-label="Customer"`. Unit asserts exact strings + outerHTML absence. |
| **OC-A11Y-3** | name updates same render as `.num`; no role / live region; setAttribute only on change | `if (el.getAttribute('aria-label') !== al) el.setAttribute(...)`. Re-render 4→3→1→0 unit. No `role` / `aria-live` added. axe `label-content-name-mismatch` → **HoQA**. |

## rg: leftover `aria-label="Customer"` / chip name readers

Exact `rg 'aria-label="Customer"|Customer\"'` at head (excl. `node_modules` / `.git`):

- **Only** `tests/order-chip-a11y.test.ts` (asserts **absence** of `aria-label="Customer"` in chip markup) — correct.
- `src/ui/app.ts:88` still has `aria-label="Customer queue"` on `#queue` (group label; **not** the chip; unchanged and out of scope).
- **No** hits in `scripts/golden-game-browser.mjs`, `scripts/check-release*`, QA golden scripts, or other tests expecting chip name `"Customer"`.
- `scripts/rc0-browser.mjs` "B3 chip" is the **goal** chip (aria-label null + visible name), not `.chip.arrive`.
- `src/ui/order-list.ts` more-chip aria is a different control.

**Conclusion:** removing the static chip label does not break existing selectors / golden / release checks.

## Identity / gates

Worktree: `/tmp/rev118` (detached @ fc5fe67). Node **v20.19.2** (`/workspace/tools/node-v20.19.2-linux-x64/bin`). eng flock `.vitest-eng.lock` + nice 10. `--maxWorkers=1` **omitted** after tinypool `RangeError: options.minThreads and options.maxThreads must not conflict` (established local-review exception; flock serializes). Do **not** pass `--minWorkers`.

| Check | Result |
|---|---|
| HEAD / tree / parent | `fc5fe67…` / `486193c1…` / `f20b9183…` **MATCH** brief |
| Spec sha1 | `82176255…` **MATCH** |
| `tsc --noEmit` | **0** |
| `vite-node scripts/sync-economy-cli.ts -- --check` | **0** (balance.json up to date) |
| vitest focused (order-chip-a11y + UI/app/chip/queue-adjacent) | **10 files · 164 passed · exit 0** (incl. new a11y **4/4**) |
| `npm run build` path (sync+tsc+vite build+check-release-build) | **0** (`m4.1+fc5fe67 ok`) |
| `check-globals` chromium | **PASS** (B-4 + blank + newer-save) |

Focused files: `order-chip-a11y`, `m41-8-best-chip`, `orders`, `m41-p2-ui-dom`, `m41-7-ui-fixes`, `m41-p2-ui-minors`, `ui-logic`, `zg-ui`, `zg-ui-onestrip`, `m4a-tracks-ui`.

Evidence: `engineering/reviews/evidence-order-chip-118-fc5fe67/` (overwrote failed first-run PATH/tinypool logs).

## Findings

None content-blocking. Optional non-blockers (do not expand this PR):

1. Chromium a11y-tree + axe on `.chip.arrive` remain **HoQA** (explicitly out of Architect lane).
2. Art owns final English copy; helper is the single swappable string site — correct per draft.

## Scope note

No sim / balance / flag / schema / golden / release-hook changes. Pure UI accessible-name + unit coverage. Architecture advice only — not merge/Ready/publication authority.
