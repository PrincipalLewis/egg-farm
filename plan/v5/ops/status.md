# Ops status
## Renewals
| Service | Renewal/expiry | Confidence | Within 30 days? |
|---|---|---|---|
| Claude Code login | ~Oct 2027 | Estimate | No |
| GitHub | unknown | — | unknown |
| Grok Bot | unknown | — | unknown |

## Open items
- OPEN (owner: Vadim, via Head of Operations): plan, cost and renewal date for Claude Code, GitHub, Grok Bot and Slack; Claude credential holder.
- ~~Head of QA: decide the Claude Code model/effort for the tester bots.~~ CLOSED 2026-10-16: Sonnet with high effort (QA) / medium effort (Gamer), via ops/claude wrappers.
- 2026-10-16: Claude Code users corrected per Head of Operations. claude-ux.sh is ready for Claude UX Reviewer (not yet created): sonnet/high, cap 8. Each wrapper logs calls to ops/claude/usage.log, and ops/claude/usage-report.sh gives the weekly totals.
- CLOSED: Claude Code Reviewer model/effort = sonnet/high (2026-10-16).
- CLOSED: Claude Design Reviewer model/effort = sonnet/high (2026-10-16).
- CLOSED: Claude UX Reviewer budget = 8 per pass.
- 2026-10-16: Claude UX Reviewer created (id 9b4bd3d2-361d-41a3-9ddd-fa87326df61f); registry updated.
- 2026-10-16: added claude-code-review.sh and claude-design.sh, so all 5 Claude bots log through a wrapper.
- 2026-10-16: CLOSED Q8/Q9: Code Reviewer and Design Reviewer set to opus/high.
- 2026-10-16 14:28: Code Reviewer and Design Reviewer switched to sonnet/high (owners agreed to Vadim's proposal). Caps: CR 15+5 re-check, DR 15.
- 2026-10-16 14:40: All 5 Claude wrappers rebuilt on ops/claude/lib.sh: hard timeout, usage.log counting with refunds, PASS_ID check. The 2 hung design calls (m4a-econ-2026-10-16) are refunded and voided.
- 2026-10-16 14:40: Permissions owner-confirmed for all 5. ON for design, code-review and ux (permtests passed). qa/gamer: smoke.mjs was wrongly denied; fixed; CLOSED by the 14:42 retest.
- CLOSED 2026-10-19 09:12: build id is on the page. smoke.mjs reads build_id m3-rc1-pre+246de09 on the Latest release asset (m4b-dd223f5, egg-farm.html sha256 0bc5bb72…). NEW OPEN (owner: Head of Engineering): the release tag is m4b-dd223f5 but the build id still says m3-rc1-pre+246de09, so the label is stale or the wrong build was attached.
- APPROVED by CEO 2026-10-19 10:05: read-only GitHub token. Waiting on Vadim to create it (CEO will bring it up with him). The wrapper hook is ready in ops/claude/lib.sh.
- Pass failures are reported by owners to the CEO; no automatic removal threshold. Removing simulating testers is Vadim's call, on the CEO's report.
- 2026-10-16 14:42: qa/gamer retest passed (smoke.mjs screenshot+JSON in their report folders; git push / printenv refused). Permissions are now ON for all 5 wrappers. Added home, ~/.cc and /proc read denies after a no-cost review.
- 2026-10-16 21:44: Slack connector connected by Vadim; added to registry. Channel/plan unknown.
- 2026-10-16 21:47: Design r1 'opus' log line checked. Opus really ran (session 2f2bce1f); the old claude-design.sh default was opus. Fix: the Opus override must equal the PASS_ID inline (inherited values ignored), and the logged model now comes from the session transcript. Design/ux wrappers accept review PASS_IDs. smoke.mjs reads build_id m3-rc1-pre+ccd7bf9 on rc1/ux-clarity.

- 2026-10-16 21:55: Superpowers plugin installed by Vadim (free). Recorded in the registry, and Head of Engineering told it is available but optional.
- 2026-10-16 21:56: Vadim has a Railway account (not in use). Recorded in the registry; leads are not to be told until it is needed.
- 2026-10-16 21:58: Railway connector connected (verified). Still not in use.
- 2026-10-16 22:03: Studio email henhousestudio@mail.grokbot.com created by Vadim. Recorded in the registry.
- 2026-10-16 23:15: Connector survey recorded in tools-registry.md: no new apps needed. Only paid item is real-device testing (BrowserStack from $39/mo), deferred and needing CEO + Vadim approval. QA engineers' repo access is through the shared box gh login; confirm with Head of QA. Nothing installed.
- 2026-10-16 23:17: Claude usage and renewal tables added to the registry. No known renewal in the next 7 days. Plan dates for Claude, GitHub, Grok Bot and Slack are still unknown (asked Vadim).
- 2026-10-17 04:46: After the box reset, re-checked: GITHUB_TOKEN (PrincipalLewis) works again for gh and git fetch, the Claude Code login works (sonnet test), the Railway/Slack/GitHub connectors are connected, and game/node_modules has been reinstalled. Reports lost in the reset are not recoverable.
- 2026-10-19 09:12: OPS-2 done. Remaining open items, each with an owner: build-id label mismatch (Head of Engineering), read-only token (CEO), plan/renewal dates (Vadim). Also: game/node_modules was missing again this morning; reinstalled with npm ci.
- 2026-10-19 09:33: OPEN (owner: Vadim): GitHub Actions blocked account-wide by billing (failed payment or spending limit). Fix note: ops/proposals/github-actions-billing.md. Nothing changed or spent.
- 2026-10-19 10:05: Weekly renewal check: no known renewal or expiry within the next 7 days (to 2026-10-26). Only known date is the Claude Code login, ~Oct 2027 (estimate). Plan/renewal dates for Claude Code, GitHub, Grok Bot, Slack, Railway are still unknown (owner: Vadim). GitHub Actions still blocked by billing at 10:01 (latest ci runs failed). Weekly Claude usage: 96 counted calls (Oct 16-19), no bot over its per-PASS_ID cap. Weekly cost summary prepared and handed off for delivery to the CEO.

- 2026-10-27 20:52 — X Subscription: Vadim confirmed Grok/Cursor accounts unified, one shared weekly usage limit for Grok Bot + Cursor. Tier, pool size, renewal date unknown (owner Vadim).
- 2026-10-27 20:58: Logged D-VK-20261027-01 (Cursor available to studio, shared usage limit) in decisions.md + research/cursor-x-subscription.md.
- 2026-10-30 07:30 — BLOCKER (from CEO): after box restore, GITHUB_TOKEN not in shell env, gh not logged in, no ~/.config/gh. Saved Grok Bot secret GITHUB_TOKEN still exists (store rewritten 06:20) but platform no longer exports it to shells; CLAUDE_AUTH_CODE/2 also not exported (Claude login via ~/.cc/env unaffected). Git helpers still expect $GITHUB_TOKEN / gh. Did not extract the secret from the store. Fix needs Vadim: re-save GITHUB_TOKEN secret (same value or new PAT) or Update Bot's Computer. Reported to CEO + HoE.
- 2026-10-30 07:37 — RESOLVED: Vadim re-saved GITHUB_TOKEN as a Grok Bot secret (classic PAT, PrincipalLewis, scopes repo+workflow; read:org missing = gh warning only, same as before). gh auth OK, dry-run push OK. Claude login unaffected (loads from ~/.cc/env; nothing uses CLAUDE_AUTH_CODE). Claude hit its session limit, resets 08:40 CET.
