# Architecture review: PR #63 @ b986cd3 (commit 11684c2): LS key `eggfarm.save.reset_at`
Reviewer: Senior Software Architect · 2026-10-22 · Scope: resetProgress (save.ts), bootOrphanIdb / readCorrupt / preserveCorrupt(stillOwner) (idb-mirror.ts), main.ts wiring.

**Verdict: no Blocker, no Major.** Minors below; none of them blocks merge.

## 1. Save compatibility and migration
- This is a new side key, read only by bootOrphanIdb. Absent maps to 0, so no migration is needed and old builds ignore it.
- Downgrade-safe: an old build simply never reads the key.
- Pre-upgrade players have no key, so resetAt is 0. The only effect is a possible one-time M3 (corrupt-save notice and Export) for a player whose next boot has no main/.bak anywhere and who has a corrupt.* copy from before an earlier reset. That needs a reset followed by closing before the first autosave, or clearMirror racing. The same session then writes a fresh main, so it can't repeat. It errs toward showing, which is acceptable (never data loss).

## 2. Quota failure
- The setItem comes after the RESET_KEYS removals, so space has just been freed and a failure is unlikely.
- The failure is caught, and the fallback is the same one-time re-offer as above. Correct direction: never silent, never loss.

## 3. Versioned save envelope or not
- Keeping it outside is correct. The envelope is exactly what Reset deletes, and reset_at must outlive it.
- It describes the storage (the IDB corrupt.* store), not game state, the same class as corrupt.index and headroom_probe.
- Putting it in the envelope would also make it unreadable when the envelope is corrupt, which is the case this code exists for.

## Minors
- **m1, wall-clock dependence.** Corrupt keys are `corrupt.<Date.now()>` and reset_at is Date.now(). If the device clock moves backwards after a Reset, a genuinely new orphan copy gets ts < resetAt and is skipped. That brings back the silent fresh farm this fix targets (the copy stays in IDB, but the player isn't told). Suggestion: at Reset, record the newest existing corrupt key (or a monotonic counter) instead of a time, and treat any key ordered after it (idbCorruptOrder) as new. Rare, so not merge-blocking.
- **m2, namespace.** The key sits under the `eggfarm.save.` prefix but is deliberately not in RESET_KEYS. Prefix scans already exist (scripts/rc0-browser.mjs:298 filters `eggfarm.save*`), and a future "clear all save keys" or Export-by-prefix would sweep it. Add a one-line comment at RESET_KEYS plus a test asserting resetProgress keeps reset_at and that Export/hidden-save-path checks exclude it. Alternatively name it outside the save prefix (e.g. `eggfarm.meta.reset_at`), but only before it ships.
- **m3, test gap.** Add a test where kv.setItem throws QuotaExceededError in resetProgress: the removals still happen, it doesn't throw, and the UI_KEY prefs trim still runs.
- **m4, value hardening.** `Number(x) || 0` accepts any garbage as 0, which is fine. Also clamp a future-dated value (resetAt > now + 1 day maps to 0) so a clock that was ahead at Reset can't suppress orphans indefinitely. Same root cause as m1; m1's fix covers it.
