# v5 ship-set of record (HoP, D-HOP-2026-10-30-30, rev 2 13:07 CET: exact keys, telemetry/post-L10 not flags)
Basis: CEO D-CEO-20261030-09/-10, ranking bfdfd73e. This lists the flag and tunable values the final v5 RC ships with. The full gate runs once, on that RC.

## Exact config keys (src/config/balance.json, as on origin/rc/v5 at 13:06)
- m4.enabled = 1
- m4.flags.streak = 1
- m4.flags.tapCoins = 1
- m4.flags.golden = 1
- m4.flags.breeds = 1
- m4.flags.abilities = 1
- m4.flags.pause = 1
- m4.flags.rc2Refill = 1
- m4.flags.autoRefill = 1
- m4.flags.broody = 1
- m4.flags.zeroGainUi = 1
- m4.flags.clockWage = 1
- m4.flags.salesStopped = 1
- m4.flags.fatigueCue = 1
- m4.flags.bestBuyV2 = 1, REQUIRED (D-CEO-20261030-10, no cuts: a 0 at the RC fails shipflags and the schedule slips). Spec product/farm/m5.1-bestbuy-rebaseline-proposal.md v1.0.4 4ea3841a (live; D-PMFU-BB15). Open PR #100 d654afda at flag 0; merge date superseded, awaiting Architect/SIM-only flag-list and AC13 sign-off. D-HOP-2026-10-30-47/-49/-50/-51
- m4.zeroGain.confirm = 0 (a tunable value of record, not a flag)

## Not flags (ship always-on)
- telemetry v0.6.2 (telemetry-spec.md d170eb09) + telemetry-spec-errata-v5.md (sha of record at gate): no flag, ships always-on, TELEMETRY_SCHEMA_VERSION "0.6.2" per D-HOE-20261030-19 (pre-0.6.2 rings marked legacy:true), gated by the #T card and save-migration tests (D-HOP-2026-10-30-41)
- post-L10 progression: data only (economy CSV L11-30), no flag

## Tunables of record
- tc_streak_cap = 0.27 (breeds=1, Broody offset; breeds spec rev 3.8.7, D-HOP-27)
- economy CSV: the post-L10 plus breeds bc_* PR, sha recorded here on merge (needs HoP approval, HoQA gate and HoE integration)

## Reference configs (test only, not shipped)
- pre-M5 Collect: final RC with streak and tapCoins forced off (D-HOP-29 a)
- flags-0: final RC with all M5 flags at 0, golden pinned by HoE (D-HOP-29 b)

Any change to this file needs a new HoP decision ID.

## Not in v5 (D-HOP-2026-10-30-36)
- First-hire nudge (workers/rc2-first-hire-nudge.md): never in M5 scope of record, deferred to 5.1. first_worker_hired ships with via_nudge=false; first_hire_nudge_* events are not emitted.
