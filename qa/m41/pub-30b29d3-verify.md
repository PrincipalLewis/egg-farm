# Verify-before-publish: egg-farm M4.1 patch 1 (D-CEO-20261019-13). QA-passed 30b29d3, main merge d1fb206 (#70)
Saves QA. Run on 2026-10-24, 20:57–21:10 CEST. Read-only (no push, tag or release edit; GITHUB_TOKEN never printed). Evidence is in `qa/m41/pub-30b29d3/`. The method is the same as pub-35931cb-verify.md.

## Verdict: **GO-with-conditions** (the release is still a DRAFT)
Everything verifiable before publish passes, and the only open conditions are the publish-time ones (1–3): the draft asset is byte-identical to my clean build of 30b29d3, the tag ref is on 30b29d3, migration loses nothing, and the 3-engine smoke test is clean. Before and at publish:
1. **Asset:** publish draft 422922551 with its current asset unchanged. That is `egg-farm.html`, 547,466 B, sha256 `dd919d616fe0138a89c362b1db269458558a0a2c85827b3e4fc104d36b22979b`, build-id `m4.1+30b29d3`.
2. **Tag:** the tag `m4.1-p1-30b29d3` must stay on 30b29d3f60d7eeae5b78feb3ec5c1fcbcf9a1134. It must **not** move to d1fb206, or release-asset.yml would expect m4.1+d1fb206 and fail.
3. **release-asset.yml:** the run on publish must be green. I will check it post-publish.
4. **Main CI: met.** The ci run on main d1fb206 (run 40123031775) is green. Under the #68 ci/diet workflow it ran gate, release-globals (firefox) and release-globals (webkit), all successful, with the last finishing at 21:08:57 CEST. `main-ci-d1fb206.txt` has the details.

## Queue
`qa/queue.md` has no row for #70, d1fb206 or 30b29d3. Related rows:
- **P1** (M4.1-P1 yard hens + asleep signal + sales-stopped lane, `fix/m41-patch1`, UI QA, "after M4.1 Latest"): still says WAITING (v2 SHA off main after #67 merge). #70 is from `fix/m41-patch1`, so this release is that row's patch. The queue hasn't been updated for its QA PASS at 30b29d3; that is HoQ's row to update.
- **Row 7:** SHIPPED, Latest m4.1-5d9efa6.

## Checks
| # | Check | Result | Value found |
|---|-------|--------|-------------|
| 1a | d1fb206 on origin/main | PASS | origin/main = **d1fb206b8f59a1a1f19623526fdbf3003d12efce** ("Merge pull request #70 from PrincipalLewis/fix/m41-patch1", GitHub merge commit, 20:56:48 CEST) |
| 1b | Parents / ancestry | PASS | Parents are **2efb445800dd52967a6116e4778077f31d8021b8** (main after #68 ci/diet) and **30b29d3f60d7eeae5b78feb3ec5c1fcbcf9a1134**. 30b29d3 is an ancestor. 5d9efa6 is an ancestor of 30b29d3 (35931cb → ebf3a7a…30b29d3, 13 commits) |
| 1c | Trees / diff | PASS (explained) | tree(d1fb206) = 26f929eaf686212426f753b86492747b070aa03d and tree(30b29d3) = 5996599b43940856d2e56a395bd42ef18223fe8c, so they **differ**. `git diff --stat 30b29d3 d1fb206` shows **only `.github/workflows/ci.yml`** (60+/38−). That is exactly #68's change on main (`git diff --stat 35931cb 2efb445` is the same single file). It is a CI workflow and **does not ship in the HTML**. release-asset.yml, src/, public/ and scripts are identical. Patch: `diff-30b29d3-d1fb206.patch` |
| 2 | Clean build 30b29d3 (fresh worktree qa/wt-pub-30b29d3, npm ci, build:html) | PASS | sha256 **dd919d616fe0138a89c362b1db269458558a0a2c85827b3e4fc104d36b22979b**, **547,466 B**. Build-id `m4.1+30b29d3` ×3, 0 `+dirty`. check-release-build passed, and porcelain was 0 before and after the build. A second build gave the same sha256, so the build is reproducible |
| 3a | Release / tag | PASS (draft) | Release id **422922551**, "M4.1 patch 1 (30b29d3)", tag `m4.1-p1-30b29d3`, **draft=true**, prerelease false, published_at null, target_commitish 30b29d3f60d7…. The **tag ref exists** on origin as a lightweight tag and peels to **30b29d3f60d7eeae5b78feb3ec5c1fcbcf9a1134** (not d1fb206) |
| 3b | Draft asset vs clean build | PASS | Asset id 673050571, name `egg-farm.html` (it was uploaded as `p1-egg-farm.html` and renamed at 20:58:40 CEST; same id and bytes). Size **547,466 B**. Downloaded sha256 **dd919d61…2979b** = GitHub digest `sha256:dd919d61…2979b`. **cmp identical** to the clean build. Build-id `m4.1+30b29d3` ×3, 0 `+dirty`. HoE's claimed values all match |
| 3c | Current Latest | PASS | `releases/latest` = **m4.1-5d9efa6** (unchanged) |
| 3d | release-asset.yml run | NOT RUN (pending publish) | It triggers on `release: published/edited`, and the newest run is still 40107345648 (m4.1-5d9efa6). I will check it post-publish |
| 3e | CI on 30b29d3 | PASS | Tag-push run: release-html, release-globals ×3, unit and slow all succeeded (last finished 21:06:35 CEST). An earlier PR run was also green, including `gate` |
| 4 | Save migration (Chromium 156; assets m41-5d9efa6 = ccb87daa and p1-30b29d3 = dd919d61; same origin) | PASS | See the table below. All saves came out as v6, with no recovery dialog and nothing lost |
| 5 | 3-engine smoke of the asset | PASS | Chromium 156.0.8078.47, Firefox 157.0 and WebKit 27.2, run one at a time. Each loaded with runtime build-id `m4.1+30b29d3` (meta + #app) and no +dirty. Collect → basket 0→20; Sell all → coins $10.00 / $12.00 / $6.00; autosave v6; reload kept coins, basket and levels; **0 console/page/HTTP errors** on every engine |

### Save migration detail (`mig/mig-result.json`, saves in `mig/*.json`)
| Case | Before (save) | After 30b29d3 boot + autosave | Result |
|---|---|---|---|
| M1: fresh play on 5d9efa6 (collect, Sell all 12 eggs, bought Collection L1), then same-origin upgrade to 30b29d3 | v6, coins 200¢, basket 8, F0, C1, H0, EV0, 0 workers | v6, 200¢, 8, F0, C1, H0, EV0 (coop 13→21, lay only) | PASS. UI $2.00 / 8 |
| M2: v5 fixture → 5d9efa6 (played, bought C12) → same-origin upgrade to 30b29d3 | v6, 57,518¢, basket 19,443, F10, C12, Hens 10, EggValue 9, grader 0, workers coop_hand/hawker/market_hand, seenTracksExplainer true | v6, 72,412¢, 19,468, F10, C12, H10, EV9, same 3 workers, same keys | PASS. Coins rose by 14,894¢ from the live/offline grant and Market Hand sales. UI $575.18 / 19.4K |
| M3: v5 fixture `m2-rc1-v5-12min.json` (7ae75247…) straight into 30b29d3 | v5, 15,061¢, basket 0, F10, C11, 3 workers | v6, 31,068¢, 0, F10, C11, the same 3 workers, + H10/EV9/tracksV7 (M4 migration) | PASS. The UI showed $150.57 at boot (wages), then the offline grant brought it to $310.68. This is the same value as on 5d9efa6 earlier today |
| M4: M2's 5d9efa6 save (3ec9b531…) cold-seeded alone into 30b29d3 | as M2 before | as M2 after | PASS |

**Harness note:** run 1 and run 2 each logged one console 404, in M1 only. It came from `http://127.0.0.1:5961/favicon.ico`, requested by the python directory-listing page at `/` that my harness used to read localStorage between builds. That page is not the game, so I don't count it against the build. The game pages logged 0 errors (M2–M4 and all smoke runs).

## Housekeeping
- **Browser lock:** taken 21:01:18–21:02:34 and 21:03:30–21:04:50 (migration, Chromium), then 21:05:35–21:06:02 (Chromium), 21:06:02–21:06:31 (Firefox) and 21:06:31–21:06:58 (WebKit), all CEST. Each hold was under 2 minutes, one engine at a time.
- **Servers:** my own servers on :5961 (PIDs 983698, 987298, 990977, 991352, 991938) were each stopped, and ports 5961–5964 are free.
- **Worktree:** `qa/wt-pub-30b29d3` was removed after a clean status check (porcelain 0).

## Not run
- release-asset.yml and the released-asset hash, because the release is still a draft. Both are pending post-publish.
- Migration in Firefox and WebKit (Chromium only, as briefed).

---
## Post-publish confirmation: release `m4.1-p1-30b29d3` (run 2026-10-24, 21:12–21:15 CEST, read-only)
### Verdict: **CONFIRMED**
All pre-publish conditions are met: the asset is unchanged, the tag is on 30b29d3, and release-asset.yml is green. Evidence is in `qa/m41/pub-30b29d3/post/`.

| # | Check | Result | Value found |
|---|-------|--------|-------------|
| P1a | The release is Latest, not a draft and not a prerelease | PASS | `releases/latest` = id 422922551, "M4.1 patch 1 (30b29d3)", tag `m4.1-p1-30b29d3`, draft false, prerelease false. Published **21:11:02 CEST**. target_commitish is 30b29d3f60d7eeae5b78feb3ec5c1fcbcf9a1134 |
| P1b | The tag peels to 30b29d3 | PASS | `refs/tags/m4.1-p1-30b29d3` points to **30b29d3f60d7eeae5b78feb3ec5c1fcbcf9a1134**. It is a lightweight tag, not on d1fb206 |
| P2 | Released asset | PASS | Asset id 673050571 (the same as the draft, updated_at 20:58:40 CEST, unchanged since). Size **547,466 B**, sha256 **dd919d616fe0138a89c362b1db269458558a0a2c85827b3e4fc104d36b22979b**, which equals the GitHub digest. **cmp is identical** to the pre-publish draft download and to the clean build of 30b29d3. Build-id `m4.1+30b29d3` ×3, 0 `+dirty` |
| P3 | release-asset.yml run **40124125129** | PASS | Workflow `release-asset`, event `release`, head m4.1-p1-30b29d3 @ 30b29d3f60d7…, title "M4.1 patch 1 (30b29d3)". Conclusion **success**, finished **21:11:21 CEST**. Job check-uploaded-html succeeded (21:11:07–21:11:20), and every step succeeded. Log: "build id m4.1+30b29d3 matches expected ok", "build-id meta + data-build-id = m4.1+30b29d3 ok". "547324 bytes" in the log is the UTF-8 character count; the file is 547,466 B. This is the only release-asset run for this tag |
| P4a | Chromium smoke of the downloaded asset (:5961, under the lock) | PASS | Runtime build-id `m4.1+30b29d3` (meta + #app), no +dirty, no recovery dialog. Collect took the basket 0→20, and "Sell all (11 eggs · $11.00)" took coins $0.00→$11.00. Autosave wrote v6 with 1100¢. After reload the screen showed $11.00 / 9 and the save still had 1100¢. **0 console/page/HTTP errors** |
| P4b | 5d9efa6 save → released 30b29d3 (M2: same-origin upgrade; M4: cold seed) | PASS | Before (5d9efa6 v6 save): 57,518¢, basket 19,443, F10, C12, Hens 10, EggValue 9, workers coop_hand/hawker/market_hand. After 30b29d3: v6, 72,412¢ (offline/live income and Market Hand sales), basket 19,468, F10, C12, H10, EV9, the same 3 workers, all state keys kept. No recovery dialog and 0 errors on both paths |
| P4c | v5 fixture → released 30b29d3 (M3, extra) | PASS | v5 15,061¢, F10, C11, 3 workers → v6 31,068¢ (offline grant), F10, C11, 3 workers, + H10/EV9. No dialog, 0 errors |

- **Browser lock:** acquired at 21:12:53 and released at 21:14:07 CEST, about 74 s.
- **Server:** I started one (PID 1002518) and stopped it. Ports 5961–5964 are free.
- **Harness change:** this harness reads localStorage from a same-origin `blank.txt` page instead of the directory listing, so the earlier favicon 404 artifact doesn't occur. The served directory also has an empty `favicon.ico`.
- **Screenshots:** `post/smoke/chromium-*.png` and `post/mig/*.png`. Results are in `post/smoke/chromium-result.json` and `post/mig/mig-result.json`. The run log is `post/post-run.log`.
- **Not run:** the post-publish smoke in Firefox and WebKit. The pre-publish 3-engine smoke ran on these exact bytes.
