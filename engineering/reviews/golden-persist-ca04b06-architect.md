# Architect review · PR #109 golden persist B · ca04b062
**Date:** 2026-11-05 21:46 CET (Europe/Belgrade)  
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/109  
**Head:** `ca04b062be0170e7f2de60a11c6ccc9cc4a68b32`  
**Base:** `feat/v5-golden-spawn` `b0d7e8526c8a21f0688b338b4dec2a460bc257e7`  
**Bundle:** `scratch/bundles/fix-saves-golden-m5persist-ca04b06.bundle`  
**Bundle sha256:** `7c8e0ba9fc0cc76d069b58bb5055db77d9f342c8e730ce2052370a691ed5da45` (verified OK; requires b0d7e85; HEAD ca04b06)  
**Contract:** `engineering/reviews/arch-golden-slice2-contracts-20261105.md` ADDENDUM B (REVISED 21:29 CET)  
**Reviewer:** Architect · worktree `/workspace/wt-review-109-ca04b06` @ exact head  
**Logs:** `scratch/architect/review109-ca04b06/`

## Verdict: **APPROVE (B scope)** — 0 Blocker / 0 Major / 1 Minor / 1 nit

B matches the revised contract. A (endSession / live `goldenUnload`) is **out of scope** for this PR (Features). Local exact-head vitest **not run**: `.vitest-eng.lock` has **11 flock waiters** (rule 21); hosted `gate` still **pending**. Approve on static review + PR’s unit file T1–T3; confirm green gate before merge.

---

## Diff summary (b0d7e85..ca04b06)
6 files, +135/−12:
- `src/save/m5-fields.ts` — `m5Persist(s, b?)` egg→copy→`drawGap`→strip
- `src/save/save.ts` — `serialize(..., b?)` / `save` already threaded `b` into persist
- `src/game.ts`, `src/main.ts`, `src/ui/app.ts` — production `serialize` call sites pass balance
- `tests/v5-golden-m5persist.test.ts` — new T1/T2/T3 (+ flag-off / load-0)

## Contract checklist (B)

| Requirement | Result | Evidence |
|---|---|---|
| Live `s` never mutated | PASS | `{ ...s }; delete out.goldenEgg`; T1 asserts `JSON.stringify(s)` unchanged, egg ref same (`m5-fields.ts` L57–59; test L35–38) |
| Egg on + golden on → one `drawGap` on **copy** (atomic `evRngState` + `nextSpawnRemainingS`) | PASS | `return stripSession(drawGap(out, b))`; `drawGap`/`evDraw`/`ensureEvRng` pure (`golden.ts` L89–92, `rng.ts` L18–24) |
| No telemetry from persist | PASS | no `ev` arg / no pushes |
| Same input → identical JSON every call | PASS | T2 L54–61 |
| No egg (incl. spawn-due `nextSpawnRemainingS===0`) → strip-only, **no** draw | PASS | T3 L75–86; `m5Load` still `m5Persist(s)` without `b` (L74 comment: stored 0 not re-drawn) |
| Flag off / missing `b` → strip, no redraw | PASS | test L89–95; shipping `golden: 0` (`balance.json` L166) |
| SAVE_VERSION 6 | PASS | `save.ts` L7; T1 L39; disk `version` T2 L64 |
| Production serialize/save pass `b` when egg possible | PASS | `Game.saveWithQuotaRetry` → `save(..., this.b)`; mirror fallback `serialize(..., this.b)`; tracks headroom `serialize(..., p.on)`; `main.ts` / `app.ts` recovery `live` serializers pass `g.balance` |
| Offline same semantics (T6 helper) | PASS for shared path | Base already has `m5Offline` → `goldenUnload(..., 'offline')` (`m5-fields.ts` ~L118). B does not alter offline. Full T6 byte-parity is Features A (`9add0b6` claims it). |
| T4/T5 | N/A here | Features-owned (live unload + endSession compose) |

## Minor
**M1 · `debugBackdateSave` second write omits `b`** (`game.ts` L338):  
`save(this.kv, this.persisted(), this.now() - ms)` — no balance → egg on screen would strip without copy-draw. Dev/QA only; first `this.save()` is correct. Fix when touching the line: pass `this.b`.

## Nit
**N1 · `b?: Balance` optional** — contract text used required `b`; optional is fine for `m5Load` strip-only and legacy tests. Document that **production writers must pass `b`** (they do). Do not make `serialize` require `b` without a test sweep.

## Hosted CI (inspected 21:46 CET)
| Check | Status |
|---|---|
| gate | **pending** (run 42105523962) |
| pacing-x1-stack ×3 | **pending** |
| k10-breeds-offset | pass (non-required) |

## Local tests
**LOCK PENDING.** `.vitest-eng.lock` contended (11 flock waiters: QA schema, review104, p8-slim, pr84, golden-rewards, …). Lane-run architect queued/exited without acquiring. Exact-head `tests/v5-golden-m5persist.test.ts` **not executed** on this box this turn. Re-run when lock free; do not merge on static-only if gate stays red.

---

## Related ruling · Features A `9add0b6` open Q7: `refuseNewer` vs egg unload

**Context:** Features Game FINAL @ `9add0b6b85ebcfbfc135d79dd07588280d66f718` (restack onto #109 then Draft). PR-BODY §Remaining #7: `refuseNewer` does not unload the egg; asks Architect.

**Code (ca04b06 / same freeze path):**
```ts
refuseNewer(v) {
  newerSave = v; readOnly = true; inactive = true; mirror = null; endHiddenOnFreeze();
  track('save_newer_version'); onNewerSave?.(v);
  // no save(), no state mutation, no goldenUnload
}
endSession() { if (resetting || inactive || held()) return; /* … */ }
```
After freeze, `endSession` **early-outs** on `inactive` — pagehide will not unload either.

**Not R10b.** R10b = same-build single-tab **takeover** (`deactivate` → `goldenUnload('takeover')` before peer owns the save). `refuseNewer` = **newer-build** save detected (BUG-2 / M4A-31): this tab permanently loses write authority; newer format/bytes must not be overwritten.

### Ruling (Architect): **do NOT `goldenUnload` / mutate / write on `refuseNewer`**

1. **No writes** — absolute (ADR / BUG-2). Unload’s purpose is a persisted gap; without a write the draw is useless and dangerous if a later bug wrote.
2. **No live `drawGap`** — would advance in-memory `evRngState` that can never be the committed save; risks confusing any accidental write or export-of-live-state paths.
3. **Egg is session-only** (R10a) — abandoning the tab without `collectible_expired` is acceptable under “tab no longer owns progress” (same class as flush loss / frozen tab). Newer build’s save never holds an egg.
4. **Contrast:** lease `deactivate` **must** keep `goldenUnload('takeover')` (R10b). Reset / pagehide unload stay as A.

**Optional (non-blocking):** UI may hide the egg sprite when `newerSave !== null` without calling unload (display-only). No sim/rng change.

**Restack note:** spawn base `goldenUnload(s,b,reason,ev?)` vs Features A `goldenUnload(s,b,ev,reason)` — reconcile signature when stacking A onto ca04b06; prefer Features A order matching the revised Architect addendum `(s,b,ev,reason)`.

---

## Pending before merge
1. Hosted **gate** green on ca04b06.  
2. Optional: local T1–T3 when vitest lock free.  
3. Features restack A onto #109; T4/T5/T6 on combined head.  
4. M1 debugBackdateSave `b` when convenient.


---

## M1 recheck · tip `98d2cbe93ac3a0994079587f41e1a0865051d705` · 2026-11-05 21:50 CET

**Delta vs ca04b06:** exactly 1 commit, 2 files (+14/−1).
- `src/game.ts` L338: `debugBackdateSave` → `save(..., this.now()-ms, **this.b**)` (closes M1).
- `tests/v5-golden-m5persist.test.ts`: new test asserting backdated disk has drawn gap/rng, live state unchanged.

**No other behaviour change.** `m5-fields.ts` / `save.ts` / production serialize sites / golden sim untouched. **Not** related to golden #107 `a6d44c2` GE-AC26 `all_sales!=1` reject (not in this tip; do not conflate).

**Bundle:** `scratch/bundles/fix-saves-golden-m5persist-98d2cbe.bundle` sha256 `53023441e4954982917e55c8057a2a683a930da67b9106caeefb75f8fcd3c656` verified; requires b0d7e85; HEAD 98d2cbe.

**Evidence (honest):**
- Static delta: **M1 CLOSED**.
- Hosted on PR tip 98d2cbe (inspected 21:50 CET): **gate IN_PROGRESS** (run 42106981155); pacing-x1 ×3 IN_PROGRESS; k10-breeds-offset pass (non-required).
- Local exact-head vitest: **still LOCK PENDING** (flock waiters on `.vitest-eng.lock`); not re-run this turn.
- HoE-reported “cloud targeted 20 pass”: **not independently verified from an artifact on disk this turn** — accept as HoE report only; Architect evidence for M1 close is the byte-small diff + new unit assertion, not a re-executed cloud log.

**Verdict update:** prior APPROVE (B) stands; **M1 closed** at 98d2cbe. Merge still waits on hosted gate green (unchanged).
