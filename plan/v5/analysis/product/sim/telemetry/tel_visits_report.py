import json
R = json.load(open('tel_visits.json')); B = ['F0-2','F3-7','F8-14','F15-19','F20-30']
def pct(v,p):
  v=sorted(v); k=(len(v)-1)*p; i=int(k); return v[i]+(v[min(i+1,len(v)-1)]-v[i])*(k-i)
out=[]
for metric in ('full','lost'):
 for caps in ('csv','cand'):
  out.append(f'\n## visit player {metric} % caps={caps} (P10/P50/P90, 30 seeds; n seeds reaching band)')
  out.append('| G | mode | '+' | '.join(B)+' |'); out.append('|---|---|'+'---|'*5)
  for G in (20,45,90):
   for mode in ('nohand','unmanaged','managed'):
    cells=[]
    for i in range(5):
      v=[100*(r['tel'][i]['full']/r['tel'][i]['fg'] if metric=='full' else r['tel'][i]['lostc']/r['tel'][i]['prod']) for r in R if r['caps']==caps and r['prof']==f'visit{G}' and r['mode']==mode and r['tel'][i]['fg']>30]
      cells.append(f'{pct(v,.1):.0f}/{pct(v,.5):.0f}/{pct(v,.9):.0f} (n{len(v)})' if v else 'n/r')
    out.append(f'| {G} | {mode} | '+' | '.join(cells)+' |')
for G in (20,45,90):
  fe=[r['f_end'] for r in R if r['caps']=='csv' and r['prof']==f'visit{G}' and r['mode']=='nohand']; ft=[r['first'] for r in R if r['caps']=='csv' and r['prof']==f'visit{G}' and r['mode']=='nohand']
  out.append(f'G{G}: Farm @2h P50 {pct(fe,.5):.0f}; TTFU P10/P50/P90 {pct(ft,.1):.0f}/{pct(ft,.5):.0f}/{pct(ft,.9):.0f}')
open('tel_visits_report.md','w').write('\n'.join(out)); print('\n'.join(out))
