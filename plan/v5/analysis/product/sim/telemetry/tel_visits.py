"""Stochastic visit player: visits with exponential gaps (mean G s), 5 taps (1/s) per visit + Sell all every 30 s.
python3 tel_visits.py -> tel_visits.json"""
import sys, os, json, random
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tel_core as m, tel_run as tr
def mk(G, seed, T=7200, n=5):
  rng = random.Random(10_000 + seed); S = set(); t = 1.0
  while t < T:
    for k in range(n): S.add(round(t + k))
    t += n + rng.expovariate(1 / G)
  return lambda tt: round(tt) in S
def job(a):
  caps, G, mode, seed = a; e = m.Eco(m.CURRENT)
  r = m.run_tel(e, 'seller15', seed, T=7200, sell_every=30, taps=mk(G, seed), spec=tr.SPEC, cap_fn=tr.cand_cap if caps == 'cand' else None, **tr.MODES[mode])
  return dict(caps=caps, prof=f'visit{G}', mode=mode, pol='seller15', seed=seed, tel=r['tel'], first=r['buys'][0][0] if r['buys'] else None, f_end=r['f'], reach=r['reach'])
if __name__ == '__main__':
  jobs = [(c, G, mo, s) for c in ('csv', 'cand') for G in (20, 45, 90) for mo in tr.MODES for s in range(30)]
  with Pool(2) as p: out = p.map(job, jobs, chunksize=4)
  json.dump(out, open('tel_visits.json', 'w')); print(len(out))
