"""M4 active-vs-idle checks (Economy/Balance Designer, 2026-10-16). New module; economy_sim.py is NOT edited.
CEO target (via HoP): optimal sustained active play earns <= 2.0x idle income, target band 1.5-2.0x, 10-min window.
Economy source: product/economy.f1.csv (Farm cost, interval, demand, queue, coop, Collection, worker columns).
Three tracks per research/slices/upgrades.md 5a/7/9a: Farm drives market (demand from the Farm reference curve =
CSV demand at F), coop, queue, unlocks, Grader gates and wages; Hens drives eggs/s (cap F+3); Egg value drives price.
  price A (default): (1+0.05V)(1+0.12V) x grade ; price B: (1+0.05V)(1+0.12C) x grade ; grades V5 x1.1, V10 x1.25, V20(F>=15) x1.5
  x Grader tier (w4, awake; tired 0.5 share, asleep 0.15 share). Top end Jumbo x1.5 * Balanced5 x1.3 * Grader T5 x4.0 = x7.8.
Usage: python3 m4_active.py [--seeds 20] > ../../m4-active-raw.md
"""
import csv, math, random, argparse, statistics as st, sys
from multiprocessing import Pool
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim'); import economy_sim as m  # read-only use
CSV = '/workspace/egg-farm-studio/product/economy.f1.csv'
R = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(open(CSV))]
SP = m.spec_from_csv(CSV)
def row(F): return R[min(int(F), len(R) - 1)]
def cents(x): return round(x + 1e-9, 2)
# ---- tracks ----
TR = dict(h_base=60, h_g=1.30, v_base=80, v_g=1.33, price='A', balanced=True, hens_ms=True)
def hens_ms(H): return 2.0 if H >= 30 else 1.5 if H >= 20 else 1.25 if H >= 10 else 1.0  # M1 fix: coop size + offline eggs
def coop_mult(H, tr): return hens_ms(H) if tr and tr.get('hens_ms') else 1.0
def hens_rate(H, tr):
  r = 1.5 if H == 0 else 0.2 * (5 + 5 * H)
  if tr.get('hens_ms_lay'): r *= hens_ms(H)  # legacy pre-M1-fix meaning only; default off
  return r
def grade(V, F): return 1.5 if (V >= 20 and F >= 15) else 1.25 if V >= 10 else 1.1 if V >= 5 else 1.0
def price(F, H, V, C, tr):
  if tr is None: return round((1 + 0.05 * F) * (1 + 0.12 * C), 2)  # F1 single track
  b = (1 + 0.05 * V) * (1 + 0.12 * (V if tr['price'] == 'A' else C)) * grade(V, F)
  if tr.get('balanced'):
    lo = min(F, H, V); b *= 1.30 if lo >= 25 else 1.25 if lo >= 20 else 1.20 if lo >= 15 else 1.15 if lo >= 10 else 1.10 if lo >= 5 else 1.0
  return round(b, 2)
def hcost(H, tr): return math.floor(tr['h_base'] * tr['h_g'] ** H)
def vcost(V, tr): return math.floor(tr['v_base'] * tr['v_g'] ** V)

# ---- 10-minute window: active vs idle at a fixed state ----
ACT = dict(  # mechanic switches/parameters (defaults = shipped-candidate values)
  cb=0.05,                          # completion bonus share of order value on the completing sale (all sellers)
  focus=0.0, focus_cards=1,         # manual focus premium on manual sells, cards served per manual visit
  egg=False, egg_gap=(120, 300), egg_life=30, egg_p_frenzy=0.45, fr_mult=7.0, fr_s=60, lucky_s=60, lucky_cap=None,
  abil=False, ab_dur=30, ab_cd=300, ab_w2=2.0, ab_w3=2.0, ab_w4=0.5,   # Activate-all: W2 speed x, W3 demand x, Grader +bonus share
  streak=False, st_cap=0.25, st_step=0.01, st_decay=0.05, st_target='price',
  pause=None,
  egg_v=0, w_cash=0.45, w_fr=0.35, w_eggs=0.20, cash_s=45, eggs_s=60, fr_price=2.0, fr_s3=30, fr_scope='all', leave_pen=0.0, ab2=False, a1=1.15, a2=1.15, a3=1.15, a4=0.5, eggs_cash_from=99)  # PM Collection v0.3                       # None | 'yawn' (pause W1/W2 at <=40%, resume 100) | 'never'
PLAYERS = dict(  # active player models inside the window
  optimal=dict(tap=1.0, sell=3, refill=True, catch=1.0, ab_use=1.0, poisson=False, dem=1.0),
  seller15=dict(tap=1.0, sell=15, refill=True, catch=1.0, ab_use=1.0, poisson=False, dem=1.0),
  casual=dict(tap=0.5, sell=20, refill=True, catch=0.6, ab_use=0.5, poisson=True, dem=0.75),
  seller15_unm=dict(tap=1.0, sell=15, refill=False, catch=1.0, ab_use=1.0, poisson=False, dem=1.0),
  seller15_c60=dict(tap=1.0, sell=15, refill=True, catch=0.6, ab_use=1.0, poisson=False, dem=1.0),
  seller15_unm_c60=dict(tap=1.0, sell=15, refill=False, catch=0.6, ab_use=1.0, poisson=False, dem=1.0),
  idle=dict(tap=0, sell=None, refill=False, catch=0, ab_use=0, poisson=False, dem=1.0),
  idle_casual=dict(tap=0, sell=None, refill=False, catch=0, ab_use=0, poisson=True, dem=0.75))
def window(F, H, V, C, pl, x, seed, tr=TR, T=600, dt=0.1, workers=True, e0=100.0):
  P = PLAYERS[pl]; X = dict(ACT, **x); rng = random.Random(seed); erng = random.Random(seed * 31 + 7)
  rw = row(F); cap = rw['coop_capacity'] * coop_mult(H, tr); iv = rw['customer_interval_s']; qm = int(rw['queue_max'])
  dlo, dhi = int(rw['demand_min']), int(rw['demand_max']); tapn = row(C)['eggs_per_tap']
  rate = hens_rate(H, tr) if tr else rw['eggs_per_sec']; pr = price(F, H, V, C, tr)
  gmult = 1.0; tiers = [g for f_, g in SP['w4'] if F >= f_]
  W = [w for w in ('w1', 'w2', 'w3') if workers and F >= SP[w]['unlock']] + (['w4'] if workers and tiers else [])
  if tiers: gmult = tiers[-1]
  en = {w: e0 for w in W}; paused = set(); last_manage = -1e9
  coop = cap * 0.5; basket = 0; coins = 0.0; q = []; nxt = 1.0; tap_t = 0.0; sell_t = P['sell'] or 1e18
  wt = {'w1': 0.0, 'w2': 0.0}; wages = 0.0; streak = 0.0; last_tap = -1e9; last_etap = -1e9
  egg_next = erng.uniform(*X['egg_gap']) if (X['egg'] and F >= 8) else 1e18; egg_until = -1; fr_until = -1; frnew = 0; fr_stats = dict(n=0, extra=0.0)
  ab_next = 0.0 if (X['abil'] and P['ab_use'] > 0) else 1e18; ab_until = -1; inc_est = rate * pr
  def st_(w):
    if w in paused: return 'paused'
    return 'work' if en[w] >= SP['tired_below'] else ('tired' if en[w] > 0 else 'asleep')
  def unit_price(manual):
    g = 1.0
    if 'w4' in en:
      s = st_('w4'); share = 1.0 if s == 'work' else 0.5 if s == 'tired' else 0.15
      if t < ab_until and not X['ab2']: share = min(1.0 + X['ab_w4'], share + X['ab_w4'])
      g = 1 + (gmult - 1) * share
      if X['ab2'] and t < ab_until and s != 'asleep': g += X['a4']  # v0.2 Inspect +0.5 tier
    p = pr * g
    if X['streak'] and X['st_target'] == 'price': p *= 1 + streak
    if manual and X['focus']: p *= 1 + X['focus']
    if X['ab2'] and t < ab_until:  # v0.2 Shout (all sales), Rush (W1 sales)
      if 'w3' in en and st_('w3') != 'asleep': p *= X['a3']
      if not manual and 'w1' in en and st_('w1') != 'asleep': p *= X['a1']
    return p
  def sell(cust, manual):
    nonlocal basket, coins
    nonlocal frnew
    k = min(basket, cust[0]); basket -= k; cust[0] -= k; up = unit_price(manual); coins += k * up
    if X['egg_v'] == 3 and t < fr_until:
      kb = k if X['fr_scope'] == 'all' else (min(k, frnew) if manual else 0)
      if X['fr_scope'] != 'all' and manual: frnew -= kb
      coins += kb * up * (X['fr_price'] - 1); fr_stats['extra'] += kb * up * (X['fr_price'] - 1)
    if cust[0] == 0:
      coins += X['cb'] * cust[2] * up; q.remove(cust)
  n = int(round(T / dt)); t = 0.0
  for i in range(1, n + 1):
    t = i * dt
    r = rate * (X['fr_mult'] if (t < fr_until and X['egg_v'] != 3) else 1.0)
    if X['streak'] and X['st_target'] == 'lay': r *= 1 + streak
    if X['ab2'] and t < ab_until and 'w2' in en and st_('w2') != 'asleep': r *= X['a2']  # v0.2 Sweep
    coop = min(cap, coop + r * dt)
    if X['leave_pen']:  # fixed hook (leave_pen.py): no penalty if basket < 1 at timeout; price incl. Grader; floor $0
      for c_ in q:
        if c_[1] <= t and c_[0] > 0 and basket >= 1:
          fee = min(max(coins, 0.0), X['leave_pen'] * c_[0] * unit_price(False)); coins -= fee
    q = [c_ for c_ in q if c_[1] > t]
    if t >= nxt:
      gap = rng.expovariate(1 / iv) if P['poisson'] else iv; nxt = t + max(dt, gap)
      dm = P['dem']
      if 'w3' in en:
        s = st_('w3'); dm *= (SP['w3']['demand'] if s == 'work' else SP['w3']['tired_demand'] if s == 'tired' else 1.0)
        if t < ab_until and not X['ab2']: dm *= X['ab_w3']
      if len(q) < qm: d = max(1, round(rng.randint(dlo, dhi) * dm)); q.append([d, t + 30, d, t])
    # energy, pause
    for w in en:
      s = st_(w)
      if s == 'paused': en[w] = min(100.0, en[w] + 0.5 * dt / SP['drain_s_per_pct'])
      elif s != 'asleep': en[w] = max(0.0, en[w] - dt / SP['drain_s_per_pct'])
    if X['pause'] == 'yawn':
      for w in ('w1', 'w2'):
        if w in en and w not in paused and en[w] <= SP['yawn_at']: paused.add(w)
        if w in paused and en[w] >= 100: paused.discard(w)
    if P['refill'] and en and t - last_manage >= SP['manage_cd']:
      low = [w for w in en if en[w] <= SP['yawn_at'] and w not in paused]
      if low:
        for w in (low if len(low) >= 3 else [min(low, key=lambda w: en[w])]): en[w] = 100.0
        last_manage = t
    # wages (per second, carried) for unpaused hired W1/W2
    for w in ('w1', 'w2'):
      if w in en and w not in paused: wg = SP[w]['wage_per_f_min'] * F * dt / 60; wages += wg; coins -= wg
    # golden egg
    if t >= egg_next:
      egg_next = t + erng.uniform(*X['egg_gap'])
      if erng.random() < P['catch']:
        if X['egg_v'] == 3:
          u = erng.random(); g_ = 1.0
          if 'w4' in en:
            s4 = st_('w4'); g_ = 1 + (gmult - 1) * (1.0 if s4 == 'work' else 0.5 if s4 == 'tired' else 0.15)
          if u < X['w_cash']: coins += X['cash_s'] * rate * pr * g_
          elif u < X['w_cash'] + X['w_fr']: fr_until = t + X['fr_s3']; frnew = 0; fr_stats['n'] += 1
          elif F >= X['eggs_cash_from']: coins += X['eggs_s'] * rate * pr * g_
          else: basket += math.floor(X['eggs_s'] * rate)
        elif erng.random() < X['egg_p_frenzy']: fr_until = t + X['fr_s']
        else:
          cash = X['lucky_s'] * inc_est
          if X['lucky_cap'] is not None: cash = min(cash, X['lucky_cap'] * max(coins, 0))
          coins += cash
    # ability
    if t >= ab_next:
      ab_next = t + X['ab_cd'] / max(P['ab_use'], 1e-9); ab_until = t + X['ab_dur']
    # player taps
    if P['tap'] and t >= tap_t:
      tap_t = t + 1 / P['tap']; k = min(math.floor(coop), tapn); coop -= k; basket += k; last_tap = t
      if X['streak'] and X.get('st_spec') and k > 0: streak = min(X['st_cap'], streak + 0.01); last_etap = t
      if t < fr_until: frnew += k
    if X['streak'] and X.get('st_spec'):  # m4-collect-streak-spec: hold 3 s after last egg-moving tap, then -0.03/s
      if t - last_etap > 3: streak = max(0.0, streak - 0.03 * dt)
    elif X['streak']:
      streak = min(X['st_cap'], streak + X['st_step'] * dt) if t - last_tap <= 2 else max(0.0, streak - X['st_decay'] * dt)
    # Coop Hand
    if 'w2' in en:
      s = st_('w2'); ev = SP['w2']['every'] if s == 'work' else SP['w2']['tired_every'] if s == 'tired' else None
      if ev and t < ab_until and not X['ab2']: ev /= X['ab_w2']
      if ev and t >= wt['w2']: wt['w2'] = t + ev; k = min(math.floor(coop), tapn); coop -= k; basket += k
    # Market Hand: holds turn until a customer waited >= 2 s (F1 b)
    if 'w1' in en:
      s = st_('w1'); ev = SP['w1']['every'] if s == 'work' else SP['w1']['tired_every'] if s == 'tired' else None
      if ev and t >= wt['w1'] and basket > 0 and any(t - c_[3] >= SP['w1']['defer'] for c_ in q):
        wt['w1'] = t + ev
        for c_ in list(q):
          if basket <= 0: break
          if t - c_[3] >= SP['w1']['defer']: sell(c_, False)
    # player sells
    if t >= sell_t:
      sell_t = t + P['sell']
      tgt = list(q[:X['focus_cards']]) if X['focus'] else list(q)
      for c_ in tgt:
        if basket <= 0: break
        sell(c_, True)
  return coins / T
def ratio(F, H, V, C, x, seeds, act='optimal', idle='idle', tr=TR, workers=True):
  a = st.mean(window(F, H, V, C, act, x, s, tr, workers=workers) for s in seeds)
  b = st.mean(window(F, H, V, C, idle, x, s, tr, workers=workers) for s in seeds)
  return a, b, (a / b if b > 0 else float('inf'))

# ---- progression (no workers) for AC7 / tracks ----
def prog(policy, seed, tr=None, T=1800, dt=0.1, model='seller15', h_cap=3):
  rng = random.Random(seed); pois = model == 'casual'; sell_every = 20 if pois else 15; dem = 0.75 if pois else 1.0
  F = H = V = C = 0; coop = 0.0; basket = 0; coins = 0.0; q = []; nxt = 10.0; tap_t = 1.0; sell_t = sell_every
  reach = {0: 0.0}; buys = [0.0]; log = [(0.0, '-', 0, 0)]; n = int(round(T / dt))
  for i in range(1, n + 1):
    t = round(i * dt, 1); rw = row(F)
    rate = hens_rate(H, tr) if tr else rw['eggs_per_sec']; coop = min(rw['coop_capacity'] * coop_mult(H, tr), coop + rate * dt)
    q = [c_ for c_ in q if c_[1] > t]
    if t >= nxt:
      nxt = t + max(dt, rng.expovariate(1 / rw['customer_interval_s']) if pois else rw['customer_interval_s'])
      if len(q) < rw['queue_max']: q.append([max(1, round(rng.randint(int(rw['demand_min']), int(rw['demand_max'])) * dem)), t + 30])
    if t >= tap_t: tap_t += 1; k = min(math.floor(coop), row(C)['eggs_per_tap']); coop -= k; basket += k
    if t >= sell_t:
      sell_t += sell_every; pr = price(F, H, V, C, tr)
      for c_ in list(q):
        if basket <= 0: break
        k = min(basket, c_[0]); basket -= k; c_[0] -= k; coins = cents(coins + k * pr)
        if c_[0] == 0: q.remove(c_)
      while True:
        fc = row(F)['farm_cost'] if F < 30 else 1e18; cc = row(C)['collection_cost'] if C < 30 else 1e18
        if tr is None:  # F1 seller15 rule
          if coins >= fc: kind = 'f'
          elif coins >= cc and cc <= 0.5 * fc: kind = 'c'
          else: break
        else:  # greedy best-ROI across tracks: d(income estimate)/cost, buy if affordable else wait for it
          hc = hcost(H, tr) if H < min(30, F + h_cap) else 1e18; vc = vcost(V, tr) if V < min(30, F + tr.get('v_cap', 99)) else 1e18
          def inc(F_, H_, V_, C_):
            r_ = row(F_); dem_r = (r_['demand_min'] + r_['demand_max']) / 2 / r_['customer_interval_s'] * dem
            return min(hens_rate(H_, tr), dem_r, row(C_)['eggs_per_tap']) * price(F_, H_, V_, C_, tr)
          base = inc(F, H, V, C)
          hc1 = hcost(H, tr) if H < 30 else 1e18  # Farm also lifts the Hens cap: value Farm as the Farm+Hens bundle when capped
          fg = inc(F + 1, H, V, C) - base; fb = (inc(F + 1, H + 1, V, C) - base) * fc / (fc + hc1) if hc >= 1e17 else 0
          opts = [('f', fc, max(fg, fb) + 1e-3 * base), ('h', hc, inc(F, H + 1, V, C) - base),
                  ('v', vc, inc(F, H, V + 1, C) - base), ('c', cc, inc(F, H, V, C + 1) - base)]
          if policy == 'greedy':
            opts = [o for o in opts if o[1] < 1e17 and o[2] > 0]
            if not opts: break
            kind, cost, _ = max(opts, key=lambda o: o[2] / o[1])
          else:  # rule bots (Task B): Collection is bought whenever tap size caps supply (tap < 1.2 x Hens rate), else by rule
            av = {'f': fc, 'h': hc, 'v': vc, 'c': cc}; av = {k: v for k, v in av.items() if v < 1e17}
            need_c = row(C)['eggs_per_tap'] < 1.2 * hens_rate(H, tr) and 'c' in av
            if policy == 'cheapest': kind = min(av, key=av.get)
            elif need_c and av['c'] <= 0.5 * min(av.get(k, 1e18) for k in 'fhv'): kind = 'c'
            elif policy == 'balanced':
              lv = {'f': F, 'h': H, 'v': V}; cand = [k for k in 'fhv' if k in av]
              kind = min(cand, key=lambda k: (lv[k], av[k]))
            elif policy in ('hens_first', 'value_first'):  # keep the favoured track at its cap (F+3), else cheapest of F/H/V
              fav = policy[0]; kind = fav if fav in av else min((k for k in 'fhv' if k in av), key=av.get)
            elif policy == 'farm_first': kind = next(k for k in 'fhvc' if k in av)
            cost = av[kind]
          if coins < cost: break
        cost = dict(f=fc, c=cc, h=hcost(H, tr) if tr else 0, v=vcost(V, tr) if tr else 0)[kind]
        coins = cents(coins - cost); buys.append(t)
        if kind == 'f': F += 1; reach[F] = t
        elif kind == 'c': C += 1
        elif kind == 'h': H += 1
        else: V += 1
        log.append((t, kind, F, C))
  gaps = max(b - a for a, b in zip(buys, buys[1:] + [T]))
  return dict(log=log, reach=reach, t18=reach.get(18), L30=F, H=H, V=V, C=C, gap=gaps)
def _pj(a): return prog(*a)
def prog_stats(tr, seeds, model, pool, policy=None):
  rs = pool.map(_pj, [(policy or ('greedy' if tr else 'seller15'), s, tr, 1800, 0.1, model) for s in seeds])
  t18 = [r['t18'] for r in rs if r['t18']]
  return dict(t18=(st.median(t18) / 60 if t18 else None), n18=len(t18), L30=st.median(r['L30'] for r in rs),
              H=st.median(r['H'] for r in rs), V=st.median(r['V'] for r in rs), C=st.median(r['C'] for r in rs),
              gap=max(r['gap'] for r in rs) / 60)
