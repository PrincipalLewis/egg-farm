"""Follow-up sweeps for m4_sim (B focus setup, B2 counters, C matched-level uplift, D active/idle). python3 m4_sweep.py > m4_sweep_out.md"""
import pickle, statistics as st
from multiprocessing import Pool
import m4_sim as M
A05 = M.A05; S = range(30)
V = {'bulk': A05, 'focus +5% x1.5': dict(A05, wmode='focus'), 'focus +5% x2.5 drain': dict(A05, wmode='focus', wfocus_drain=2.5),
     'focus +3% x1.5': dict(A05, wmode='focus', wfocus_prem=0.03), 'focus +5% x1.5, 3 s': dict(A05, wmode='focus', wfocus_every=3),
     'focus 0% x1.0 (control)': dict(A05, wmode='focus', wfocus_prem=0.0, wfocus_drain=1.0),
     'pause@40 W1/W2 rec 0.5': dict(A05, pause='yawn12'), 'pause@40 W1/W2 rec 0.25': dict(A05, pause='yawn12', pause_rec=0.25),
     'pause@40 W1/W2 rec 0': dict(A05, pause='yawn12', pause_rec=0.0), 'pause@40 W1/W2 resume 50': dict(A05, pause='yawn12', resume_at=50),
     'egg 100%': dict(A05, egg=True), 'egg 60%': dict(A05, egg=True, egg_catch=0.6), 'egg 30%': dict(A05, egg=True, egg_catch=0.3),
     'egg 100% cash cap bank': dict(A05, egg=True, egg_cash_cap_bank=True)}
def j(a):
  v, sc, mo, s = a; return M.job((v, sc, mo, s, V[v]))
if __name__ == '__main__':
  jobs = [(v, sc, mo, s) for v in V for sc in ('managed', 'unmanaged', 'M1') for mo in ('seller15', 'cheapest', 'casual', 'slow') for s in S]
  with Pool(8) as p: R = {r['k']: r for r in p.map(j, jobs, chunksize=8)}
  pickle.dump(R, open('/tmp/m4_sweep.pkl', 'wb'))
  md = M.md
  print('| variant | model | managed $/s 0-60 | unmanaged $/s 0-60 | managed wages 2h | inc@F21 managed | inc@F21 M1 | F21 ratio | F18 managed |\n|---|---|---|---|---|---|---|---|---|')
  for v in V:
    for mo in ('seller15', 'cheapest', 'casual', 'slow'):
      g = lambda sc: [R[(v, sc, mo, i)] for i in S]
      rat = md([a['inc21'] / b['inc21'] if a['inc21'] and b['inc21'] else None for a, b in zip(g('managed'), g('unmanaged'))])
      print(f"| {v} | {mo} | {md([r['i60'] for r in g('managed')]):.1f} | {md([r['i60'] for r in g('unmanaged')]):.1f} | {md([r['wages'] for r in g('managed')]):.0f} | {md([r['inc21'] for r in g('managed')]):.0f} | {md([r['inc21'] for r in g('M1')]):.0f} | {rat:.2f} | {M.fm(md([r['t'][18] for r in g('managed')]))} |")
  e = M.E; o = e.p['offline_rate']
  print(f"\n## Idle (offline) income at matched level: offline_rate {o} x eggs/s x price (cap {e.p['offline_cap_s']} s)")
  for L in (10, 15, 18, 21, 25): print(f"- F{L}: idle {o*e.rate(L)*e.price(L):.1f} $/s; demand-bound active ceiling {e.demand_rate(L)*e.price(L):.1f} $/s")
