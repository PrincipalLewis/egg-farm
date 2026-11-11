# PR #1 recheck: engineering/m4-design.md @ 3342918 (v0.3.12, ADR M4-19 rev 7) vs e152960
Saves QA · 2026-10-17 ~00:20 CEST · doc-only. No browser or test runs. No PR comments, push, merge or tag. Final verdict is HoQA's.
Line refs are to `git show 3342918:engineering/m4-design.md`.

**Recommendation: APPROVE (with 3 Minor Shoulds; none blocks).** M-4 and M-5 are closed, as are S-5 and S-6. HoQA (a) and (b) PASS as designed. I found no regressions.

## Diff e152960..3342918 (1 commit)
m4-design.md +11/−8, in the header, l.110, l.112, l.113, l.137, new rows l.202–204, row l.206, l.296 and l.362. decisions.md +6 (ADR M4-19 rev 7, 00:15). status.md +1. Nothing outside the claimed items changed.

## Architect's claims
| Claim | Status | Evidence |
|---|---|---|
| M-4: dup delete first; tmp present ⇒ write_failed, loser untouched, notice, winner saves; rows; §7 #13 | **PASS** | l.110: "**occupied-tmp guard (M-4):** if `diverged_tmp` already holds a copy, first run the sweep's verified-duplicate delete on it; if tmp is still present (unique or unverified), the replace is **not attempted**: `save_recovery_slot{slot:'tmp', action:'write_failed'}`, the loser store is untouched, the diverged notice is shown, and the winner keeps playing and saving to its own store … A replace never overwrites an existing `diverged_tmp`." l.202 row: "unique `diverged_tmp` + both slots full + a new divergence … `diverged`, `diverged2`, `diverged_tmp` byte-identical; loser store untouched … winner store keeps saving across autosave ticks. Variant: tmp is a verified duplicate ⇒ deleted (`{slot:'tmp', action:'sweep'}`), then the replace proceeds normally." l.362: "a replace never overwrites an occupied `diverged_tmp`: a unique or unverified tmp blocks the replace (`write_failed`, loser store untouched, notice; M-4, rev 7)". |
| M-5: clear only on share resolved / explicit "I saved it"; cancel/close/reload clear nothing | **PASS** | l.113: "clears the exported keys **only after the save or share is confirmed**: Web Share API `navigator.share({files})` resolving ⇒ confirmed; rejection (`AbortError` cancel or any error) ⇒ clears nothing. A plain download … after the download is triggered the notice shows "Did you save the file?" with **I saved it** (`[data-testid=diverged-export-confirm]`) and **Not yet**; only **I saved it** clears the keys; Not yet, closing the notice, reload or tab close clear nothing." Row l.203. |
| S-5: flag = SHA-256 of sorted checksums | **PASS** | l.113: "the sorted `sum` values of the copies present in `diverged`, `diverged2` and `diverged_tmp`, joined and SHA-256 hashed (hex string; plain value, never save data). The notice re-shows whenever the current set's hash differs". l.137 allowlist now reads "a plain hash string of slot/tmp checksums … **never save data**". Rows l.204, l.206 (incl. "a new lower-`saveSeq` copy"). |
| S-6: telemetry slot 'tmp', action 'sweep' | **PASS** | l.296: "`{slot: 'diverged'\|'diverged2'\|'tmp', action: 'fill'\|'replace'\|'dedupe'\|'write_failed'\|'sweep', …}`". l.112: "the boot sweep emits `slot:'tmp', action:'sweep'`". |

## HoQA conditions
| Condition | Status | Evidence / note |
|---|---|---|
| (a) No unbounded write_failed | **PASS (Should S-7)** | The divergence move and the guard run once per load, not per save tick. l.112: "the losing store is not written this session, and the move is retried on the next load". l.110: "the loser's store is not overwritten this session". The winner's autosave writes only its own store, so a tick can't re-trigger the move. **Retry loop:** none within a session; once per load across sessions. **Notice:** the once-flag hash applies, *but* l.113 says it is "additionally shown on **every** load while both slots are full (or tmp is kept), regardless of the flag". That's once per load by design (the M4-25 mitigation), not per tick. Acceptable. **Telemetry:** at most one `write_failed` per load. The doc doesn't state that bound explicitly, and doesn't dedupe across loads. → S-7. |
| (b) "I saved it" not tappable before the download starts | **PASS (Should S-8)** | l.113: the confirm prompt appears "**after the download is triggered**". The `diverged-export-confirm` button doesn't exist before the export click. A plain `<a download>` has no "started" event, so "triggered" is the strongest gate the platform allows. Row l.203: "download: failed … ⇒ nothing cleared". Gap: the doc doesn't say the prompt is withheld if building the blob or dispatching the click throws. → S-8. |

## Regression check
| Item | Status | Evidence |
|---|---|---|
| M-1 no one-slot/skip | PASS | The only "skip" lines are l.95–96 (migration, unrelated), l.104/l.112/l.137 "no skip path / no skip", and l.374 (SQ-1 task, two-slot). l.137 inventory unchanged: `diverged`, `diverged2`, `diverged_tmp`. |
| M-2 Reset | PASS | l.119 unchanged (all three IDB keys + `diverged_notice_shown`). |
| M-3 replace order/restore/sweep | PASS | l.110 order unchanged after the guard. l.112 sweep unchanged (refusal-first, verified-dup delete, never evicts). |
| Earlier rows | PASS | l.187 `fill`; l.194 a01faea keeps all three; l.198 fill/fill/replace; l.199 M-3 restore; l.200–201, l.205 (v0.3.11 rows); l.207 a01faea Reset; l.362 §7 #13. |
| D-2 / F2-EQ | PASS | Winner rules unchanged (l.101, l.104). |
| §3b flag type | PASS | The flag changed from an integer to a hash string. l.137 has been updated accordingly. The guard's flag check must accept a 64-hex string (QA side). |

## Musts
None.

## Shoulds (Minor)
- **S-7:** state that `save_recovery_slot{write_failed}` (and the notice) fire at most once per load, and consider a per-copy-set dedupe for telemetry across loads (e.g. emit only when the set hash changes, plus a count).
- **S-8:** show the "Did you save the file?" prompt only after the blob/object-URL is built and the download click is dispatched without throwing. If they fail, show an error and clear nothing.
- **S-9:** l.248 lists a **clipboard fallback** for exports, and M-5 doesn't cover it. Say that the clipboard path clears only via **I saved it** (same as download), never on the `writeText` resolve alone. Add it to row l.203.

## Not run
No browser, unit or guard runs (doc-only). Guard update on approval: 3 IDB keys, tmp in the zero-writes set, hash flag, D-2 accepting any slot/tmp.
