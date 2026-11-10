"""F1 mid-game stall before/after (Economy, 2026-10-16). Read-only use of economy_sim.run_m2: its source is
instrumented at load time (per-level order log) -- behaviour unchanged, economy_sim.py not edited.
Before = PROPOSAL (M1-R1) + workers from economy.pre-p1q.csv (no P4). After = CURRENT (P1q+P3) + economy.csv workers + P4.
Usage: python3 f1_stall.py [--seeds 30]"""
import sys, inspect, argparse, statistics as st, textwrap
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim'); import economy_sim as m
from multiprocessing import Pool
src = textwrap.dedent(inspect.getsource(m.run_m2))
R = [("  income_log = []", "  income_log = []; LOG = dict(orders=[], held=[], out=[])"),
     ("      if len(q) < qm: q.append(", "      LOG['orders'].append((f, max(1, round(rng.randint(e.dmin(f), e.dmax(f)) * dm)))) if False else None\n      if len(q) < qm: q.append("),
     ("          if x[3]: partial += 1\n          else: lost += 1", "          if x[3]: partial += 1; LOG['out'].append((x[2], 'p'))\n          else: lost += 1; LOG['out'].append((x[2], 'l'))"),
     ("      else: lost += 1; lost_full += 1", "      else: lost += 1; lost_full += 1; LOG['out'].append((f, 'l'))"),
     ("      sell_t += sell_every\n", "      sell_t += sell_every; LOG['held'].append((f, basket))\n"),
     ("        if x[0] == 0: q.remove(x); filled += 1", "        if x[0] == 0: q.remove(x); filled += 1; LOG['out'].append((x[2], 'f'))"),
     ("qfull_ticks=qfull_ticks, ticks=n, filled=filled)", "qfull_ticks=qfull_ticks, ticks=n, filled=filled, LOG=LOG)")]
for a, b in R:
  assert a in src, a; src = src.replace(a, b)
# order size: log the spawned order (size stored as q[-1][5] original size)
src = src.replace("      if len(q) < qm: q.append([max(1, round(rng.randint(e.dmin(f), e.dmax(f)) * dm)), t + e.p['patience'], f, 0, t])",
  "      _sz = max(1, round(rng.randint(e.dmin(f), e.dmax(f)) * dm)) if len(q) < qm else None\n      if _sz is not None: q.append([_sz, t + e.p['patience'], f, 0, t]); LOG['orders'].append((f, _sz))")
src = src.replace("      LOG['orders'].append((f, max(1, round(rng.randint(e.dmin(f), e.dmax(f)) * dm)))) if False else None\n", "")
ns = dict(vars(m)); exec(src, ns); run_m2 = ns['run_m2']
B = '/workspace/egg-farm-studio/product/economy.pre-p1q.csv'; A = '/workspace/egg-farm-studio/product/economy.csv'
def cfg(k):
  if k == 'before': return m.Eco(dict(m.PROPOSAL)), m.spec_from_csv(B)
  w = m.spec_from_csv(A); w.update(manage_at=w['yawn_at'], manage_all_low_only=True); return m.Eco(dict(m.CURRENT)), w
MOD = {'seller15': ('seller15', {}), 'casual': ('seller15', m.CASUAL), 'cheapest': ('cheapest', {})}
LV = range(5, 21)
def one(a):
  k, mo, s = a; e, w = cfg(k); pol, kw = MOD[mo]; r = run_m2(e, pol, s, T=7200, spec=w, manage='managed', **kw); L = r['LOG']
  o = {}
  for F in LV:
    out = [x[1] for x in L['out'] if x[0] == F]
    o[F] = dict(sz=[z for f, z in L['orders'] if f == F], held=[h for f, h in L['held'] if f == F], out=out,
                dt=(r['reach'][F + 1] - r['reach'][F]) if F in r['reach'] and F + 1 in r['reach'] else None, inc=m.income_at_level(r, F))
  return (k, mo, s), o
md = lambda v: st.median(v) if v else None
if __name__ == '__main__':
  ap = argparse.ArgumentParser(); ap.add_argument('--seeds', type=int, default=30); N = ap.parse_args().seeds
  with Pool(8) as p: D = dict(p.map(one, [(k, mo, s) for k in ('before', 'after') for mo in MOD for s in range(N)]))
  print(f'# F1 stall before/after ({N} seeds/model, 120 min, run_m2 managed, workers on)\n')
  for mo in MOD:
    print(f'\n## {mo}\n| F | order med B/A | held@sale med B/A | filled/partial/lost % B | filled/partial/lost % A | time/level med s B/A (n/r) | x prev B/A | $/s med B/A |\n|---|---|---|---|---|---|---|---|')
    prev = {}
    for F in LV:
      c = []
      for k in ('before', 'after'):
        rs = [D[(k, mo, s)][F] for s in range(N)]
        sz = md([z for r in rs for z in r['sz']]); hd = md([h for r in rs for h in r['held']]); out = [x for r in rs for x in r['out']]
        pc = '/'.join(f"{100*out.count(t)/len(out):.0f}" for t in 'fpl') if out else 'n/r'
        dts = [r['dt'] for r in rs if r['dt'] is not None]; dt = md(dts); nr = N - len(dts)
        rat = f"{dt/prev[k]:.2f}" if dt and prev.get(k) else '—'; prev[k] = dt
        c.append((sz, hd, pc, dt, nr, rat, md([r['inc'] for r in rs if r['inc'] is not None])))
      f = lambda x, d=0: 'n/r' if x is None else f'{x:.{d}f}'
      b, a = c
      print(f"| {F} | {f(b[0])}/{f(a[0])} | {f(b[1])}/{f(a[1])} | {b[2]} | {a[2]} | {f(b[3])}/{f(a[3])} ({b[4]}/{a[4]}) | {b[5]}/{a[5]} | {f(b[6],2)}/{f(a[6],2)} |")
