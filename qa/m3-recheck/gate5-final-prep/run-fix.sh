#!/usr/bin/env bash
# EXP1 + C5/C5b + storage-blocked + Art&UX 360 reshoots on HoE's fix SHA, 3 engines. Target <=20 min.
# usage: bash run-fix.sh <full-sha>     (own worktree /tmp/qa-fix-<sha7>, own node_modules, port 4821, lane rule)
set -u; SHA=$1; S7=${SHA:0:7}; R=/workspace/egg-farm-studio; H=$R/qa/m3-recheck/gate5-final-prep; O=$R/qa/m3-recheck/exp1-fix-$S7; W=/tmp/qa-fix-$S7; PORT=4821
mkdir -p $O; cd /tmp/qa-final-c11e3a0 && git fetch -q gh && git cat-file -e $SHA^{commit} || { echo "SHA not fetchable"; exit 2; }
git diff --stat c11e3a0 $SHA -- src > $O/diff-vs-c11e3a0.txt
[ -d $W ] || git worktree add -q --detach $W $SHA; cd $W && cp -al /tmp/qa-final-c11e3a0/node_modules . 2>/dev/null || npm ci --no-audit --no-fund >$O/npm.log 2>&1
npm run build >$O/build.log 2>&1 || { echo build failed; exit 3; }; grep -o 'build-id" content="[^"]*' dist/index.html | tee $O/build-id.txt
python3 -m http.server $PORT --bind 127.0.0.1 -d dist >/dev/null 2>&1 & SRV=$!; trap "kill $SRV" EXIT; sleep 1
lock(){ L=$(cut -d' ' -f1 /proc/loadavg); [ "$E" = chromium ] && awk "BEGIN{exit !($L<12)}" && echo $R/.browser-test-2.lock || echo $R/.browser-test.lock; }  # lane 2 = chromium only
export URL=http://127.0.0.1:$PORT/ SHA PW=$W/node_modules/playwright-core/index.mjs; unset G5MODE EXP1_VARIANT
cd $H; for E in chromium firefox webkit; do   # ~6 min/engine
  flock -w 300 $(lock) timeout 420 node exp-final.mjs $E $O > $O/exp-final-$E.log 2>&1; echo "$E exp-final exit=$?"
  flock -w 300 $(lock) timeout 150 node exp-ro.mjs $E $O > $O/exp-ro-$E.log 2>&1; echo "$E C5b exit=$?"
  flock -w 300 $(lock) env SIZES=390x844,360x800 timeout 420 node exp-blocked.mjs $E $O > $O/exp-blocked-$E.log 2>&1; echo "$E blocked exit=$?"
done
python3 - $O $SHA <<'P'
import json,glob,os,sys,hashlib;O,SHA=sys.argv[1:];os.chdir(O)
ents=[json.loads(l) for f in sorted(glob.glob('entries-*.jsonl')) for l in open(f) if l.strip()]
for r in ents: r['sha256']=hashlib.sha256(open(r['file'],'rb').read()).hexdigest() if os.path.exists(r['file']) else None
jl=lambda p:[json.loads(l) for f in sorted(glob.glob(p)) for l in open(f) if l.strip()]
fin=jl('exp-final-*.jsonl');blk=jl('exp-blocked-*.jsonl')
m={"sha":SHA,"build_id":open('build-id.txt').read().strip(),"entries":ents,"exp_final_fails":[r for r in fin if r.get('ok') is False],"blocked":blk,
"blocked_pass":all(r['pass'] for r in blk),"art_ux_360":[{k:r[k] for k in('engine','variant','fixture','ok')} for r in blk if r['size']=='360x800' and r['fixture'].startswith('canonical')]}
json.dump(m,open('manifest.json','w'),indent=1);print('entries',len(ents),'exp_final_fails',len(m['exp_final_fails']),'blocked_pass',m['blocked_pass'])
P
