"""M4-A save migration v6 -> v7: first 10 min after migration vs the same save staying on v6 (F1).
Imports m4_active (read-only): row/price/hens_rate/grade/SP. v7 costs from economy.m4-candidate.csv (36/48, caps F+3).
Typical save: C = F-3, all workers unlocked at F hired, Grader at highest tier unlocked at F, energy 100, coins 0, coop half.
Golden egg, streak, abilities off in both arms (isolates the migration jump). python3 migration_v7.py > migration_v7_out.md"""
import math, random, statistics as st, csv
from multiprocessing import Pool
import m4_active as a
CAND = list(csv.DictReader(open('/workspace/egg-farm-studio/product/economy.m4-candidate.csv')))
TR = dict(a.TR, h_base=36, v_base=48, v_cap=3)
HC = lambda H: int(CAND[min(H, 30)]['hens_cost']); VC = lambda V: int(CAND[min(V, 30)]['egg_value_cost'])
SP = a.SP; row = a.row
MODELS = dict(seller15=dict(tap=1.0, sell=15, poisson=False, dem=1.0), casual=dict(tap=0.5, sell=20, poisson=True, dem=0.75))
def start_state(F, var):
  C = F - 3
  if var == 'v6': return F, 0, 0, C
  if var == 'v7': return F, F, F, C
  if var.startswith('HV-'): k = int(var[3:]); return F, F - k, F - k, C
  if var.startswith('V-'): k = int(var[2:]); return F, F, F - k, C
  if var == 'Vmatch':  # cap starting Egg value: smallest V whose v7 price >= v6 price (TR-4 floor)
    p6 = a.price(F, 0, 0, C, None); V = next(v for v in range(0, F + 1) if a.price(F, F, v, C, TR) >= p6); return F, F, V, C
  if var.startswith('Vm+'):
    k = int(var[3:]); F_, H_, V_, C_ = start_state(F, 'Vmatch'); return F, F, min(F, V_ + k), C
def run(F0, var, model, seed, T=600, dt=0.1):
  P = MODELS[model]; rng = random.Random(seed); v6 = var == 'v6'; v6buy = var.endswith(':v6buy')  # diagnostic: v7 state, Farm/Collection only by v6 rule
  F, H, V, C = start_state(F0, var.split(':')[0])
  tiers = [g for f_, g in SP['w4'] if F0 >= f_]; gm = tiers[-1] if tiers else 1.0
  W = [w for w in ('w1', 'w2', 'w3') if F0 >= SP[w]['unlock']] + (['w4'] if tiers else [])
  en = {w: 100.0 for w in W}; last_m = -1e9
  def rate_(): return row(F)['eggs_per_sec'] if v6 else a.hens_rate(H, TR)
  def price_(): return a.price(F, 0, 0, C, None) if v6 else a.price(F, H, V, C, TR)
  r0, p0 = rate_(), price_()
  coop = row(F)['coop_capacity'] * 0.5; basket = 0; coins = 0.0; earned = []; q = []; nxt = 1.0; tap_t = 0.0; sell_t = P['sell']; wt = {'w1': 0.0, 'w2': 0.0}
  buys = []
  def stt(w): return 'work' if en[w] >= SP['tired_below'] else ('tired' if en[w] > 0 else 'asleep')
  def sell(c_):
    nonlocal basket, coins
    g = 1.0
    if 'w4' in en: s = stt('w4'); g = 1 + (gm - 1) * (1.0 if s == 'work' else 0.5 if s == 'tired' else 0.15)
    k = min(basket, c_[0]); basket -= k; c_[0] -= k; up = price_() * g; v = k * up
    if c_[0] == 0: v += 0.05 * c_[2] * up; q.remove(c_)
    coins += v; earned.append((t, v))
  def buy():
    nonlocal coins, F, H, V, C
    while True:
      fc = row(F)['farm_cost'] if F < 30 else 1e18; cc = row(C)['collection_cost'] if C < 30 else 1e18
      if v6 or v6buy:
        if coins >= fc: kind, cost = 'f', fc
        elif coins >= cc and cc <= 0.5 * fc: kind, cost = 'c', cc
        else: return
      else:
        hc = HC(H) if H < min(30, F + 3) else 1e18; vc = VC(V) if V < min(30, F + 3) else 1e18
        dem = P['dem'] * (SP['w3']['demand'] if 'w3' in en else 1)
        def inc(F_, H_, V_, C_):
          r_ = row(F_); d_ = (r_['demand_min'] + r_['demand_max']) / 2 / r_['customer_interval_s'] * dem
          return min(a.hens_rate(H_, TR), d_, row(C_)['eggs_per_tap'] * (1 + ('w2' in en) / 2)) * a.price(F_, H_, V_, C_, TR)
        b = inc(F, H, V, C); hc1 = HC(H) if H < 30 else 1e18
        fg = inc(F + 1, H, V, C) - b; fb = (inc(F + 1, H + 1, V, C) - b) * fc / (fc + hc1) if hc >= 1e17 else 0
        opts = [o for o in [('f', fc, max(fg, fb) + 1e-3 * b), ('h', hc, inc(F, H + 1, V, C) - b), ('v', vc, inc(F, H, V + 1, C) - b), ('c', cc, inc(F, H, V, C + 1) - b)] if o[1] < 1e17 and o[2] > 0]
        if not opts: return
        kind, cost, _ = max(opts, key=lambda o: o[2] / o[1])
        if coins < cost: return
      coins -= cost; buys.append((t, kind))
      if kind == 'f': F += 1
      elif kind == 'c': C += 1
      elif kind == 'h': H += 1
      else: V += 1
  n = int(round(T / dt)); t = 0.0
  for i in range(1, n + 1):
    t = i * dt; rw = row(F)
    coop = min(rw['coop_capacity'], coop + rate_() * dt)
    q = [c_ for c_ in q if c_[1] > t]
    if t >= nxt:
      nxt = t + max(dt, rng.expovariate(1 / rw['customer_interval_s']) if P['poisson'] else rw['customer_interval_s'])
      dm = P['dem']
      if 'w3' in en: s = stt('w3'); dm *= SP['w3']['demand'] if s == 'work' else SP['w3']['tired_demand'] if s == 'tired' else 1
      if len(q) < rw['queue_max']: d = max(1, round(rng.randint(int(rw['demand_min']), int(rw['demand_max'])) * dm)); q.append([d, t + 30, d, t])
    for w in en:
      if stt(w) != 'asleep': en[w] = max(0.0, en[w] - dt / SP['drain_s_per_pct'])
    if en and t - last_m >= SP['manage_cd'] and t >= sell_t - dt:  # refill at visits
      low = [w for w in en if en[w] <= SP['yawn_at']]
      if low:
        for w in (low if len(low) >= 3 else [min(low, key=lambda w: en[w])]): en[w] = 100.0
        last_m = t
    for w in ('w1', 'w2'):
      if w in en: wg = SP[w]['wage_per_f_min'] * F * dt / 60; coins -= wg; earned.append((t, -wg))
    if t >= tap_t: tap_t = t + 1 / P['tap']; k = min(math.floor(coop), row(C)['eggs_per_tap']); coop -= k; basket += k
    if 'w2' in en:
      s = stt('w2'); ev = SP['w2']['every'] if s == 'work' else SP['w2']['tired_every'] if s == 'tired' else None
      if ev and t >= wt['w2']: wt['w2'] = t + ev; k = min(math.floor(coop), row(C)['eggs_per_tap']); coop -= k; basket += k
    if 'w1' in en:
      s = stt('w1'); ev = SP['w1']['every'] if s == 'work' else SP['w1']['tired_every'] if s == 'tired' else None
      if ev and t >= wt['w1'] and basket > 0 and any(t - c_[3] >= SP['w1']['defer'] for c_ in q):
        wt['w1'] = t + ev
        for c_ in list(q):
          if basket <= 0: break
          if t - c_[3] >= SP['w1']['defer']: sell(c_)
    if t >= sell_t:
      sell_t = t + P['sell']
      for c_ in list(q):
        if basket <= 0: break
        sell(c_)
      buy()
  inc = lambda a_, b_: sum(v for tt, v in earned if a_ <= tt < b_) / (b_ - a_)
  return dict(i1=inc(0, 60), i10=inc(0, 600), nb=len(buys), nb60=sum(1 for tt, _ in buys if tt < 60), dF=F - F0, lv=len([b for b in buys if b[1] in 'fhv']),
              r0=r0, p0=p0, F=F, H=H, V=V, C=C, first=buys[0][0] if buys else None)
def job(a_): return a_, run(*a_)
VARS = ['v6', 'v7', 'V-1', 'V-2', 'V-3', 'V-4', 'HV-1', 'HV-2', 'HV-3', 'Vmatch', 'Vm+1', 'v7:v6buy', 'Vmatch:v6buy']
if __name__ == '__main__':
  S = range(30); jobs = [(F, v, mo, s) for F in (10, 15, 20) for v in VARS for mo in MODELS for s in S]
  with Pool(8) as p: R = dict(p.map(job, jobs, chunksize=8))
  md = st.median
  print('| save | model | variant | start H/V | eggs/s 0 (v6) | price 0 (v6) | TR-4 | inc 0-1 (x v6) | inc 0-10 (x v6) | buys 10 min (v6) | buys <60 s (v6) | dFarm 10 min (v6) | skipped | verdict |\n|' + '---|' * 14)
  for F in (10, 15, 20):
    for mo in MODELS:
      b = [R[(F, 'v6', mo, s)] for s in S]
      for v in VARS:
        r = [R[(F, v, mo, s)] for s in S]; _, H, V, _ = start_state(F, v.split(':')[0])
        x1 = md([x['i1'] for x in r]) / md([x['i1'] for x in b]); x10 = md([x['i10'] for x in r]) / md([x['i10'] for x in b])
        tr4 = r[0]['r0'] >= b[0]['r0'] and r[0]['p0'] >= b[0]['p0']
        sk = max(md([x['nb60'] for x in r]) - md([x['nb60'] for x in b]), md([x['dF'] for x in r]) - md([x['dF'] for x in b]))
        ok = tr4 and x1 <= 1.5 and x10 <= 1.5 and sk <= 1
        print(f"| F{F} | {mo} | {v} | {H}/{V} | {r[0]['r0']:.2f} ({b[0]['r0']:.2f}) | {r[0]['p0']:.2f} ({b[0]['p0']:.2f}) | {'PASS' if tr4 else 'FAIL'} | {md([x['i1'] for x in r]):.1f} (x{x1:.2f}) | {md([x['i10'] for x in r]):.1f} (x{x10:.2f}) | {md([x['nb'] for x in r]):.0f} ({md([x['nb'] for x in b]):.0f}) | {md([x['nb60'] for x in r]):.0f} ({md([x['nb60'] for x in b]):.0f}) | {md([x['dF'] for x in r]):.0f} ({md([x['dF'] for x in b]):.0f}) | {sk:.0f} | {'PASS' if ok else 'FAIL'} |")
