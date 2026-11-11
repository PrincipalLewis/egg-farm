# HoQA review: Golden Egg v1.3.2.3
Decision: **QA-D-1105-GOLD1323 — ACCEPT-WITH-NOTES**
Date: 2026-11-05 (Europe/Belgrade, CET).
Scope: focused paper delta review under D-HOP-2026-11-05-11; not a build, implementation, economy gate or release approval.

## Provenance
Verified from disk:
- Live `product/collection/m5-golden-egg-spec.md`: sha1 `d3934b4843f8f28a8b459e13b51044ae9f64a617` (matches).
- Frozen `product/collection/m5-golden-egg-spec.910098bd.md`: sha1 `910098bdc4b4a7906078c06510e06ac95757ee43` (matches).
Read the full live spec, full predecessor-to-live diff, live `qa/m5/test-plan-golden-egg.md`, and the Architect slice2 contract record (including Product ruling). Unchanged dependency systems are not re-certified by this focused review.

## Full diff / scope control
Exactly six changed regions (live line numbers):
1. L1–2: version/date, clarification status and frozen predecessor provenance.
2. L172 R22: fixed 1-only v5 domain; invalid 0 has no supported alternate semantics. Existing all-sales paths and multiplicative payout remain.
3. L260: table labels the existing value 1 a fixed constant rather than a sale-scope tunable.
4. L271: validation requires 1, flags/rejects 0; no silent coercion or player-only interpretation.
5. L379 GE-AC26: tunable-only sweep plus explicit negative validation case for 0; points back to GE-AC10.
6. L864: matching changelog/provenance entry.
No unrelated drift. §4 formulas and §10 build-size text are byte-identical. No economy number, reward, timer, sale factor or supported-config gameplay change in this delta. Validation coverage is newly explicit; this is not evidence that implementation already validates it. No code/build or CSV was changed by this review.

## Oracle byte checks
Compared raw bytes from each section heading up to (excluding) the next section heading, including trailing whitespace/newlines:
- §9.1: identical, 11,496 bytes; sha256 `e00612540d9f7b8ce3f2fb0f1783b143fb1fee4ad92b192eee107832cacf8768`.
- §9.2: identical, 6,237 bytes; sha256 `089a3fd883d58eb8851e66a04b3c601dc3cdcb4c76c76fb612a3947b25e9beb4`.
- GE-AC10 entire criterion: byte-identical (L354). Player, worker and Basket-stock sale acceptance is unchanged.

## Substance and consistency
All six references to `tc_frenzy_all_sales` (L2,172,260,271,379,864) agree: valid v5 domain is {1}; 0 is invalid, not another gameplay branch. Reviewed all acceptance criteria: none requires a valid 0 sale-scope branch. GE-AC34's 0 is the separate `m4.flags.golden` feature-disable flag, not this constant. Likewise the 1× frozen-sale cases concern focus-clock suspension, not a 0 config branch.
GE-AC26 now explicitly supplies 0 and requires validation to flag/reject it as invalid with no alternate branch. This is an independently testable negative-config requirement, not an executable test result. Wording permits an explicit invalid diagnostic rather than prescribing a particular exception/exit API; silent acceptance/coercion does not satisfy it. Confirm valid 1 remains accepted and all-sales GE-AC10 remains the positive behaviour oracle.
The prior R22 already specified all sales at 1 without defining 0; narrowing the formerly broad tunability wording removes that ambiguity. Architect record section A and its Product-ruling addendum agree. No new player-only implementation should be inferred.

## QA plan note (non-blocking to spec acceptance)
Live plan: `qa/m5/test-plan-golden-egg.md` v0.8.
- **GE-AC26 row, L82 (Saves, U + grep): needs update by its owner before execution.** Its blanket “change every tc_egg_*/tc_frenzy_* ... behaviour follows” implicitly sweeps this fixed constant into valid tunables. Exclude `tc_frenzy_all_sales` from that positive sweep; add explicit valid-1 and invalid-0 validation assertions, with no silent coercion or alternate sale branch. No row explicitly names 0 as a valid sale-scope setting; this is an implicit wildcard inconsistency, not proof a 0-branch test already exists.
- **Plan provenance, L3–4:** re-pin the applicable spec version/hash when the owner updates the plan (currently v1.3.2 / older v1.3 wording).
- GE-AC10 row L64 remains the correct all-sales positive scope; no sale-scope change required.
Plan deliberately left untouched per task. Other historical plan issues are outside this delta review.

## Review summary
Completeness: 5/5 required delta checks covered (provenance, complete diff, preserved oracles, consistent negative-config AC, plan impact). Dependency check: touched Architect/Product contract agrees. Value conflicts: none introduced. Blocking revisions: none. Recommended revision: plan GE-AC26 and provenance as above. Disagreements: none; single-reviewer QA lens, no independent specialist review claimed. Scope signal: S (contract clarification only).

**Verdict: ACCEPT-WITH-NOTES.** Accept spec clarification; track the QA-plan follow-up separately. No implementation/test-pass/merge/release claim.
