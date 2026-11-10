"""F1 purchase-gap fix (Economy, 2026-10-16). Uses f1_levers.SegEco + per-level Farm cost multipliers (f_mul {F: x}).
economy_sim.py / f1_levers.py untouched. python3 f1_gapfix.py [--seeds 30] [--full]"""
import sys, math, argparse, statistics as st
import f1_levers as fl; m = fl.m
from multiprocessing import Pool
F1 = dict(f_seg=((6, 14, 1.25), (15, 20, 1.45)))
class GapEco(fl.SegEco):
  def fcost(s, f): return math.floor(super().fcost(f) * s.p.get('f_mul', {}).get(f, 1.0))
V = {'F1': {}}
for a, b, c in [(1, .85, 1), (.90, .85, 1), (.90, .85, .85), (.85, .85, .85), (.90, .80, .80), (.85, .80, .80), (1, .85, .85), (1, .80, .80), (.80, .85, 1), (.75, .85, 1), (.80, .80, 1), (.75, .80, 1), (.70, .85, 1), (.80, .85, .85)]:
  V[f'F1 c18x{a} c19x{b} c20x{c}'] = dict(f_mul={18: a, 19: b, 20: c})
def eco(v): return GapEco(dict(m.CURRENT, **F1, **V[v]))
MOD = {'seller15': ('seller15', {}), 'casual': ('seller15', m.CASUAL), 'cheapest': ('cheapest', {})}
def gap30(r, T=1800):
  bt = [0.0] + [b[0] for b in r['buys'] if b[0] <= T]
  g = [(y - x, i) for i, (x, y) in enumerate(zip(bt, bt[1:]))]
  # open gap at 30:00 counts only if it later closes (measure to next buy, any time)
  nxt = [b[0] for b in r['buys'] if b[0] > T]
  if nxt: g.append((nxt[0] - bt[-1], len(bt) - 1))
  closed = max(g[:-1] if nxt else g)[0]
  w = max(g); b = r['buys'][w[1]] if w[1] < len(r['buys']) else None
  return (w[0], closed), (r['buys'][w[1] - 1] if w[1] > 0 else None), b
def one(a):
  v, mo, s, T = a; pol, kw = MOD[mo]; r = m.run(eco(v), pol, s, T=T, **kw)
  (g, gc), prev, nb = gap30(r)
  st_ = [r['reach'][L + 1] - r['reach'][L] for L in range(5, 14)]
  return a, dict(gc=gc, g=g, prev=prev, nb=nb, l30=m.lvl_at(r, 1800), t30=r['reach'].get(30), first=r['buys'][0][0], st=st_)
if __name__ == '__main__':
  ap = argparse.ArgumentParser(); ap.add_argument('--seeds', type=int, default=30); ap.add_argument('--T', type=int, default=2400); ap.add_argument('--var', nargs='*')
  A = ap.parse_args(); N = A.seeds; VV = A.var or list(V)
  with Pool(8) as p: D = dict(p.map(one, [(v, mo, s, A.T) for v in VV for mo in MOD for s in range(N)], chunksize=2))
  print('| variant | model | gap incl. open-at-30:00 med / worst (s) | closed-in-30:00 med / worst | where (median seed: prev buy -> next buy, t,kind,C,F) | worst seed | L@30 med (min-max) | L30 min med | first buy s | s/level L5-14 med (max) |\n|---|---|---|---|---|---|---|---|---|---|')
  for v in VV:
    for mo in MOD:
      rs = sorted((D[(v, mo, s, A.T)] for s in range(N)), key=lambda r: r['g']); md = rs[N // 2]; wr = rs[-1]
      l = [r['l30'] for r in rs]; t = [r['t30'] for r in rs if r['t30']]
      stl = [st.median(r['st'][i] for r in rs) for i in range(9)]
      print(f"| {v} | {mo} | {md['g']:.0f} / {wr['g']:.0f} | {st.median(r['gc'] for r in rs):.0f} / {max(r['gc'] for r in rs):.0f} | {md['prev']} -> {md['nb']} | {wr['prev']} -> {wr['nb']} | {st.median(l)} ({min(l)}-{max(l)}) | {st.median(t)/60 if t else 'n/r'} ({len(t)}/{N}) | {st.median(r['first'] for r in rs)} | {' '.join(f'{x:.0f}' for x in stl)} ({max(max(r['st']) for r in rs):.0f}) |")
