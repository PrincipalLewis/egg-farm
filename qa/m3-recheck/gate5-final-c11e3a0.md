# Gate 5 FINAL: c11e3a0a2ffd42707e1d6c976082d84baa5c5b4d (PR #49) · QA Engineer UI/Layout · report time noted at the bottom
## Setup
- **Diff ffc3dfd → c11e3a0:** fast-forward, and `git diff --stat` touches only `scripts/rc0-browser.mjs` (14 lines; the G5 checks are rewritten to v1.15, MODE fixed to nonmodal).
- **Build:** own worktree `/tmp/qa-final-c11e3a0`, own `npm ci`, `build` and `build:qa`, with **G5MODE unset and no env overrides**. The only env given is our own PORT and SHOTS paths.
  - The build-id meta reads **m3-rc1-pre+c11e3a0**. Served on our own port 4799.
- **dist hashes:** **not byte-identical** to ffc3dfd, because the build-id is embedded in `index-*.js` and `index.html`. With `c11e3a0` replaced by `ffc3dfd`, the JS is byte-identical and the HTML is identical apart from the asset hash.
  - Per the rule, I **reshot everything on c11e3a0** and reused no ffc3dfd evidence. The ffc3dfd results in `gate5-final-ffc3dfd.md` are for reference only.
- **Profile B**, from the data: maxLevel 30, Hens/Egg value cost rows L0–30. The cap, C4 and L50/L55 cells are **N/A by ruling (D-CEO-09 option B)**.
- **EXP1 judged against m4a-spec v1.15 only.** The swallow (b) and v1.16 cases were **dropped per CEO final ruling**.
- Evidence: `gate5-final-c11e3a0/` holds `exp-final-<engine>.jsonl/.log`, `exp-sheetclose-<engine>.jsonl`, `entries-<engine>.jsonl` (manifest entries), `<engine>/*.png`, `rc0-<engine>.log` plus shots, and `check-*.log`.

## Owed items for the A&UX provisional pass (07:12 CEST)
1. **manifest.json**: gate5-final-c11e3a0/manifest.json. Full SHA c11e3a0a2ffd42707e1d6c976082d84baa5c5b4d, 195 entries (65 per engine), 0 missing files, sha256 per shot. No ffc3dfd evidence reused.
2. **Flag off: PASS (3 engines × 390/1280 × acdbedc-v6 and canonical, 12 cells).** No card, count 0. c11e3a0 has no runtime off switch, so this ran on Latest dd52bfd (m4.enabled=0, build-id m3-rc1-pre+dd52bfd). Shots: <engine>/flagoff-dd52bfd-*.png.
   **Settings label: PASS** in all 3 engines ("Egg Farm m3-rc1-pre+c11e3a0"; <engine>/settings-label-390x844.png).
3. **C5b after reload**: v6 in session, read-only: no card while blocked and no flag set. Writable with no reload: no card. **Reload: card shows once. PASS in all 3 engines** (this matches A&UX's wording).
   **Canonical committed-unseen, read-only: the card SHOWS while storage is blocked** (blocked=true, seenTracksExplainer not persisted, count 1). Same in all 3 engines. Under the gate this is a writable-gating miss: the flag can't persist, so the card can come back on the next load. Caveat: we emulate read-only by making localStorage.setItem throw, and the app's own read-only detection may differ. **Needs HoQ/Saves triage.**
4. **Firefox rc0 bug9 ×10: 10/10 pass (12/12 each). Not a flake on c11e3a0.** The ffc3dfd/0ee8831 timeout came from the swallow card. Runs 5-11 of the first attempt were invalid because of a port collision (our own tooling) and are kept in invalid-port-collision/.
5. **vs 0ee8831** (rc/m4-t3-capped preview B: 2c34044 swallow + focus fixes 4795fad/0ee8831). An ancestor of c11e3a0; 3 commits since (085af12 v1.15 non-modal, ffc3dfd focus, c11e3a0 rc0); src diff = tracks-explainer.ts only. rc0: 0ee8831 276/277 (chromium bug9 click timeout under the swallow card), c11e3a0 297/297 ×3. Globals identical. Ext probes on 0ee8831: 0 fails. Main entries 60 → 65 (+flag-off/label).
