# QA: save-recovery dialog on m3/save-recovery-dialog-v4 @ a01faea (a01faea4097d…)
2026-10-16, 18:31– CEST. Clone /workspace/qa-sd3/game, fetched at FETCH_HEAD = a01faea4097dd5a869be93343d65fd0e82e5255c, which sits on top of aaaa91a (540b758 → e9887da → a01faea). Nothing pushed, merged or tagged.
**Servers:** every run uses its own vite preview with `--strictPort` and checks that it serves this outDir's own chunk. Ports are 69xx; :4173 was never used. The runtime build ID (telemetry session_start) contains a01faea in dist and dist-qa (`buildid-<engine>.log`).
Spec: art-ux/save-recovery-dialog.md v2.1 plus the v2.2 note (the Restored Export link only when a corrupt main exists; the "Can't save" case; keyboard-only focus ring).
Script: `dlg.mjs`, 6 cases × 360/1280: Restored (corrupt main), Restored (main missing), Fresh, SD4-3 (main missing + bad .bak), Storage (copy fails), Can't save (storage refuses every write). Screenshots: `save-recovery-dialog-a01faea/shots/<engine>-<width>-<case>.png` and `-focusring.png`.

## Code-level
- Units **462 + 2 skipped = 464** (matches the claim).
- `npm run build` with check-release-build OK (only `eggfarmExportTelemetry`). build:qa OK.

## How to read the results: script expectations that were wrong (verified by hand, not bugs)
- **"exact copy" FAIL for Storage / Can't save:** my script required class `btn` on the outlined Export. The shipped class is `rc-export-q` alone: full width, white background, 2px `--c-wood-text` border, Nunito 700 16, min-height 44. That matches the spec, and all strings match exactly.
- **"focus → Collect" FAIL for Restored / Can't save:** these fixtures are a valid save 60 s old, so the offline "Welcome back" modal opens after the dialog closes. app.ts:636 then focuses the modal's button, which is correct. Fresh, where no modal follows, focuses Collect.
- **quota2 15/15 "no notice" on this branch:** this is what v2.2 asks for. "Saving is paused" opens instead and the toast is held until it closes. dlg.mjs confirms the toast appears after "Keep farming". "Another tab" appeared 0/15 times, so SD4-2 still holds.

## Chromium: done
| Check | Result |
|---|---|
| Copy (v2.1 / v2.2), all 6 cases × 2 widths | **PASS.** Exact titles, bodies and primaries. Restored with a corrupt main shows the Export text link. Restored with main missing has no link (v2.2). Fresh shows the link. Storage and Can't save show the outlined button ("Export old save" / "Export save") |
| SD4-3 main missing + bad .bak | **FIXED:** the Fresh dialog shows (no silent fresh farm). The Export link downloads the bad .bak bytes byte-identical |
| SD4-5 copy | **FIXED:** matches v2.1 word for word |
| aria | alertdialog, aria-modal=true, labelledby = title, describedby includes the body, icon alt="", background inert, initial focus on the primary, Export aria-label "Export old save, downloads a copy of your old save file" |
| Size | Primary 48 px tall. Export ≥44 (link ≥120 wide). Card 312 at 360 and 440 at 1280. Card and layer opacity 1 |
| Keyboard | Esc and a scrim tap don't close it. Tab / Shift+Tab stay inside the dialog. Focus ring on Tab: `solid 3px rgb(43,121,168)` with offset 3 on every control |
| Export | All 5 cases with Export download `eggfarm-old-save-YYYYMMDD-HHmm.json`. Can't save downloads the current farm (farm 10). Each shows "Saved a copy." and the dialog stays open. Storage case: at most 1 QuotaExceededError on the copy (no retry loop) |
| Can't save toast | Held while the dialog is open, shown after it closes |
| No page errors | 0 |
| Save v4 regression (probe3 items 1 + 5: BUG-7, SD4-1 reconcile incl. +3 min / +1 min control) | 17/17 |
| SD4-2 | 0/15 "another tab" |
| Release globals | 2/2 |
| rc0-browser | **197/197** |

## Firefox: done
| Check | Result |
|---|---|
| Build ID | a01faea in dist and dist-qa |
| dlg.mjs (copy, SD4-3, SD4-5, aria, sizes, Esc/scrim, Tab trap, focus ring 3px #2B79A8, Export bytes and filenames, toast hold) | **PASS.** 86 pass; the 10 "fails" are exactly the same script-expectation items as in Chromium (see above) |
| Save v4 regression (BUG-7, SD4-1) | 17/17 |
| SD4-2 | 0/15 "another tab" |
| Release globals | 2/2 |
| rc0-browser | 197/197 |

## WebKit: done
| Check | Result |
|---|---|
| Build ID | a01faea in dist and dist-qa |
| dlg.mjs | **PASS.** 86 pass; the 10 "fails" are the same script-expectation items |
| Save v4 regression (BUG-7, SD4-1) | 17/17 |
| SD4-2 | 0/15 "another tab" |
| Release globals | 2/2 |
| rc0-browser | 197/197 |

## Verdict: PASS (Chromium, Firefox, WebKit at 360 and 1280). No bugs found.
SD4-3 and SD4-5 are fixed. All 4 dialog variants plus Restored-with-main-missing match v2.1/v2.2: copy, buttons, Export behaviour and bytes, aria, ≥44 px targets, Esc and scrim inert, Tab trapped, focus ring 3px #2B79A8 offset 3. There are no save v4 regressions.
Notes for Art & UX (not bugs): (1) v2.1 §2 says the focus ring is 3px offset 3, while the v2.2 note says 2px. The build ships 3px, which satisfies both "3px #2B79A8" and "≥2px". (2) After "Keep farming" on a save old enough to earn offline income, focus goes to the offline modal's button, not Collect, which is the right order.
Not run: 200% zoom and Android Back (not automatable here); a pixel diff against the mocks (screenshots are in `shots/` for visual review).
