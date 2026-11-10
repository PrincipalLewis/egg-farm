"""Customer roadmap v0.2 on full M4 stack (Economy 2026-10-16): copy of sim/m4/m4_workers_prog.py + O[se] seller interval, O[goals], O[bulk], earned-income log.
TR-5 progression re-check WITH workers + Grader (Economy, 2026-10-16). python3 m4_workers_prog.py
Base = PM Farm's TR-5 bot (farm/m4/m4_sim.py: greedy look-ahead best-ROI for Farm/Hens/Egg value/Collection, table costs, caps F+3).
Added, from the CSV (economy.f1-m4cols.csv / m4-candidate.csv):
- Hires: W1 Market hand (F>=3, $40, wage 0.25*F/min), W2 Egg runner (F>=7, $150, 0.5*F/min), W3 Crier (F>=8, $800, demand x1.25).
  Bought as soon as unlocked and affordable (before track buys). Wages are charged continuously (coins can't go below 0; unpaid -> worker idle).
- Grader: tier t unlocks at the first Farm row with w4_tier=t, costs w4_tier_cost of that row, price x w4_price_mult; bought when affordable (priority).
- Worker behaviour: W1 every 1 s sells basket to customers waiting >= 2 s; W2 one extra collect (eggs_per_tap) every 2 s.
  Energy: the player refills at each Sell-all visit (seller15/casual both visit every 15/20 s), so workers stay 'working'
  (drain 1%/9 s => 40% yawn after 540 s >> visit interval). Assumption stated, not simulated per tick.
- Abilities v0.3 (tc_ability_*): Activate-all every 300 s for 30 s once >=1 worker hired: W1 Rush x1.15 on W1 sales, W2 Sweep x1.15 lay,
  W3 Shout x1.15 on all sales, W4 Inspect +0.5 on the Grader multiplier.
Idle time after everything is bought (F30, H/V capped, Grader maxed, all hires) is excluded: the run stops there.
Realism (args[5] dict, used by tr5_run.py --workers): refill_delay=S simulates energy (drain 1%/9 s, tired <30%, asleep 0%;
  tired W1 every 3 s, W2 every 4 s, W3 x1.1, Grader 0.5 share, asleep 0.15) and refills only at a visit >= S s after a worker hits 40%;
  jitter=S delays each ability activation by U(0,S); skip=P skips an activation window with probability P. Default (None) = always working.
Metric = TR-5: gap between consecutive purchases (any kind, incl. hires/Grader) <= 3.0 min, worst per seed; F18 time; Farm level at 30:00 and L30 time."""
import os, sys, csv, math, random, statistics as st, collections
from multiprocessing import Pool
FARM = '/workspace/egg-farm-studio/product/farm/m4'
def setup(path):
  os.environ['ECON_CSV'] = path
  sys.path.insert(0, FARM); import importlib, m4_sim as m; importlib.reload(m)
  rows = list(csv.DictReader(open(path))); hc = [float(r['hens_cost']) for r in rows]; vc = [float(r['egg_value_cost']) for r in rows]
  m.TUNE.update(hcap=int(float(rows[0]['hens_cap_over_farm'])), vcap=int(float(rows[0]['egg_value_cap_over_farm']))); b0 = m.cost
  def cost(k, L, T=m.TUNE):
    if L >= 30: return math.inf
    return hc[int(L)] if k == 'h' else vc[int(L)] if k == 'v' else b0(k, L, T)
  m.cost = cost
  R = [{k: float(v) for k, v in r.items()} for r in rows]
  tiers = []  # (unlock F, mult, cost)
  for L, r in enumerate(R):
    if r['w4_tier'] > (tiers[-1][3] if tiers else 0): tiers.append((L, r['w4_price_mult'], r['w4_tier_cost'], r['w4_tier']))
  return m, R, tiers
WK = dict(w1=dict(unlock=3, cost=40, wage=0.25), w2=dict(unlock=7, cost=150, wage=0.5), w3=dict(unlock=8, cost=800, wage=0.0))
def run(args):
  path, seed, model, T_, workers = args[:5]; O = dict(refill_delay=None, jitter=0.0, skip=0.0, taps=None, se=None, goals=None, bulk=None, w1off=False); O.update(args[5] if len(args) > 5 else {})
  realistic = O['refill_delay'] is not None
  m, R, tiers = setup(path); a0 = R[0]
  ab_s, ab_cd = a0['tc_ability_s'], a0['tc_ability_cd_s']; a1, a2, a3, a4 = a0['tc_ability_w1_price_mult'], a0['tc_ability_w2_lay_mult'], a0['tc_ability_w3_price_mult'], a0['tc_ability_w4_tier_add']
  rng = random.Random(seed); rng_b = random.Random(seed * 104729 + 3); arng = random.Random(seed * 7919 + 1); pois = model == 'casual'; se = O['se'] or (20 if pois else 15); dem = 0.75 if model in ('casual', 'd25') else 1.0
  taps = O['taps'] or (0.5 if pois else 1.0)
  en = {}; low_since = {}
  F = H = V = C = 0; coop = 0.0; basket = 0; coins = 0.0; q = []; nxt = m.row(0)['first_customer_s']; tap_t = 1.0; sell_t = se
  hired = set(); gt = 0; gmult = 1.0; ab_next = None; ab_until = -1; w1_t = w2_t = 0.0
  earned = 0.0; inc = {}; gst = dict(n=0, nxt=0.0, done=0, val=0.0); bk = dict(cur=None, nxt=None, served=0, miss=0, val=0.0); reach = {0: 0.0}; buys = [(0.0, '-', 0)]; dt = 0.1
  def buy_log(t, k): buys.append((t, k, F))
  for i in range(1, int(T_ / dt) + 1):
    t = round(i * dt, 1); r = m.row(F); ab = t < ab_until
    if i % 600 == 0: inc[int(t // 60)] = earned
    for w_ in list(en): en[w_] = max(0.0, en[w_] - dt / 9.0)
    def stt(w_):
      if not realistic or w_ not in en: return 'work'
      return 'work' if en[w_] >= 30 else 'tired' if en[w_] > 0 else 'asleep'
    lay = m.hens_rate(H) * (a2 if ab and 'w2' in hired and stt('w2') != 'asleep' else 1.0)
    coop = min(r['coop_capacity'] * m.hens_ms(H), coop + lay * dt)
    while t >= nxt:
      d_ = dem * ({'work': 1.25, 'tired': 1.1, 'asleep': 1.0}[stt('w3')] if 'w3' in hired else 1.0)
      if len(q) < r['queue_max']: q.append([max(1, round(rng.randint(int(r['demand_min']), int(r['demand_max'])) * d_)), nxt + r['customer_patience_s'], nxt])
      nxt = round(nxt + (rng.expovariate(1 / r['customer_interval_s']) if pois else r['customer_interval_s']), 2)
    q = [c_ for c_ in q if c_[1] > t]
    for w in ('w1', 'w2'):
      if w in hired and not (w == 'w1' and O.get('w1off')): coins = max(0.0, coins - WK[w]['wage'] * F * dt / 60)
    def up(worker_sale):
      g = (1 + (gmult - 1) * {'work': 1.0, 'tired': 0.5, 'asleep': 0.15}[stt('w4')]) + (a4 if ab and gt and stt('w4') != 'asleep' else 0.0)
      p = m.price(F, H, V) * g
      if ab and 'w3' in hired and stt('w3') != 'asleep': p *= a3
      if ab and worker_sale and 'w1' in hired and stt('w1') != 'asleep': p *= a1
      return p
    def sell_to(cands, worker_sale):
      nonlocal basket, coins, earned
      for c_ in cands:
        if basket <= 0: break
        k = min(basket, c_[0]); basket -= k; c_[0] -= k; g_ = k * up(worker_sale); coins = round(coins + g_, 2); earned += g_
        if c_[0] == 0:
          q.remove(c_)
          G = O['goals']
          if G and not worker_sale and F >= 5:
            if t >= gst['nxt']:
              gst['n'] += 1
              if gst['n'] >= G['n']:
                rw_ = G['r'] * m.hens_rate(H) * up(False); coins = round(coins + rw_, 2); earned += rw_
                gst['n'] = 0; gst['nxt'] = t + G['cd']; gst['done'] += 1; gst['val'] += rw_
    if t >= tap_t - 1e-9: tap_t += 1 / taps; k = min(math.floor(coop), int(m.row(C)['eggs_per_tap'])); coop -= k; basket += k
    if 'w2' in hired and stt('w2') != 'asleep' and t >= w2_t: w2_t = t + (2 if stt('w2') == 'work' else 4); k = min(math.floor(coop), int(m.row(C)['eggs_per_tap'])); coop -= k; basket += k
    if 'w1' in hired and not O.get('w1off') and stt('w1') != 'asleep' and t >= w1_t and basket > 0:
      w1_t = t + (1 if stt('w1') == 'work' else 3); sell_to([c_ for c_ in list(q) if t - c_[2] >= 2], True)
    if ab_next is not None and t >= ab_next:
      if arng.random() < O['skip']: ab_next = t + ab_cd  # missed this cooldown window
      else: ab_until = t + ab_s; ab_next = t + ab_cd + (arng.uniform(0, O['jitter']) if O['jitter'] else 0.0)
    for w_ in en:
      if en[w_] <= 40 and w_ not in low_since: low_since[w_] = t
    B = O['bulk']
    if B and F >= 6:
      if bk['nxt'] is None: bk['nxt'] = t + rng_b.uniform(*B['iv'])
      if bk['cur'] and t >= bk['cur'][1]: bk['cur'] = None; bk['miss'] += 1
      if bk['cur'] is None and t >= bk['nxt']:
        dm_ = r['demand_max']; bk['cur'] = [int(min(B['maxm'] * dm_, max(dm_, round(B['share'] * basket)))), t + B['wait']]; bk['nxt'] = t + rng_b.uniform(*B['iv'])
    if t >= sell_t - 1e-9:
      sell_t += se
      if B and bk['cur'] and basket >= bk['cur'][0]:
        g_ = bk['cur'][0] * up(False) * B['pm']; basket -= bk['cur'][0]; coins = round(coins + g_, 2); earned += g_; bk['served'] += 1; bk['val'] += g_; bk['cur'] = None
      sell_to(list(q), False)
      if realistic:  # refill at a visit once a worker has been at/below the 40% yawn for >= refill_delay s (30 s manage cooldown ignored)
        due = [w_ for w_, t0 in low_since.items() if t - t0 >= O['refill_delay']]
        for w_ in due: en[w_] = 100.0; low_since.pop(w_)
      while True:
        if workers:  # hires + Grader first
          w = next((w for w in ('w1', 'w2', 'w3') if w not in hired and F >= WK[w]['unlock'] and coins >= WK[w]['cost']), None)
          if w:
            coins = round(coins - WK[w]['cost'], 2); hired.add(w); en[w] = 100.0; buy_log(t, w)
            if ab_next is None: ab_next = t
            continue
          nt = next((x for x in tiers if x[3] == gt + 1 and F >= x[0]), None)
          if nt and coins >= nt[2]:
            coins = round(coins - nt[2], 2); gt += 1; gmult = nt[1]; en.setdefault('w4', 100.0); buy_log(t, 'g'); continue
        s = (F, H, V, C); k = m.choose('greedy', s, coins, dem * (1.25 if 'w3' in hired else 1.0), m.TUNE)
        if not k: break
        coins = round(coins - m.cost(k, s[m.IDX[k]], m.TUNE), 2)
        if k == 'f': F += 1; reach[F] = t
        elif k == 'h': H += 1
        elif k == 'v': V += 1
        else: C += 1
        buy_log(t, k)
      # nothing left to buy (F30, H/V at caps, Grader maxed, all hires): stop the clock so idle completion time is not a 'gap'
      if F >= 30 and H >= min(30, F + m.TUNE['hcap']) and V >= min(30, F + m.TUNE['vcap']) and (not workers or (gt >= len(tiers) and len(hired) == 3)):
        t_end = t; break
  else:
    t_end = T_
  gaps = [(b[0] - a[0], a[2]) for a, b in zip(buys, buys[1:] + [(t_end, '-', F)])]
  perF = collections.defaultdict(float)
  for g, f in gaps: perF[f] = max(perF[f], g)
  return dict(reach=reach, L30=max(L for L, tt in reach.items() if tt <= 1800), F=F, gap=max(gaps), perF=dict(perF), inc=inc, goals=gst['done'], goal_val=gst['val'], bulk=bk['served'], bulk_miss=bk['miss'], bulk_val=bk['val'], gt=gt, hired=sorted(hired), done=t_end if t_end < T_ else None)
