# M5.2 add-on: effect on the pooled share / ratio of perturbing ONE seed (±1 charge at F20) while the other 199 stay at base. Also per-seed |delta share| distribution. Input as pool2.py.
import json
import os as _os
PD=_os.environ.get("PDIR","out")  # 2026-10-25: PDIR=out/o1a for the o1a re-run
from press import load,k30,hq
from pool2 import agg
out={}
for p in ('optimal','seller15','casual'):
  A={c:agg(load(f'{PD}/pr.{p}.{c}.p0.jsonl')) for c in ('on','off')}; N={c:sum(v[0] for v in A[c].values()) for c in A}; D={c:sum(v[1] for v in A[c].values()) for c in A}
  r={}
  for c in ('on','off'):
    for P in (1,-1):
      fp=f'{PD}/pr.{p}.{c}.p{P}.jsonl'
      if not _os.path.exists(fp) or sum(1 for _ in open(fp))!=200: continue  # optional runs (o1a -1) may be absent
      Ap=agg(load(fp)); o='off' if c=='on' else 'on'
      one=[]; ds=[]
      for s in A[c]:
        n=N[c]-A[c][s][0]+Ap[s][0]; d=D[c]-A[c][s][1]+Ap[s][1]; sh=n/d; base=N[c]/D[c]
        rt=(sh/(N[o]/D[o])) if c=='on' else ((N[o]/D[o])/sh); rb=(N['on']/D['on'])/(N['off']/D['off'])
        one.append((abs(sh-base),abs(rt-rb))); ds.append(Ap[s][0]/Ap[s][1]-A[c][s][0]/A[c][s][1])
      r[f'{c}{P:+d}']=dict(seed_dShare_p50=hq(ds,.5),seed_dShare_p95abs=hq([abs(x) for x in ds],.95),oneSeed_dPooled_max=max(x[0] for x in one),oneSeed_dRatio_max=max(x[1] for x in one),oneSeed_dRatio_med=hq([x[1] for x in one],.5))
  out[p]=r; print(p,json.dumps(r))
json.dump(out,open(f'{PD}/pool2b.json','w'),indent=1)
