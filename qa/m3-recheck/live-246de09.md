# Published asset check: release m4b-dd223f5 (egg-farm.html), SHA 246de09c8b329360754cc0d77a6cd6b6788b6ad4 (INTERIM, 10:07 Europe/Belgrade)
## Asset
- Source: HoQ's verified copy /tmp/relchk/egg-farm.html, copied to live-246de09/asset/egg-farm.html.
- sha256 0bc5bb72df4ab0dee287d3e1d57b7d8178659a147dd6740738b3f0ea8f179a4c, 511,108 bytes. Both match.
- build-id `m3-rc1-pre+246de09` (no +dirty), checked by curl and at runtime (boot and every reload) in each script.

## How it was opened
- file:// works in all 3 engines: boot, localStorage write, and save persisted across reload (fileprobe.log).
- The harness pre-seeds from a same-directory blank page, asset/egg-farm.htmlfavicon.ico.
- **Chromium under file:// lost harness sessionStorage state across reloads.** This affects the setItem-throw switch (`__qblock`), the show counter (`__expCount`) and the hidden/readonly toggles. Result: chromium file:// cardreload mock 390 and 5 chromium artux cells fail with count reset to 0 or the block not applied. localStorage and the game save persisted, and the real-quota variant passed.
- So Chromium is re-run on the **same verified file over http on :4828** (live-246de09/chromium-http/). Firefox and WebKit stay on file://.

## Results so far
| Check | chromium | firefox (file://) | webkit (file://) |
|---|---|---|---|
| cardreload 390/1280 real+mock (blocked → reload blocked → writable → next load once → Got it → reload no card, flag persisted, tab asserted) | file://: 3/4 (mock 390 = harness sessionStorage loss); http rerun pending | PASS 4/4 | PASS 4/4 |
| A&UX set exp-final (4 sizes, 52 cases) | file://: 47/52 (harness, see above); http rerun pending | PASS 52/52 | PASS 52/52 |
| g5 ext max | 14 shots, 0 assert fails | pending | pending |
| g5 ext coins | 8 shots, 0 assert fails | pending | pending |
| g5 ext goal f2 f3 h6 expgate expui | running (shared lock queue) | pending | pending |
| rc0 (local build:qa of 246de09) | pending | pending | pending |
rc0 ran on build:qa because the window.eggfarm hook is compiled out of release builds (src/main.ts:112).

## Findings
- None Major or above so far.
- M4B-1 is already known and repro'd separately; not re-reported.
