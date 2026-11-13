"""python3 tel_run.py [seeds]  -> tel_raw.json. 2 worker processes."""
import sys, json, csv, os
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tel_core as m
P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
CAND = list(csv.DictReader(open(os.path.join(P, 'economy.m4-candidate.csv'))))
def cand_cap(f):  # M4 candidate: coop_capacity x Hens milestone coop mult; Hens level assumed = Farm level (bots)
  r = CAND[f]; mult = 1.0
  for k in (1, 2, 3):
    if f >= float(r[f'hens_ms{k}_level']): mult = float(r[f'hens_ms{k}_coop_mult'])
  return float(r['coop_capacity']) * mult
SPEC = m.spec_from_csv(os.path.join(P, 'economy.csv'))
PROF = {'bot1hz': dict(taps=None, sell_every=15), 'casual05': dict(taps=(2, 1), sell_every=15), 'slow': dict(taps=(30, 5), sell_every=30)}
MODES = {'nohand': dict(use=('w1', 'w3', 'w4'), manage='managed'), 'unmanaged': dict(use=('w1', 'w2', 'w3', 'w4'), manage='unmanaged'),
         'managed': dict(use=('w1', 'w2', 'w3', 'w4'), manage='managed')}
def job(a):
  caps, prof, mode, pol, seed = a; e = m.Eco(m.CURRENT); pr = PROF[prof]
  r = m.run_tel(e, pol, seed, T=7200, sell_every=pr['sell_every'], taps=pr['taps'], spec=SPEC, cap_fn=cand_cap if caps == 'cand' else None, **MODES[mode])
  hand = [b[0] for b in r['buys'] if b[1] == 'w2']
  return dict(caps=caps, prof=prof, mode=mode, pol=pol, seed=seed, tel=r['tel'], first=r['buys'][0][0] if r['buys'] else None,
              f_end=r['f'], hand_t=hand[0] if hand else None, reach=r['reach'])
if __name__ == '__main__':
  S = int(sys.argv[1]) if len(sys.argv) > 1 else 20
  jobs = [(c, p, mo, po, s) for c in ('csv', 'cand') for p in PROF for mo in MODES for po in ('seller15', 'cheapest') for s in range(S)]
  with Pool(2) as pool: out = pool.map(job, jobs, chunksize=4)
  json.dump(out, open('tel_raw.json', 'w')); print(len(out), 'runs')
