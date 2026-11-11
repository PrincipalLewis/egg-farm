# Pause spec v1.3.9 AC-P1 (L304) save-byte check on rc/v5 a923206 — Saves QA, 2026-10-30 ~10:32 CET
Spec: product/workers/m5-worker-pause-spec.md v1.3.9, sha1 7fdd8d90a987ee6c14e6ffd57aeb1c2f83bb753c (sha1sum OK), sha256 1e9dcef4…999b.
Worktree qa/scratch/wt-acp1-a923206 (detached a923206b80f2c301341d100d9eaa34554e948fb9, read-only; probe copied in, removed; worktree removed). Probe: probe-acp1.test.ts (harness = #91 probe-saves.test.ts c8b8a7d1… path, NOW = Date.UTC(2026, 9, 30, 9), no saveSeq). Configs: `ship` (shipped flags, pause 0) and `abOnly` (abilities 1, pause 0 = the P-12 golden config).

## AC-P1 input fixture (named in plan v0.11)
`tests/fixtures/saves/m4-exp1-committed-unseen.json`, key `ls["eggfarm.save"]` (the committed M4.1 main; IDB main is the same string).
File sha256 de6b02970cd2991630355e6f5a5e499768ae7d06a50f23c74d56cbb9ba6e7961 (git blob f69b576d…, identical at 5d9efa61 and a923206); embedded save string sha256 8889e66980fdf0fc9beec790967db8de41a7e1964de85fa270856bee4472a9ff (562 B, v6, saveSeq 3, tracksV7 1, F30).
Why this one: it is the only save in the 5d9efa61 tree that is a committed M4.1 save (tracksV7 + v6BackupId). Every other fixture is unmarked (v4/v5/v6 pre-tracks), and Game defers their tracks migration at boot, so clause (b) cannot match (a) for them (below). Caveat: it has no hired workers (`workers: {}`), so it does not exercise a reachable pause toggle.

## Results
| fixture | (a) deterministic, = #91 base 458f74c output | (a) out sha256 | (b) state = (a) state | (b) tracks deferred |
|---|---|---|---|---|
| **m4-exp1-committed-unseen.json#ls.eggfarm.save** | yes / yes | 4c2f88a21d15aeb598f8320a3990b357bc362826e2544bb9c777e96dfa1f0828 | **yes** (and = input state) | no |
| m2-rc1-v5-40min.json | yes / yes | c334b703…6938 | no: hensLevel, eggValueLevel, celebratedMilestones, tracksV7 | yes |
| m2-rc1-v5-12min.json | yes / yes | eab1c714…a779 | no (same 4 keys) | yes |
| m2-rc1-v5-40min-edge.json | yes / yes | 44514bc1…0eff | no (same 4 keys) | yes |
| m1-rc2-v4-12min.json | yes / yes | dd74c464…bff1 | no (same 4 keys) | yes |
| m4-pre-v7-F30-C30.json | yes / yes | 0f27b7a0…18b1 | no (same 4 keys) | yes |
`abOnly` output bytes = `ship` output bytes for every fixture. Envelope in (b) differs only in savedAt/saveSeq for the committed input (plus `sum` for unmarked ones).

- **(a) PASS against the stand-in, formal check BLOCKED.** The output is deterministic and byte-identical to the same harness at pre-#91 rc/v5 458f74c (qa/v5-saves/trace-reviews/pr91-7d59dda/15-probe-base.jsonl) for all 6 inputs. The pinned comparison save (`engineering/golden/m5-abilities-only.<sha>.test.ts`) does not exist (checked: not in a923206, not on any origin ref, not in history), so there is nothing pinned to compare against yet.
- **(b) PASS for the named fixture** (state byte-identical, only savedAt/saveSeq differ). **FAIL for every unmarked input**: validate migrates the state to tracksV7 (a), but Game boot restores the v6 state and defers the migration (src/game.ts:74-76), and saves only the v6 keys (src/game.ts:172-177). So (b) only holds if the AC-P1 input is a committed M4 save. That should be written into the spec (input = committed tracksV7 save), or (b) should exclude the M4 track fields.

Files: probe-acp1.test.ts, run.sh, 00-npm-ci.log, 10-acp1.log, 10-acp1.jsonl, dump/ (a- and b- output bytes per fixture × config), SHA256SUMS.
