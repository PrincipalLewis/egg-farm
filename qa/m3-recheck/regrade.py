# by-design grading: canonical -> blocked no card/no flag, writable-in-session no card, next load card once + flag saved
import json,glob,sys
O=sys.argv[1];F=lambda o:True in (o or {}).values()
for f in sorted(glob.glob(O+'/exp-blocked-*.jsonl'))+sorted(glob.glob(O+'/exp-blkreload-*.jsonl'))+sorted(glob.glob(O+'/exp-cardreload-*.jsonl')):
  for l in open(f):
    r=json.loads(l);a,b,c=r['blocked'],r['writable'],r['reload'];a2=r.get('blockedReload')
    ok={'blockedNoCard':not a['card'] and a['count']==0 and not F(a['flag']),'writableSessionNoCard':b['count']==0,'nextLoadOnce':c['card'] and c['count']==1 and (F(c['flag']) or not r['fixture'].startswith('canonical'))}
    if a2: ok['reloadBlockedNoCard']=not a2['card'] and a2['count']==0 and not F(a2['flag'])
    d=r.get('reloadAfterGotIt')
    if d: ok['reloadAfterGotItNoCard']=bool(d.get('gotItClicked')) and not d['card'] and d['count']==1 and F(d['flag']) and bool(d.get('tab'))
    print(f.split('/')[-1],r['size'],r['variant'],r['fixture'],'PASS' if all(ok.values()) else 'FAIL',ok)
for f in sorted(glob.glob(O+'/exp-final-*.jsonl')):
  for l in open(f):
    r=json.loads(l)
    if r['case'].startswith('C5-gate'):print(f.split('/')[-1],r['size'],r['case'],r.get('fails'),r.get('count'))
