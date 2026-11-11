# Re-runnable: python3 make-manifest.py <full-sha>   (run from qa/m41/m41-9-<sha7>/)
import json,glob,hashlib,subprocess,sys
SHA=sys.argv[1]; S7=SHA[:7]
h=lambda p:hashlib.sha256(open(p,'rb').read()).hexdigest()
ls=subprocess.run(['git','-C','/workspace/egg-farm-studio/game','ls-remote','origin'],capture_output=True,text=True).stdout
refs=[l.split('\t')[1] for l in ls.splitlines() if l.startswith(SHA)]
summ=open('gates/summary.txt').read()
runs=[]
for f in sorted(glob.glob('browser/entries-*.jsonl')):
  L=[json.loads(x) for x in open(f)]; d=[x for x in L if x.get('done')]
  runs.append({'file':f,'complete':bool(d),'after_fails':d[-1]['fails'] if d else None,'before_defects':sorted(set(d[-1]['beforeDefects'])) if d else None})
m={'pr':65,'sha':SHA,'branch':'fix/m41-9-ux-minors','pushed':bool(refs),'pushed_refs':refs,'merged':False,'note':'DO NOT MERGE; SHA not confirmed final (HoE: UI may add a commit for new Art rulings)',
 'base':'dd223f510e9acabf9b1915b56e39da8b88dcac63','build_id':f'm3-rc1-pre+{S7}','before_build_id':'m3-rc1-pre+dd223f5',
 'build_id_runtime_verified':'meta[name=build-id] read in-page in every context (AFTER and BEFORE) before any measurement; probe aborts on mismatch',
 'dist':[l for l in summ.splitlines() if l.startswith('dist')],
 'art_spec':{'path':'art-ux/m4.1-ui-minors.md','sha256':h('/workspace/egg-farm-studio/art-ux/m4.1-ui-minors.md')},
 'checkout':f'/tmp/qa-m41-9-{S7} clean (porcelain empty before/after gates)','before_tree':'/tmp/qa-m41-9-base-dd223f5 (clean dd223f5, own dist-qa)',
 'not_reused':'/workspace/wt-ui-shots/m41-9-6041522/ was never read or reused; all shots are from browser/p65.mjs',
 'rerun':f'gates/run-gates.sh {SHA} && (cd /tmp/qa-m41-9-base-dd223f5 && npm run build:qa) && for each engine/width: flock <lock> timeout 600 node browser/p65.mjs <engine> <w> {SHA}; python3 make-manifest.py {SHA}',
 'runs':runs,'shots':[{'path':p,'sha256':h(p)} for p in sorted(glob.glob('shots/*/*.png'))]}
json.dump(m,open('manifest.json','w'),indent=1); print(len(m['shots']),'shots', [ (r['file'],r['complete'],len(r['after_fails'] or [])) for r in runs], refs)
