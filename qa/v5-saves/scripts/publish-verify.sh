#!/bin/bash
# Verify-before-publish / post-publish / rollback re-verify for egg-farm releases (Saves QA, D-CEO-20261019-13, release-checklist steps 2-5 and 8).
# Method = qa/m41/pub-35931cb-verify.md + pub-30b29d3-verify.md, scripted. READ-ONLY on GitHub: never pushes, tags or edits releases;
# never prints GITHUB_TOKEN (gh uses its own auth; this script never echoes env). Ports 5961-5964 only. Browser steps run under
# `flock /workspace/egg-farm-studio/.browser-test.lock timeout 600` (one engine per hold). Kills only the PIDs it starts.
#
# usage:
#   publish-verify.sh prepublish  --tag <tag> --sha <qa-passed sha> [--merge <main merge sha>] [--release-id <id>] [--out DIR] [--engines chromium] [--port 5961] [--clean-html F]
#   publish-verify.sh postpublish --tag <tag> --sha <qa-passed sha> [--expect-sha256 H] [--out DIR] [--engines chromium] [--clean-html F]
#   publish-verify.sh rollback    --tag <restored tag> --expect-sha256 <logged sha256> --expect-build <prefix+sha7> [--sha <restored sha>] [--bad-save <save from the bad build>] [--out DIR]
# Exit 0 = every HARD check PASS (verdict GO / CONFIRMED / ROLLBACK PASS); 1 = a HARD FAIL; 2 = usage.
set -u -o pipefail; set +x
REPO=PrincipalLewis/egg-farm; STUDIO=/workspace/egg-farm-studio; GIT=$STUDIO/game; Q=$STUDIO/qa; HERE=$(cd "$(dirname "$0")" && pwd); LOCK=$STUDIO/.browser-test.lock
MODE=${1:-}; shift || true
TAG= SHA= MERGE= RID= OUT= ENGINES=chromium PORT=5961 CLEAN= XSHA= XBUILD= BADSAVE=
while [ $# -gt 0 ]; do case $1 in --tag) TAG=$2;; --sha) SHA=$2;; --merge) MERGE=$2;; --release-id) RID=$2;; --out) OUT=$2;; --engines) ENGINES=$2;; --port) PORT=$2;;
  --clean-html) CLEAN=$2;; --expect-sha256) XSHA=$2;; --expect-build) XBUILD=$2;; --bad-save) BADSAVE=$2;; *) echo "unknown arg $1"; exit 2;; esac; shift 2; done
case $MODE in prepublish|postpublish) [ -n "$TAG" ] && [ -n "$SHA" ] || { echo "need --tag --sha"; exit 2; };; rollback) [ -n "$TAG" ] && [ -n "$XSHA" ] && [ -n "$XBUILD" ] || { echo "need --tag --expect-sha256 --expect-build"; exit 2; };; *) sed -n 2,14p "$0"; exit 2;; esac
case $PORT in 5961|5962|5963|5964) ;; *) echo "port must be 5961-5964"; exit 2;; esac
OUT=${OUT:-$Q/v5-saves/dryrun/pubv-$MODE-$TAG-$(date +%Y%m%dT%H%M%S)}; mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd); S="$OUT/summary.txt"; : > "$S"; HARDFAIL=0
cest(){ [ -n "$1" ] && [ "$1" != null ] && TZ=Europe/Belgrade date -d "$1" '+%Y-%m-%d %H:%M:%S %Z' || echo "-"; }
chk(){ local id=$1 res=$2 hard=${3:-HARD}; shift 3; echo "$id | $res | $hard | $*" | tee -a "$S"; [ "$res" = FAIL ] && [ "$hard" = HARD ] && HARDFAIL=$((HARDFAIL+1)); return 0; }
log(){ echo "# $*" >> "$OUT/run.log"; }
echo "mode=$MODE tag=$TAG sha=$SHA merge=$MERGE release_id=$RID expect_sha256=$XSHA expect_build=$XBUILD started=$(date '+%F %T %Z')" | tee "$OUT/params.txt"
# ---- G1 git (read-only fetch) ----
git -C "$GIT" fetch origin --tags --prune > "$OUT/fetch.log" 2>&1 && chk G1-fetch PASS HARD "origin/main=$(git -C $GIT rev-parse origin/main)" || chk G1-fetch FAIL HARD "see fetch.log"
if [ -n "$SHA" ]; then FULL=$(git -C "$GIT" rev-parse --verify "$SHA^{commit}" 2>/dev/null) || FULL=; [ -n "$FULL" ] && chk G1-sha PASS HARD "$FULL" || chk G1-sha FAIL HARD "cannot resolve $SHA"; SHORT=${FULL:0:7}; fi
PEEL=$(git -C "$GIT" ls-remote origin "refs/tags/$TAG^{}" | cut -f1); [ -z "$PEEL" ] && PEEL=$(git -C "$GIT" ls-remote origin "refs/tags/$TAG" | cut -f1)
if [ -z "$PEEL" ]; then [ "$MODE" = prepublish ] && chk G1-tag "NOT RUN" HARD "tag $TAG not on origin yet (pending)" || chk G1-tag FAIL HARD "tag $TAG not on origin"
else if [ -n "${FULL:-}" ]; then [ "$PEEL" = "$FULL" ] && chk G1-tag PASS HARD "$TAG -> $PEEL" || chk G1-tag FAIL HARD "$TAG -> $PEEL, expected $FULL"; else chk G1-tag PASS INFO "$TAG -> $PEEL"; FULL=$PEEL; SHORT=${PEEL:0:7}; fi; fi
if [ -n "$MERGE" ]; then
  M=$(git -C "$GIT" rev-parse --verify "$MERGE^{commit}" 2>/dev/null); { echo "merge $M"; git -C $GIT log -1 --format='parents %P%ncommitter %cn %ci%nsubject %s' "$M"; } > "$OUT/merge.txt"
  git -C "$GIT" merge-base --is-ancestor "$M" origin/main && chk G1-merge-on-main PASS HARD "$M" || chk G1-merge-on-main FAIL HARD "$M not on origin/main"
  git -C "$GIT" merge-base --is-ancestor "$FULL" "$M" && chk G1-ancestor PASS HARD "$SHORT ancestor of ${M:0:7}; parents $(git -C $GIT log -1 --format=%P $M)" || chk G1-ancestor FAIL HARD "$SHORT not an ancestor of $M"
  T1=$(git -C $GIT rev-parse "$FULL^{tree}"); T2=$(git -C $GIT rev-parse "$M^{tree}"); git -C $GIT diff --stat "$FULL" "$M" > "$OUT/diff-stat.txt"; git -C $GIT diff "$FULL" "$M" > "$OUT/diff.patch"
  SHIP=$(git -C $GIT diff --name-only "$FULL" "$M" | grep -E '^(src/|public/|index\.html|vite\.config|scripts/(build-html|build-id|check-release-build)|data/|package(-lock)?\.json)' || true)
  if [ "$T1" = "$T2" ]; then chk G1-tree PASS HARD "trees equal $T1"; elif [ -z "$SHIP" ]; then chk G1-tree PASS HARD "trees differ ($T1 vs $T2) but only non-shipping files: $(git -C $GIT diff --name-only $FULL $M | tr '\n' ' ')"; else chk G1-tree FAIL HARD "shipping files differ: $(echo $SHIP | tr '\n' ' ')"; fi
fi
# ---- G2 clean build of the QA-passed SHA (pre/post; rollback uses --expect-sha256 instead) ----
if [ "$MODE" != rollback ]; then
  if [ -n "$CLEAN" ]; then cp "$CLEAN" "$OUT/clean-build.html"; chk G2-clean-build PASS INFO "given --clean-html $CLEAN"
  else WT=$Q/wt-pubv-$SHORT; if [ -e "$WT" ]; then chk G2-clean-build FAIL HARD "$WT exists; remove it or pass --clean-html"; else
    git -C "$GIT" worktree add --detach "$WT" "$FULL" > "$OUT/worktree.log" 2>&1; ( cd "$WT" && npm ci --no-audit --no-fund > "$OUT/npm-ci.log" 2>&1 && git status --porcelain > "$OUT/porcelain-pre.txt" && npm run build:html > "$OUT/build-html.log" 2>&1 && git status --porcelain > "$OUT/porcelain-post.txt" )
    if [ -f "$WT/dist-html/egg-farm.html" ] && [ ! -s "$OUT/porcelain-post.txt" ]; then cp "$WT/dist-html/egg-farm.html" "$OUT/clean-build.html"; PREFIX=$(sed -n "s/^export const BUILD_PREFIX = '\(.*\)';/\1/p" "$WT/scripts/build-id.ts"); echo "$PREFIX" > "$OUT/build-prefix.txt"
      chk G2-clean-build PASS HARD "npm ci + build:html ok, porcelain 0"; else chk G2-clean-build FAIL HARD "build failed or dirty (see build-html.log, porcelain-post.txt)"; fi
    git -C "$WT" status --porcelain | grep -q . || git -C "$GIT" worktree remove "$WT" >> "$OUT/worktree.log" 2>&1; fi; fi
  if [ -f "$OUT/clean-build.html" ]; then CSHA=$(sha256sum "$OUT/clean-build.html" | cut -d' ' -f1); CSIZE=$(stat -c %s "$OUT/clean-build.html"); PREFIX=${PREFIX:-$(cat "$OUT/build-prefix.txt" 2>/dev/null || grep -o 'name="build-id" content="[^"+]*' "$OUT/clean-build.html" | head -1 | sed 's/.*content="//')}
    XBUILD=${XBUILD:-$PREFIX+$SHORT}; IDS=$(grep -o "$PREFIX+[0-9a-z+]*" "$OUT/clean-build.html" | sort | uniq -c | tr -s ' ' | tr '\n' ';')
    [ "$(grep -c '+dirty' "$OUT/clean-build.html")" = 0 ] && [ "$(grep -o "$PREFIX+[0-9a-z+]*" "$OUT/clean-build.html" | sort -u)" = "$XBUILD" ] && chk G2-build-id PASS HARD "clean sha256 $CSHA size $CSIZE ids $IDS" || chk G2-build-id FAIL HARD "ids $IDS expected $XBUILD"
    XSHA=${XSHA:-$CSHA}; fi
fi
# ---- G3 release + asset ----
if [ -n "$RID" ]; then gh api "repos/$REPO/releases/$RID" > "$OUT/release.json" 2>"$OUT/release.err"; else gh api "repos/$REPO/releases?per_page=30" --jq "[.[] | select(.tag_name==\"$TAG\")][0]" > "$OUT/release.json" 2>"$OUT/release.err"; fi
gh api "repos/$REPO/releases/latest" --jq '{tag_name,html_url,published_at}' > "$OUT/latest.json" 2>/dev/null; LATEST=$(jq -r .tag_name "$OUT/latest.json")
if [ ! -s "$OUT/release.json" ] || [ "$(jq -r '.id // empty' "$OUT/release.json")" = "" ]; then chk G3-release "NOT RUN" $([ $MODE = prepublish ] && echo INFO || echo HARD) "no release for $TAG (pending)"; [ $MODE != prepublish ] && HARDFAIL=$((HARDFAIL+1))
else
  DRAFT=$(jq -r .draft "$OUT/release.json"); PRE=$(jq -r .prerelease "$OUT/release.json"); URL=$(jq -r .html_url "$OUT/release.json"); PUB=$(jq -r .published_at "$OUT/release.json"); RTAG=$(jq -r .tag_name "$OUT/release.json")
  chk G3-release INFO INFO "id $(jq -r .id $OUT/release.json) tag $RTAG draft=$DRAFT prerelease=$PRE target=$(jq -r .target_commitish $OUT/release.json) published $(cest $PUB) url $URL"
  if [ $MODE != prepublish ]; then [ "$DRAFT" = false ] && [ "$PRE" = false ] && [ "$LATEST" = "$TAG" ] && chk G3-latest PASS HARD "Latest = $LATEST" || chk G3-latest FAIL HARD "Latest=$LATEST draft=$DRAFT prerelease=$PRE"; else chk G3-latest INFO INFO "current Latest = $LATEST"; fi
  AID=$(jq -r '[.assets[] | select(.name=="egg-farm.html")][0].id // empty' "$OUT/release.json"); ADIG=$(jq -r '[.assets[] | select(.name=="egg-farm.html")][0].digest // empty' "$OUT/release.json" | sed 's/^sha256://'); ASZ=$(jq -r '[.assets[] | select(.name=="egg-farm.html")][0].size // empty' "$OUT/release.json")
  if [ -z "$AID" ]; then chk G3-asset FAIL HARD "no asset named egg-farm.html ($(jq -r '[.assets[].name]|join(",")' $OUT/release.json))"; else
    gh api "repos/$REPO/releases/assets/$AID" -H "Accept: application/octet-stream" > "$OUT/release-egg-farm.html" 2>"$OUT/asset.err"; RSHA=$(sha256sum "$OUT/release-egg-farm.html" | cut -d' ' -f1); RSZ=$(stat -c %s "$OUT/release-egg-farm.html")
    [ "$RSHA" = "$ADIG" ] && [ "$RSZ" = "$ASZ" ] && chk G3-asset-digest PASS HARD "downloaded sha256 $RSHA = GitHub digest, size $RSZ" || chk G3-asset-digest FAIL HARD "downloaded $RSHA/$RSZ vs digest $ADIG/$ASZ"
    [ "$RSHA" = "$XSHA" ] && chk G3-asset-expected PASS HARD "asset == expected sha256 $XSHA" || chk G3-asset-expected FAIL HARD "asset $RSHA != expected $XSHA (Blocker in rollback mode)"
    [ -f "$OUT/clean-build.html" ] && { cmp -s "$OUT/release-egg-farm.html" "$OUT/clean-build.html" && chk G3-asset-cmp PASS HARD "cmp identical to clean build" || chk G3-asset-cmp FAIL HARD "cmp differs from clean build"; }
    AIDS=$(grep -o "${XBUILD%%+*}+[0-9a-z+]*" "$OUT/release-egg-farm.html" | sort -u | tr '\n' ' '); [ "$AIDS" = "$XBUILD " ] && [ "$(grep -c '+dirty' $OUT/release-egg-farm.html)" = 0 ] && chk G3-asset-build-id PASS HARD "$AIDS" || chk G3-asset-build-id FAIL HARD "asset ids '$AIDS' expected $XBUILD"
  fi
  # release-asset.yml run for this tag
  gh run list -R $REPO --workflow release-asset.yml --limit 20 --json databaseId,event,headBranch,headSha,conclusion,status,updatedAt,createdAt > "$OUT/release-asset-runs.json" 2>/dev/null
  RUN=$(jq -r "[.[] | select(.headBranch==\"$TAG\")][0].databaseId // empty" "$OUT/release-asset-runs.json")
  if [ -z "$RUN" ]; then chk G3-release-asset-run "NOT RUN" $([ $MODE = postpublish ] && echo HARD || echo INFO) "no release-asset.yml run for $TAG yet"; [ $MODE = postpublish ] && HARDFAIL=$((HARDFAIL+1))
  else gh run view $RUN -R $REPO --json conclusion,event,headSha,updatedAt,jobs > "$OUT/release-asset-run-$RUN.json" 2>/dev/null; gh run view $RUN -R $REPO --log 2>/dev/null | grep -E 'check-release-build: ' | sed 's/^.*Z //' > "$OUT/release-asset-run-$RUN-log.txt"
    RC=$(jq -r .conclusion "$OUT/release-asset-run-$RUN.json"); STEP=$(jq -r '[.jobs[].steps[] | select(.name|test("check-release-build")) | .conclusion][0]' "$OUT/release-asset-run-$RUN.json"); MATCH=$(grep -c "matches expected ok" "$OUT/release-asset-run-$RUN-log.txt")
    [ "$RC" = success ] && [ "$STEP" = success ] && [ "$MATCH" -ge 1 ] && chk G3-release-asset-run PASS $([ $MODE = rollback ] && echo INFO || echo HARD) "run $RUN $(jq -r .event $OUT/release-asset-run-$RUN.json) success, finished $(cest $(jq -r .updatedAt $OUT/release-asset-run-$RUN.json)), build-id match in log" \
      || chk G3-release-asset-run FAIL $([ $MODE = rollback ] && echo INFO || echo HARD) "run $RUN conclusion=$RC step=$STEP match=$MATCH"; fi
fi
# ---- G4 CI on the passed SHA ----
if [ -n "${FULL:-}" ] && [ $MODE != rollback ]; then gh api "repos/$REPO/commits/$FULL/check-runs" --jq '.check_runs[] | "\(.name)\t\(.status)\t\(.conclusion)\t\(.completed_at)"' > "$OUT/ci-$SHORT.txt" 2>/dev/null
  NBAD=$(awk -F'\t' '$2!="completed" || ($3!="success" && $3!="skipped")' "$OUT/ci-$SHORT.txt" | wc -l); N=$(wc -l < "$OUT/ci-$SHORT.txt")
  [ "$N" -gt 0 ] && [ "$NBAD" = 0 ] && chk G4-ci PASS HARD "$N check runs green on $SHORT" || chk G4-ci FAIL HARD "$NBAD of $N check runs not green (ci-$SHORT.txt)"; fi
# ---- G5 runtime (one engine per lock hold) ----
RT=$OUT/release-egg-farm.html; [ -f "$RT" ] || RT=$OUT/clean-build.html
if [ -f "$RT" ]; then for E in ${ENGINES//,/ }; do flock -w 900 "$LOCK" timeout 600 node "$HERE/runtime-smoke.mjs" --html "$RT" --port $PORT --out "$OUT/runtime" --expect-build "$XBUILD" --engine $E ${BADSAVE:+--bad-save "$BADSAVE"} > "$OUT/runtime-$E.log" 2>&1
  rc=$?; [ $rc = 0 ] && chk G5-runtime-$E PASS HARD "$(basename $RT): $(grep -c '] PASS' $OUT/runtime-$E.log) checks pass" || chk G5-runtime-$E FAIL HARD "exit $rc: $(grep '] FAIL' $OUT/runtime-$E.log | cut -c1-200 | tr '\n' ' ')"; done
else chk G5-runtime "NOT RUN" HARD "no html to run"; fi
# ---- verdict ----
NR=$(grep -c '| NOT RUN | HARD' "$S"); case $MODE in
  prepublish) V=$([ $HARDFAIL = 0 ] && { [ "$NR" = 0 ] && echo GO || echo "GO-with-conditions (pending: publish-time checks)"; } || echo NO-GO);;
  postpublish) V=$([ $HARDFAIL = 0 ] && echo CONFIRMED || echo "NOT CONFIRMED");;
  rollback) V=$([ $HARDFAIL = 0 ] && echo "ROLLBACK RE-VERIFY PASS" || echo "ROLLBACK RE-VERIFY FAIL (Blocker: escalate to HoE + CEO now)");; esac
{ echo "VERDICT: $V"; echo "hard_fail=$HARDFAIL not_run_hard=$NR finished=$(date '+%F %T %Z')"; } | tee -a "$S"
if [ $MODE = rollback ]; then { echo; echo "--- draft message (priority, to HoE + CEO) ---"; echo "Rollback re-verify $([ $HARDFAIL = 0 ] && echo PASS || echo FAIL): Latest = $LATEST ${URL:-}"; echo "egg-farm.html sha256 ${RSHA:-n/a} (expected $XSHA), build-id ${AIDS:-n/a}(expected $XBUILD)."; [ $HARDFAIL = 0 ] || echo "MISMATCH = Blocker."; } | tee "$OUT/message-draft.txt"; fi
(cd "$OUT" && find . -type f ! -name SHA256SUMS ! -path './runtime/.serve/*' | sort | xargs sha256sum > SHA256SUMS)
exit $([ $HARDFAIL = 0 ] && echo 0 || echo 1)
