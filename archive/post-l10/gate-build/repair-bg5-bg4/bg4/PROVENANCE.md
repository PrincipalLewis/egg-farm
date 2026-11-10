# BG4 PROVENANCE — analyze.py / compare.py card pins · Mon 9 Nov 2026 ~23:50 CET
**Result: NOT FOUND.** No file, archive member or git object on the box matches the Card #4 pins. Nothing copied, nothing repinned, nothing overwritten. Per evidence-contract EC-3: escalate — replacement needs a **separate** approval.

## Pins (authority)
Card #4 (`product/m5-gate-acs.md`, L859–860): `analyze.py` sha1 **e67f184b**, `compare.py` sha1 **8a31fe7b**. Only these 8-hex prefixes exist anywhere: a box-wide text search for longer forms (`e67f184b[0-9a-f]*`, `8a31fe7b[0-9a-f]*`) found 441 / 110 mentions, all bare prefixes (card copies, reviews, notes). The full hashes are not recorded, so matching is by prefix and is reported as such. Whether "sha1" means plain sha1(content) or git blob id is unspecified → both were tested for every candidate.

## Search evidence (read-only; outputs in bg4/search/)
| Step | Scope | Candidates | Matches |
|---|---|---|---|
| search.sh §1 | `find /workspace /home/box /tmp -xdev`, `*.py` named *analy*/*compar* (node_modules, .git pruned); plain sha1 + git blob + sha256 | 250 (fs-hashes.tsv) | **0** (fs-MATCHES.tsv) |
| search.sh §1b | any `*.py` mentioning noAffByF / verdicts.json / metrics.json | 45 | **0** |
| search.sh §2 | 90 distinct git object stores (473 `.git` entries incl. worktrees, + bare `*.git`): `git cat-file -t <prefix>` | 90×2 lookups | **0** (all "Not a valid object name") |
| search.sh §2 | `git log --all` history of every *analy*/*compar* `.py` path, every blob → plain sha1 + blob id | 67 historical blobs (only scripts/bot-m5-parity/compare-smoke.py, fpar1-strip-compare.py) | **0** |
| search2.sh | non-.py names (*.bak/.orig/.txt copies etc., <2 MB) under /workspace /home/box /tmp /cursor/stores | 317 | **0** |
| search2.sh | members *analy*/*compar*.py of 7 tar/tgz/zip archives | 2 (next-71b45fce.tar: minors-compare.py, zg-compare.py) | **0** |
| search2.sh | `git cat-file --batch-all-objects` in all 90 stores (incl. unreachable/dangling, reflog-only) by object id prefix | all objects | **0** |
| text | `rg 'e67f184b\|8a31fe7b'` | 829 lines (text-mentions.txt) | references only, no file content |
Not covered: plain-sha1 of *unreachable* git blobs (only object id checked), files on users' computers, other boxes, private stores not mounted here. Box note: the box was replaced at ~23:46 CET; all on-disk mtimes now read 2026-11-09 23:44–23:45, so mtime provenance (Task D recorded Oct 30 13:16 / 14:05) is no longer observable.

## Copies that do exist (hashes)
| File | sha1 | git blob | sha256 | Note |
|---|---|---|---|---|
| scratch/post-l10/cand/tools/analyze.py | 8f6e4e9ba92c96fcf7c8ed3aab3ac5314a2c153b | db590fe01de6a18942692171b2d9185bcf401011 | 1764791afd482ac3ad223db8ab003f412538a0270fdbbc92d2cd0c49e1eea234 | on-disk "drift" copy; byte-identical to scratch/post-l10/gate/analyze.py |
| scratch/post-l10/cand/tools/compare.py | 2b85337d9fba5bf3a9edb2f08dbbb33d53c4a3da | 0a02fc709620f64b3fcda987f9ef1c1f28dbda49 | 2100bd704e003f68fa3d4c8e5a5f0fe520caea5d8c9581da56f1c1381086e927 | on-disk "drift" copy |
| scratch/post-l10/cycle-R04-MR14-off/analyze.py ("QA's 4701dbf8 copy") | e7e708406792e87121bb8a28dd687e3a17e862fa | 5188e1b22eb06260aa660bbe9b9543076c1ea26f | 4701dbf82e7209f7999c42a51e2492e177d2a0558aee34c3043af439673c59ed | see delta below |
| qa/m3-recheck/min-wait-pr38-fe33db2/analyze.py | a00b2003… | c4ac1337… | 103a6310… | unrelated M3 tool |
| qa/m3-scripts/combined/econ-compare.py | f396de4b… | e02dd78a… | 856c3547… | unrelated M3 tool |

## Delta notes
- **Pinned blobs vs disk (8f6e4e9b / 2b85337d):** cannot be diffed — the pinned blobs are not recoverable on this box. No behavioural delta can be established; Card-pinned behaviour remains unverifiable.
- **Disk analyze 8f6e4e9b vs 4701dbf8 copy** (`bg4/analyze-disk-8f6e4e9b-vs-4701dbf8.diff`, 116 lines): **not versions of the same tool.** 8f6e4e9b is the generic post-L10 metrics writer (`analyze.py <rawdir> <csv>` → metrics.json; per-level tP50/tP95, tstep `round(.,3)`, band gP95 with `x.get(L, 0)` missing→0, PL bars). 4701dbf8 is the Economy/R04-MR14-off diagnostic script (reads official raw-<pf>.json + diag-out.json, hardcodes PL-AC3 refs 2116.0/2100.2/2041.5, nearest-rank `sorted(xs)[ceil(n·p)-1]` without the min/max clamp). It cannot stand in for the e67f184b pin either.
- compare.py: only the disk copy 2b85337d exists; no other version found.

## Consequence (EC-3)
Pins unrecoverable here → escalate to HoP/Econ/Architect/QA with this evidence; any replacement pin needs separate approval. Until then no new Card #4-certified outputs that depend on analyze/compare. BG4 remains OPEN.
