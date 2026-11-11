#!/usr/bin/env python3
# Manifest: every shot -> the jsonl record that measured it (same page state, shot taken right after the measurement).
import json,glob,os,hashlib
E='/workspace/egg-farm-studio/qa/m41/m41-9-3110e88/'; out=[]
for f in sorted(glob.glob(E+'browser/p64-*.jsonl')):
  for l in open(f):
    d=json.loads(l)
    for k in ('shot',):
      if d.get(k):
        p=E+d[k]; out.append({'shot':d[k],'exists':os.path.exists(p),'sha256':hashlib.sha256(open(p,'rb').read()).hexdigest()[:16] if os.path.exists(p) else None,
          'target':d['target'],'build_id':d['build_id'],'engine':d['engine'],'size':d['size'],'section':d['section'],'state':d.get('state') or d.get('tab') or d.get('lv'),
          'tab':d.get('tab'),'sheet':(d.get('nav') or {}).get('marketVisible') if d.get('nav') else None,'activeTabs':(d.get('act') or {}).get('tabs'),'record':os.path.basename(f),'t':d['t']})
json.dump(out,open(E+'manifest.json','w'),indent=1); print(len(out),'shots;',sum(not x['exists'] for x in out),'missing')
