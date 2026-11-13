"""Telemetry reconciliation sim (Economy, 2026-10-16). run_tel = copy of sim/economy_sim.py run_m2 + per-Farm-band
instrumentation: foreground s, coop-full s (coop >= cap), eggs produced, eggs lost at cap (overflow), taps / effective taps.
Proposal-only copy; canonical sim untouched."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from economy_sim import *
import economy_sim as _m
SELL_EVERY = _m.SELL_EVERY; COLL_SHARE = _m.COLL_SHARE
def run_tel(e, policy, seed, T=7200, dt=0.1, sell_every=SELL_EVERY, poisson=False, dem_scale=1.0,
           spec=None, use=('w1', 'w2', 'w3', 'w4'), manage='managed', price_mult=None, taps=None, cap_fn=None):
  B=lambda F: 0 if F<=2 else 1 if F<=7 else 2 if F<=14 else 3 if F<=19 else 4
  tel=[dict(fg=0.0,full=0.0,prod=0.0,lostc=0.0,taps=0,eff=0) for _ in range(5)]
  # taps=(period_s, n): player taps n times (1/s) at the start of every period_s window; None = 1 tap/s
  sp = spec or {}; use = set(use) if sp else set()
  rng = random.Random(seed); c = f = 0; coop = 0.0; basket = 0; coins = 0.0
  q = []; nxt = e.p['first']; tap_t = 1.0; sell_t = sell_every
  reach = {0: 0.0}; buys = []; spawned = lost = partial = lost_full = 0; sold = 0; fees = wages = 0.0
  qfull_ticks = filled = 0  # PT1 diagnostics (no behaviour change)
  hired = {}; energy = {}; last_manage = -1e9; last_sell = 0.0; manages = 0; w1_t = w2_t = 0.0; grade = 1.0; tiers_bought = 0
  w4cost = lambda F: math.floor(sp['w4_cost_share'] * e.fcost(F))
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
    CAP = cap_fn(f) if cap_fn else e.cap(f); b = tel[B(f)]; b['fg'] += dt; add = e.rate(f) * dt; b['prod'] += add
    if coop >= CAP - 1e-9: b['full'] += dt
    b['lostc'] += max(0.0, coop + add - CAP); coop = min(CAP, coop + add)
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
      if taps is None or (taps(tap_t - 1) if callable(taps) else ((tap_t - 2) % taps[0]) < taps[1]):
        m = min(math.floor(coop), e.tap(c)); coop -= m; basket += m; tel[B(f)]['taps'] += 1; tel[B(f)]['eff'] += (m > 0)
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
    if s1 in ('work', 'tired') and t >= w1_t and t - last_sell >= sp['w1'].get('idle_gate', 0) \
        and not (sp['w1'].get('hold_until_servable') and not any(t - x[4] >= sp['w1']['defer'] for x in q)):  # F1 (b): hold turn, no wage, until a customer waited >= min wait (empty basket unchanged)
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
              qfull_ticks=qfull_ticks, ticks=n, filled=filled, tel=tel)

