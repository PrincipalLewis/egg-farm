"""F1 non-Farm share check (PM Farm Upgrades, 2026-10-16). Farm + Collection only, no workers. Reads ECON_CSV (default
product/economy.f1.csv incl. F1-GAP). Bots: greedy (Collection-aware bundle ROI, waits for best), farmonly, seller15.
Mechanics as farm_stress_sim (tap 1/s, Sell all every 15 s; casual = Poisson, 20 s, x0.75)."""
import csv, math, random, statistics as st, os, sys
from multiprocessing import Pool
HERE = os.path.dirname(os.path.abspath(__file__))
def load(p): return [{k: float(v) for k, v in r.items()} for r in csv.DictReader(open(p))]
def run(args):
  path, policy, seed, model, T = args; R = load(path)
  price = lambda F, C: round(R[F]['egg_price'] * (1 + R[C]['collection_price_bonus']), 2)
  def inc(F, C, dem):
    r = R[F]; d = (r['demand_min'] + r['demand_max']) / 2 / r['customer_interval_s'] * dem
    return min(r['eggs_per_sec'], d, R[C]['eggs_per_tap']) * price(F, C)
  def choose(F, C, coins, dem):
    fc = R[F]['farm_cost'] if F < 30 else math.inf; cc = R[C]['collection_cost'] if C < 30 else math.inf
    if policy == 'farmonly': return 'f' if coins >= fc else None
    if policy == 'seller15':
      if coins >= fc: return 'f'
      return 'c' if coins >= cc and cc <= 0.5 * fc else None
    base = inc(F, C, dem); best = None
    for path_ in ('f', 'c', 'ff', 'fc', 'cf', 'cc', 'fff', 'ffc', 'fcf', 'fcc', 'cff', 'cfc', 'ccf', 'ccc'):
      f, c, cost = F, C, 0.0
      for k in path_:
        if k == 'f':
          if f >= 30: cost = math.inf; break
          cost += R[f]['farm_cost']; f += 1
        else:
          if c >= 30: cost = math.inf; break
          cost += R[c]['collection_cost']; c += 1
      if cost == math.inf: continue
      g = inc(f, c, dem) - base
      if g > 0 and (best is None or g / cost > best[0]): best = (g / cost, path_[0])
    k = best[1] if best else 'f'
    return k if coins >= (fc if k == 'f' else cc) else None
  rng = random.Random(seed); pois = model == 'casual'; se = 20 if pois else 15; dem = 0.75 if model in ('casual', 'd25') else 1.0
  F = C = 0; coop = 0.0; basket = 0; coins = 0.0; q = []; nxt = R[0]['first_customer_s']; tap_t = 1.0; sell_t = se
  reach = {0: 0.0}; buys = [(0.0, '-', 0)]; dt = 0.1
  for i in range(1, int(T / dt) + 1):
    t = round(i * dt, 1); r = R[F]
    coop = min(r['coop_capacity'], coop + r['eggs_per_sec'] * dt)
    while t >= nxt:
      if len(q) < r['queue_max']: q.append([max(1, round(rng.randint(int(r['demand_min']), int(r['demand_max'])) * dem)), nxt + 30])
      nxt = round(nxt + (rng.expovariate(1 / r['customer_interval_s']) if pois else r['customer_interval_s']), 2)
    q = [c_ for c_ in q if c_[1] > t]
    if t >= tap_t - 1e-9: tap_t += 1; k = min(math.floor(coop), int(R[C]['eggs_per_tap'])); coop -= k; basket += k
    if t >= sell_t - 1e-9:
      sell_t += se; pr = price(F, C)
      for c_ in list(q):
        if basket <= 0: break
        k = min(basket, c_[0]); basket -= k; c_[0] -= k; coins = round(coins + k * pr, 2)
        if c_[0] == 0: q.remove(c_)
      while True:
        k = choose(F, C, coins, dem)
        if not k: break
        if k == 'f': coins = round(coins - R[F]['farm_cost'], 2); buys.append((t, 'f', F)); F += 1; reach[F] = t
        else: coins = round(coins - R[C]['collection_cost'], 2); buys.append((t, 'c', F)); C += 1
      if F >= 30: break
  b30 = [b for b in buys[1:] if b[0] <= 1800]; gaps = [(y[0] - x[0], x[2]) for x, y in zip([buys[0]] + b30, b30 + [(1800, '-', 0)])]
  seg = {}
  for lo, hi in ((0, 5), (5, 10), (10, 15), (15, 20), (0, 20)):
    bb = [b for b in buys[1:] if lo <= b[2] < hi]; seg[(lo, hi)] = (sum(b[1] == 'c' for b in bb), len(bb))
  return dict(reach=reach, L30=max(L for L, tt in reach.items() if tt <= 1800), gap=max(gaps), seg=seg)
def summarize(path, policy, model='s15', seeds=30, T=6 * 3600, pool=None):
  rs = pool.map(run, [(path, policy, s, model, T) for s in range(seeds)]); N = len(rs); need = math.ceil(.8 * N)
  med = lambda L: st.median(r['reach'].get(L, math.inf) for r in rs) / 60
  steps = {L: st.median(r['reach'][L + 1] - r['reach'][L] for r in rs if L + 1 in r['reach']) if sum(L + 1 in r['reach'] for r in rs) >= N / 2 else math.inf for L in range(30)}
  t10 = [r['reach'].get(10, math.inf) / 60 for r in rs]; L30 = [r['L30'] for r in rs]; t30 = [r['reach'].get(30, math.inf) / 60 for r in rs]; g = [r['gap'][0] / 60 for r in rs]
  inb = lambda v, lo, hi: (lo <= st.median(v) <= hi) and sum(lo <= x <= hi for x in v) >= need
  share = {k: (sum(r['seg'][k][0] for r in rs), sum(r['seg'][k][1] for r in rs)) for k in rs[0]['seg']}
  rr = [steps[L] / steps[L - 1] for L in (22, 23, 24) if steps[L - 1] not in (0, math.inf) and steps[L] != math.inf]; ratio = max(rr) if rr else math.inf
  return dict(t5=med(5), t10=med(10), t18=med(18), t20=med(20), t30=med(30), L30=st.median(L30), L30n=sum(18 <= x <= 22 for x in L30),
              gapmax=max(g), gapwhere=max(rs, key=lambda r: r['gap'][0])['gap'][1],
              ok10=inb(t10, 8, 12), ok30=inb(L30, 18, 22), okT=inb(t30, 180, 300), okG=inb(g, 0, 3),
              steps514=[round(steps[L]) for L in range(5, 15)], ok514=all(45 <= steps[L] <= 75 for L in range(5, 15)), ratio=ratio, okR=ratio <= 1.54,
              share={f'L{a}-{b}': f"{100*c/max(n,1):.0f}% ({c}/{n})" for (a, b), (c, n) in share.items()}, sh=share[(0, 20)][0] / max(share[(0, 20)][1], 1))
def make(out, cg=None, cb=None, pb=None, tapm=None):
  rows = list(csv.DictReader(open(os.path.join(HERE, '..', 'economy.f1.csv')))); cols = list(rows[0].keys())
  for r in rows:
    L = int(r['level'])
    if cg or cb: r['collection_cost'] = math.floor((cb or 10) * (cg or 1.6) ** L)
    if pb is not None: r['collection_price_bonus'] = round(pb * L, 2)
  w = csv.DictWriter(open(out, 'w', newline=''), fieldnames=cols); w.writeheader(); w.writerows(rows)
