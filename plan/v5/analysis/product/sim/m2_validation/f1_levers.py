"""F1 levers (Economy, 2026-10-16): opt-in variants on CURRENT (P1q+P3) + M2_CURRENT (P4). economy_sim.py untouched.
Usage: python3 f1_levers.py [--seeds 30] [--var name ...]"""
import sys, copy, math, argparse, statistics as st
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim'); import economy_sim as m
from multiprocessing import Pool
class SegEco(m.Eco):
  """Optional per-level overrides: hens_extra {F: +hens}, f_seg (F0,F1,g) farm cost growth g on levels F0..F1 then x f_growth."""
  def hens(s, f): return super().hens(f) + s.p.get('hens_extra', {}).get(f, 0)
  def fcost(s, f):
    sg = s.p.get('f_seg')
    if not sg: return super().fcost(f)
    G = s.p['f_growth']
    segs = sg if isinstance(sg[0], tuple) else [sg]  # pow form (formulas.ts parity): base x prod g_seg^(levels of f in seg) x G^(rest)
    v = s.p['f_base']; n = f
    for a, b, g in segs:
      k = max(0, min(f, b) - a + 1); v *= g ** k; n -= k
    return math.floor(v * G ** n)
VARS = {'current': {}}
def quad(q, a=0, b=99): return {F: math.floor(q * max(0, min(F, b) - a) ** 2) for F in range(31)}
for q in (0.1, 0.15, 0.2, 0.25): VARS[f'A hens+{q}F2'] = dict(hens_extra=quad(q))
for q in (0.3, 0.4, 0.5): VARS[f'A hens+{q}(F-4)2 cap14'] = dict(hens_extra=quad(q, 4, 14))
for g in (1.25, 1.28, 1.30): VARS[f'B seg L6-14 x{g}'] = dict(f_seg=(6, 14, g))
for g in (1.26, 1.27): VARS[f'B seg L6-14 x{g}'] = dict(f_seg=(6, 14, g))
VARS['B seg x1.25 + L15-20 x1.45'] = dict(f_seg=((6, 14, 1.25), (15, 20, 1.45)))
VARS['B seg x1.26 + L15-22 x1.40'] = dict(f_seg=((6, 14, 1.26), (15, 22, 1.40)))
VARS['B base80 grow1.32'] = dict(f_base=80, f_growth=1.32)
for r in (0.22, 0.24, 0.25, 0.26, 0.28, 0.30): VARS[f'A rate{r}'] = dict(egg_rate=r)
for h in (6, 7, 8): VARS[f'A hens_per{h}'] = dict(hens_per=h)
for g in (1.30, 1.28, 1.25): VARS[f'B grow{g}'] = dict(f_growth=g)
for b in (80, 60, 50): VARS[f'B base{b}'] = dict(f_base=b)
MOD = {'seller15': ('seller15', {}), 'casual': ('seller15', m.CASUAL), 'cheapest': ('cheapest', {})}
SPEC = copy.deepcopy(m.M2_CURRENT)
def eco(v): return SegEco(dict(m.CURRENT, **VARS[v]))
def one(a):
  v, mo, s = a; pol, kw = MOD[mo]; r = m.run_m2(eco(v), pol, s, T=7200, spec=SPEC, manage='managed', **kw)
  bt = [b[0] for b in r['buys']]; gaps = [y - x for x, y in zip([0] + bt, bt)]
  steps = [r['reach'][L + 1] - r['reach'][L] if L + 1 in r['reach'] else None for L in range(0, 26)]
  return (v, mo, s), dict(reach=r['reach'], first=bt[0] if bt else None, gap=max(gaps[:]) if gaps else None,
    gap18=max([y - x for x, y in zip([0] + bt, bt) if r['reach'].get(18, 1e9) > y] or [0]), steps=steps, man15=r['manages'] / 8,
    inc={L: m.income_at_level(r, L) for L in range(5, 15)})
md = lambda v: (lambda w: st.median(w) if w else None)([x for x in v if x is not None])
def table(D, VV, N):
  print('| variant | model | first buy s | L10 min | L18 min | s/level L5..L14 | max gap to L18 s | max ×prev after L18 (L19-25) | worst step L18-25 min | Manage/15m |\n|---|---|---|---|---|---|---|---|---|---|')
  for v in VV:
    for mo in MOD:
      rs = [D[(v, mo, s)] for s in range(N)]
      sl = [md([r['steps'][L] for r in rs]) for L in range(5, 15)]
      st_ = [md([r['steps'][L] for r in rs]) for L in range(17, 25)]
      rat = max(st_[i] / st_[i - 1] for i in range(1, len(st_)) if st_[i] and st_[i - 1]) if all(st_) else None
      f = lambda x, d=1: 'n/r' if x is None else f'{x:.{d}f}'
      print(f"| {v} | {mo} | {f(md([r['first'] for r in rs]),0)} | {f(md([r['reach'].get(10) for r in rs])/60)} | {f(md([r['reach'].get(18) for r in rs]) and md([r['reach'].get(18) for r in rs])/60)} | {' '.join(f(x,0) for x in sl)} | {f(md([r['gap18'] for r in rs]),0)} | {f(rat,2)} | {f(max(x for x in st_[1:])/60 if all(st_) else None)} | {md([r['man15'] for r in rs]):.2f} |")
REC = 'B seg x1.25 + L15-20 x1.45'
def levels(N, VV):
  with Pool(8) as p: D = dict(p.map(one, [(v, mo, s) for v in VV for mo in MOD for s in range(N)], chunksize=4))
  print('| F | farm_cost ' + ' | '.join(VV) + ' | ' + ' | '.join(f'{v} {mo}' for v in VV for mo in MOD) + ' |')
  for L in range(1, 26):
    print(f'| {L} | ' + ' | '.join(str(eco(v).fcost(L)) for v in VV) + ' | ' + ' | '.join(str(md([D[(v, mo, s)]['steps'][L - 1] for s in range(N)])) for v in VV for mo in MOD) + ' |')
  for v in VV:
    for mo in MOD: print(v, mo, 'L10 s', md([D[(v, mo, s)]['reach'].get(10) for s in range(N)]), 'first', md([D[(v, mo, s)]['first'] for s in range(N)]), 'inc L5-14', [round(md([D[(v, mo, s)]['inc'][L] for s in range(N)]), 2) for L in range(5, 15)])
if __name__ == '__main__':
  ap = argparse.ArgumentParser(); ap.add_argument('--seeds', type=int, default=30); ap.add_argument('--var', nargs='*'); a = ap.parse_args()
  VV = a.var or list(VARS); N = a.seeds
  with Pool(8) as p: D = dict(p.map(one, [(v, mo, s) for v in VV for mo in MOD for s in range(N)], chunksize=4))
  table(D, VV, N)

# ---- AC checks reusing pt1_resim.m1 / m2 (eco swapped for SegEco variants): python3 -c 'import f1_levers as f; f.ac(30, [...])'
def ac(N, VV):
  import pt1_resim as P
  P.eco = eco; P.VAR.clear()
  for v in VV: P.VAR[v] = ({}, SPEC)
  S = range(N)
  with Pool(8) as p:
    A = {r['k']: r for r in p.map(P.m1, [(v, pol, s, False) for v in VV for pol in ('seller15', 'cheapest') for s in S] + [(v, 'seller15', s, True) for v in VV for s in S])}
    B = {r['k']: r for r in p.map(P.m2, [(v, 'managed', mo, s) for v in VV for mo in ('seller15', 'cheapest', 'casual') for s in S])}
  print(f'| variant | AC7 seller15 L@10m/L@30m | cheapest L@10m/L@30m | AC7-soft casual F10<=15m / F18<=45m | AC-W1 F10<=15m s/c/casual | F18 med min s/c/casual | W4 seller15 worst step L18-25 | W4b cheapest | W5 Manage/15m | $/s first 2 min |\n|---|---|---|---|---|---|---|---|---|---|')
  for v in VV:
    s = [A[(v, 'seller15', i, False)] for i in S]; c = [A[(v, 'cheapest', i, False)] for i in S]; cs = [A[(v, 'seller15', i, True)] for i in S]
    b = {mo: [B[(v, 'managed', mo, i)] for i in S] for mo in ('seller15', 'cheapest', 'casual')}
    w1 = '/'.join(str(sum(1 for r in b[mo] if r['t'][10] and r['t'][10] <= 900)) for mo in b); f18 = '/'.join(P.fm(P.md([r['t'][18] for r in b[mo]])) for mo in b)
    print(f"| {v} | {P.md([x['l10'] for x in s])}/{P.md([x['l30'] for x in s])} | {P.md([x['l10'] for x in c])}/{P.md([x['l30'] for x in c])} | {sum(1 for x in cs if x['t10'] and x['t10']<=900)}/{N} / {sum(1 for x in cs if x['t18'] and x['t18']<=2700)}/{N} | {w1} (of {N}) | {f18} | {P.fm(P.md([r['maxstep'] for r in b['seller15']]))} | {P.fm(P.md([r['maxstep'] for r in b['cheapest']]))} | {P.md([r['man15'] for r in b['seller15']]):.2f} | {P.md([r['inc2'] for r in b['seller15']]):.2f} |")

# ---- PM Workers F21 check: managed/unmanaged income at F21 (pt1_resim.m2 'inc21' = income_at_level(r, 21); per-seed ratio, median) ----
def f21(N, VV, specs=None):
  import pt1_resim as P
  P.eco = eco; P.VAR.clear()
  for v in VV: P.VAR[v] = ({}, (specs or {}).get(v, SPEC))
  with Pool(8) as p: B = {r['k']: r for r in p.map(P.m2, [(v, sc, mo, s) for v in VV for sc in ('managed', 'unmanaged') for mo in ('seller15', 'cheapest', 'casual') for s in range(N)])}
  print('| variant | model | managed/unmanaged inc@F21 (median of per-seed ratios) | seeds with both F21 values | managed $/s @F21 | unmanaged $/s @F21 |\n|---|---|---|---|---|---|')
  for v in VV:
    for mo in ('seller15', 'cheapest', 'casual'):
      pr = [(B[(v, 'managed', mo, s)]['inc21'], B[(v, 'unmanaged', mo, s)]['inc21']) for s in range(N)]
      r = [a / b for a, b in pr if a and b]
      print(f"| {v} | {mo} | {P.md(r):.2f} | {len(r)}/{N} | {P.md([a for a, b in pr]):.2f} | {P.md([b for a, b in pr]):.2f} |")

# ---- HoP acceptance bands (2026-10-16), extra output; old outputs unchanged. python3 -c 'import f1_levers as f; D=f.bands(30, ["current", f.REC]); f.afford(30, ["current", f.REC], D)'
# AC7 = Farm level at 30:00 in L18-L22 (target L20); L30 reached in 180-300 min (seller15). Both run_m2, managed, workers on, T=6 h.
BAND_T = 21600
def _band(a):
  v, mo, s, wk = (a + (True,))[:4]; pol, kw = MOD[mo]
  r = m.run_m2(eco(v), pol, s, T=BAND_T, spec=SPEC, manage='managed', **kw) if wk else m.run(eco(v), pol, s, T=BAND_T, **kw)
  return (v, mo, s, wk), dict(l30m=m.lvl_at(r, 1800), t30=r['reach'].get(30), lv=r['reach'],
    inc={L: m.income_at_level(r, L) for L in range(1, 30)} if 'income' in r else {})
def bands(N, VV, D=None, workers=True):  # workers=False: M1 run() (no workers), the basis of PM Farm Upgrades' L30 196.5 min
  if D is None:
    with Pool(8) as p: D = {k[:3]: x for k, x in p.map(_band, [(v, mo, s, workers) for v in VV for mo in MOD for s in range(N)], chunksize=2)}
  print(f'| variant | model | AC7 L@30:00 med (min-max) | AC7 pass L18-22 seeds | L30 min med (n/r) | L30 180-300 pass seeds | verdict |\n|---|---|---|---|---|---|---|')
  for v in VV:
    for mo in MOD:
      rs = [D[(v, mo, s)] for s in range(N)]; l = [r['l30m'] for r in rs]; t = [r['t30'] for r in rs]
      okA = sum(1 for x in l if 18 <= x <= 22); okL = sum(1 for x in t if x and 10800 <= x <= 18000); mt = md(t)
      vd = ('PASS' if 18 <= md(l) <= 22 else 'FAIL') + (' / ' + ('PASS' if mt and 10800 <= mt <= 18000 else 'FAIL') if mo == 'seller15' else '')
      print(f"| {v} | {mo} | {md(l)} ({min(l)}-{max(l)}) | {okA}/{N} | {'n/r' if mt is None else f'{mt/60:.1f}'} ({sum(1 for x in t if not x)}) | {okL}/{N} | {vd} |")
  return D
def afford(N, VV, D):
  # income/s at level L divided by next Farm cost (fcost(L+1)): fraction of the next level earned per second; 1/x = s to afford
  print('| L | ' + ' | '.join(f'{v} {mo} inc/s / next cost (‰) [s]' for v in VV for mo in MOD) + ' |\n|' + '---|' * (1 + len(VV) * len(MOD)))
  for L in range(1, 30):
    c = []
    for v in VV:
      for mo in MOD:
        x = md([D[(v, mo, s)]['inc'][L] for s in range(N)]); fc = eco(v).fcost(L + 1)
        c.append('n/r' if not x else f'{1000*x/fc:.2f} [{fc/x:.0f}]')
    print(f'| {L} | ' + ' | '.join(c) + ' |')

# ---- PM Workers metric v2 (2026-10-16): managed/unmanaged income averaged over F22-24, every model, w4 share 0.5.
# Per seed: mean over L=22,23,24 of income_at_level(managed)/income_at_level(unmanaged); median over seeds. T=4 h so slow reaches F24.
MOD4 = dict(MOD, slow=('seller15', m.SLOW))
def _f2224(a):
  v, mo, s = a; pol, kw = MOD4[mo]; o = {}
  for sc in ('managed', 'unmanaged'):
    r = m.run_m2(eco(v), pol, s, T=14400, spec=SPEC, manage=sc, **kw); o[sc] = [m.income_at_level(r, L) for L in (22, 23, 24)]
  rs = [a_ / b_ for a_, b_ in zip(o['managed'], o['unmanaged']) if a_ and b_]
  return a, (sum(rs) / 3 if len(rs) == 3 else None, rs)
def f2224(N, VV):
  with Pool(8) as p: D = dict(p.map(_f2224, [(v, mo, s) for v in VV for mo in MOD4 for s in range(N)], chunksize=2))
  print('| variant | model | ratio F22-24 mean (median of seeds) | F22 / F23 / F24 | seeds | pass >=1.5 |\n|---|---|---|---|---|---|')
  for v in VV:
    for mo in MOD4:
      x = [D[(v, mo, s)][0] for s in range(N)]; ok = [y for y in x if y is not None]
      per = [md([D[(v, mo, s)][1][i] for s in range(N) if len(D[(v, mo, s)][1]) == 3]) for i in range(3)]
      r = md(ok); print(f"| {v} | {mo} | {r:.2f} | {' / '.join(f'{y:.2f}' for y in per)} | {len(ok)}/{N} | {'PASS' if r >= 1.5 else 'FAIL'} |")
