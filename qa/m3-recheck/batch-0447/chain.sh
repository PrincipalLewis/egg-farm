Q=/workspace/egg-farm-studio/qa/m3-recheck
bash $Q/batch-0447/gates.sh c6c4458 $Q/pr26-evidence-c6c4458 /tmp/qa-pr26c
cd /tmp/qa-pr26c; for i in 1 2; do (npm run test:slow -- --reporter=verbose; echo exit=$?) > $Q/pr26-evidence-c6c4458/slow-run$i.log 2>&1; done; rm -rf dist
echo PR26-DONE
bash $Q/batch-0447/gates.sh 47f0167 $Q/pr27-evidence-47f0167 /tmp/qa-pr27
echo PR27-GATES-DONE
