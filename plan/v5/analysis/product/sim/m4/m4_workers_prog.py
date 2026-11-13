"""TR-5 progression re-check WITH workers + Grader (Economy, 2026-10-16). python3 m4_workers_prog.py
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
FARM = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'farm', 'm4')
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
  path, seed, model, T_, workers = args[:5]; O = dict(refill_delay=None, jitter=0.0, skip=0.0, taps=None); O.update(args[5] if len(args) > 5 else {})
  realistic = O['refill_delay'] is not None
  m, R, tiers = setup(path); a0 = R[0]
  ab_s, ab_cd = a0['tc_ability_s'], a0['tc_ability_cd_s']; a1, a2, a3, a4 = a0['tc_ability_w1_price_mult'], a0['tc_ability_w2_lay_mult'], a0['tc_ability_w3_price_mult'], a0['tc_ability_w4_tier_add']
  rng = random.Random(seed); arng = random.Random(seed * 7919 + 1); pois = model == 'casual'; se = 20 if pois else 15; dem = 0.75 if model in ('casual', 'd25') else 1.0
  taps = O['taps'] or (0.5 if pois else 1.0)
  en = {}; low_since = {}
  F = H = V = C = 0; coop = 0.0; basket = 0; coins = 0.0; q = []; nxt = m.row(0)['first_customer_s']; tap_t = 1.0; sell_t = se
  hired = set(); gt = 0; gmult = 1.0; ab_next = None; ab_until = -1; w1_t = w2_t = 0.0
  reach = {0: 0.0}; buys = [(0.0, '-', 0)]; dt = 0.1
  def buy_log(t, k): buys.append((t, k, F))
  for i in range(1, int(T_ / dt) + 1):
    t = round(i * dt, 1); r = m.row(F); ab = t < ab_until
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
      if w in hired: coins = max(0.0, coins - WK[w]['wage'] * F * dt / 60)
    def up(worker_sale):
      g = (1 + (gmult - 1) * {'work': 1.0, 'tired': 0.5, 'asleep': 0.15}[stt('w4')]) + (a4 if ab and gt and stt('w4') != 'asleep' else 0.0)
      p = m.price(F, H, V) * g
      if ab and 'w3' in hired and stt('w3') != 'asleep': p *= a3
      if ab and worker_sale and 'w1' in hired and stt('w1') != 'asleep': p *= a1
      return p
    def sell_to(cands, worker_sale):
      nonlocal basket, coins
      for c_ in cands:
        if basket <= 0: break
        k = min(basket, c_[0]); basket -= k; c_[0] -= k; coins = round(coins + k * up(worker_sale), 2)
        if c_[0] == 0: q.remove(c_)
    if t >= tap_t - 1e-9: tap_t += 1 / taps; k = min(math.floor(coop), int(m.row(C)['eggs_per_tap'])); coop -= k; basket += k
    if 'w2' in hired and stt('w2') != 'asleep' and t >= w2_t: w2_t = t + (2 if stt('w2') == 'work' else 4); k = min(math.floor(coop), int(m.row(C)['eggs_per_tap'])); coop -= k; basket += k
    if 'w1' in hired and stt('w1') != 'asleep' and t >= w1_t and basket > 0:
      w1_t = t + (1 if stt('w1') == 'work' else 3); sell_to([c_ for c_ in list(q) if t - c_[2] >= 2], True)
    if ab_next is not None and t >= ab_next:
      if arng.random() < O['skip']: ab_next = t + ab_cd  # missed this cooldown window
      else: ab_until = t + ab_s; ab_next = t + ab_cd + (arng.uniform(0, O['jitter']) if O['jitter'] else 0.0)
    for w_ in en:
      if en[w_] <= 40 and w_ not in low_since: low_since[w_] = t
    if t >= sell_t - 1e-9:
      sell_t += se; sell_to(list(q), False)
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
  return dict(reach=reach, L30=max(L for L, tt in reach.items() if tt <= 1800), F=F, gap=max(gaps), perF=dict(perF), gt=gt, hired=sorted(hired), done=t_end if t_end < T_ else None)
def job(a): return a, run(a)
if __name__ == '__main__':
  P = '/workspace/egg-farm-studio/product/'
  CSVS = [P + 'economy.f1-m4cols.csv', P + 'economy.m4-candidate.csv']
  CASES = [('s15', 3600, True), ('s15', 3600, False), ('casual', 2700, True), ('casual', 2700, False)]
  J = [(c, s, mo, T, w) for c in CSVS for mo, T, w in CASES for s in range(30)]
  with Pool(8) as p: D = dict(p.map(job, J))
  for c in CSVS:
    for mo, T, w in CASES:
      rs = [D[(c, s, mo, T, w)] for s in range(30)]
      med = lambda L: (lambda v: f'{st.median(v)/60:.2f}' if len(v) == 30 else f'{len(v)}/30 reach')([r['reach'][L] for r in rs if L in r['reach']])
      gw = max(r['gap'][0] for r in rs) / 60; ok3 = sum(r['gap'][0] <= 180 for r in rs)
      g30 = max(max([g for f, g in r['perF'].items() if r['reach'].get(f + 1, 1e9) <= 1800] or [0]) for r in rs) / 60
      pf = collections.defaultdict(float)
      for r in rs:
        for f, g in r['perF'].items(): pf[f] = max(pf[f], g)
      print(f"## {os.path.basename(c)} | {mo} | {T//60} min | workers+Grader {'ON' if w else 'OFF (control)'}")
      print(f"F18 {med(18)} min (in 45: {sum(r['reach'].get(18, 1e9) <= 2700 for r in rs)}/30) | Farm@30:00 med L{st.median(r['L30'] for r in rs):g} | F30 {med(30)} | final F med {st.median(r['F'] for r in rs):g} | Grader tier med {st.median(r['gt'] for r in rs):g} | complete {sum(r['done'] is not None for r in rs)}/30")
      print(f"worst gap {gw:.2f} min, seeds <=3.0 min {ok3}/30 | worst gap per Farm level (s): " + ', '.join(f'F{f}:{g:.0f}' for f, g in sorted(pf.items()) if f >= 10))
