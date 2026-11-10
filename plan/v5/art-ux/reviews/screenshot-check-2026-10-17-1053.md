# Screenshot spec check, 2026-10-17 10:53 CEST (feature freeze, verification only)

Result: NO VERDICT on new shots. Every new in-scope set since the 10:40 #35 efd7886 review lacks a manifest.json (org-plan.md §5, routine rule), so all are rejected unreviewed. No Blocker/Critical/Major/Minor/Nit raised. Nothing held.

## Rejected: no manifest.json (resend with art-ux/screenshot-manifest-template.md, HUD build label checked)
- M4-A #31 d75d41f Fx/WK: qa/m3-recheck/m4a-31-delta-d75d41f-evidence/shots-firefox/fileopen-{served,file}-firefox.png, shots-webkit/fileopen-{served,file}-webkit.png (4). QA summary.txt: build-id m3-rc1-pre+d75d41f all 3 engines, rc0 224/224 x3; fileopen-file fails by design (file:// CORS / local resource), same wrong-target note as 10:23.
- #5 a56b3a2 Fx/WK: qa/m3-recheck/toast-pr5-a56b3a2/{firefox,webkit}-midfade-re+100ms-*.png (8) are the known-invalid +100ms probe (midfade fails=4 per engine, same as Chromium); ff-extra-shots/toast-v3/*.png (6) re-rendered 10:18. QA summary: rc0 213/213 and toastfirst 14/14 in all 3 engines (log evidence, not screenshots).
- #35 QA re-shoot @ 3fa3781 (tests-only head): qa/m3-recheck/pr35-3fa3781/shots/**/*.png (109). The manifest-backed set wt-ui-shots/rc2-minors-2-efd7886 already PASSED at 10:40 (3 engines + 375); this set is parity evidence only.
- /workspace/wt-ui-shots/cuta4/{firefox,webkit}-*.png (re-rendered 10:15/10:24): not the #3 forward-merge (branch rc1/ux-clarity-v3-main lands after #31, per engineering/status.md:481); B-3/8a49d35 re-render, out of scope.

## Not evidence
- art-ux/scratch/sc1023/*.png (18): my own scratch crops from the 10:23 run.
- wt-ui-shots/b3/firefox/*.png: B-3 parked.

## Still waiting on (in scope)
#3 forward-merge shots (only if layout changed); #31 Fx/WK with manifest; #5 Fx/WK with manifest; Market Hand min wait c05c83a; worker-asleep display; #37; #12; final RC 3-engine shots.
