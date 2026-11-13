"""M4 three-track check (PM Farm Upgrades, 2026-10-16). Reads ../../economy.f1.csv (F1 Farm costs, coop, queue, interval,
demand on the Farm reference curve, Collection cost/tap). Canonical files untouched. No workers.
Track definitions = Economy's (product/sim/m4/m4_active.py): hens_rate H0 1.5, else 0.2(5+5H), milestones H10/20/30 x1.25/1.5/2 on coop size + offline eggs (not lay rate, M1 fix 2026-10-16);
price A = (1+0.05V)(1+0.12V) x grade (V5 1.1, V10 1.25, V20&F15 1.5) x balanced (min(F,H,V) >= 5/10/15/20/25 -> 1.10..1.30).
Tuning: Hens 30x1.30^H, Value 40x1.33^V, both capped at F+3. Collection = eggs per tap only (its +12% moved to Value).
Player: tap 1/s, Sell all every 15 s (casual: 20 s, Poisson, demand x0.75). Buying is checked right after each sell."""
import csv, math, random, statistics as st, os, sys, collections
from multiprocessing import Pool
HERE = os.path.dirname(os.path.abspath(__file__))
CSV = os.environ.get('ECON_CSV') or os.path.join(HERE, '..', '..', 'economy.f1.csv')
R = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(open(CSV))]
TUNE = dict(hb=30, hg=1.30, vb=40, vg=1.33, hcap=3, vcap=3)
def row(L): return R[min(int(L), 30)]
def hens_ms(H, kind='coop'):  # M1 fix (HoP 2026-10-16 14:45): Hens milestones scale coop size + offline eggs, NOT lay rate
  c = R[0]; ks = [k for k in (1, 2, 3) if f'hens_ms{k}_{kind}_mult' in c]
  if not ks: return 2.0 if H >= 30 else 1.5 if H >= 20 else 1.25 if H >= 10 else 1.0
  return max([1.0] + [c[f'hens_ms{k}_{kind}_mult'] for k in ks if H >= c[f'hens_ms{k}_level']])
def hens_rate(H):
  return 1.5 if H == 0 else 0.2 * (5 + 5 * H)
def grade(V, F): return 1.5 if (V >= 20 and F >= 15) else 1.25 if V >= 10 else 1.1 if V >= 5 else 1.0
def bal(F, H, V):
  lo = min(F, H, V); return 1.30 if lo >= 25 else 1.25 if lo >= 20 else 1.20 if lo >= 15 else 1.15 if lo >= 10 else 1.10 if lo >= 5 else 1.0
def price(F, H, V): return round((1 + 0.05 * V) * (1 + 0.12 * V) * grade(V, F) * bal(F, H, V), 2)
def cost(k, L, T=TUNE):
  if L >= 30: return math.inf
  if k == 'f': return row(L)['farm_cost']
  if k == 'c': return row(L)['collection_cost']
  if k == 'h': return math.floor(T['hb'] * T['hg'] ** L)
  return math.floor(T['vb'] * T['vg'] ** L)
def capok(k, s, T=TUNE):
  F, H, V, C = s
  return {'f': F < 30, 'c': C < 30, 'h': H < min(30, F + T['hcap']), 'v': V < min(30, F + T['vcap'])}[k]
def inc(s, dem=1.0, taps=1.0):
  F, H, V, C = s; r = row(F); d = (r['demand_min'] + r['demand_max']) / 2 / r['customer_interval_s'] * dem
  return min(hens_rate(H), d, row(C)['eggs_per_tap'] * taps) * price(F, H, V)
IDX = dict(f=0, h=1, v=2, c=3)
def bump(s, k): s = list(s); s[IDX[k]] += 1; return tuple(s)
def best_roi(s, dem, T=TUNE):
  """Bundle-aware ROI: for each first buy k, consider k alone and k followed by up to 2 more buys (any tracks, caps respected);
  value = income gain / total cost of the bundle. This values Collection (and Hens) correctly when both co-bind supply,
  and values Farm via the caps/market it opens. Returns the first item of the best bundle."""
  base = inc(s, dem); best = None
  def walk(st_, path, c, depth):
    nonlocal best
    if path:
      g = inc(st_, dem) - base
      if g > 0:
        roi = g / c
        if best is None or roi > best[0]: best = (roi, path[0], c)
    if depth == 0: return
    for k in 'fhvc':
      if capok(k, st_, T): walk(bump(st_, k), path + [k], c + cost(k, st_[IDX[k]], T), depth - 1)
  walk(s, [], 0.0, 3)
  return best[1] if best else 'f'
def choose(policy, s, coins, dem, T=TUNE):
  F, H, V, C = s
  af = lambda k: capok(k, s, T) and coins >= cost(k, s[IDX[k]], T)
  supply = hens_rate(H); tap = row(C)['eggs_per_tap']
  if policy == 'greedy':
    k = best_roi(s, dem, T); return k if af(k) else None
  if policy == 'cheapest':
    o = [k for k in 'fhvc' if capok(k, s, T)]; k = min(o, key=lambda k: cost(k, s[IDX[k]], T)); return k if af(k) else None
  # priority bots; Collection bought whenever tap size is the binding supply limit and it is affordable
  if tap < supply and af('c') and cost('c', C, T) <= 0.5 * min(cost(k, s[IDX[k]], T) for k in 'fhv' if capok(k, s, T)): return 'c'
  order = {'hens': 'hfv', 'value': 'vfh', 'balanced': None}[policy]
  if order is None:
    o = [k for k in 'fhv' if capok(k, s, T)]; order = ''.join(sorted(o, key=lambda k: (s[IDX[k]], 'fhv'.index(k))))
  top = next((k for k in order if capok(k, s, T)), None)
  if top is None: return 'c' if af('c') else None
  if af(top): return top
  for k in order[1:]:  # seller15-style: buy a lower priority only if <= 50% of the top's cost
    if capok(k, s, T) and af(k) and cost(k, s[IDX[k]], T) <= 0.5 * cost(top, s[IDX[top]], T): return k
  return None
def run(args):
  policy, seed, model, T_, tune = args; T = dict(TUNE, **(tune or {}))
  rng = random.Random(seed); pois = model == 'casual'; se = 20 if pois else 15; dem = 0.75 if model in ('casual', 'd25') else 1.0
  F = H = V = C = 0; coop = 0.0; basket = 0; coins = 0.0; q = []; nxt = row(0)['first_customer_s']; tap_t = 1.0; sell_t = se
  reach = {0: 0.0}; buys = [(0.0, '-', 0)]; last_buy = 0.0; waiting = True; noaff_max = (0.0, 0, 0.0); dt = 0.1
  for i in range(1, int(T_ / dt) + 1):
    t = round(i * dt, 1); r = row(F)
    coop = min(r['coop_capacity'] * hens_ms(H), coop + hens_rate(H) * dt)
    while t >= nxt:
      if len(q) < r['queue_max']: q.append([max(1, round(rng.randint(int(r['demand_min']), int(r['demand_max'])) * dem)), nxt + r['customer_patience_s']])
      nxt = round(nxt + (rng.expovariate(1 / r['customer_interval_s']) if pois else r['customer_interval_s']), 2)
    q = [c_ for c_ in q if c_[1] > t]
    if t >= tap_t - 1e-9: tap_t += 1 / T.get('tap', 1.0); k = min(math.floor(coop), int(row(C)['eggs_per_tap'])); coop -= k; basket += k
    if t >= sell_t - 1e-9:
      sell_t += se; pr = price(F, H, V)
      for c_ in list(q):
        if basket <= 0: break
        k = min(basket, c_[0]); basket -= k; c_[0] -= k; coins = round(coins + k * pr, 2)
        if c_[0] == 0: q.remove(c_)
      while True:
        s = (F, H, V, C); k = choose(policy, s, coins, dem, T)
        if not k: break
        coins = round(coins - cost(k, s[IDX[k]], T), 2)
        if k == 'f': F += 1; reach[F] = t
        elif k == 'h': H += 1
        elif k == 'v': V += 1
        else: C += 1
        buys.append((t, k, F)); last_buy = t; waiting = True
    # dead-zone metric (role spec): time from a purchase until ANY item (caps respected) is next affordable
    if waiting:
      s = (F, H, V, C); mc = min(cost(k, s[IDX[k]], T) for k in 'fhvc' if capok(k, s, T))
      if coins >= mc:
        if t - last_buy > noaff_max[0]: noaff_max = (t - last_buy, F, t)
        waiting = False
  if waiting and T_ - last_buy > noaff_max[0]: noaff_max = (T_ - last_buy, F, T_)
  gaps = [(b[0] - a[0], a[2], a[0]) for a, b in zip(buys, buys[1:] + [(T_, '-', F)])]
  g = max(gaps)
  seq = [b[1] for b in buys[1:] if 5 <= b[2] <= 20]
  sw = sum(1 for a, b in zip(seq, seq[1:]) if a != b); runs = [len(list(x)) for _, x in __import__('itertools').groupby(seq)]
  return dict(reach=reach, L30=max(L for L, tt in reach.items() if tt <= 1800), H=H, V=V, C=C, F=F, gap=g, noaff=noaff_max,
              sw=sw, nseq=len(seq), maxrun=max(runs) if runs else 0, mix=collections.Counter(b[1] for b in buys[1:] if b[0] <= 1800))
def stats(policy, model, seeds=30, T_=1800, tune=None, pool=None):
  rs = pool.map(run, [(policy, s, model, T_, tune) for s in range(seeds)])
  def tt(L):
    v = sorted(r['reach'].get(L, math.inf) for r in rs); m = v[len(v) // 2]; return '—' if m == math.inf else f'{m/60:.2f}'
  L30 = [r['L30'] for r in rs]; g = max(rs, key=lambda r: r['gap'][0])['gap']; na = max(rs, key=lambda r: r['noaff'][0])['noaff']
  mix = sum((r['mix'] for r in rs), collections.Counter())
  return dict(t5=tt(5), t10=tt(10), t18=tt(18), t20=tt(20), L30med=st.median(L30), L30min=min(L30), L30max=max(L30),
              inband=sum(18 <= x <= 22 for x in L30), gap=g, noaff=na, sw=st.median(r['sw'] for r in rs), nseq=st.median(r['nseq'] for r in rs),
              maxrun=max(r['maxrun'] for r in rs), H=st.median(r['H'] for r in rs), V=st.median(r['V'] for r in rs), C=st.median(r['C'] for r in rs),
              mix={k: round(v / len(rs), 1) for k, v in sorted(mix.items())})
def table(title, rows):
  print(f'\n## {title}')
  print('| strategy / model | F5 | F10 | F18 | F20 | L@30 med (min–max) | in L18–22 | max purchase gap (min, at F, t) | max wait until anything affordable (min, at F) | switches L5–20 (of buys) | longest same-track run | H/V/C @30 | buys/run @30 |')
  print('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  for name, s in rows:
    print(f"| {name} | {s['t5']} | {s['t10']} | {s['t18']} | {s['t20']} | {s['L30med']:g} ({s['L30min']}–{s['L30max']}) | {s['inband']}/30 | {s['gap'][0]/60:.2f} (F{s['gap'][1]}, {s['gap'][2]/60:.1f} min) | {s['noaff'][0]/60:.2f} (F{s['noaff'][1]}) | {s['sw']:g} of {s['nseq']:g} | {s['maxrun']} | {s['H']:g}/{s['V']:g}/{s['C']:g} | {s['mix']} |")
if __name__ == '__main__':
  tune = None
  if len(sys.argv) > 1: tune = eval(sys.argv[1])
  print('# M4 track check, table', os.path.relpath(CSV, HERE), 'tuning', dict(TUNE, **(tune or {})), '| 30 seeds, no workers')
  with Pool(8) as p:
    for model, lab in (('s15', 'seller15 (tap 1/s, Sell all every 15 s)'), ('casual', 'casual worst case (Poisson, 20 s, demand -25%)'), ('d25', 'demand -25% (seller15)')):
      table(lab, [(pol, stats(pol, model, tune=tune, pool=p)) for pol in ('greedy', 'hens', 'value', 'balanced', 'cheapest')])
