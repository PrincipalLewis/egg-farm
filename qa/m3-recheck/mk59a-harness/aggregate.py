import json,sys,glob
R=[x for f in sys.argv[2:] for x in json.load(open(f))]
ref=json.load(open('/workspace/egg-farm-studio/scratch/mh-hold/t2_lc1.json'))['prog'][sys.argv[1]]['levels']
out={}
print(f'seeds={len(R)}  variant ref={sys.argv[1]}')
print('L  harness  economy  diff')
for L in range(3,26):
  sp=sum(x['spawn'].count(L) for x in R); fl=sum(x['filled'].count(L) for x in R)
  if sp: out[L]=round(100*fl/sp,2); e=ref.get(str(L),{}).get('served_pct'); print(L,out[L],e,None if e is None else round(out[L]-e,2))
l30=sorted(max([int(k) for k,v in x['reach'].items() if v<=1800]) for x in R); print('L@30m P5',l30[4],'median',l30[len(l30)//2])
json.dump(out,open('served.json','w'))
