"""L30-50 late-game curve model (Economy/Balance Designer, 2026-10-16). PROPOSAL ONLY: writes product/economy.l30plus-candidate.csv
(new file); no shipped CSV is touched.  python3 late_curve.py [--iters 4] > late_curve_out.md

Rows L0-29 = economy.f1-m4cols.csv unchanged. Rows L30-50 are extrapolated (linear columns continue their L29->30 step; constants copied)
and the three track costs for L30-49 use ONE smooth geometric growth g from the L29 values, bisected so the median L50 time with workers is ~100 min
(Monte Carlo, 30 seeds); L35/L40 and the no-worker/casual runs are reported against their bands, not fitted.

Candidate L30+ content (assumptions, all multipliers are proposals):
- Farm milestones (new family, on top of the unchanged x7.8 Jumbo x Balanced5 x Grader T5 stack): price x1.10 at L35, x1.25 at L40,
  x1.10 at L45, x1.25 at L50 (cumulative x1.10 / x1.375 / x1.5125 / x1.89). Column farm_ms_price_mult (cumulative).
- L32 second coop wing: coop_capacity x1.5 from L32 (baked into coop_capacity).
- L35 feed mill: passive egg value x1.10 on every sale incl. offline (column feed_mill_price_mult).
- L40 auto-collector: collects eggs_per_tap every 2 s in tab (also when idle in tab; not offline) (column auto_collect_every_s, 0 = none).
- L45 contracts board: +5% on manual player sells only (active content) (column contracts_manual_bonus).
- L50 prestige teaser: no economy effect.
- Hens coop milestones 1.25/1.5/2.0 at H10/20/30 unchanged (no lay effect); Balanced tiers and grades unchanged (max at L25/V20).
- Workers W1-W3 + Grader T5 as in the CSV; abilities v0.3 Activate-all every 300 s for 30 s; workers refilled at visits.
Model = m4_workers_prog-style tick sim (0.2 s), greedy look-ahead best-ROI buyer (bundles up to 2), max level 50."""
import csv, math, random, statistics as st, sys, os, collections
from multiprocessing import Pool
P = '/workspace/egg-farm-studio/product/'
SRC = P + 'economy.f1-m4cols.csv'; OUT = P + 'economy.l30plus-candidate.csv'
MAXL = 50
HVMAX = 55  # v7 HoP decision (a): Hens/Egg value table rows to L55 so F45-50 still has purchases (Farm max stays 50)
MING = float(os.environ.get('MING', '1.0'))
HVS = float(os.environ.get('HVS', '1.0'))  # v6: scale of H/V cost vs farm_cost share for L41-50
CAPX = int(os.environ.get('CAPX', '5'))  # v4 HoP 23:19: Hens/Egg value cap F+5 from L40 (was F+3); table rows stop at 50, so H/V max out at 50 (cap binds F40-44 only)
TARGET = {35: 45.0, 40: 60.0, 50: 100.0}
BUMP_LV = (36, 41, 46)  # +b step on the cost of BUYING these levels (rows 35/40/45) and every later row; v2 2026-10-16
FMS = {35: 1.10, 40: 1.15, 45: 1.10, 50: 1.15}  # v3 2026-10-16 HoP: L40/L50 x1.15
def fms(F): m = 1.0; [m := m * v for L, v in FMS.items() if F >= L]; return m
def feed(F): return 1.10 if F >= 35 else 1.0
def base_rows():
  rows = list(csv.DictReader(open(SRC))); head = list(rows[0].keys())
  R = [{k: float(v) for k, v in r.items()} for r in rows[:30]]
  r29, r30 = {k: float(v) for k, v in rows[29].items()}, {k: float(v) for k, v in rows[30].items()}
  for L in range(30, HVMAX + 1):
    r = {}
    for k in head:
      a, b = r29[k], r30[k]
      if k == 'level': r[k] = L
      elif k in ('farm_cost', 'hens_cost', 'egg_value_cost'): r[k] = 0.0  # calibrated below (one geometric growth from L29)
      elif k == 'collection_cost': r[k] = math.floor(10 * 1.6 ** L)  # rev 2026-10-16 23:5x: same closed form as L0-29 / sync-economy (floor(10 x 1.6^L))
      elif k == 'customer_interval_s': r[k] = b
      elif a == b: r[k] = b
      else: r[k] = round(b + (b - a) * (L - 30), 4)
    r['coop_capacity'] *= 1.5 if L >= 32 else 1.0
    r['offline_eggs_per_sec'] = round(r['eggs_per_sec'] * 0.25, 4); r['offline_max_eggs_2h'] = round(r['offline_eggs_per_sec'] * 7200)
    R.append(r)
  for r in R:
    L = int(r['level']); r['farm_ms_price_mult'] = round(fms(L), 4); r['feed_mill_price_mult'] = feed(L)
    r['auto_collect_every_s'] = 2.0 if L >= 40 else 0.0; r['contracts_manual_bonus'] = 0.05 if L >= 45 else 0.0
  return R, head + ['farm_ms_price_mult', 'feed_mill_price_mult', 'auto_collect_every_s', 'contracts_manual_bonus']
# ---- model ----
def hens_rate(H): return 1.5 if H == 0 else 0.2 * (5 + 5 * H)
def hms(H): return 2.0 if H >= 30 else 1.5 if H >= 20 else 1.25 if H >= 10 else 1.0
def grade(V, F): return 1.5 if (V >= 20 and F >= 15) else 1.25 if V >= 10 else 1.1 if V >= 5 else 1.0
def bal(F, H, V):
  lo = min(F, H, V); return 1.30 if lo >= 25 else 1.25 if lo >= 20 else 1.20 if lo >= 15 else 1.15 if lo >= 10 else 1.10 if lo >= 5 else 1.0
def price(F, H, V): return round((1 + 0.05 * V) * (1 + 0.12 * V) * grade(V, F) * bal(F, H, V) * fms(F) * feed(F), 2)
WK = dict(w1=dict(unlock=3, cost=40, wage=0.25), w2=dict(unlock=7, cost=150, wage=0.5), w3=dict(unlock=8, cost=800, wage=0.0))
def run(args):
  R, seed, workers, T_, model = args
  row = lambda L: R[min(int(L), HVMAX)]
  tiers = []
  for r in R:
    if r['w4_tier'] > (tiers[-1][3] if tiers else 0): tiers.append((int(r['level']), r['w4_price_mult'], r['w4_tier_cost'], r['w4_tier']))
  def cost(k, L, F_=None):  # v5 option (a): H/V levels beyond F+3 (from L40) cost max(table, share x farm_cost[F]) = about one Farm-level interval of income
    if L >= (HVMAX if k in 'hv' else MAXL): return math.inf
    c = row(L)[{'f': 'farm_cost', 'h': 'hens_cost', 'v': 'egg_value_cost', 'c': 'collection_cost'}[k]]
    if k in 'hv' and F_ is not None and F_ >= 40 and L >= F_ + 3: ex = row(F_)['hv_extra_cost_farm_share'] * float(os.environ.get('HV_SHARE_'+k.upper(), os.environ.get('HV_SHARE_SCALE','1'))) * row(F_)['farm_cost'] * (1 + 0.1 * (L - F_ - 3)); c = max(c, ex) if os.environ.get('HV_MAX_ROW', '1') == '1' else ex  # v9 (HoP 2026-10-17 00:28): extra level = max(row cost, share x CURRENT farm_cost x markup); HV_MAX_ROW=0 restores the old replace rule
    return c
  capok = lambda k, s: {'f': s[0] < MAXL, 'c': s[3] < MAXL, 'h': s[1] < min(HVMAX, s[0] + (CAPX if s[0] >= 40 else 3)), 'v': s[2] < min(HVMAX, s[0] + (CAPX if s[0] >= 40 else 3))}[k]
  rng = random.Random(seed); pois = model == 'casual'; se = 20 if pois else 15; dem = 0.75 if pois else 1.0; taps = 0.5 if pois else 1.0
  F = H = V = C = 0; coop = 0.0; basket = 0; coins = 0.0; q = []; nxt = row(0)['first_customer_s']; tap_t = 1.0; sell_t = se
  hired = set(); gt = 0; gm = 1.0; ab_next = None; ab_until = -1; w1_t = w2_t = ac_t = 0.0; dt = 0.2
  reach = {0: 0.0}; buys = [0.0]; noaff = 0.0; waiting = False; last_buy = 0.0
  IDX = dict(f=0, h=1, v=2, c=3)
  def inc(s, w3):
    F_, H_, V_, C_ = s; r = row(F_); d = (r['demand_min'] + r['demand_max']) / 2 / r['customer_interval_s'] * dem * w3
    tap = row(C_)['eggs_per_tap'] * (taps + (0.5 if 'w2' in hired else 0) + (0.5 if r['auto_collect_every_s'] else 0))
    return min(hens_rate(H_), d, tap) * price(F_, H_, V_)
  def choose(s):
    w3 = 1.25 if 'w3' in hired else 1.0; base = inc(s, w3); best = None
    def walk(st_, path, c, depth):
      nonlocal best
      if path:
        g = inc(st_, w3) - base
        if g > 0 and (best is None or g / c > best[0]): best = (g / c, path[0])
      if depth == 0: return
      for k in 'fhvc':
        if capok(k, st_): l = list(st_); l[IDX[k]] += 1; walk(tuple(l), path + [k], c + cost(k, st_[IDX[k]], st_[0]), depth - 1)
    walk(s, [], 0.0, 2)
    return best[1] if best else ('f' if capok('f', s) else None)
  t_end = T_
  NUD = os.environ.get('NUDGE') == '1' and not workers  # rev 00:0x: hire-nudge events (no-workers profiles; never hires, affordability only)
  fq = collections.deque(); fsum = 0; g25q = collections.deque(); g25sum = 0; fh_n = 0; cf_done = g25_done = False; nev = []; pend = []
  WIN = int(row(0)['nudge_coopfull_window_s'] / dt) if NUD else 0
  for i in range(1, int(T_ / dt) + 1):
    t = round(i * dt, 1); r = row(F); ab = t < ab_until
    coop = min(r['coop_capacity'] * hms(H), coop + hens_rate(H) * (1.15 if ab and 'w2' in hired else 1.0) * dt)
    while t >= nxt:
      if len(q) < r['queue_max']: q.append([max(1, round(rng.randint(int(r['demand_min']), int(r['demand_max'])) * dem * (1.25 if 'w3' in hired else 1.0))), nxt + r['customer_patience_s'], nxt])
      nxt = round(nxt + (rng.expovariate(1 / r['customer_interval_s']) if pois else r['customer_interval_s']), 2)
    q = [c_ for c_ in q if c_[1] > t]
    for w in ('w1', 'w2'):
      if w in hired: coins = max(0.0, coins - WK[w]['wage'] * F * dt / 60)
    def up(worker, manual):
      p = price(F, H, V) * (gm + (0.5 if ab and gt else 0.0))
      if ab and 'w3' in hired: p *= 1.15
      if ab and worker and 'w1' in hired: p *= 1.15
      if manual: p *= 1 + r['contracts_manual_bonus']
      return p
    def sell_to(cs, worker, manual):
      nonlocal basket, coins
      for c_ in cs:
        if basket <= 0: break
        k = min(basket, c_[0]); basket -= k; c_[0] -= k; coins += k * up(worker, manual)
        if c_[0] == 0: q.remove(c_)
    tapn = int(row(C)['eggs_per_tap'])
    if t >= tap_t - 1e-9: tap_t += 1 / taps; k = min(math.floor(coop), tapn); coop -= k; basket += k
    if r['auto_collect_every_s'] and t >= ac_t: ac_t = t + r['auto_collect_every_s']; k = min(math.floor(coop), tapn); coop -= k; basket += k
    if 'w2' in hired and t >= w2_t: w2_t = t + 2; k = min(math.floor(coop), tapn); coop -= k; basket += k
    if 'w1' in hired and t >= w1_t and basket > 0: w1_t = t + 1; sell_to([c_ for c_ in list(q) if t - c_[2] >= 2], True, False)
    if ab_next is not None and t >= ab_next: ab_until = t + 30; ab_next = t + 300
    if waiting:
      s = (F, H, V, C); mc = min([cost(k, s[IDX[k]], s[0]) for k in 'fhvc' if capok(k, s)] or [math.inf])
      if coins >= mc: noaff = max(noaff, t - last_buy); waiting = False
    if t >= sell_t - 1e-9:
      sell_t += se; sell_to(list(q), False, True)
      while True:
        if workers:
          w = next((w for w in ('w1', 'w2', 'w3') if w not in hired and F >= WK[w]['unlock'] and coins >= WK[w]['cost']), None)
          if w: coins -= WK[w]['cost']; hired.add(w); buys.append(t); ab_next = t if ab_next is None else ab_next; continue
          nt = next((x for x in tiers if x[3] == gt + 1 and F >= x[0]), None)
          if nt and coins >= nt[2]: coins -= nt[2]; gt += 1; gm = nt[1]; buys.append(t); continue
        s = (F, H, V, C); k = choose(s)
        if not k or coins < cost(k, s[IDX[k]], s[0]): break
        coins -= cost(k, s[IDX[k]], s[0]); buys.append(t); last_buy = t; waiting = True
        if k == 'f': F += 1; reach[F] = t
        elif k == 'h': H += 1
        elif k == 'v': V += 1
        else: C += 1
      if F >= MAXL and H >= HVMAX and V >= HVMAX: t_end = t; break
    if NUD:
      full = coop >= r['coop_capacity'] * hms(H) - 1e-9
      fq.append(full); fsum += full
      if len(fq) > WIN: fsum -= fq.popleft()
      if F >= 25:
        g25q.append(full); g25sum += full
        if len(g25q) > WIN: g25sum -= g25q.popleft()
      w1c, w2c = WK['w1']['cost'], WK['w2']['cost']
      if fh_n < row(0)['nudge_max_dismissals'] and F >= (WK['w1']['unlock'] if fh_n == 0 else row(0)['nudge_rearm_farm']) and coins >= w1c:
        fh_n += 1; nev.append(dict(kind='first_hire', t=t, F=F, coins=round(coins, 2))); pend.append((nev[-1], w1c))
      if not cf_done and F >= row(0)['nudge_coopfull_min_farm'] and len(fq) == WIN and fsum / WIN > row(0)['nudge_coopfull_share']:
        cf_done = True; nev.append(dict(kind='coop_full', t=t, F=F, coins=round(coins, 2))); pend.append((nev[-1], w2c))
      if not g25_done and len(g25q) == WIN and g25sum / WIN > row(0)['nudge_coopfull_share']:
        g25_done = True; nev.append(dict(kind='coop_full_gate_L25', t=t, F=F, coins=round(coins, 2))); pend.append((nev[-1], w2c))
      if F >= 25 and not hired and not any(e['kind'] == 'nudge_f25_noworker' for e in nev):  # L30-19b: first reach Farm L25 with 0 workers → named hire-nudge event
        nev.append(dict(kind='nudge_f25_noworker', t=t, F=F, coins=round(coins, 2))); pend.append((nev[-1], w2c))  # next hire affordability = Coop Hand $150 (w2)
      for e, c_ in list(pend):
        if coins >= c_: e['afford_s'] = round(t - e['t'], 1); pend.remove((e, c_))
  gaps = [b - a for a, b in zip(buys, buys[1:] + [t_end])]
  return dict(buys=buys, reach=reach, gap=max(gaps), noaff=noaff, nudges=nev if NUD else [], F=F)
def mc(R, workers, seeds=30, T_=150 * 60, model='s15', pool=None):
  return pool.map(run, [(R, s, workers, T_, model) for s in range(seeds)])
def summarise(rs, T_=150 * 60):
  med = lambda L: st.median([r['reach'].get(L, math.inf) for r in rs]) / 60
  lv = {L: med(L) for L in range(18, MAXL + 1)}
  per = {L: lv[L] - lv[L - 1] for L in range(19, MAXL + 1) if lv[L] < math.inf and lv[L - 1] < math.inf}
  worst_ratio = max(((per[L] / per[L - 1]), L) for L in per if L - 1 in per and per[L - 1] > 0) if len(per) > 1 else (0, 0)
  per_seed = []
  sr = []  # per-seed clear-time ratio, every level L31-50 (step to reach L vs step to reach L-1); steps < 30 s floored at 30 s
  for r in rs:
    rc = r['reach']; per_seed.append([])
    for L in range(31, MAXL + 1):
      if L in rc and L - 1 in rc and L - 2 in rc:
        if rc[L - 1] - rc[L - 2] < 60: continue  # HoP 23:30: ratio counts only when the previous level took >= 1 min
        a_, b_ = max(30.0, rc[L - 1] - rc[L - 2]), max(30.0, rc[L] - rc[L - 1]); sr.append((b_ / a_, L)); per_seed[-1].append((b_ / a_, L))
  ps = sorted(max([x[0] for x in sr_s] or [0]) for sr_s in per_seed)
  gs = sorted(r['gap'] / 60 for r in rs)
  p95 = lambda v: v[min(len(v) - 1, math.ceil(0.95 * len(v)) - 1)] if v else 0
  std = dict(ratio_p95=p95(ps), ratio_worst=ps[-1] if ps else 0, gap_p95=p95(gs), gap_worst=gs[-1])
  ap = []  # (c) diagnostic: ratio of consecutive purchase gaps (any purchase, 30 s floor), from L30 on, per-seed worst
  for r in rs:
    t30 = r['reach'].get(30, math.inf); g_ = [max(30.0, b - a) for a, b in zip(r['buys'], r['buys'][1:]) if a >= t30]
    ap.append(max([y / x for x, y in zip(g_, g_[1:])] or [0]))
  ap.sort(); std['allbuy_ratio_p95'] = p95(ap); std['allbuy_ratio_worst'] = ap[-1] if ap else 0
  std['pass'] = std['ratio_p95'] <= 2.0 and std['ratio_worst'] <= 2.25 and std['gap_p95'] <= 4.0 and std['gap_worst'] <= 4.0
  return dict(std=std, lv=lv, per=per, ratio=worst_ratio, seed_ratio=max(sr) if sr else (0, 0), seed_ratios=sr, gap=max(r['gap'] for r in rs) / 60, noaff=max(r['noaff'] for r in rs), n50=sum(MAXL in r['reach'] for r in rs))
def set_geo(R, g):
  for k in ('farm_cost', 'hens_cost', 'egg_value_cost'):
    for L in range(30, HVMAX + 1): R[L][k] = math.floor(R[29][k] * g ** (L - 29))
def set_geo2(R, g1, g2, b):
  base = {k: R[29][k] for k in ('farm_cost', 'hens_cost', 'egg_value_cost')}
  for k in base:
    for L in range(30, HVMAX + 1):
      c = base[k] * g1 ** (min(L, 40) - 29) * g2 ** max(0, L - 40)
      c *= (1 + b) ** sum(L + 1 >= x for x in BUMP_LV)  # persistent step: +b from the purchase of L36 / L41 / L46 onwards
      R[L][k] = math.floor(c)
  fix(R)
def calibrate2(R, b, pool, it1=4, it2=4):
  """v2: split growth. g1 (L30-40) bisected so median L40 = 65 min, then g2 (L41-50) so median L50 = 100 min."""
  lo, hi = 1.00, 1.20; g2 = 1.12
  for i in range(it1):
    g1 = (lo + hi) / 2; set_geo2(R, g1, g2, b); s = summarise(mc(R, True, pool=pool))
    print(f'b {b:.2f} g1 {g1:.4f}: L35 {s["lv"][35]:.1f} L40 {s["lv"][40]:.1f}', file=sys.stderr)
    if s['lv'][40] > 65: hi = g1
    else: lo = g1
  g1 = (lo + hi) / 2; lo, hi = 1.00, 1.30
  for i in range(it2):
    g2 = (lo + hi) / 2; set_geo2(R, g1, g2, b); s = summarise(mc(R, True, pool=pool))
    print(f'b {b:.2f} g1 {g1:.4f} g2 {g2:.4f}: L35 {s["lv"][35]:.1f} L40 {s["lv"][40]:.1f} L50 {s["lv"][50]:.1f} seed-ratio {s["seed_ratio"][0]:.2f}@L{s["seed_ratio"][1]} gap {s["gap"]:.2f}', file=sys.stderr)
    if s['lv'][50] > 100: hi = g2
    else: lo = g2
  g2 = (lo + hi) / 2; set_geo2(R, g1, g2, b); s = summarise(mc(R, True, pool=pool))
  print(f'FINAL b {b:.2f} g1 {g1:.4f} g2 {g2:.4f}: L35 {s["lv"][35]:.1f} L40 {s["lv"][40]:.1f} L50 {s["lv"][50]:.1f} seed-ratio {s["seed_ratio"][0]:.2f}@L{s["seed_ratio"][1]} gap {s["gap"]:.2f}', file=sys.stderr)
  return g1, g2, s
def handtune(R, pool, iters=8, k_hv=None):
  """v6 (HoP hand-tune): per-level farm_cost (row L-1 buys level L) for L31-50 so the median Farm-level time is flat ~2.17 min
  over L31-40 (keeps L35 <= 54, L40 ~64.5) and rises linearly 3.0 -> 4.0 min over L41-50 (L50 ~100). Hens/Egg value rows L41-50
  re-priced at HVS x the L40 share of farm_cost; the F+3..F+5 extras cost hv_extra_cost_farm_share x CURRENT farm_cost."""
  T = {L: 2.17 for L in range(31, 41)}; T.update({L: 3.0 + (L - 41) / 9.0 for L in range(41, 51)})
  sh = {k: R[40][k] / R[40]['farm_cost'] for k in ('hens_cost', 'egg_value_cost')}
  def hv():
    for L in range(41, MAXL):
      for k in sh: R[L][k] = math.floor(R[L]['farm_cost'] * sh[k] * HVS)
    # v7: rows 50-55. Row 49 is the last BOUGHT Farm row; rows 50+ farm_cost are never purchasable (Farm max 50) and only continue the
    # L41-49 geometric growth so the H/V share pricing (same sh x HVS as L41-49) has a smooth base and costs stay strictly rising.
    gF = (R[49]['farm_cost'] / R[40]['farm_cost']) ** (1 / 9)
    for L in range(50, HVMAX + 1):
      R[L]['farm_cost'] = math.floor(R[49]['farm_cost'] * gF ** (L - 49))
      for k in sh: R[L][k] = math.floor(R[L]['farm_cost'] * sh[k] * HVS)
    fix(R)
  for it in range(iters):
    hv(); sm = summarise(mc(R, True, pool=pool))
    per = {L: sm['lv'][L] - sm['lv'][L - 1] for L in T}
    print(f"hand {it + 1}: L35 {sm['lv'][35]:.1f} L40 {sm['lv'][40]:.1f} L50 {sm['lv'][50]:.1f} per " + ' '.join(f'{per[L]:.2f}' for L in T) + f" | ratio P95 {sm['std']['ratio_p95']:.2f} worst {sm['std']['ratio_worst']:.2f} gap P95 {sm['std']['gap_p95']:.2f}", file=sys.stderr)
    for L in T: R[L - 1]['farm_cost'] = math.floor(R[L - 1]['farm_cost'] * (T[L] / max(0.3, per[L])) ** 0.6)
    fix(R)
  hv()
def calibrate(R, iters, pool):
  """One smooth geometric growth g for all three track costs from L29 (no per-level jumps), bisected so that the
  median L50 time with workers hits ~100 min; L35/L40 are then checked against their +-20% bands."""
  lo, hi = 1.00, 1.30
  for it in range(iters):
    g = (lo + hi) / 2; set_geo(R, g); s = summarise(mc(R, True, pool=pool))
    t50 = s['lv'][50]
    print(f'bisect {it + 1}: g {g:.4f} -> L30 {s["lv"][30]:.1f} L35 {s["lv"][35]:.1f} L40 {s["lv"][40]:.1f} L50 {t50:.1f} min', file=sys.stderr)
    if t50 > TARGET[50]: hi = g
    else: lo = g
  set_geo(R, lo); fix(R)
  print(f'chosen g {lo:.4f}', file=sys.stderr)
def fix(R):
  for k in ('farm_cost', 'hens_cost', 'egg_value_cost'):
    for L in range(30, HVMAX + 1):
      R[L][k] = max(R[L][k], math.floor(R[L - 1][k] * (MING if k == 'farm_cost' else 1.0)) + 1)  # strictly rising (v6: farm >= +MING per level, no flat plateaus)
def write(R, head):
  src = list(csv.reader(open(SRC))); hs = src[0]  # rev: rows L0-29 copied verbatim (string-exact) from SRC; + farm_max_level, hv_extra_second_markup
  head = [h for h in head if h not in ('farm_max_level', 'hv_extra_second_markup')] + ['farm_max_level', 'hv_extra_second_markup']
  with open(OUT, 'w', newline='') as f:
    w = csv.writer(f, lineterminator='\n'); w.writerow(head)
    for r in R:
      r['farm_max_level'] = MAXL; r['hv_extra_second_markup'] = 0.1
      cells = [(int(r[k]) if float(r[k]).is_integer() else r[k]) for k in head]
      if int(r['level']) < 30: cells = src[int(r['level']) + 1] + cells[len(hs):]
      w.writerow(cells)
def windows(R):
  """Active (seller15 + ALL stack + abilities v0.3, m4_active.window) vs in-tab idle at F30/40/50, H=V=F, C=F-3, 10 min, 30 seeds,
  with the L30+ candidate rows, Farm milestones/feed mill on price, auto-collector modelled as W2 every 1 s (in tab, both players);
  contracts bonus on manual sells. Offline 2 h = offline_eggs_per_sec x 7200 x hens offline mult x price (no Grader)."""
  sys.path.insert(0, P + 'sim/m4'); import m4_active as a, m4_final_run as fr
  a.R[:] = R; base_price = a.price
  a.price = lambda F, H, V, C, tr: round(base_price(F, H, V, C, tr) * fms(F) * feed(F), 2) if tr else base_price(F, H, V, C, tr)
  X = dict(fr.X['ALL_st0.4'], ab2=True); out = []
  for F in (30, 40, 50):
    a.SP['w2']['every'] = 1 if F >= 40 else 2
    act = st.mean(a.window(F, F, F, F - 3, 'seller15', dict(X, cb=X['cb'] + R[F]['contracts_manual_bonus']), s, fr.TR) for s in range(30))
    actw = max(a.window(F, F, F, F - 3, 'seller15', X, s, fr.TR) / a.window(F, F, F, F - 3, 'idle', {}, s, fr.TR) for s in range(30))
    idl = st.mean(a.window(F, F, F, F - 3, 'idle', {}, s, fr.TR) for s in range(30))
    pr = a.price(F, F, F, F - 3, fr.TR); off = R[F]['offline_eggs_per_sec'] * 7200 * hms(F) * pr / 7200
    out.append((F, act, idl, act / idl, actw, pr, off, act / off))
  a.SP['w2']['every'] = 1
  for F, HV in ((40, 45), (44, 49), (50, 55)):  # v4: F+5 caps -> H/V above F; worst-seed and P95 active/idle
    rr = sorted(a.window(F, HV, HV, F - 3, 'seller15', X, s, fr.TR) / a.window(F, HV, HV, F - 3, 'idle', {}, s, fr.TR) for s in range(30))
    out.append((f'{F} (H=V={HV})', st.mean(rr), rr[min(len(rr) - 1, math.ceil(0.95 * len(rr)) - 1)], rr[-1]))
  a.SP['w2']['every'] = 2
  return out
if __name__ == '__main__':
  iters = int(sys.argv[sys.argv.index('--iters') + 1]) if '--iters' in sys.argv else 4
  R, head = base_rows()
  XS = [float(x) for x in sys.argv[sys.argv.index('--xk') + 1].split(',')] if '--xk' in sys.argv else [1.0]
  BS = [float(x) for x in sys.argv[sys.argv.index('--bumps') + 1].split(',')] if '--bumps' in sys.argv else [0.08]
  with Pool(6) as pool:
    best = None
    for xk in XS:
     for L in range(len(R)): R[L]['hv_extra_cost_farm_share'] = xk if L >= 40 else 0.0
     for b in BS:
      g1, g2, s0 = calibrate2(R, b, pool)
      d = s0['std']; print(f'STD xk {xk:.2f} b {b:.2f}: allbuy P95 {d["allbuy_ratio_p95"]:.2f} ratio P95 {d["ratio_p95"]:.2f} worst {d["ratio_worst"]:.2f} gap P95 {d["gap_p95"]:.2f} worst {d["gap_worst"]:.2f} L35 {s0["lv"][35]:.1f} pass {d["pass"]}', file=sys.stderr)
      key = (not d['pass'], s0['lv'][35] > 54, max(d['ratio_p95'] / 2.0, d['gap_p95'] / 3.0))
      if best is None or key < best[0]: best = (key, b, g1, g2, xk)
    _, B, G1, G2, XK = best
    if '--handtune' in sys.argv:
      for L in range(len(R)): R[L]['hv_extra_cost_farm_share'] = XK if L >= 40 else 0.0
      set_geo2(R, G1, G2, B); handtune(R, pool, int(sys.argv[sys.argv.index('--handtune') + 1]))
    for L in range(len(R)): R[L]['hv_extra_cost_farm_share'] = XK if L >= 40 else 0.0
    if '--handtune' not in sys.argv: set_geo2(R, G1, G2, B)
    if 'hv_extra_cost_farm_share' not in head: head.append('hv_extra_cost_farm_share')
    for L in range(len(R)):
      if L >= 40: R[L]['hens_cap_over_farm'] = R[L]['egg_value_cap_over_farm'] = CAPX
    print(f'chosen xk {XK:.2f} b {B:.2f} g1 {G1:.4f} g2 {G2:.4f}', file=sys.stderr)
    write(R, head)
    sw = summarise(mc(R, True, pool=pool, seeds=100)); sn = summarise(mc(R, False, pool=pool, T_=200 * 60, seeds=100))
    sc = summarise(mc(R, True, pool=pool, model='casual', T_=200 * 60, seeds=100))
  print(f'# L30-50 candidate curves v7 (H/V rows to L55, HoP (a)) on v6 hand-tuned L41-50 (milestones x1.10/x1.15/x1.10/x1.15, H/V cap F+5 from L40, HoP P95 standard, final eval 100 seeds) (late_curve.py), 30 seeds, greedy buyer: g1 {G1:.4f} (L30-40), g2 {G2:.4f} (L41-50), +{B:.0%} persistent step from buying L36/L41/L46, H/V beyond F+3 cost {XK:.2f} x farm_cost[F] x (1 + 0.1 x (extra-1))\n')
  print('| level | farm_cost | hens_cost | egg_value_cost | farm_ms | min to reach (workers) | per-level min (workers) | min (no workers) | min (casual+workers) |')
  print('|---|---|---|---|---|---|---|---|---|')
  for L in range(28, HVMAX + 1):
    f = lambda d, L: '—' if d.get(L, math.inf) == math.inf else f'{d[L]:.1f}'
    print(f"| {L} | {int(R[L]['farm_cost'])} | {int(R[L]['hens_cost'])} | {int(R[L]['egg_value_cost'])} | {R[L]['farm_ms_price_mult']} | {f(sw['lv'], L)} | {f(sw['per'], L)} | {f(sn['lv'], L)} | {f(sc['lv'], L)} |")
  for nm, s in (('workers', sw), ('no workers', sn), ('casual+workers', sc)):
    print(f"\n{nm}: worst per-seed clear-time ratio L31-50 (prev level >= 1 min only) = {s['seed_ratio'][0]:.2f} at L{s['seed_ratio'][1]}; seeds-level pairs > 2x: {sum(x[0] > 2 for x in s['seed_ratios'])}/{len(s['seed_ratios'])}")
    d = s['std']; print(f"{nm}: HoP standard: clear-time ratio P95 {d['ratio_p95']:.2f} (<=2.0) worst {d['ratio_worst']:.2f} (<=2.25); gap P95 {d['gap_p95']:.2f} (<=4 gate, ideal <=3) worst {d['gap_worst']:.2f} (<=4) -> {'PASS' if d['pass'] else 'FAIL'}")
    print(f"{nm}: (c) diagnostic, all-purchase gap ratio from L30: P95 {d['allbuy_ratio_p95']:.2f} worst {d['allbuy_ratio_worst']:.2f}")
    print(f"{nm}: worst per-level time ratio L19+ = {s['ratio'][0]:.2f} at L{s['ratio'][1]}; worst purchase gap {s['gap']:.2f} min; worst wait until anything affordable {s['noaff']:.0f} s; reached L50 {s['n50']}/30")
  mono = all(R[L]['farm_cost'] < R[L + 1]['farm_cost'] and R[L]['hens_cost'] < R[L + 1]['hens_cost'] and R[L]['egg_value_cost'] < R[L + 1]['egg_value_cost'] for L in range(0, HVMAX))
  ones = [(k.split('_')[0], L) for k in ('farm_cost', 'hens_cost', 'egg_value_cost') for L in range(30, HVMAX) if R[L + 1][k] - R[L][k] <= 1]
  print(f'\nPOLISH +$1 cost steps (row L -> L+1): {len(ones)}: ' + ', '.join(f'{k}@{L}' for k, L in ones))
  print(f'\nmonotonic (strictly rising L0-55, all three track costs): {mono}')
  print('\n## Active / idle / offline at H=V=F (10-min window, 30 seeds)\n| F | price/egg | active $/s | in-tab idle $/s | active/idle mean | worst seed | offline 2 h $/s | active/offline |\n|---|---|---|---|---|---|---|---|')
  for x in windows(R):
    if len(x) == 4: print(f'\nF+5 cap check {x[0]}: active/idle mean {x[1]:.2f}, P95 {x[2]:.2f}, worst {x[3]:.2f}'); continue
    F, act, idl, r, rw, pr, off, ro = x
    print(f'| {F} | {pr:.2f} | {act:.0f} | {idl:.0f} | {r:.2f} | {rw:.2f} | {off:.0f} | {ro:.1f} |')
