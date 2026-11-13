# Egg Farm Studio: Tools Registry
Compiled 2026-10-16 14:15 CEST by Tools & Accounts Admin. Only verified facts are recorded; each has its source. Everything else is marked **unknown**. No secret values are recorded here.

| Service | Plan/cost | Owner | Users | Renewal date | Config | Credentials location/holder |
|---|---|---|---|---|---|---|
| GitHub (repo PrincipalLewis/egg-farm) | Plan: unknown. Cost: unknown | Account PrincipalLewis (repo admin) [gh api collaborators] | Collaborators: PrincipalLewis (admin) only [gh api collaborators]. Studio bots work through the box's gh/git | unknown | Repo is **PRIVATE**, verified (`gh repo view`: visibility PRIVATE, created 2026-10-15 22:23 CEST). Token scopes: delete:packages, repo, workflow, write:packages; read:org missing [gh auth status] | GITHUB_TOKEN env var on the box (shared by all agents), account PrincipalLewis [gh auth status]. The cursor-github MCP cannot see this repo (the repo isn't granted to the Cursor GitHub App) |
| Claude Code (Anthropic) | Plan: unknown. Cost: unknown | unknown | Claude QA Tester, Claude Gamer, Claude Code Reviewer, Claude Design Reviewer. Claude UX Reviewer (9b4bd3d2-361d-41a3-9ddd-fa87326df61f, created 2026-10-16). See the Claude Code users table below [roster.md, org-plan.md; Head of Operations correction 2026-10-16] | Login saved ~2026-10-16, so expiry is **~Oct 2027 (estimate, not verified)** [task brief; ~/.claude.json mtime 2026-10-16 14:04] | CLI v2.1.301 at ~/.local/bin/claude. **No model/effort override, verified**: there is no ~/.claude/settings.json, ~/.claude.json has no model/effortLevel key, and ~/.claude/remote-settings.json is `{}`. Global config stays at defaults. Per-bot config: see the Claude Code users table below and ops/claude/README.md | No ~/.claude/.credentials.json file. Env vars CLAUDE_AUTH_CODE / CLAUDE_AUTH_CODE2 are set on the box (they appear as injected secrets). Holder: unknown |
| Grok Bot (studio agents platform) | unknown | Vadim Korshunov (studio owner) [roster.md: agents created by Grok Bot at Vadim's request] | All studio bots [roster.md] | unknown | unknown | unknown |
| Box tooling: git, node/npm, python3, gh CLI | Free/open-source CLIs. No account of their own except gh (above) | n/a | All agents on the shared box | n/a | /usr/bin [which] | n/a |

Headless browser: system Chrome (/usr/bin/google-chrome) and playwright-core (game/node_modules) both work. The smoke test passed (ops/claude/README.md).

Not found on the box: docker, vercel, firebase CLIs. Listing art is in preparation for itch, CrazyGames, and Poki (status.md line 217), but there is no evidence of accounts on those platforms, so they are not listed.

## Open questions
For Head of Operations:
1. What is the GitHub plan and its cost, and when does it renew? Who owns billing for PrincipalLewis?
2. Which Claude Code / Anthropic plan is it (Pro, Max, API?), what does it cost, and when does it renew? Is the Oct 2027 login expiry correct?
3. Who holds the Claude credentials (the source of CLAUDE_AUTH_CODE)?
4. What are the Grok Bot plan, usage limits, cost, and renewal date?
5. Should the gh token get read:org, or is that intentionally left out?
6. Do accounts exist yet on itch.io, CrazyGames, or Poki? If so, who owns them?

For Head of QA:
7. ~~Decide the Claude Code model and effort for the testers.~~ **CLOSED 2026-10-16:** Head of QA chose Sonnet with high effort (QA) and medium effort (Gamer), applied via the ops/claude wrappers.
8. RESOLVED 2026-10-16: Code Reviewer = sonnet/high, cap 15 + 5 re-check (Head of Engineering; was opus/high).
9. RESOLVED 2026-10-16: Design Reviewer = sonnet/high, cap 15 (Head of Product; was opus/high).
10. RESOLVED 2026-10-16: the Claude UX Reviewer budget is 8 calls per pass (Head of Art & UX formal request, confirmed by Head of Operations).

## Claude Code users
| Bot | Id | Owner | Model/effort | Budget | Wrapper | Permissions (owner-confirmed 2026-10-16) |
|---|---|---|---|---|---|---|
| Claude QA Tester | b009dd7a-c461-4dae-96b6-a8362dbd4510 | Head of QA | sonnet/high | 10 calls per PASS_ID | ops/claude/claude-qa.sh | proposed/qa.settings.json; ON (retest passed 14:41 CEST) |
| Claude Gamer | 5ea347e1-6aa6-456e-9d79-cf32ce13904e | Head of QA | sonnet/medium | 10 calls per PASS_ID | ops/claude/claude-gamer.sh | proposed/gamer.settings.json; ON (retest passed 14:41 CEST) |
| Claude UX Reviewer | 9b4bd3d2-361d-41a3-9ddd-fa87326df61f | Head of Art & UX | sonnet/high | 8 calls per PASS_ID | ops/claude/claude-ux.sh | ON (permtest passed) |
| Claude Design Reviewer | de2a045c-9a09-4d18-8515-d5115e2b7890 | Head of Product | sonnet/high | 15 calls per PASS_ID | ops/claude/claude-design.sh | ON (permtest passed) |
| Claude Code Reviewer | 5c46fe73-b09e-452a-a279-1478fb2a01b5 | Head of Engineering | sonnet/high | 15 per PASS_ID + 5 re-check | ops/claude/claude-code-review.sh | ON (permtest passed) |

All wrappers share ops/claude/lib.sh:
- hard timeout (`CLAUDE_TIMEOUT`, default 600 s, setsid + `timeout --kill-after=15`, stdin from /dev/null);
- counting from usage.log, with timeouts and no-output calls refunded;
- PASS_ID format `<branch>-<shortsha>`; design and ux also accept `<topic>-<date>[-rN]` and `<topic>-rN` (others warn);
- Opus override only if `CLAUDE_OPUS_OVERRIDE` equals the PASS_ID, set inline; the logged model is read from the session transcript;
- `--settings … --permission-mode dontAsk`; never `--dangerously-skip-permissions`;
- auth loaded like ask-claude (env file outside the repo).

Wrapper-only rule and evidence rules: ops/claude/README.md. Owners report pass failures to the CEO, with no automatic removal threshold. Vadim's directive (2026-10-16): testers who keep simulating after the access fix should be removed, leaving only the Code Reviewer. That decision is Vadim's, on the CEO's report.

## Claude usage (feeds the CEO weekly summary)
- Every wrapper appends one tab-separated line per call to `ops/claude/usage.log`: timestamp, PASS_ID (build), bot, model/effort.
- Totals per build and per bot: `ops/claude/usage-report.sh`.
- Counted calls as of 2026-10-16 14:42 CEST: **7** (one permtest per bot plus approved retests for qa and gamer, permtest-ce7d59a). Not counted: 3 void (2 hung design calls for m4a-econ-2026-10-16 refunded at Head of Product's request; 1 'Not logged in' attempt). Unlogged, pre-wrapper: 3 bot sessions ~14:04–14:07, 3 login tests ~14:02–14:03, 1 possible effort-flag check ~14:12.

- 2026-11-09 23:40 CET, after the restart (D-CEO-20261109-01): **0** Claude calls since Nov 9. The last `usage.log` line is 2026-10-30 09:30 (pr89-a32faeb, code-review, sonnet/high, ok), and there are no Claude Code session files newer than Nov 9.

10. CEO/Vadim: approve a read-only fine-grained GitHub token for the Claude bots? See ops/proposals/readonly-bot-token.md (free).

## Slack (added 2026-10-16 21:44)
| Service | Plan/cost | Owner | Users | Renewal | Config | Credentials |
|---|---|---|---|---|---|---|
| Slack (workspace via Grok Bot Slack connector) | unknown | Vadim | Head of Operations posts build links (drafts for Vadim to send) | unknown | Connector connected 2026-10-16 21:44, account "default". Channel: #egg-farm (created by Vadim 2026-10-16) | OAuth sign-in held by the Grok Bot connector (Vadim signed in); no secret in files |

## Superpowers (Grok Bot plugin)
- Installed: 2026-10-16 ~21:54 (Europe/Belgrade) by Vadim.
- Plan/cost: free plugin (plugin id 684), no account or credentials.
- Users: all bots (shared skills library). Use is optional; Head of Engineering was told it's available, not required.
- Owner: Vadim (installer). Renewal: none.

## Railway (hosting)
- Status: available, NOT in use (noted 2026-10-16 21:56). Vadim's personal account; reusable if hosting is ever needed.
- Connector: Railway connected as a Grok Bot connector on 2026-10-16 ~21:58 (68 tools, status checked: connected). Usable by bots; still not in use.
- Owner/credential holder: Vadim (Railway account @principallewis, per Head of Operations 21:58). Access is through the connector; no credentials stored on the box.
- Plan/cost/renewal: unknown.
- Leads: not informed yet, per Vadim. Tell them only when a hosting need comes up. Any use or paid plan needs CEO and Vadim approval.

## Studio email (Grok Bot Email)
- Address: henhousestudio@mail.grokbot.com (created by Vadim on 2026-10-16 ~22:03, shown as Connected).
- Plan/cost: part of Grok Bot; any separate cost is unknown. Owner: Vadim.
- Use: sign-up codes, receipts, newsletters. Incoming mail only wakes a bot through a routine. Every send needs Vadim's approval.
- Credentials: none stored on the box.

## Connector survey (heads, closed 2026-10-16 22:25 CEST)
Source: ops-log.md 22:25 entry (Head of Operations). Result: **no new apps or connectors needed.** Nothing was installed. Checked with Grok Bot's plugin search and vendor pricing pages on 2026-10-16 23:15 CEST.

| Request / gap | Raised by | Connector exists? | Cost | Status |
|---|---|---|---|---|
| Repo access for both QA engineers (33ec1b55…, edb6ef85…) | CEO (survey outcome) | n/a (GitHub) | Free | Access is through the shared box gh/git login (PrincipalLewis, verified ADMIN on the private repo at 23:15). No per-bot GitHub account exists. Confirm with Head of QA that this is enough. |
| Real-phone / real-device testing | QA (M3-AC10, smoke plan) | Yes: BrowserStack plugin (546), not installed. Also Revyl (44746620, cloud mobile devices; pricing not checked) | **Paid**: BrowserStack Live Desktop & Mobile from $39/month billed annually; Freelancer $12.50/month (100 min App Live, 1 user) [browserstack.com/pricing] | Deferred by CEO to public mobile-launch planning. Needs CEO and Vadim approval. Free fallback: Vadim's or friends' own phones. |
| Data / Analytics owner | QA and Art & UX (gaps-poll.md) | It's a role, not a tool. If a tool is ever wanted: PostHog plugin (730) exists, not installed | PostHog free tier: 1M events/month, no card [posthog.com/pricing] | Role gap only; org decision for Head of Operations / CEO. Telemetry stays under Engineering for now (org-plan.md). |
| itch.io / CrazyGames / Poki accounts | Art & UX listing prep (status.md) | No connector found | Accounts unknown | Out of scope for M3. Any account needs CEO and Vadim approval. |
| Figma, Notion, Linear, Sentry | none | Figma (657) and Linear (512) plugins exist | n/a | Not requested by any team. No action. |

## Claude bot usage to date (from ops/claude/usage.log, as of 2026-10-16 23:17 Belgrade)
Counted calls only. Timeouts, no-output and voided calls are excluded. Model and effort are in the Claude Code users table above.
| Bot | Calls counted |
|---|---|
| QA Tester | 5 |
| Gamer | 3 |
| UX Reviewer | 1 |
| Design Reviewer | 4 (3 more voided) |
| Code Reviewer | 9 reviews + 10 re-checks (2 no-output) |
| Total | 32 |
Cost per call: unknown, because the Claude plan is unknown.

## Renewal dates (all known)
| Service | Renewal / expiry | Verified? |
|---|---|---|
| Claude Code login | ~Oct 2027 (saved about a year from 2026-10-16) | Estimate, not verified |
| Claude Code plan | unknown | No |
| GitHub (PrincipalLewis) | unknown | No |
| Grok Bot plan | unknown | No |
| Slack | unknown (plan unknown) | No |
| Railway | unknown (not in use) | No |
| Superpowers, studio email | none (free) | Yes |
No renewal falls within the next 7 days that we know of. The 7-day flags start as soon as Vadim confirms any date.

## Incident: GitHub Actions blocked by billing (2026-10-19 ~09:30)
- All Actions jobs on PrincipalLewis are refused: 'recent account payments have failed or your spending limit needs to be increased'. Verified: the last 3 ci runs failed.
- Plan, payment method and Actions budget: unknown (the token lacks the user scope).
- Owner: Vadim (escalated by HoE). Fix note: ops/proposals/github-actions-billing.md. Any spend is Vadim's call.

## Read-only GitHub token for bots
- Status: **APPROVED by CEO 2026-10-19 10:05, waiting on Vadim to create it** (the CEO will raise it with him; nobody else should message him about it).
- Spec: fine-grained PAT, repo PrincipalLewis/egg-farm only, Contents and Metadata read-only, 90-day expiry. Free.
- Setup ready: ops/claude/lib.sh switches bot sessions to it automatically once GITHUB_READONLY_TOKEN exists (as an env secret or ~/.cc/gh-readonly.env, mode 600), and removes the full-scope GITHUB_TOKEN from those sessions. Until then, nothing changes.
- Holder: Vadim (once created). Renewal: 90 days after creation; flag 7 days before.

## The X Subscription (Grok + Cursor + X unified account) — added 2026-10-27 20:55
- What it is (source: docs.x.ai/x-subscription/unify-accounts, cursor.com/help/the-x-subscription/overview, read 2026-10-27): one subscription, workspace and bill for Grok, Cursor and X. Grok and Cursor share one weekly included usage pool; past it, extra usage comes from prepaid credits. Grok Bot is included on Premium, Super and Ultra (not Free or Plus), per Grok Bot release note 2026-10-18.
- Third-party models in Cursor (Claude, GPT) are NOT included; billed at API list prices from prepaid credit. Our Claude Code runs on the separate Claude login and is not affected.
- Unifying is optional and PERMANENT (cannot be undone). It auto-cancels the old Cursor/Grok/X Premium subscriptions and refunds unused time (Apple App Store purchases must be cancelled in Apple). Managed afterwards at grok.com/dashboard. Start points: cursor.com/unify, accounts.x.ai/unify.
- Studio status (Vadim confirmed 2026-10-27 20:52): accounts ARE unified on one X Subscription; Grok, Grok Bot and Cursor usage all spend one shared weekly limit. Still unknown: plan tier, weekly pool size, credit balance, renewal date. Owner: Vadim. Check in Grok Bot Settings > Usage & Billing.
- Impact: Cursor cloud agents and Grok Bot usage would draw from the same weekly pool (we already hit the Grok Bot usage limit on Oct 19).
- Any switch or plan change needs CEO approval, then Vadim's go-ahead (rule 3).

- 2026-10-30 07:37: GitHub push credential re-saved by Vadim after box restore as Grok Bot secret GITHUB_TOKEN (classic PAT, scopes repo, workflow). Holder: Vadim. Expiry: unknown.

## Usage stop guard (hourly) — updated 2026-11-09 23:40 (D-CEO-20261109-01)
- Name: "Usage 65% stop guard" (previously the 90%, then 80%, then 67% guard). It's running again as of the 2026-11-09 23:38 resume.
- Rule: stop all studio work when the shared weekly X Subscription limit reaches 65% (was 67%, D-CEO-20261106-01). Silent below the threshold.
- Usage at resume: 0.2%. Next reset: Thu 2026-11-12 17:53 CET.
- Owner: CEO (the CEO posts the guard's stop and resume decisions). Schedule: hourly (per decisions.md). Model: unknown, because it's a CEO routine I can't read.
- Cost: draws on the shared weekly limit; no separate charge.

## Batched questions for Vadim (CEO to raise the next time Vadim is already talking to us; not blocking, don't ping)
1. X Subscription: plan tier, weekly pool size, credit balance, renewal date.
2. Claude Code: plan and cost, renewal date (login estimated ~Oct 2027), credential holder.
3. GitHub: plan and renewal date; GITHUB_TOKEN expiry; Actions billing status (blocked since 2026-10-19, repo now public).
4. Slack and Railway: plan and renewal date.
5. Read-only GitHub token for the Claude bots (CEO-approved 2026-10-19, waiting on Vadim to create it).
