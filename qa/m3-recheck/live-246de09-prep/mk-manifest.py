# python3 mk-manifest.py <outdir> <sha40> <base> <expected-build-id>  -> <outdir>/manifest.json (entries + sha256 + by-design grading)
import json,glob,os,hashlib,sys,subprocess
O,SHA,BASE,BID=sys.argv[1:5];os.chdir(O)
ents=[json.loads(l) for f in sorted(glob.glob('entries-*.jsonl')) for l in open(f) if l.strip()]
for r in ents: r['sha256']=hashlib.sha256(open(r['file'],'rb').read()).hexdigest() if os.path.exists(r['file']) else None
recs=[json.loads(l) for f in sorted(glob.glob('exp-cardreload-*.jsonl')) for l in open(f) if l.strip()]
F=lambda o:True in (o or {}).values()
for r in recs:
  a,a2,b,c,d=r['blocked'],r.get('blockedReload'),r['writable'],r['reload'],r.get('reloadAfterGotIt')
  ok={'blockedNoCard':not a['card'] and a['count']==0 and not F(a['flag']),'writableSessionNoCard':b['count']==0,'nextLoadOnce':c['card'] and c['count']==1 and F(c['flag'])}
  if a2: ok['reloadBlockedNoCard']=not a2['card'] and a2['count']==0 and not F(a2['flag'])
  if d: ok['reloadAfterGotItNoCard']=bool(d.get('gotItClicked')) and not d['card'] and d['count']==1 and F(d['flag']) and bool(d.get('tab'))
  r['ok_by_design']=ok;r['pass_by_design']=all(ok.values())
try: pushed=subprocess.run(['git','-C','/tmp/qa-final-c11e3a0','branch','-r','--contains',SHA],capture_output=True,text=True).stdout.split()
except Exception: pushed=[]
m={"sha":SHA,"base_url":BASE,"build_id_expected":BID,"pushed_branches":pushed,"entries":ents,"cardreload":recs,
   "missing_files":[r['file'] for r in ents if r['sha256'] is None],"all_pass":bool(recs) and all(r['pass_by_design'] for r in recs)}
json.dump(m,open('manifest.json','w'),indent=1);print('entries',len(ents),'records',len(recs),'all_pass',m['all_pass'],'missing',len(m['missing_files']))
