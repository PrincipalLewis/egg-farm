# PR #12 save compatibility @ 8b1b23b (supersedes e7035f7 and 003ddcc for HoQA's CONDITIONAL)
Fresh clone /tmp/qa-x/pr12 after the box reset, npm ci OK, git auth OK. Main is now 4608a4f. Evidence: pr12-save-compat-8b1b23b-evidence/

| Step | Result |
|---|---|
| Save-code diff e7035f7→8b1b23b (src/save, game.ts, main.ts) | src/save and game.ts unchanged. main.ts only adds the build-id meta and #app data-build-id (from main #13). save-diff-e7035f7-8b1b23b.patch |
| Unit: fixture round-trip, 14 fixtures vs main 2700804 | PASS: 11 byte-identical (w1/w2/.bak), 3 rejected identically to main (v7-by-version, old export). cmp-main-vs-8b1b23b.txt |
| Unit: v7 fields | PASS: track fields and state bytes identical over 2 flag-off rounds |
| Unit: stale-IDB repro and 999,999 (i, ii) | PASS. Case iii is still the known Minor (Saves rework) |
| tsc / build | 0 / 0 |
| vitest full (2 workers, locked) | **772/772 PASS** (more than the 729 claimed; extra tests came in with the merges). cost-segments 9/9 and flagoff-golden (storage bytes, sim trace) PASS. Both earlier failures are gone |
| Firefox (port 4644, build-id meta + data-build-id = m3-rc1-pre+8b1b23b at runtime) | PASS: stale-IDB/999,999 reload keeps 99,999,900 cents; flag-off main-fixture boot leaves no M4 keys in LS/IDB, keys and order kept |
| WebKit (port 4645, build-id meta + data-build-id = m3-rc1-pre+8b1b23b) | PASS, same results as Firefox |

**Verdict: APPROVE** (HoQA condition met: Firefox + WebKit green, vitest 772/772, tsc clean).
Open (non-blocking, owner Saves rework): Minor case iii (stale IDB seq 5 beats a newer LS copy at seq 2, exact-b-unit.txt).
Not run: Chromium on 8b1b23b (not requested this round; it passed on 003ddcc and 182b932). The browser runs saw no re-save within the window (rt_lsRewritten=false), so the browser checks cover boot/load only, and the byte identity is covered at unit level. Main has moved to 4608a4f and another merge forward is expected, so rerun this on the next head.
