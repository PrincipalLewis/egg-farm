# Chromium rc0 rerun prep (pt1 + AC14b cantsave 360), 76390f2 — QA-D-1030-PRERUN-TRIAGE (4)/(b). NOT RUN.
Order (HoQ): the harness-rc re-freeze and self-test go first, then this.

## Findings
- pt1 reads axe from `process.env.AXE_PATH || '/tmp/axe/node_modules/axe-core/axe.min.js'` — repo script `/tmp/qa-v5-76390f2/scripts/rc0-browser.mjs:87` (worktree at 76390f2, clean). /tmp/axe is absent now.
- Frozen harness/ does NOT hardcode /tmp/axe: run-rc.sh:307 calls `env PORT=$P0 SHOTS=… $H scripts/rc0-browser.mjs chromium` and sets neither AXE_PATH nor ONLY, so the repo default applied. harness/'s own probes use `AXE` (default artifacts/v5-ui/tools/axe-core-4.14.0/axe.min.js, run-rc.sh:108).
- Pin: axe-core 4.14.0, `artifacts/v5-ui/tools/axe-core-4.14.0/axe.min.js` sha256 20c09fe157a8a34a30e241aaa1fcdade657734f08ab379ecfbeb7d45cc46e878 (run-rc.sh:108 AXE_SHA; harness/PROVENANCE.md:67, npm integrity sha512-9WTZxEjs…; verified on disk now). Earlier green rc0 runs used 4.14.0 at /tmp/axe (engineering/status.md:121 in the QA worktrees).
- So no frozen file needs editing: copy the pinned file to a scratch path, verify the sha, pass `AXE_PATH`.
- Subset: `ONLY` (rc0-browser.mjs:39, comma list of section names; runner :1047). pt1 = `pt1` (:69, PT1-4/5/6). AC14b cantsave = `recoveryCantSave` (:597 → recoveryCase('cantsave'), the Export-current-farm check is :574-577 at w 360). `ONLY=pt1,recoveryCantSave`.
- Preview server: rc0-browser imports scripts/serve-own.mjs; under the harness preload ($H = `node --import harness/lib/pw-launch.mjs --import harness/lib/console-hook.mjs`, run-rc.sh:140) it is redirected to harness/lib/serve-lane.mjs, which needs a lane-run vite preview at `QA_SERVE_URL` with `QA_SERVE_OUTDIR=dist-qa`. pw-launch needs QA_LANE, QA_PIDFILE, QA_WT; console-hook needs QA_WT, QA_BID, CONSOLE_LOG, RUN_TAG.
- Ports: harness/ uses 5171-5195, harness-rc 5201-5235 (T lane 5231-35 = baseline). Proposed: **5241** (vite preview). Lock: `.browser-test-2.lock` (Chromium lane-B lock; serialises with any harness-rc Chromium step).
- Worktree /tmp/qa-v5-76390f2: HEAD 76390f2, `git status --porcelain` empty, dist-qa build-id m4.1+76390f2 (checked 10:4x).
- Output: NEW dir `artifacts/v5-rc-ui/prerun-p2-rerun-rc0/` (never into prerun-p2/, whose SUMS/.carryover must stay valid). Label it PROVISIONAL rerun.

## Commands (from /workspace/egg-farm-studio; one operator shell)
```bash
cd /workspace/egg-farm-studio
LANE=uiqa-rerun-rc0-76390f2; WT=/tmp/qa-v5-76390f2; HN=$PWD/artifacts/v5-ui/harness
OUT=$PWD/artifacts/v5-rc-ui/prerun-p2-rerun-rc0; AX=/workspace/qa-v5-scratch/axe-4.14.0
PORT=5241; PIDF=$PWD/.pids/$LANE.pids
# 0. axe scratch copy of the pinned file (no npm install needed)
mkdir -p $AX $OUT/{logs,console,run,serve,rc0-shots}
cp artifacts/v5-ui/tools/axe-core-4.14.0/axe.min.js $AX/axe.min.js
echo "20c09fe157a8a34a30e241aaa1fcdade657734f08ab379ecfbeb7d45cc46e878  $AX/axe.min.js" | sha256sum -c || exit 3
echo "PROVISIONAL rerun of rc0 Chromium pt1+recoveryCantSave on 76390f2 (QA-D-1030-PRERUN-TRIAGE 4/b); not an RC gate" > $OUT/PROVISIONAL.txt
# 1. load gate (repeat right before each launch)
awk '{exit !($1 < 8)}' /proc/loadavg || { echo "1-min load $(cut -d' ' -f1 /proc/loadavg) >= 8: wait"; exit 1; }
# 2. vite preview (lane-run, own group)
VS=$(ops/tools/lane-run.sh $LANE -- bash -c "cd $WT && exec npx vite preview --outDir dist-qa --port $PORT --strictPort --host 127.0.0.1 > $OUT/serve/vite-$PORT.log 2>&1")
for i in $(seq 1 30); do curl -sf http://127.0.0.1:$PORT/ | grep -q 'content="m4.1+76390f2"' && break; sleep 1; done
# 3. load gate again, then the rc0 step under lane-step (lock 2, exit code file)
awk '{exit !($1 < 8)}' /proc/loadavg || { echo "load >= 8: stop vite (step 5) and retry later"; }
RC=$(ops/tools/lane-run.sh $LANE -- env QA_LANE=$LANE QA_PIDFILE=$PIDF QA_LOCK_WAIT=600 \
  bash $HN/lib/lane-step.sh $OUT/logs/rc0-chromium-rerun.log $OUT/run/exit $OUT/run/stamp $PWD/.browser-test-2.lock -- \
  bash -c "cd $WT && exec env QA_WT=$WT QA_BID=m4.1+76390f2 QA_LANE=$LANE QA_PIDFILE=$PIDF QA_SERVE_URL=http://127.0.0.1:$PORT/ QA_SERVE_OUTDIR=dist-qa PORT=$PORT ONLY=pt1,recoveryCantSave AXE_PATH=$AX/axe.min.js SHOTS=$OUT/rc0-shots CONSOLE_LOG=$OUT/console/rc0-chromium-rerun.jsonl RUN_TAG=rc0-chromium-rerun node --import $HN/lib/pw-launch.mjs --import $HN/lib/console-hook.mjs scripts/rc0-browser.mjs chromium")
echo "$LANE vite=$VS rc0=$RC" > $OUT/run/pids.txt
# 4. wait for $OUT/run/exit (poll the file, no ps); 600 s watchdog by hand:
#    if no exit file 600 s after $OUT/run/stamp -> ops/tools/lane-kill.sh $LANE $RC   (recorded PID only), record as HALTED, not evidence
# 5. stop vite: ops/tools/lane-kill.sh $LANE $VS   -> expect exactly "TERM <VS> (group)", then re-run lane-kill for "GONE <VS>"
# 6. cd $OUT && find . -type f ! -name SHA256SUMS | sort | xargs sha256sum > SHA256SUMS
```
Pass criteria to read: log has the PT1-6 axe lines (no ENOENT) and `AC14b cantsave 360: Export save exports the CURRENT farm (basket 33, not boot 15)` PASS/FAIL with a non-null value. If it is null again, keep the download (`acceptDownloads` path) for triage before any severity.
Note: QA_DRYRUN/run-rc are not usable for this: MODE=prerun refuses (PRERUN.json exists, run-rc.sh:117) and QA_DRYRUN=1 output is NOT EVIDENCE.
