# QA manifest for PR #70 @ 30b29d3: every evidence file with sha256 + per-run summaries. usage: python3 make-manifest-p1.py
import json, glob, hashlib, os
E = '/workspace/egg-farm-studio/qa/m41/p1-30b29d3'; os.chdir(E)
h = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
files = sorted(f for f in glob.glob('**/*', recursive=True) if os.path.isfile(f) and not f.endswith('manifest.json'))
p1 = []
for f in sorted(glob.glob('p1/p1-*.jsonl')):
  L = [json.loads(x) for x in open(f)]; d = [x for x in L if x.get('rt') == 'done']
  p1.append({'file': f, 'done': bool(d), 'pass': d[-1]['pass'] if d else None, 'fail': d[-1]['fail'] if d else None, 'fails': d[-1]['fails'] if d else None, 'loads': d[-1]['loads'] if d else None, 'bidOk': d[-1]['loadsOk'] if d else None})
con = {}
for f in sorted(glob.glob('console/*.jsonl')):
  L = [json.loads(x) for x in open(f)]
  con[f] = {'loads': sum(1 for x in L if x['kind'] == 'load'), 'bid_bad': sum(1 for x in L if x['kind'] == 'load' and not x.get('bidOk')), 'console_error': sum(1 for x in L if x['kind'] == 'console.error'), 'pageerror': sum(1 for x in L if x['kind'] == 'pageerror')}
m = {'pr': 70, 'sha': '30b29d3f60d7eeae5b78feb3ec5c1fcbcf9a1134', 'branch': 'fix/m41-patch1', 'build_id': 'm4.1+30b29d3', 'flagoff_build_id': 'm4.1+30b29d3+dirty (QA flag-off clone, balance.json m4.enabled=0)',
  'worktree': '/tmp/qa-p1-30b29d3 (clean, detached)', 'not_reused': 'no evidence from /workspace/wt-ui-shots or author worktrees; all shots made by QA probes in this folder',
  'p1_runs': p1, 'console': con, 'shot_count': sum(1 for f in files if f.endswith('.png')), 'files': [{'path': f, 'sha256': h(f), 'bytes': os.path.getsize(f)} for f in files]}
json.dump(m, open('manifest.json', 'w'), indent=1)
print(len(files), 'files,', m['shot_count'], 'png;', 'p1 runs', [(r['file'].split('/')[-1], r['pass'], r['fail']) for r in p1]); print('console', {k.split('/')[-1]: v for k, v in con.items() if v['console_error'] or v['pageerror'] or v['bid_bad']})
