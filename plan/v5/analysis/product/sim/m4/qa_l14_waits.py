"""QA: waits ending at a Farm L14 purchase (no workers, seller15+casual, 30 seeds) on live economy.csv vs economy.f1.csv. python3 qa_l14_waits.py"""
import csv, statistics as st, m4_active as a
def load(p): a.R[:] = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(open(p))]
for p in ('/workspace/egg-farm-studio/game/data/economy.csv', '/workspace/egg-farm-studio/product/economy.f1.csv'):
  load(p)
  for model in ('seller15', 'casual'):
    w14 = []; t14 = []; worst = []
    for s in range(30):
      r = a.prog('seller15', s, None, 1800, 0.1, model); L = r['log']
      for x, b in zip(L, L[1:]):
        if b[1] == 'f' and b[2] == 14: w14.append(b[0] - x[0]); t14.append(b[0] / 60)
        if 15*60 <= b[0] <= 21*60: worst.append(b[0] - x[0])
    print(p.split('/')[-2], model, 'L14 reached med %.1f min' % st.median(t14) if t14 else 'L14 not reached', '| wait before L14 med %.0f max %.0f s' % (st.median(w14), max(w14)) if w14 else '', '| max gap min15-21 %.0f s' % max(worst))
