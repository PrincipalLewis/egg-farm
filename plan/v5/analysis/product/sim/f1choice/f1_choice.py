"""F1-CHOICE (Economy, 2026-10-16): how often is a non-Farm upgrade the best next buy before L20, on F1 (economy.f1.csv incl. F1-GAP)?
CSV-driven sim (same mechanics as sim/m4/m4_active.prog, which reproduces economy_sim F1 t18 19.75). Bots:
 greedy  = Collection-aware best-ROI with 3-buy look-ahead (PM Farm Upgrades' best_roi, adapted to the rc1 set: Farm, Collection,
           + with workers: W1/W2/W3 hires and Grader tiers; value = d(income estimate incl. wages)/cost)
 seller15 = AC7 rule (Farm if affordable, Collection if <= 50% of next Farm); farm_only = never buys anything else.
Levers are data-only: Collection cost growth g (collection_cost = floor(10 g^C)) and collection_price_bonus per level b (= b*C).
python3 f1_choice.py"""
import csv, math, random, statistics as st, sys, copy
from multiprocessing import Pool
F1 = '/workspace/egg-farm-studio/product/economy.f1.csv'
def load(p=F1): return [{k: float(v) for k, v in r.items()} for r in csv.DictReader(open(p))]
BASE = load()
def variant(cg=None, cb=None, rows=None):
  R = copy.deepcopy(rows or BASE)
  for r in R:
    C = int(r['level'])
    if cg: r['collection_cost'] = math.floor(10 * cg ** C)
    if cb is not None: r['collection_price_bonus'] = round(cb * C, 4)
  return R
W1, W2, W3 = dict(unlock=3, cost=40, wage=0.25), dict(unlock=7, cost=150, wage=0.5), dict(unlock=8, cost=800, dem=1.25)
TIERS = [(18, 1.5), (19, 2.0), (21, 2.5), (22, 3.0), (24, 4.0)]
def sim(R, policy, seed, model='seller15', workers=False, T=1800, stop_L=None, dt=0.1):
  rw = lambda L: R[min(int(L), 30)]
  rng = random.Random(seed); pois = model == 'casual'; se = 20 if pois else 15; dem = 0.75 if pois else 1.0
  F = C = 0; g = 0; hired = set(); coop = 0.0; basket = 0; coins = 0.0; q = []; nxt = 10.0; tap_t = 1.0; sell_t = se; w2t = 0.0
  reach = {0: 0.0}; log = []; buys = [0.0]
  def price(F_, C_, g_): return round((1 + 0.05 * F_) * (1 + rw(C_)['collection_price_bonus']), 2) * (TIERS[g_ - 1][1] if g_ else 1)
  def inc(s):
    F_, C_, g_, h = s; r = rw(F_); d = (r['demand_min'] + r['demand_max']) / 2 / r['customer_interval_s'] * dem * (W3['dem'] if 'w3' in h else 1)
    col = rw(C_)['eggs_per_tap'] * (1 + (0.5 if 'w2' in h else 0))
    wage = (W1['wage'] * F_ / 60 if 'w1' in h else 0) + (W2['wage'] * F_ / 60 if 'w2' in h else 0)
    return min(r['eggs_per_sec'], d, col) * price(F_, C_, g_) - wage
  def opts(s):
    F_, C_, g_, h = s; o = []
    if F_ < 30: o.append(('f', rw(F_)['farm_cost'], (F_ + 1, C_, g_, h)))
    if C_ < 30: o.append(('c', rw(C_)['collection_cost'], (F_, C_ + 1, g_, h)))
    if workers:
      for w, d in (('w1', W1), ('w2', W2), ('w3', W3)):
        if w not in h and F_ >= d['unlock']: o.append((w, d['cost'], (F_, C_, g_, h | {w})))
      if g_ < len(TIERS) and F_ >= TIERS[g_][0]: o.append(('g', math.floor(0.5 * rw(TIERS[g_][0])['farm_cost']), (F_, C_, g_ + 1, h)))
    return o
  def best(s):
    base = inc(s); b = None
    def walk(st_, first, c, d):
      nonlocal b
      if first:
        gn = inc(st_) - base
        if gn > 0 and (b is None or gn / c > b[0]): b = (gn / c, first)
      if d == 0: return
      for k, cost, ns in opts(st_): walk(ns, first or (k, cost), c + cost, d - 1)
    walk(s, None, 0.0, 3)
    return b[1] if b else ('f', rw(s[0])['farm_cost'])
  n = int(round(T / dt))
  for i in range(1, n + 1):
    t = round(i * dt, 1); r = rw(F)
    coop = min(r['coop_capacity'], coop + r['eggs_per_sec'] * dt)
    q = [c_ for c_ in q if c_[1] > t]
    if t >= nxt:
      nxt = t + max(dt, rng.expovariate(1 / r['customer_interval_s']) if pois else r['customer_interval_s'])
      dm = dem * (W3['dem'] if 'w3' in hired else 1)
      if len(q) < r['queue_max']: q.append([max(1, round(rng.randint(int(r['demand_min']), int(r['demand_max'])) * dm)), t + 30])
    if t >= tap_t: tap_t += 1; k = min(math.floor(coop), rw(C)['eggs_per_tap']); coop -= k; basket += k
    if 'w2' in hired and t >= w2t: w2t = t + 2; k = min(math.floor(coop), rw(C)['eggs_per_tap']); coop -= k; basket += k
    for w, d in (('w1', W1), ('w2', W2)):
      if w in hired: coins -= d['wage'] * F * dt / 60
    if t >= sell_t or ('w1' in hired and q and basket):
      if t >= sell_t: sell_t += se
      pr = price(F, C, g)
      for c_ in list(q):
        if basket <= 0: break
        k = min(basket, c_[0]); basket -= k; c_[0] -= k; coins += k * pr
        if c_[0] == 0: q.remove(c_)
      while True:
        s = (F, C, g, frozenset(hired))
        if policy == 'greedy': kind, cost = best(s)
        elif policy == 'farm_only': kind, cost = 'f', rw(F)['farm_cost']
        else:
          fc = rw(F)['farm_cost']; cc = rw(C)['collection_cost']
          if coins >= fc: kind, cost = 'f', fc
          elif coins >= cc and cc <= 0.5 * fc: kind, cost = 'c', cc
          else:
            ow = [(k, c) for k, c, _ in opts(s) if k not in ('f', 'c') and coins >= c] if workers else []
            if not ow: break
            kind, cost = ow[0]
        if coins < cost or F >= 30 and kind == 'f': break
        coins -= cost; buys.append(t); log.append((t, kind, F))
        if kind == 'f': F += 1; reach[F] = t
        elif kind == 'c': C += 1
        elif kind == 'g': g += 1
        else: hired.add(kind)
    if stop_L and F >= stop_L: break
  b30 = [b for b in buys if b <= 1800]
  gaps = [y - x for x, y in zip(b30, b30[1:] + [min(T, 1800)])]
  return dict(log=log, reach=reach, L30=max(L for L, tt in reach.items() if tt <= 1800), gap=max(gaps) if gaps else 0,
              t30=reach.get(30), first=log[0][0] if log else None, steps=[reach[L + 1] - reach[L] for L in range(5, 14) if L + 1 in reach])
def share(log, maxF=20):
  pre = [k for t, k, F in log if F < maxF]; n = len(pre) or 1
  return {k: sum(1 for x in pre if x == k) / n for k in ('f', 'c', 'w1', 'w2', 'w3', 'g')}, len(pre)
def _j(a): R, pol, s, mo, wk, T = a; return sim(R, pol, s, mo, wk, T)
def summary(R, pool, seeds=30, T=1800, pols=('greedy', 'seller15', 'farm_only'), models=('seller15', 'casual'), wks=(False, True)):
  out = {}
  for wk in wks:
    for mo in models:
      for pol in pols:
        rs = pool.map(_j, [(R, pol, s, mo, wk, T) for s in range(seeds)])
        sh = [share(r['log']) for r in rs]
        out[(wk, mo, pol)] = dict(share={k: st.mean(x[0][k] for x in sh) for k in sh[0][0]}, n=st.mean(x[1] for x in sh),
          L30=st.median(r['L30'] for r in rs), gap=max(r['gap'] for r in rs), t30=st.median(r['t30'] for r in rs) / 60 if all(r['t30'] for r in rs) else None,
          first=st.median(r['first'] for r in rs), steps=(min(min(r['steps']) for r in rs if r['steps']), max(max(r['steps']) for r in rs if r['steps'])),
          t10=st.median(r['reach'].get(10, 1e9) for r in rs) / 60, t18=st.median(r['reach'].get(18, 1e9) for r in rs) / 60)
  return out
