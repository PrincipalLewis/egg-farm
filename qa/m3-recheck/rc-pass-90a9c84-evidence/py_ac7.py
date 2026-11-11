import sys, math, json, hashlib
sys.path.insert(0, '/tmp/qa-rc/90a9c84/vendor/economy-sim/sim'); import seller_variance_sim as S
N=100; e=S.Eco(S.F1); W=S.spec_from_csv('/tmp/qa-rc/90a9c84/data/economy.csv'); T=3600
def q(a,p): a=sorted(a); return a[min(len(a)-1,max(0,math.ceil(p*len(a))-1))]
out={'sim_sha':hashlib.sha256(open('/tmp/qa-rc/90a9c84/vendor/economy-sim/sim/seller_variance_sim.py','rb').read()).hexdigest()[:8],
     'csv_sha':hashlib.sha256(open('/tmp/qa-rc/90a9c84/data/economy.csv','rb').read()).hexdigest()[:8], 'yawn':W.get('yawn_at'), 'manage_at':W.get('manage_at')}
for wk in ('no workers','workers'):
  for mode,var in (('fixed',None),('variance',S.VAR_DEFAULT)):
    R=[S.run(e,'seller15',s,T=T,var=var) if wk=='no workers' else S.run_m2(e,'seller15',s,T=T,spec=W,var=var) for s in range(1,N+1)]
    l30=[S.lvl_at(r,1800) for r in R]; t10=[(S.t_to(r,10) or 1e9)/60 for r in R]; t18=[(S.t_to(r,18) or 1e9) for r in R]; t20=[(S.t_to(r,20) or 1e9) for r in R]
    slow=[max(((S.t_to(r,n+1) or 1e9)-(S.t_to(r,n) or 1e9)) for n in range(18,26)) for r in R]
    out[f'{wk}/{mode}']=dict(l30_P5=q(l30,.05),l30_P50=q(l30,.5),l30_P95=q(l30,.95),l30_min=min(l30),l30_max=max(l30),
      l10_min=round(min(t10),2),l10_P95=round(q(t10,.95),2),t18_distinct=len(set(round(x,3) for x in t18)),t18_p95_over_p50_pct=round(100*(q(t18,.95)/q(t18,.5)-1),1),
      t20_P5=round(q(t20,.05)),t20_P95=round(q(t20,.95)),t20_worst=round(max(t20)),slow1825_P95=round(q(slow,.95)),slow1825_worst=round(max(slow)))
    print(wk,mode,json.dumps(out[f'{wk}/{mode}']),flush=True)
json.dump(out,open('/workspace/egg-farm-studio/qa/m3-recheck/rc-pass-90a9c84-evidence/py_ac7.json','w'),indent=1)
