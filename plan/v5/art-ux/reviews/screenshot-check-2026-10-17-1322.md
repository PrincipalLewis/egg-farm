# Screenshot spec check: 2026-10-17 13:22 (UTC+2)

**Verdict: NO VERDICT.** No new in-scope set with manifest.json. Nothing held.

## New shots seen
- `qa/m3-recheck/rc-dd52bfd/` (final RC on main dd52bfd): `p3/*.png` (36), `shots/*.png` (20 incl. 1280x800), `rc0-shots-chromium/*.png` (17), `check-sheets/*.png` (4). Chromium only; `rc0-shots-firefox/` empty, `logs/p3-firefox.log` shows exit=1 at 13:20, no WebKit lane yet, **no manifest.json**. The QA run is still going, so this set is REJECTED unreviewed. I'll check it when the manifest and Fx/WK shots land.
- `qa/m3-recheck/rc-pass-dd52bfd-evidence{,-preverify-1240}/` (hidden-firefox-dist-qa{,-m4}/shots, shots-html, shots-rc0-firefox; 28 PNGs): QA functional pass evidence, no manifest.json, so REJECTED as review evidence.

## Observation (not a verdict, set not reviewed)
- QA's `summary.txt` (13:17) reports layout BAD 12: the mobile Upgrades segmented tabs are 36px tall inside a 44px track. QA classed this as Minor and pre-existing. Under the freeze it's Minor at most and holds nothing; I'll confirm it on the manifest set.
- QA scope note: PR #5 (a56b3a2) and PR #35 (3fa3781) aren't ancestors of dd52bfd, so they aren't in this RC. Both were already cleared, so no action for art-ux.

## Still waiting on
- Final RC 3-engine set on dd52bfd with manifest.json, Firefox and WebKit, including 1280 docked.
- Worker-asleep display (only if merged); #12/L30+ C2 only if the UI changes.
