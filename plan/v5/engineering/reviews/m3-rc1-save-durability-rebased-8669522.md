# Review: m3/rc1-save-durability-rebased @ 8669522 (base main 4aadcbf)
Reviewer: Claude Code Reviewer (read-only, single pass). Checkout: /workspace/review-8669522 (detached).
Specs: product/farm/m4a-spec.md M4A-31 (b),(f). Note: ask-claude was not used; I did this pass by hand against the diff.

**Verdict: CHANGES REQUESTED** (1 blocking, 1 major, 4 minor, 1 nit)

## BLOCKING
### B1. A newer save that exists only in IndexedDB is overwritten by the old build
- src/save/idb-mirror.ts `reconcile` (`if (newerSaveVersion(lsRaw)!==null || newerSaveVersion(idbRaw)!==null) return 'ls'`) and src/save/save.ts `loadSafe` (only checks the localStorage `eggfarm.save` for a newer version); src/game.ts constructor `this.save()` → `this.mirror?.write(raw)`.
- When IDB `save/main` is newer (v7) but localStorage holds an older v6 save or nothing, reconcile returns 'ls'. Then loadSafe sees no newer save, so Game loads v6 (or starts a new game), and the constructor's load-time save plus the autosaves overwrite IDB `main` with v6. The v7 progress is lost. This breaks M4A-31(b) and (f)6, which say no IDB mirror writes while a save is refused.
- How it happens in practice: in the newer build a localStorage write fails (quota/private mode), and Game.save's catch still writes the mirror. Or localStorage gets evicted or cleared while IDB survives.
- Repro: put v7 JSON in IDB eggfarm/save/main. Set `eggfarm.save` to a valid older v6 save, or remove it. Load the rc1 build. The game starts with no `.newer-save` layer, and IDB main now holds v6.
- Fix: work out "newer" from both copies before building the Game, and refuse if either one is newer (newer dialog, no Game, no mirror).

## MAJOR
### M1. A refused (newer-save) tab still claims the tab lease and kicks the live owner tab
- src/main.ts boot: `lease.requestFlush()` and `lease.claim()` run before the Game, and so before the newer-save check. `lease.release()` only runs afterwards.
- With the newer build open in tab A, opening the old build in tab B sends flush and claim. Tab A deactivates and shows "Game open in another tab". That is player-visible disruption, and requestFlush also makes A write its save because of B. The refused tab should not take part in the lease.
- Repro: open the v7 build in tab A (or any owner tab), then open the rc1 build in tab B with the v7 save stored. Tab A freezes with the tab-guard modal.

## MINOR
- m1. src/save/save.ts `newerSaveVersion`: uses `Number.isFinite`, but (f)3 requires an integer. A save with version 6.5 or 7.5 is refused instead of going down the corrupt path. Use `Number.isInteger`.
- m2. src/save/save.ts `loadSafe`: if main is corrupt and `.bak` is newer (v7), the .bak is treated as corrupt (a copy is preserved, nothing is lost) and a new game starts and autosaves. The .bak itself is protected by the rotation guard, but the spec wants a refusal whenever a newer save is present. Repro: corrupt `eggfarm.save` plus a v7 `eggfarm.save.bak` gives a fresh game instead of `.newer-save`.
- m3. src/ui/save-recovery.ts NEWER_SAVE_STRINGS: the copy differs from M4A-31(b) ("This save is from a newer version of Egg Farm. Open the newer build to keep playing."). Align the copy or get the spec updated.
- m4. scripts/check-release-build.mjs globals allowlist: the regex only catches `window|globalThis|self.<name> =`. It misses minified aliases (`const w=window;w.x=`), bracket access (`window["x"]=`), `Object.assign(window,…)` and `defineProperty`. It's a heuristic, so it can pass a bundle that does leak globals. Add a runtime check (scripts/release-globals-browser.mjs looks like the right place) as the gate.

## NIT
- n1. src/main.ts: once refused, `gRef` stays null and the lease onLost callback is a no-op. That's fine, but add a comment that this is intentional.

## Checked, no issues found
- The v1→v6 migration chain is unchanged except for the newer-version short-circuit before validate (checksum). That ordering matches (f)3.
- `.bak` rotation never overwrites a newer .bak (save.ts save()).
- Corrupt copies: `preserveCorrupt` behaviour is unchanged (renamed and exported). reconcile preserves a corrupt localStorage save before overwriting it with IDB.
- Newer save in localStorage: Game is readOnly, the constructor save is skipped, main returns before UI, autosave and pagehide. No save writes. Telemetry and installId still write, which (f)5 allows.
- Single-tab guard: every save checks canWrite→owns(), and frame/dispatch stop when inactive or held.
- Offline earnings and sim tick: only gated, the logic is unchanged. Money math is untouched.
