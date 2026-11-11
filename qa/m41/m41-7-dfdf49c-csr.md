# M41-7 CSR sections, PR #63 (Saves & Release QA) · 2026-10-22 21:15 CEST
**Status: NO VERDICT on dfdf49c.** By the CEO via HoQA (21:04), all dfdf49c runs stopped. The full CSR gate runs **once, on the fix SHA**, which is still to come. The dfdf49c results below are an **appendix of supporting evidence only**.

## Fix-SHA run (ready; scripts checked by syntax and dry-run only)
Spec of record: `product/farm/corrupt-save-recovery-spec.m41-final.md` sha256 `cc6b7e23…8817c` (the runner refuses any other sha). The fcebedb3→cc6b7e23 diff was done by HoQ; QA had no fcebedb3 copy. Gate AC for the explainer: **D-HOP-2026-10-22-06**. Chromium blocking on **:5961**, each browser step under its own `flock /workspace/egg-farm-studio/.browser-test.lock timeout 600`. Firefox/WebKit non-blocking.
```
F=<full fix sha>; S=${F:0:7}
# items 1, 2, 6, 7, 8: CSR ACs (vitest) + DOM subset + CSR-8a/8b + CSR-14 M5/Q + settled re-measure + dialog UI (tap targets settled vs mid-animation, aria, copy)
CSR_EV=$PWD/qa/m41/m41-7-$S/csr bash qa/m3-scripts/csr-m41-7-acs.sh $F 1          # ~6-8 min + lock wait
# CSR-9c explainer gate (D-HOP-22-06) + CSR-9/9a/9b dialog tests + QEL-12/13 + build-id/check-globals/rc0 Chromium
bash qa/m3-scripts/m41-7-delta.sh $F "prep dialogs csr9c qel rc0"                  # ~8-10 min + lock wait; evidence qa/m41/m41-7-$S/delta/
# info only (M4.2): CSR-12 probe
flock .browser-test.lock timeout 600 node qa/m3-scripts/csr12-ls-throw-probe.mjs qa/wt-m41-7-$S-acs 5961 qa/m41/m41-7-$S/csr/csr12-probe/$S-preview preview $S
# item 8 (static): diff <(git -C game show $F:tests/fixtures/copy/csr9-recovery-copy.md) art-ux/copy/csr9-recovery-copy.md
# dry run of either script: DRY=1 bash qa/m3-scripts/<script> $F
```
If the gates run already covers QEL/rc0 on the same SHA, call delta.sh with `"prep dialogs csr9c"`.

| Item | Script / case | Oracle |
|---|---|---|
| 1 CSR ACs | `csr-m41-7.qa.test.ts` (155 tests; fixtures SHA256SUMS `e2d2eee7…`), `csr-m41-7-browser.mjs` | -01 (a)–(c); (d) per -04: newer .bak → M1, tie → M1, newer IDB silent + 1x save_restore{idb}; tried[] = bak, idb (+ v6_backup only if no valid tier-A copy, never on defer); per-store copies + dedupe; CSR-10 store-null/passthrough; M5 'Export save file' |
| 2 CSR-8 / CSR-14 | `csr-m41-7-b8-14.mjs`: B-CSR8a (owner loses to a newer tab), B-CSR8b (race loser during the awaited IDB copy), B-CSR14-M5-lease-quota, B-CSR14-Q-preserve-quota | spec :56, CSR-14 |
| 6 Tap targets | `csr-m41-7-ui.mjs`: M1, M1cf, M2, M3, M4 (IDB open hangs → defer), M5, legacy Q, legacy cantsave @360/375/390. **Settled** = recovery-layer finite animations finished + 2 rAF (transitionend logged); **mid-animation** = every-frame sampler from insertion for 1.2 s. Reports getBoundingClientRect h/w + computed min-height | primary ≥48, Export ≥44, strict, settled (blocking); mid-animation min (info) |
| 7 EXPORT_ARIA | `csr-m41-7-ui.mjs` | every Export aria-label starts with its visible text; `EXPORT_ARIA` never on M1–M5 (data-notice); legacy dialogs recorded |
| 8 Copy | `csr-m41-7-ui.mjs` rendered title/body/button/link/aria/badge vs `art-ux/copy/csr9-recovery-copy.md` (sha256 8dec99cd…) + static diff | rendered diff = bug; stale fixture only = Info |
| CSR-9c (gate per D-HOP-22-06) | `csr9c-explainer-queue.mjs`: M1-preM4, M2-preM4 (pre-v7 F30 / unmarked v6 F12), WELCOME-preM4, M3-fresh; flows dismiss-then-reload and reload-before-dismiss | (1) never under .recovery-layer or #modal-layer.open (every frame); (2) still visible after 12 s, no auto-dismiss; (3) seen false in mem/LS/IDB until the dismiss click (timestamped writes); (4) a reload before dismissal shows it again; (5) after dismissal, a reload shows 0. M3/fresh: 0 cards. Welcome back: queued the same way |
| CSR-9c rest, CSR-12 | N/A for M4.1 (CSR-12 = M4.2 Major, `csr12-ls-throw-m42-major.md`) | — |

**Expected on the fix SHA if not fixed:** CSR-9c (2)/(3) fail on dfdf49c behaviour (auto-dismiss after EXP_MS 8 s; seen set when shown) and (1) fails (Art M-1). **B-CSR8b is a HARD gate (HoQA 21:09, confirmed Major on dfdf49c, A-3b).**

## Appendix: dfdf49c supporting evidence (runs finished before the stop; evidence `qa/m41/m41-7-dfdf49c/csr/`)
- **Verified (fetch only):** dfdf49cd904398c7e302eec16161f8fb63b10a8d is on `origin/fix/saves-csr-loadsafe` and is a fast-forward from 9cce82d. Ancestors dd223f5, 1682a0c, 66680eb, 9cce82d, 4c94704 and c61ed2b are all Y (c61ed2b = merge of 9cce82d + 4c94704). Spec sha256 cc6b7e23…8817c. Runtime build-id `m3-rc1-pre+dfdf49c` (clean, no +dirty). Worktree `qa/wt-m41-7-dfdf49c-acs`, porcelain 0 after vitest.
- **A-1 vitest (cc6b7e23 oracle): 154/155.** All rulings pass: (a)–(c); (d) bak-only / bak-newer / tie = M1, idb-newer = silent + 1x save_restore; tried[] exact on 52 cases + defer; per-store copies; **CSR-10 store-null x3 now PASS** (4c94704 merged); M5 Export. The only fail is CSR12-ls-throws (M4.2, N/A).
- **A-2 Chromium DOM subset: 157 PASS / 2 FAIL.** The 2 fails are CSR11 card width @360 = 314.04 and @1280 = 445.77, **measured mid-entrance-animation** (no settle). The script now settles first. These are not findings.
- **A-3 CSR-8 / CSR-14 (`browser-b8-14/`):** 8a PASS (5/5: the loser A writes 0 LS save keys and 0 IDB ops after B's takeover). CSR-14: M5 lease-quota 12/12 PASS (copy, 'Export save file' with "current farm" aria, download = F20, notice M5 store ls shown/dismissed x1, no-storage notice after close). Q preserve-quota 5/5 PASS (copy_failed true, export = corrupt bytes).
- **A-3b CONFIRMED MAJOR on dfdf49c (HoQA ruling 21:09): CSR-8 race (case 8b) gives a silent new game.** It fails CSR-AC-IDB1 ("never a silent new game") and IDB1-5/CSR-8 ("a tab that loses the claim makes no IDB write"). HoE is fixing it in the same push as the explainer fix.
  - **Repro** (`csr-m41-7-b8-14.mjs … csr8b`, one Chromium context, two pages):
    1. Seed IDB `eggfarm/save/main` = IDB1-truncated bytes (`qa/csr/fixtures/idb1/IDB1-truncated.manifest.json`), with no LS main and no .bak.
    2. In tab B only, delay every readwrite `IDBTransaction` `oncomplete` by 3 s (init script).
    3. Tab B: Tap to start. B claims the lease and starts the awaited `bootPreserveIdb` copy tx (`put corrupt.<ts>` + `delete main`, ruling (a)).
    4. 600 ms later, open tab C and Tap to start. C claims the lease.
    5. B's tx commits. B re-checks `owns()`, shows "Game open in another tab" and creates no Game.
    6. C read IDB after B's tx committed (no main), so it **boots a silent new game**: no dialog, no `save_corrupt`, `isNewGame: true`. The corrupt bytes sit unannounced in IDB `corrupt.*` (225 B), C's fresh farm becomes IDB main (512 B), and there's no Export.
  - **First seen** 21:04 CEST (`browser-b8-14/`), when it was info-only. **The control re-run with HARD asserts is in A-8.**
  - **Hard asserts now in the script:** (i) the winner never boots silently; (ii) the loser makes no IDB put/delete, OR the winner shows M3 with `save_corrupt{store:'idb'}`.
- **A-4 Tap targets, mid-animation evidence (supports HoE):** the first-paint sample in the old re-measure step (no settle) gave **primary 40.80 / Export 37.40 / card 265.2 @360; 43.28 / 39.67 / 294.8 @375; 45.22 / 41.46 / 322.2 @390**, all with computed min-height 48px/44px. The card is mid-scale in the entrance animation. On 9cce82d the same step happened to sample after settle: 48 / 44 / 312 @360. **So Art's 47.69/43.71 is consistent with a mid-animation sample.** Settled values on dfdf49c weren't measured (the UI script wasn't reached before the stop). Art's own render reports 48.000/44.000 settled on 3 engines.
- **A-5 CSR-12 probe on dfdf49c (partial, 3 of 4 cases before the stop): still present.** Same blank screen after Tap to start, 1 unhandled rejection, 0 save writes, 0 IDB puts, IDB F20 kept. Evidence `csr12-probe/dfdf49c-preview/`.
- **A-6 Copy fixture (item 8 static):** `tests/fixtures/copy/csr9-recovery-copy.md` @dfdf49c differs from `art-ux/copy/csr9-recovery-copy.md` only by the missing "Implementation confirmations (2026-10-19, PR #58 @66680eb)" section (6 lines: M1/M2 copy_failed label, Export aria strings, M4/M5 coop + '!' badge). **Info (stale fixture).** Rendered strings: not run on dfdf49c (the UI script was stopped). Art's review reports them verbatim.
- **A-7 CSR-9c explainer CONTROL on dfdf49c (HoQA 21:09; expected FAIL; reproduces Art & UX Major M-1).** Run: `csr9c-explainer-queue.mjs`, Chromium, :5961 under the flock, worktree `qa/wt-m41-7-dfdf49c-acs` (clean, `m3-rc1-pre+dfdf49c`). Two passes: `csr9c-control/` (21:15) and `csr9c-control-v2/` (21:22–21:33, the script fixed to stop waiting 30 s for an already auto-dismissed card). Same per-assert outcome in both.
  | Case | (1) never under dialog | (2) no auto-dismiss | (3) seen false until dismiss | (4) reload before dismiss shows again | (5) reload after dismiss shows 0 |
  |---|---|---|---|---|---|
  | M1-preM4 (corrupt main + pre-v7 F30 .bak) | **FAIL**: card under `.recovery-layer[data-notice=M1]` from t≈0.5–0.8 s; ~380 violating frames | **FAIL**: card gone at ≈8.5 s (EXP_MS 8 s), never dismissed | **FAIL**: seen=true when shown, under the dialog (mem 0.56 s, LS 0.55 s, IDB 0.57 s) | **FAIL**: 0 cards on reload (already seen) | **not evaluable**: no player dismissal possible (the reload showed 0, vacuously) |
  | M2-preM4 (L17 bad-checksum main + unmarked v6 F12) | **FAIL** (same, notice M2) | **FAIL** (≈8.5 s) | **FAIL** (mem 0.49 s, LS 0.49 s, IDB 0.50–0.51 s) | **FAIL** | not evaluable (same) |
  | WELCOME-preM4 (queueing gate) | **PASS**: 0 violations; card at ≈3.5 s, after Collect | info: auto-dismissed at ≈11.5 s | info: seen=true when shown (3.5 s) | info: 0 on reload | info |
  | M3-fresh | **PASS**: 0 violations, 0 cards, seen not set | — | — | — | — |
  - Also after M1/M2 here: the 'Welcome back!' modal follows the recovery dialog (old savedAt). The card was already up under both.
  - **Screenshots of the card under the dialog** (`qa/m41/m41-7-dfdf49c/csr/csr9c-control/`): `M1-preM4--dismiss-then-reload-1-dialog-open-CARD-UNDER.png`, `M1-preM4--reload-before-dismiss-1-dialog-open-CARD-UNDER.png`, `M2-preM4--dismiss-then-reload-1-dialog-open-CARD-UNDER.png`, `M2-preM4--reload-before-dismiss-1-dialog-open-CARD-UNDER.png` (same names in `csr9c-control-v2/`). Each shows "Upgrades got an upgrade!" / "Got it" above the dimmed scrim, with the recovery card "Your farm is back!" on top. Per-assert JSON: `csr9c-control*/result.json`; logs `run.log`.
- **A-8 B-CSR8b HARD-assert CONTROL on dfdf49c (expected FAIL): FAIL 2/2 hard asserts.** `csr8b-control/` (`csr-m41-7-b8-14.mjs … csr8b`).
  - Winner C: no dialog, no save_corrupt, isNewGame true, so it booted **silently**.
  - Loser B IDB ops `put:corrupt.1792696734028`, `delete:main`; the winner shows no M3 with store idb.
  - Bytes survive only as IDB corrupt.* (225 B); C's fresh farm is main (512 B).
  - Screenshots: `csr8b-control/B-CSR8b-tabB-loser.png`, `B-CSR8b-tabC-winner.png`.
- **A-9 EXP-B1 regression check on dfdf49c (HoQA 21:35: run once to validate the new asserts): PASS 16/16 + 1 N/A** (`expb1-check/`, `ONLY=EXPB1`, 21:45–21:53 CEST).
  - AC(1): the card appears at the in-session commit once (tracksV7 1); no Welcome back with the clock pinned; reload 0.
  - AC(2): the EXP1 committed-unseen fixture shows the card once on load; reload 0.
  - AC(3): new farm, 0 cards on 2 loads, seen not set.
  - AC(4): N/A in the browser (compile-time), covered by unit `tests/m4-exp1-explainer.test.ts:64`.
  - AC(5): IDB open hangs, so the migration is deferred (tracksV7 null); 0 cards, seen not set.
  - Under the 21:35 ruling, the Welcome-back case in A-7 (queueing PASS; auto-close and seen-on-show) is as-built behaviour and INFO only. The probe cases were not run on dfdf49c.
- **Not run on dfdf49c (stopped by the CEO/HoQA freeze):** the dialog UI script (items 6 settled, 7, 8 rendered) and the delta script.
