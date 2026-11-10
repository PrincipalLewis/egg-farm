# Re-check: PR #24 — a8f8611 (vs 1e8fd2d)

Read-only, no Claude calls. Worktree /workspace/review-a8f8611 (detached). Runs in /tmp/np3/game with **no sibling product/**. Probes that need a product dir point `ECONOMY_PRODUCT_DIR` at the real `egg-farm-studio/product` or at a temp copy.

## Verdict: PASS (approve). The earlier m1 is closed. One new minor (advisory).

src and package.json are unchanged since 1e8fd2d.

## Probes (`node scripts/check-economy-copy.mjs …`)
| Probe | Exit |
|---|---|
| `--strict` alone, no product/ | **1** |
| `--strict` against the real product/ | 0 (4 vendored files and the CSV match) |
| vendored seller_variance_sim.py tampered | **1** (`sha256 9cf5b090 != SOURCE pin 560ea73b`) |
| SOURCE emptied | **1** (`SOURCE lists no files`) |
| SOURCE row with a non-`product/` source path | **1** (`malformed SOURCE row`) |
| product/ copy of the proposal missing (temp dir) | **1** (`… not found`) |
| product/ economy_sim.py drifted (temp dir) | **1** (`… (eddf945d) differs from … (ebfb3d1c)`) |
| SOURCE row prefixed with `C:` | **0**: row silently ignored (see m1) |
| non-strict `--product`, no product/ | 0 (warning only) |
| default (no flags) | 0 (`opt-in only … skipped`) |

The non-strict mode is still warn-only. `check-economy-copy` appears in package.json only as its own script, not in `test` or `build`.

## Gates (no parallel load)
`npm test`: 49 files, **476/476**. `npm run test:slow`: **11/11**.

## Findings
### m1 (minor) — SOURCE rows that contain ':' are dropped instead of flagged
`scripts/check-economy-copy.mjs:21`: the filter `!l.includes(':')` removes the `vendored: <date>` header, but it also silently drops any file row containing a colon (a typo, or a Windows-style path). That file then goes unchecked and `--strict` exits 0. The pin test in `tests/economy.test.ts` (SOURCE == SHA256SUMS) would still catch a *changed* row in CI, but not an unchecked one in this release gate. Fix: skip only `^vendored:`, and also require `rows.length` to equal the number of SHA256SUMS entries.

### Note
Process: `--strict` is now a complete drift check (CSV + vendored files vs product/). It still has to be run by the rc-tag checklist owner (HoE/Architect), because it isn't in CI by design.
