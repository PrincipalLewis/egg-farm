"""AC7 (F1 rebaseline): Farm level reached at 30 min, 30 seeds (0-29), per scenario. ECON_CSV selects table."""
import farm_stress_sim as m, statistics as st, collections
SC={'standard seller15':{}, 'casual worst case (Poisson+20 s+-25%)':dict(poisson=True,sell_every=20,dem_scale=0.75),
    'demand -25%':dict(dem_scale=0.75), 'sells every 20 s':dict(sell_every=20), 'cheapest-first':dict(policy='cheapest')}
print('# table', m.CSV, '| level reached at 30:00, seeds 0-29 | pass band L18-L22, target L20')
for n,kw in SC.items():
  L=[max(l for l,t in m.run(s,T=1800,**kw)['reach'].items() if t<=1800) for s in range(30)]
  c=collections.Counter(L); inb=sum(18<=x<=22 for x in L)
  print(f'{n}: median L{st.median(L):g}, min {min(L)}, max {max(L)}, dist {dict(sorted(c.items()))}, in band {inb}/30')
