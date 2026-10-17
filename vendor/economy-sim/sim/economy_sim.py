"""Canonical Egg Farm economy sim (Economy/Balance Designer, 2026-10-15).
Merges product/economy_sim.py (pacing), farm/farm_stress_sim.py (Monte Carlo), market/sim/progression_sim.py
(real queue/income) and qa/balance_sim.py (CSV-driven, half-up coins). Supersedes them once approved.

Mechanics (core-loop-spec AC1-AC4 + HoP clarifications 2026-10-15):
 0.1 s ticks; coop fills at eggs_per_sec, capped; player taps Collect 1/s (min(floor(coop), tap)).
 Customers: first at 10 s, then every interval(F); arrival timer never pauses; arrival into a full queue is lost;
 queue = 3+floor(F/10) (M1-R1: capped at 5); patience 30 s from arrival; demand uniform int [dmin,dmax] (seeded RNG).
 Leavers: a timed-out customer who bought >=1 egg = customer_partial; never served (timeout or full queue) = customer_lost.
 Selling: every SELL_EVERY s the player presses Sell all (front to back, partial fills, coins half-up to cents).
Player models (both sell every 15 s, tap 1/s; purchases are checked right after each sell):
 seller15  : "Farm first" -- buy Farm if affordable; otherwise buy Collection only if its cost <= COLL_SHARE x next Farm cost.
 legacy    : old undocumented rule (QA I1), kept for reconciliation only.
 cheapest  : always buys the cheapest affordable upgrade, repeatedly (literal AC7 wording / naive player).
Usage: python3 economy_sim.py [--config baseline|proposal|both] [--seeds 20] [--mins 30]
       python3 economy_sim.py --config proposal --csv OUT.csv   # writes a table, never touches economy.csv unless you point it there
"""
import math, random, argparse, statistics as st, csv, os
from decimal import Decimal, ROUND_HALF_UP

BASELINE = dict(name='baseline (economy v1, pre-R1)',
  c_base=10, c_growth=1.15, tap_base=5, tap_per=5, c_price_bonus=0.0,       # Collection
  f_base=25, f_growth=1.35, hens_base=5, hens_per=5, egg_rate=0.2,           # Farm
  cap_base=50, cap_per=50, price_base=1.00, price_per=0.10,
  iv_base=10, iv_decay=0.95, iv_min=3, dmin_base=3, dmin_per=1, dmax_base=8, dmax_per=2,
  q_base=3, q_step=10, patience=30, first=10, offline_rate=0.5, offline_cap_s=7200)
# Proposal M1-R1 (see product/economy-proposal-m1.md). Farm cost growth unchanged at x1.35.
PROPOSAL = dict(BASELINE, name='M1-R1 final',
  f_base=100, c_base=10, c_growth=1.6, c_price_bonus=0.12,   # Farm growth stays x1.35; Collection +12% egg price/level
  price_base=1.00, price_per=0.05,
  demand_mode='supply', d_lo=0.8, d_hi=1.6,               # demand per customer = [0.8,1.6] x eggs_per_sec x interval
  q_cap=5,                                                 # queue = min(5, 3+floor(F/10)) per core-loop-spec AC3
  offline_rate=0.25, offline_cap_s=7200)         # CEO approved 0.25, 2 h cap (2026-10-15)
# P1q+P3 (HoP approved 2026-10-15, PT1-11): interval base 5 (= 10 x0.5, formula-clean), min 1.5; demand 0.8/1.6 x eps x interval;
# queue min(10, 6+floor(F/5)); L0 starter nest 1.5 eggs/s (hens stay 5).
P1Q = dict(PROPOSAL, name='M1-R1 + P1q + P3', iv_base=5, iv_min=1.5, q_base=6, q_step=5, q_cap=10, rate_l0=1.5)
# F1 (HoP approved; shipping data = product/economy.f1-m4cols.csv sha 86f0e80e): farm_cost and w4_tier_cost are per-level
# table values read from the CSV (F1-GAP rows 18/19 included), no formula. Every other M1 column equals the P1Q formulas.
F1_CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'economy.f1-m4cols.csv')
def _f1_tables(path=F1_CSV):
  R = list(csv.DictReader(open(path)))
  return ({int(r['level']): int(float(r['farm_cost'])) for r in R}, {int(r['level']): int(float(r['w4_tier_cost'])) for r in R})
_F1_FC, _F1_W4 = _f1_tables()
F1 = dict(P1Q, name='F1 (economy.f1-m4cols.csv 86f0e80e)', farm_cost_table=_F1_FC, w4_cost_table=_F1_W4)
CURRENT = F1  # main's data/economy.csv since #17/#32 (86f0e80e). Pre-F1: --config p1q / m.P1Q
CONFIGS = {'baseline': BASELINE, 'proposal': PROPOSAL, 'p1q': P1Q, 'f1': F1, 'current': CURRENT}
COLL_SHARE = 0.5; SELL_EVERY = 15

class Eco:
  def __init__(s, p): s.p = p
  def ccost(s, c): return math.floor(s.p['c_base'] * s.p['c_growth'] ** c)
  def fcost(s, f):
    t = s.p.get('farm_cost_table')
    if t is not None and f in t: return t[f]  # F1: per-level CSV value
    return math.floor(s.p['f_base'] * s.p['f_growth'] ** f)
  def w4cost(s, F, share):
    t = s.p.get('w4_cost_table')
    if t is not None and F in t and t[F] > 0: return t[F]  # F1: per-level CSV w4_tier_cost
    return math.floor(share * s.fcost(F))
  def tap(s, c): return s.p['tap_base'] + s.p['tap_per'] * c
  def hens(s, f): return s.p['hens_base'] + s.p['hens_per'] * f
  def rate(s, f):
    if f == 0 and 'rate_l0' in s.p: return s.p['rate_l0']  # PT1-P3 variant: L0 starter-nest override
    return round(s.hens(f) * s.p['egg_rate'], 4)
  def cap(s, f): return s.p['cap_base'] + s.p['cap_per'] * f
  def price(s, f, c=0): return round((s.p['price_base'] + s.p['price_per'] * f) * (1 + s.p['c_price_bonus'] * c), 2)
  def iv_base(s, f): return max(float(s.p['iv_min']), round(s.p['iv_base'] * s.p['iv_decay'] ** f, 2))
  def iv(s, f):  # PT1-P1 variant: iv_scale shortens the interval; default (no key) = unchanged
    return round(s.iv_base(f) * s.p['iv_scale'], 2) if 'iv_scale' in s.p else s.iv_base(f)
  def _k(s, f): return s.rate(f) * s.iv_base(f)  # eggs per BASE customer interval  # eggs produced per customer interval
  def dmin(s, f):
    if s.p.get('demand_mode') == 'supply': return max(1, math.ceil(s.p['d_lo'] * s._k(f)))
    return s.p['dmin_base'] + s.p['dmin_per'] * f
  def dmax(s, f):
    if s.p.get('demand_mode') == 'supply': return max(s.dmin(f), math.ceil(s.p['d_hi'] * s._k(f)))
    return s.p['dmax_base'] + s.p['dmax_per'] * f
  def qmax(s, f): return min(s.p.get('q_cap', 99), s.p['q_base'] + f // s.p['q_step'])
  def demand_rate(s, f): return (s.dmin(f) + s.dmax(f)) / 2 / s.iv(f)
  def offline(s, f, secs): return math.floor(min(max(secs, 0), s.p['offline_cap_s']) * s.p['offline_rate'] * s.rate(f))

def cents(x): return float(Decimal(str(x)).quantize(Decimal('0.01'), ROUND_HALF_UP))

SLOW = dict(sell_every=30, taps=(30, 5))  # slow mobile tapper: visits every 30 s, 5 taps in a burst + Sell all (~0.17 taps/s); run_m2 only
CASUAL = dict(sell_every=20, poisson=True, dem_scale=0.75)  # AC7-soft casual player (buy rule = seller15)
# M2 Workers (modelling only, NOT in M1): seller worker auto-serves the queue every `w_every` s, takes `w_fee` of sale coins,
# hired automatically by the bot at Farm >= w_unlock for w_cost coins; w_demand = extra demand multiplier (hawker).
def run(e, policy, seed, T=1800, dt=0.1, sell_every=SELL_EVERY, start=None, poisson=False, dem_scale=1.0, worker=None):
  rng = random.Random(seed); c = f = 0; coop = 0.0; basket = 0; coins = 0.0
  if start: c, f, basket, coins = start
  q = []; nxt = e.p['first']; tap_t = 1.0; sell_t = sell_every
  reach = {0: 0.0}; buys = []; spawned = lost = partial = 0; sold = 0; hired = False; w_t = 0.0; fees = 0.0
  n = int(round(T / dt))
  for i in range(1, n + 1):
    t = round(i * dt, 1)
    coop = min(e.cap(f), coop + e.rate(f) * dt)
    # QA-RC2-1 (HoP): timeouts/leavers are processed before arrivals within a tick (matches the build)
    if q and q[0][1] <= t or any(x[1] <= t for x in q):
      for x in q:
        if x[1] <= t:
          if x[3]: partial += 1   # part-served leaver -> customer_partial
          else: lost += 1         # never served -> customer_lost (timeout)
      q = [x for x in q if x[1] > t]
    if t >= nxt:
      gap = rng.expovariate(1 / e.iv(f)) if poisson else e.iv(f)
      nxt = round(t + max(dt, gap), 2); spawned += 1
      dm = dem_scale * (worker['w_demand'] if worker and hired else 1)
      if len(q) < e.qmax(f): q.append([max(1, round(rng.randint(e.dmin(f), e.dmax(f)) * dm)), t + e.p['patience'], f, 0])
      else: lost += 1
    if t >= tap_t:
      tap_t += 1; m = min(math.floor(coop), e.tap(c)); coop -= m; basket += m
    pt = False; wsell = hired and t >= w_t
    if wsell: w_t = t + worker['w_every']
    if t >= sell_t or wsell:
      by_player = t >= sell_t
      if by_player: sell_t += sell_every; pt = True
      for x in q[:]:
        if basket <= 0: break
        k = min(basket, x[0]); basket -= k; x[0] -= k; x[3] = 1; sold += k
        gross = k * e.price(f, c); fee = 0 if by_player else gross * worker['w_fee']; fees += fee
        coins = cents(coins + gross - fee)
        if x[0] == 0: q.remove(x)
    if worker and not hired and f >= worker['w_unlock'] and coins >= worker['w_cost']:
      coins = cents(coins - worker['w_cost']); hired = True; w_t = t
    if pt:
      while True:  # purchases
        fc = e.fcost(f) if f < 30 else float('inf'); cc = e.ccost(c) if c < 30 else float('inf')
        if policy == 'seller15':
          if coins >= fc: kind = 'f'
          elif coins >= cc and cc <= COLL_SHARE * fc: kind = 'c'
          else: break
        elif policy == 'legacy':  # old economy_sim/progression_sim rule: cheapest, Collection only while tap<3x eggs/s or C<2
          ok = [k for k, cost in sorted((('c', cc), ('f', fc)), key=lambda x: x[1]) if coins >= cost and (k == 'f' or e.tap(c) < 3 * e.rate(f) or c < 2)]
          if not ok: break
          kind = ok[0]
        else:
          kind = 'c' if cc <= fc else 'f'
          if coins < min(cc, fc): break
        if kind == 'f': coins = cents(coins - fc); f += 1; reach[f] = t
        else: coins = cents(coins - cc); c += 1
        buys.append((t, kind, c, f))
  return dict(reach=reach, buys=buys, c=c, f=f, basket=basket, coins=coins, lost=lost, partial=partial, hired=hired, fees=fees, spawned=spawned, sold=sold)

def lvl_at(r, sec): return max([L for L, tt in r['reach'].items() if tt <= sec], default=0)
def t_to(r, L): return r['reach'].get(L)

def summary(e, seeds, mins=30):
  out = {}
  for pol in ('seller15', 'cheapest', 'legacy'):
    R = [run(e, pol, s, T=mins * 60) for s in range(seeds)]
    out[pol] = R
  return out

def med(v): v = [x for x in v if x is not None]; return st.median(v) if v else None

def report(e, seeds, mins):
  res = summary(e, seeds, mins)
  print(f"\n## {e.p['name']}  ({seeds} seeds, {mins} min, sell every {SELL_EVERY} s, tap 1/s)")
  print("| model | first upg (s) | upg @5m | Farm @5m | Farm @10m | Farm @20m | Farm @30m | t(F10) min | t(F18) min | Coll @30m | basket @30m | lost cust % | partial % |")
  print("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
  for pol, R in res.items():
    def rng3(vals, fmt='{:.0f}'):
      v = [x for x in vals if x is not None]
      if not v: return 'n/r'
      miss = len(vals) - len(v)
      s = (fmt.format(min(v)) + '/' + fmt.format(st.median(v)) + '/' + fmt.format(max(v)))
      return s + (f' ({miss} n/r)' if miss else '')
    first = [r['buys'][0][0] if r['buys'] else None for r in R]
    u5 = [sum(1 for b in r['buys'] if b[0] <= 300) for r in R]
    row = [pol, rng3(first), rng3(u5)] + [rng3([lvl_at(r, m * 60) for r in R]) for m in (5, 10, 20, 30)]
    row += [rng3([t_to(r, 10) and t_to(r, 10) / 60 for r in R], '{:.1f}'), rng3([t_to(r, 18) and t_to(r, 18) / 60 for r in R], '{:.1f}')]
    row += [rng3([r['c'] for r in R]), rng3([r['basket'] for r in R]), rng3([100 * r['lost'] / max(1, r['spawned']) for r in R], '{:.1f}'), rng3([100 * r['partial'] / max(1, r['spawned']) for r in R], '{:.1f}')]
    print('| ' + ' | '.join(map(str, row)) + ' |')
  s = res['seller15']; ch = res['cheapest']
  f30s = st.median([lvl_at(r, 1800) for r in s]); f30c = st.median([lvl_at(r, 1800) for r in ch])
  f10s = st.median([lvl_at(r, 600) for r in s]); f10c = st.median([lvl_at(r, 600) for r in ch])
  print(f"cheapest/seller Farm-level ratio: @10m {f10c/max(f10s,1):.0%}, @30m {f30c/max(f30s,1):.0%}")
  return res

def supply_demand(e):
  print(f"\n### {e.p['name']}: supply vs demand per Farm level")
  print("| F | eggs/s | demand eggs/s | demand/supply | price $ | queue | farm cost | offline 2h eggs | offline eggs / spare demand (min to sell) |")
  print("|---|---|---|---|---|---|---|---|---|")
  for L in (0, 3, 5, 10, 15, 18, 20, 25, 30):
    d = e.demand_rate(L); s = e.rate(L); spare = max(d - s, 1e-9); off = e.offline(L, 7200)
    tsell = f"{off / spare / 60:.0f}" if d > s else "never (no spare demand)"
    print(f"| {L} | {s:.1f} | {d:.2f} | {d/s:.2f} | {e.price(L):.2f} | {e.qmax(L)} | {e.fcost(L)} | {off} | {tsell} |")

def coll_value(e, seeds=10):
  """Marginal value of Collection: seller15 Farm level at 30 min with Collection frozen at C vs free."""
  print(f"\n### {e.p['name']}: Collection marginal value (seller15, Farm @30m median, Collection capped at C)")
  global COLL_SHARE
  base = COLL_SHARE; row = []
  for cmax in (0, 1, 3, 5, 8):
    vals = []
    for s in range(seeds):
      ee = Eco(dict(e.p)); old = ee.ccost
      ee.ccost = (lambda c, old=old, cmax=cmax: old(c) if c < cmax else float('inf'))
      vals.append(lvl_at(run(ee, 'seller15', s), 1800))
    row.append(f"C≤{cmax}: F{st.median(vals):.0f}")
  print(' · '.join(row))

def write_csv(e, path):
  cols = ['level','collection_cost','eggs_per_tap','farm_cost','hens','eggs_per_sec','coop_capacity','egg_price','customer_interval_s','demand_min','demand_max','offline_eggs_per_sec','offline_max_eggs_2h','customer_patience_s','queue_max','first_customer_s','collection_price_bonus']
  with open(path, 'w', newline='') as fh:
    w = csv.writer(fh); w.writerow(cols)
    for L in range(31):
      w.writerow([L, e.ccost(L), e.tap(L), e.fcost(L), e.hens(L), e.rate(L), e.cap(L), e.price(L), e.iv(L), e.dmin(L), e.dmax(L), round(e.rate(L) * e.p['offline_rate'], 2), e.offline(L, 7200), e.p['patience'], e.qmax(L), e.p['first'], round(e.p['c_price_bonus'] * L, 2)])

# ======================= M2 Workers model (Economy/Balance Designer, 2026-10-15) =======================
# Implements product/workers/m2-proposal.md v0.1 §2-3 as a separate run_m2() so run() / M1 output stay byte-identical.
# Workers act online only (offline: no work, no drain, no wage; offline eggs = 25% x eggs/s, 2 h cap, unchanged).
# Economy-recommended M2 set (product/workers/m2-economy-validation.md): M2_REC. M2_SPEC = PM Workers v0.1 as written.
M2_SPEC = dict(
  w1=dict(unlock=1, cost=40, every=1, tired_every=3, fee=0.10, defer=5, idle_gate=0, wage_per_f_min=0.0),  # Market Hand
  # defer: only serve customers waiting >= defer s; idle_gate: only work if the player's last Sell all was >= idle_gate s ago
  w2=dict(unlock=3, cost=150, every=2, tired_every=4, wage_per_f_min=0.5),     # Coop Hand
  w3=dict(unlock=5, cost=400, demand=1.25, tired_demand=1.10),                 # Hawker (applies once hired)
  w4=[(18, 1.25), (20, 1.6), (21, 2.0), (23, 2.8), (24, 4.0)],                 # Egg Grader tiers (Farm L, price x)
  w4_cost_share=0.5, w4_asleep_keep=0.0,  # share of the tier bonus kept while the Grader is asleep                                                           # tier cost = share x next Farm cost at unlock
  drain_s_per_pct=6, tired_below=50, manage_cd=30)
# manage: 'managed' = player taps Manage on any worker <=50% energy at each of its sell visits (cooldown 30 s);
#         'unmanaged' = never manages (Working 5 min -> Tired 5 min -> Asleep). price_mult: optional {F: x} per-Farm-level
#         price multiplier (economy lever, no worker needed).
def run_m2(e, policy, seed, T=7200, dt=0.1, sell_every=SELL_EVERY, poisson=False, dem_scale=1.0,
           spec=None, use=('w1', 'w2', 'w3', 'w4'), manage='managed', price_mult=None, taps=None):
  # taps=(period_s, n): player taps n times (1/s) at the start of every period_s window; None = 1 tap/s
  sp = spec or {}; use = set(use) if sp else set()
  rng = random.Random(seed); c = f = 0; coop = 0.0; basket = 0; coins = 0.0
  q = []; nxt = e.p['first']; tap_t = 1.0; sell_t = sell_every
  reach = {0: 0.0}; buys = []; spawned = lost = partial = lost_full = 0; sold = 0; fees = wages = 0.0
  qfull_ticks = filled = 0  # PT1 diagnostics (no behaviour change)
  hired = {}; energy = {}; last_manage = -1e9; last_sell = 0.0; manages = 0; w1_t = w2_t = 0.0; grade = 1.0; tiers_bought = 0
  w4cost = lambda F: e.w4cost(F, sp['w4_cost_share'])
  income_log = []  # (t, f, coins earned in tick)
  wcarry = {}  # per-worker fractional-cent wage carry, matches game (HoP 2026-10-16: charge exact CSV rate)
  def pay(wg, w):
    if not sp.get('wage_carry'): return cents(wg)
    a = wcarry.get(w, 0.0) + wg; c = math.floor(a * 100 + 1e-9) / 100; wcarry[w] = a - c; return c
  unpaid = set(); UNP = sp.get('unpaid_rule', False)  # v1.1 §8.2/§8.15: short on wage -> Unpaid (like Asleep, no drain)
  def wage_min(w): return sp[w].get('wage_per_f_min', 0) * f if isinstance(sp[w], dict) else 0  # W4 (tier list) has no wage; was a crash if Unpaid while Grader hired
  def state(w):
    if w not in hired: return 'none'
    if w in unpaid: return 'unpaid'
    en = energy[w]; return 'work' if en >= sp['tired_below'] else ('tired' if en > 0 else 'asleep')
  n = int(round(T / dt))
  for i in range(1, n + 1):
    t = round(i * dt, 1)
    for w in hired:
      if state(w) not in ('asleep', 'unpaid'): energy[w] = max(0.0, energy[w] - dt / sp['drain_s_per_pct'])
    coop = min(e.cap(f), coop + e.rate(f) * dt)
    # QA-RC2-1: timeouts before arrivals
    if any(x[1] <= t for x in q):
      for x in q:
        if x[1] <= t:
          if x[3]: partial += 1
          else: lost += 1
      q = [x for x in q if x[1] > t]
    if len(q) >= e.qmax(f): qfull_ticks += 1
    if t >= nxt:
      gap = rng.expovariate(1 / e.iv(f)) if poisson else e.iv(f)
      nxt = round(t + max(dt, gap), 2); spawned += 1
      s3 = state('w3'); dm = dem_scale * (sp['w3']['demand'] if s3 == 'work' else sp['w3']['tired_demand'] if s3 == 'tired' else 1)
      qb = sp['w3'].get('queue_bonus', 0) if s3 in ('work', 'tired') else 0
      qm = e.qmax(f) + qb if sp.get('w3', {}).get('queue_mode', 'uncapped') == 'uncapped' else min(sp['w3'].get('queue_hard_cap', 5), e.p['q_base'] + f // e.p['q_step'] + qb)
      if len(q) < qm: q.append([max(1, round(rng.randint(e.dmin(f), e.dmax(f)) * dm)), t + e.p['patience'], f, 0, t])
      else: lost += 1; lost_full += 1
    if t >= tap_t:
      tap_t += 1
      if taps is None or ((tap_t - 2) % taps[0]) < taps[1]:
        m = min(math.floor(coop), e.tap(c)); coop -= m; basket += m
    if unpaid:  # resume one at a time W1->W4, each needs coins >= 1 min of its wage after reserving for those resumed this pass
      k = sp.get('unpaid_resume_wage_min', 1)  # R9: first reserve 1 min of wage for workers already being paid
      reserve = sum(k * wage_min(x) for x in hired if state(x) in ('work', 'tired'))  # m-3: Working/Tired only
      for w in ('w1', 'w2', 'w3', 'w4'):
        if w not in unpaid: continue
        if coins < reserve + k * wage_min(w): break  # m-4: stop at first worker that can't resume (matches build)
        unpaid.discard(w); reserve += k * wage_min(w)
    s2 = state('w2')
    if s2 in ('work', 'tired') and t >= w2_t:
      w2_t = t + (sp['w2']['every'] if s2 == 'work' else sp['w2']['tired_every'])
      m = min(math.floor(coop), e.tap(c)); coop -= m; basket += m
      wg = sp['w2']['wage_per_f_min'] * f * sp['w2']['every'] / 60 if s2 == 'work' else sp['w2']['wage_per_f_min'] * f * sp['w2']['tired_every'] / 60
      if UNP and coins < wg: unpaid.add('w2')
      else: wg = min(wg, coins); coins = cents(coins - pay(wg, 'w2')); wages += wg
    pm = price_mult.get(f, 1.0) if price_mult else 1.0
    s4 = state('w4'); gm = grade if s4 == 'work' else (1 + (grade - 1) / 2 if s4 == 'tired' else 1 + (grade - 1) * sp.get('w4_asleep_keep', 0.0))
    unit = e.price(f, c) * pm * gm
    pt = t >= sell_t
    if pt:
      sell_t += sell_every
      for x in q[:]:
        if basket <= 0: break
        k = min(basket, x[0]); basket -= k; x[0] -= k; x[3] = 1; sold += k; g = cents(k * unit); coins = cents(coins + g); income_log.append((t, f, g))
        if x[0] == 0: q.remove(x); filled += 1
      if manage == 'managed' and hired and t - last_manage >= sp['manage_cd']:
        low = [w for w in hired if energy[w] <= sp.get('manage_at', sp['tired_below'])]  # PT1-P4: manage_at = yawn (40)
        if low:
          if sp.get('manage_all_low_only'):  # PT1-P4: Manage all counts/refills only workers <= manage_at
            if sp.get('manage_all') and (len(hired) if sp.get('manage_all_unlock_by_hired') else len(low)) >= sp.get('manage_all_min_workers', 3):  # UX v1.3: unlock by hired>=3, N>=1
              for w in low: energy[w] = 100.0
            else: energy[min(low, key=lambda w: energy[w])] = 100.0
          elif sp.get('manage_all') and len(hired) >= sp.get('manage_all_min_workers', 3):   # 'Manage all': one action refills every worker, shared cooldown
            for w in hired: energy[w] = 100.0
          else: energy[min(low, key=lambda w: energy[w])] = 100.0
          last_manage = t; manages += 1
    s1 = state('w1')
    if pt: last_sell = t
    if s1 in ('work', 'tired') and t >= w1_t and t - last_sell >= sp['w1'].get('idle_gate', 0):  # F1 (b) HoP ruling 2026-10-17: held turn still advances w1_t and pays the wage; min wait gates serving only (loop skips waits < defer)
      w1_t = t + (sp['w1']['every'] if s1 == 'work' else sp['w1']['tired_every'])
      wg = sp['w1'].get('wage_per_f_min', 0) * f * (w1_t - t) / 60
      if UNP and coins < wg: unpaid.add('w1'); s1 = 'unpaid'
      else: wg = min(coins, wg); coins = cents(coins - pay(wg, 'w1')); wages += wg
      for x in (q[:] if s1 != 'unpaid' else []):
        if basket <= 0: break
        if t - x[4] < sp['w1']['defer']: continue
        k = min(basket, x[0]); basket -= k; x[0] -= k; x[3] = 1; sold += k
        g = cents(k * unit); fee = cents(g * sp['w1']['fee']); fees += fee; coins = cents(coins + g - fee); income_log.append((t, f, g - fee))
        if x[0] == 0: q.remove(x); filled += 1
    if pt:
      while True:  # purchases: workers first when unlocked + affordable, then the M1 buy rule
        bought = False
        for w in ('w1', 'w2', 'w3'):
          if w in use and w not in hired and f >= sp[w]['unlock'] and coins >= sp[w]['cost']:
            coins = cents(coins - sp[w]['cost']); hired[w] = 1; energy[w] = 100.0; buys.append((t, w, c, f)); bought = True
        if 'w4' in use and tiers_bought < len(sp['w4']) and f >= sp['w4'][tiers_bought][0]:
          cost = w4cost(sp["w4"][tiers_bought][0])
          if coins >= cost:
            coins = cents(coins - cost); grade = sp['w4'][tiers_bought][1]; tiers_bought += 1
            if 'w4' not in hired: hired['w4'] = 1; energy['w4'] = 100.0
            buys.append((t, 'w4', c, f)); bought = True
        fc = e.fcost(f) if f < 30 else float('inf'); cc = e.ccost(c) if c < 30 else float('inf')
        if policy == 'seller15':
          if coins >= fc: kind = 'f'
          elif coins >= cc and cc <= COLL_SHARE * fc: kind = 'c'
          else: kind = None
        else:
          kind = ('c' if cc <= fc else 'f') if coins >= min(cc, fc) else None
        if kind == 'f': coins = cents(coins - fc); f += 1; reach[f] = t; buys.append((t, 'f', c, f))
        elif kind == 'c': coins = cents(coins - cc); c += 1; buys.append((t, 'c', c, f))
        if not kind and not bought: break
  return dict(reach=reach, buys=buys, c=c, f=f, basket=basket, coins=coins, lost=lost, lost_full=lost_full, partial=partial, spawned=spawned,
              sold=sold, fees=fees, wages=wages, hired=dict(hired), income=income_log, manages=manages, tiers=tiers_bought,
              qfull_ticks=qfull_ticks, ticks=n, filled=filled)

def income_at_level(r, L):
  """Average coins/s earned while at Farm level L (net of W1 fee)."""
  t0 = r['reach'].get(L); t1 = r['reach'].get(L + 1)
  if t0 is None or t1 is None or t1 <= t0: return None
  return sum(g for t, F, g in r['income'] if F == L and t0 <= t < t1) / (t1 - t0)

import copy as _copy
M2_REC = _copy.deepcopy(M2_SPEC)
M2_REC['w1'].update(unlock=3, fee=0.0, defer=0, wage_per_f_min=0.25)   # flat wage instead of 10% fee; defer not needed
M2_REC['w2'].update(unlock=10)
M2_REC['w3'].update(unlock=8, cost=800)
M2_REC['w4'] = [(18, 1.5), (19, 2.0), (21, 2.5), (22, 3.0), (24, 4.0)]
M2_REC['w4_asleep_keep'] = 0.25

# v0.3 (PM Workers): Coop Hand at F7. ENERGY_V2 = Art & UX values: 15 min drain, Tired < 30%, Manage all (>=3 workers).
M2_V03 = _copy.deepcopy(M2_REC); M2_V03['w2'].update(unlock=7)
M2_V03_E2 = _copy.deepcopy(M2_V03); M2_V03_E2.update(drain_s_per_pct=9, tired_below=30, manage_all=True)

# ---- Workers v1.1 (HoP approved 2026-10-15; m2-proposal.md §10 + §8 rulings) = values written to economy.csv ----
M2_V11 = _copy.deepcopy(M2_V03_E2)
M2_V11.update(w4_asleep_keep=0.15, yawn_at=40, manage_all_min_workers=3, unpaid_rule=True, unpaid_resume_wage_min=1,
              energy_start=100, coop_full_tip_s=10)
M2_P4 = _copy.deepcopy(M2_V11); M2_P4.update(manage_at=40, manage_all_low_only=True)  # PT1-P4 (HoP approved 2026-10-15)
M2_P4['wage_carry'] = True  # HoP 2026-10-16: exact wage via fractional-cent carry (Market Hand 60 s = $0.75)
M2_F1 = _copy.deepcopy(M2_P4); M2_F1.update(yawn_at=50, manage_at=50)  # F1 (HoP approved): yawn_at_pct 50, manage_prompt_threshold 0.5
M2_CURRENT = M2_F1  # main since #17 (50 / 0.5); pre-F1 was M2_P4 (40 / 0.4)
W_CONST = [  # constant-value worker columns (same on every row), (csv column, getter)
  ('w1_unlock_farm', lambda w: w['w1']['unlock']), ('w1_every_s', lambda w: w['w1']['every']), ('w1_tired_every_s', lambda w: w['w1']['tired_every']),
  ('w2_unlock_farm', lambda w: w['w2']['unlock']), ('w2_every_s', lambda w: w['w2']['every']), ('w2_tired_every_s', lambda w: w['w2']['tired_every']),
  ('w3_unlock_farm', lambda w: w['w3']['unlock']), ('w3_demand_mult', lambda w: w['w3']['demand']), ('w3_tired_demand_mult', lambda w: w['w3']['tired_demand']),
  ('w4_tier_cost_share', lambda w: w['w4_cost_share']), ('w4_tired_bonus_share', lambda w: 0.5), ('w4_asleep_bonus_share', lambda w: w['w4_asleep_keep']),
  ('energy_start_pct', lambda w: w['energy_start']), ('drain_s_per_pct', lambda w: w['drain_s_per_pct']), ('tired_below_pct', lambda w: w['tired_below']),
  ('yawn_at_pct', lambda w: w['yawn_at']), ('manage_cooldown_s', lambda w: w['manage_cd']), ('manage_all_min_workers', lambda w: w['manage_all_min_workers']),
  ('unpaid_resume_wage_min', lambda w: w['unpaid_resume_wage_min']), ('coop_full_tip_s', lambda w: w['coop_full_tip_s']),
  ('manage_prompt_threshold', lambda w: round(w.get('manage_at', w['tired_below']) / 100, 2)),
  ]
W_GUARD = [('guard_heartbeat_s', lambda w: w['guard_heartbeat_s']), ('guard_stale_s', lambda w: w['guard_stale_s'])]  # F1 merge: set M2 spec guard_* keys to emit  # PT1-P4: 0.4
def worker_row(e, w, L):
  """Per-level worker columns. 0 = not unlocked at this Farm level (sync parser needs numbers; see economy.md)."""
  u = lambda k: L >= w[k]['unlock']
  tiers = [(i + 1, F, m) for i, (F, m) in enumerate(w['w4']) if F <= L]
  tier, tF, mult = tiers[-1] if tiers else (0, None, 1.0)
  return [w['w1']['cost'] if u('w1') else 0, round(w['w1']['wage_per_f_min'] * L, 4) if u('w1') else 0,
          w['w2']['cost'] if u('w2') else 0, round(w['w2']['wage_per_f_min'] * L, 4) if u('w2') else 0,
          w['w3']['cost'] if u('w3') else 0, tier, mult, e.w4cost(tF, w['w4_cost_share']) if tiers else 0]
W_LEVEL_COLS = ['w1_cost', 'w1_wage_per_min', 'w2_cost', 'w2_wage_per_min', 'w3_cost', 'w4_tier', 'w4_price_mult', 'w4_tier_cost']

def write_csv_v11(e, w, path):
  """economy.csv = M1 columns (unchanged, first 17) + per-level worker columns + constant worker columns."""
  write_csv(e, path + '.m1tmp')
  m1 = open(path + '.m1tmp').read().splitlines(); os.remove(path + '.m1tmp')
  WC = W_CONST + (W_GUARD if 'guard_heartbeat_s' in w else [])
  out = [m1[0] + ',' + ','.join(W_LEVEL_COLS + [c for c, _ in WC])]
  for L, line in enumerate(m1[1:]):
    vals = worker_row(e, w, L) + [g(w) for _, g in WC]
    out.append(line + ',' + ','.join(str(v) for v in vals))
  open(path, 'w', newline='').write('\r\n'.join(out) + '\r\n')

def spec_from_csv(path):
  """Read the worker spec back from economy.csv (sim <-> CSV consistency)."""
  R = list(csv.DictReader(open(path))); r0 = R[0]; num = lambda x: float(x) if '.' in x else int(x)
  w = _copy.deepcopy(M2_V11)
  first = lambda col: next(int(r['level']) for r in R if float(r[col]) > 0)
  if 'market_hand_min_wait_s' in r0: w['w1'].update(defer=num(r0['market_hand_min_wait_s']), hold_until_servable=True)  # F1
  w['w1'].update(unlock=num(r0['w1_unlock_farm']), cost=num(R[first('w1_cost')]['w1_cost']), every=num(r0['w1_every_s']), tired_every=num(r0['w1_tired_every_s']),
                 wage_per_f_min=float(R[first('w1_cost')]['w1_wage_per_min']) / first('w1_cost'))
  w['w2'].update(unlock=num(r0['w2_unlock_farm']), cost=num(R[first('w2_cost')]['w2_cost']), every=num(r0['w2_every_s']), tired_every=num(r0['w2_tired_every_s']),
                 wage_per_f_min=float(R[first('w2_cost')]['w2_wage_per_min']) / first('w2_cost'))
  w['w3'].update(unlock=num(r0['w3_unlock_farm']), cost=num(R[first('w3_cost')]['w3_cost']), demand=float(r0['w3_demand_mult']), tired_demand=float(r0['w3_tired_demand_mult']))
  tiers = []
  for r in R:
    t = int(r['w4_tier'])
    if t and t > len(tiers): tiers.append((int(r['level']), float(r['w4_price_mult'])))
  w['w4'] = tiers
  w.update(w4_cost_share=float(r0['w4_tier_cost_share']), w4_asleep_keep=float(r0['w4_asleep_bonus_share']), energy_start=num(r0['energy_start_pct']),
           drain_s_per_pct=num(r0['drain_s_per_pct']), tired_below=num(r0['tired_below_pct']), yawn_at=num(r0['yawn_at_pct']), manage_cd=num(r0['manage_cooldown_s']),
           manage_all_min_workers=num(r0['manage_all_min_workers']), unpaid_resume_wage_min=num(r0['unpaid_resume_wage_min']), coop_full_tip_s=num(r0['coop_full_tip_s']))
  return w


# ---- AC7 @30 min (HoP via PM Farm Upgrades, 2026-10-16, for F1): additional output only; report() unchanged ----
AC7_30_BAND = (18, 22); AC7_30_TARGET = 20
def ac7_30(e, seeds=30, l30_hours=6):
  """Median Farm level at 30 min over `seeds` (seller15, cheapest; M1 run()), pass band L18-22, target L20.
  Also t(Farm L30) median from l30_hours-long runs (no documented band; reported for comparison)."""
  out = {}
  for pol in ('seller15', 'cheapest'):
    R = [run(e, pol, s, T=l30_hours * 3600) for s in range(seeds)]
    l30m = st.median([lvl_at(r, 1800) for r in R]); t30 = [t_to(r, 30) for r in R]
    out[pol] = dict(level_at_30m=l30m, pass_=AC7_30_BAND[0] <= l30m <= AC7_30_BAND[1], t_L30_min=med(t30) and med(t30) / 60,
                    l30_nr=sum(1 for x in t30 if x is None), level_at_10m=st.median([lvl_at(r, 600) for r in R]))
  return out
def print_ac7_30(e, seeds=30):
  print(f"\n## AC7 @30 min (band L{AC7_30_BAND[0]}-L{AC7_30_BAND[1]}, target L{AC7_30_TARGET}; {seeds} seeds) - {e.p['name']}")
  print('| model | Farm L @30m | pass | Farm L @10m | t(Farm L30) min (n/r) |\n|---|---|---|---|---|')
  for pol, r in ac7_30(e, seeds).items():
    t = 'n/r' if r['t_L30_min'] is None else f"{r['t_L30_min']:.1f}"
    print(f"| {pol} | {r['level_at_30m']} | {'PASS' if r['pass_'] else 'FAIL'} | {r['level_at_10m']} | {t} ({r['l30_nr']}) |")

if __name__ == '__main__':
  ap = argparse.ArgumentParser(); ap.add_argument('--ac7-30', action='store_true', help='additional AC7 @30 min report (band L18-22) for --config'); ap.add_argument('--config', default='both'); ap.add_argument('--seeds', type=int, default=20)
  ap.add_argument('--mins', type=int, default=30); ap.add_argument('--csv'); ap.add_argument('--extras', action='store_true')
  ap.add_argument('--casual', action='store_true', help='AC7-soft: casual player (seller15 rule, Poisson, sell 20 s, demand x0.75), 60-min runs')
  a = ap.parse_args()
  if a.casual:
    e = Eco(CURRENT); R = [run(e, 'seller15', s, T=3600, **CASUAL) for s in range(a.seeds)]
    t10 = [r['reach'].get(10) for r in R]; t18 = [r['reach'].get(18) for r in R]
    print(f"AC7-soft casual, {a.seeds} seeds: F10<=15m {sum(1 for x in t10 if x and x<=900)}/{a.seeds} (median {med(t10)/60:.1f} min); F18<=45m {sum(1 for x in t18 if x and x<=2700)}/{a.seeds} (median {med(t18)/60:.1f} min)")
    raise SystemExit
  names = ['baseline', 'proposal'] if a.config == 'both' else [a.config]
  if a.ac7_30:
    for nm in names: print_ac7_30(Eco(CONFIGS[nm]), a.seeds)
    raise SystemExit
  for nm in names:
    e = Eco(CONFIGS[nm]); report(e, a.seeds, a.mins)
    if a.extras: supply_demand(e); coll_value(e)
  if a.csv:
    if names[-1] == 'current': write_csv_v11(Eco(CURRENT), M2_CURRENT, a.csv)
    elif names[-1] == 'f1': write_csv_v11(Eco(F1), M2_F1, a.csv)  # == F1 data/economy.csv M1 + Workers columns  # == product/economy.csv (M1 + Workers v1.1)
    else: write_csv(Eco(CONFIGS[names[-1]]), a.csv)
    print('wrote', a.csv)
