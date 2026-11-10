"""M4 market / worker-mode / pause / golden-egg modelling (Economy/Balance Designer, 2026-10-16).
Imports product/sim/economy_sim.py (NOT edited). run_m4 = copy of economy_sim.run_m2 + M4 hooks (all default off ->
identical to run_m2). Base: CURRENT (P1q/P3) + M2_CURRENT (P4, wage carry). economy.csv / game/ untouched.
Usage: python3 m4_sim.py [--seeds 30] > m4_out.md
"""
import sys, math, random, copy, argparse, statistics as st
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim'); import economy_sim as m
from multiprocessing import Pool
cents = m.cents
DEF = dict(cb=0.0, focus=0.0, focus_cards=0, wmode='bulk', wfocus_every=2, wfocus_prem=0.05, wfocus_drain=1.5,
           walk_fee=0.0, pause=None, pause_at=40, resume_at=100, pause_rec=0.5,
           egg=False, egg_unlock=6, egg_first=45, egg_gap=(90, 180), egg_life=30, egg_catch=1.0, egg_p=(0.45, 0.35, 0.20),
           egg_cash_s=45, egg_fr_mult=3, egg_fr_s=20, egg_free_s=60, egg_fr_capx=1.0, egg_cash_cap_bank=False,
           mh_hold=None,  # F1 (b) opt-in: seconds a customer must wait before W1 takes (and pays for) a turn; copy of economy_sim hold_until_servable/defer
           ab=(), ab_dur=30, ab_cd=300, ab_w1_every=0.5, ab_w2_mult=2.0, ab_w3_dem=1.5, ab_w4_add=0.5,
           ab_v2=False, ab_w1_price=1.0, ab_w2_lay=1.0, ab_w3_price=1.0)  # spec v0.2: Rush = price x on W1 sales, Sweep = laying x, Shout = price x on all sales (v1 effects off when ab_v2)  # M4 abilities (managed only, Activate-all on cooldown at visits)

def run_m4(e, policy, seed, T=7200, dt=0.1, sell_every=m.SELL_EVERY, poisson=False, dem_scale=1.0,
           spec=None, use=('w1', 'w2', 'w3', 'w4'), manage='managed', taps=None, x=None):
  X = dict(DEF, **(x or {}))
  sp = spec or {}; use = set(use) if sp else set()
  rng = random.Random(seed); erng = random.Random(seed * 7919 + 1)  # golden egg rng separate: no effect on customers
  c = f = 0; coop = 0.0; basket = 0; coins = 0.0
  q = []; nxt = e.p['first']; tap_t = 1.0; sell_t = sell_every
  reach = {0: 0.0}; spawned = lost = partial = lost_full = 0; sold = 0; fees = wages = 0.0; filled = 0
  hired = {}; energy = {}; last_manage = -1e9; last_sell = 0.0; manages = 0; w1_t = w2_t = 0.0; grade = 1.0; tiers_bought = 0
  w4cost = lambda F: math.floor(sp['w4_cost_share'] * e.fcost(F))
  income_log = []; wcarry = {}; paused = set(); walk_paid = 0.0; min_coins_after = 1e18
  egg_next = None; egg_on = None; egg_stats = dict(spawn=0, caught=0, cash=0.0, free=0.0, fr_prod=0.0, fr_lost=0.0, fr_bylvl={}); fr_until = -1
  def pay(wg, w):
    if not sp.get('wage_carry'): return cents(wg)
    a = wcarry.get(w, 0.0) + wg; cc = math.floor(a * 100 + 1e-9) / 100; wcarry[w] = a - cc; return cc
  unpaid = set(); UNP = sp.get('unpaid_rule', False)
  ab_until = {}; ab_next = {}; ab_uses = {}
  defer1 = X['mh_hold'] if X['mh_hold'] is not None else (sp['w1']['defer'] if sp else 0)
  def abon(w): return t < ab_until.get(w, -1) and state(w) in ('work', 'tired')
  def wage_min(w): return sp[w].get('wage_per_f_min', 0) * f if isinstance(sp[w], dict) else 0
  def state(w):
    if w not in hired: return 'none'
    if w in paused: return 'paused'
    if w in unpaid: return 'unpaid'
    en = energy[w]; return 'work' if en >= sp['tired_below'] else ('tired' if en > 0 else 'asleep')
  def earn(g):
    nonlocal coins; coins = cents(coins + g)
  n = int(round(T / dt))
  for i in range(1, n + 1):
    t = round(i * dt, 1)
    for w in hired:
      s_ = state(w)
      if s_ in ('asleep', 'unpaid') and ab_until.get(w, -1) > t: ab_until[w] = t  # AC-A6: ends early, cooldown keeps running
      if s_ == 'paused': energy[w] = min(100.0, energy[w] + X['pause_rec'] * dt / sp['drain_s_per_pct'])
      elif s_ not in ('asleep', 'unpaid'):
        k = X['wfocus_drain'] if (w == 'w1' and X['wmode'] == 'focus') else 1
        energy[w] = max(0.0, energy[w] - k * dt / sp['drain_s_per_pct'])
    # golden egg
    if X['egg']:
      if egg_next is None and f >= X['egg_unlock']: egg_next = t + X['egg_first']
      if egg_next is not None and egg_on is None and t >= egg_next:
        egg_stats['spawn'] += 1
        caught = erng.random() < X['egg_catch']
        egg_on = (t + erng.uniform(0, X['egg_life']), True) if caught else (t + X['egg_life'], False)
      if egg_on and t >= egg_on[0]:
        egg_next = t + erng.uniform(*X['egg_gap'])
        if egg_on[1]:
          egg_stats['caught'] += 1; r_ = erng.random(); p = X['egg_p']
          unit0 = e.price(f, c) * grade
          if r_ < p[0]:
            g = X['egg_cash_s'] * e.rate(f) * unit0
            if X['egg_cash_cap_bank']: g = min(g, coins)
            g = cents(g); earn(g); egg_stats['cash'] += g; income_log.append((t, f, g))
          elif r_ < p[0] + p[1]: fr_until = t + X['egg_fr_s']
          else:
            k = math.floor(X['egg_free_s'] * e.rate(f)); basket += k; egg_stats['free'] += k
        egg_on = None
    fr = t < fr_until
    rate = e.rate(f) * (X['egg_fr_mult'] if fr else 1) * (X['ab_w2_lay'] if (X['ab_v2'] and abon('w2')) else 1); capv = e.cap(f) * (X['egg_fr_capx'] if fr else 1)
    if fr:
      extra = (rate - e.rate(f)) * dt; room = max(0.0, capv - coop); add = min(room, rate * dt)
      lostx = max(0.0, rate * dt - room)  # overflow during frenzy (attributed to frenzy; base overflow would also be lost)
      egg_stats['fr_prod'] += extra; egg_stats['fr_lost'] += min(extra, lostx)
      b = egg_stats['fr_bylvl'].setdefault(f, [0.0, 0.0]); b[0] += extra; b[1] += min(extra, lostx)
      coop = coop + add
    else: coop = min(capv, coop + rate * dt)
    if coop > e.cap(f) and not fr: coop = float(e.cap(f))
    if any(x_[1] <= t for x_ in q):
      for x_ in q:
        if x_[1] <= t:
          if x_[3]: partial += 1
          else: lost += 1
          if X['walk_fee'] and x_[0] > 0:  # walkout fee on unserved remainder, coins floor $0
            fee_ = cents(min(coins, X['walk_fee'] * x_[0] * e.price(f, c))); coins = cents(coins - fee_); walk_paid += fee_
      q = [x_ for x_ in q if x_[1] > t]
    if t >= nxt:
      gap = rng.expovariate(1 / e.iv(f)) if poisson else e.iv(f)
      nxt = round(t + max(dt, gap), 2); spawned += 1
      s3 = state('w3'); dm = dem_scale * (X['ab_w3_dem'] if (abon('w3') and not X['ab_v2']) else sp['w3']['demand'] if s3 == 'work' else sp['w3']['tired_demand'] if s3 == 'tired' else 1)
      qm = e.qmax(f)
      if len(q) < qm: N = max(1, round(rng.randint(e.dmin(f), e.dmax(f)) * dm)); q.append([N, t + e.p['patience'], f, 0, t, N])
      else: lost += 1; lost_full += 1
    if t >= tap_t:
      tap_t += 1
      if taps is None or ((tap_t - 2) % taps[0]) < taps[1]:
        mm = min(math.floor(coop), e.tap(c)); coop -= mm; basket += mm
    if unpaid:
      k = sp.get('unpaid_resume_wage_min', 1)
      reserve = sum(k * wage_min(x_) for x_ in hired if state(x_) in ('work', 'tired'))
      for w in ('w1', 'w2', 'w3', 'w4'):
        if w not in unpaid: continue
        if coins < reserve + k * wage_min(w): break
        unpaid.discard(w); reserve += k * wage_min(w)
    s2 = state('w2')
    if s2 in ('work', 'tired') and t >= w2_t:
      w2_t = t + (sp['w2']['every'] if s2 == 'work' else sp['w2']['tired_every']) / (X['ab_w2_mult'] if (abon('w2') and not X['ab_v2']) else 1)
      mm = min(math.floor(coop), e.tap(c)); coop -= mm; basket += mm
      wg = sp['w2']['wage_per_f_min'] * f * (w2_t - t) / 60
      if UNP and coins < wg: unpaid.add('w2')
      else: wg = min(wg, coins); coins = cents(coins - pay(wg, 'w2')); wages += wg
    s4 = state('w4'); gr_ = grade + (X['ab_w4_add'] if abon('w4') else 0); gm = gr_ if s4 == 'work' else (1 + (gr_ - 1) / 2 if s4 == 'tired' else 1 + (grade - 1) * sp.get('w4_asleep_keep', 0.0))
    unit = e.price(f, c) * gm
    by_w1_ = [False]
    def sell(x_, prem, fee_share=0.0):
      nonlocal basket, sold, coins, fees, filled
      k = min(basket, x_[0]); basket -= k; x_[0] -= k; x_[3] = 1; sold += k
      pm_ = (X['ab_w3_price'] if (X['ab_v2'] and abon('w3')) else 1) * (X['ab_w1_price'] if (X['ab_v2'] and by_w1_[0] and abon('w1')) else 1)
      g = cents(k * unit * (1 + prem) * pm_)
      if x_[0] == 0 and X['cb']: g = cents(g + X['cb'] * x_[5] * unit)
      fee = cents(g * fee_share); fees += fee; coins = cents(coins + g - fee); income_log.append((t, f, g - fee))
      if x_[0] == 0: q.remove(x_); filled += 1
    pt = t >= sell_t
    if pt:
      sell_t += sell_every
      # manual serve: bulk "Sell all" (no premium) or focus = per-card taps on the first focus_cards customers at +focus
      if X['focus_cards']:
        for x_ in q[:X['focus_cards']]:
          if basket <= 0: break
          sell(x_, X['focus'])
      else:
        for x_ in q[:]:
          if basket <= 0: break
          sell(x_, 0.0)
      # B2 pause rules (player acts at visits)
      P = X['pause']
      if P and hired:
        tgt = [w for w in hired if w in ('w1', 'w2')] if P in ('yawn12', 'lowdemand') else list(hired)
        for w in tgt:
          if P == 'lowdemand':
            idle_ = (not q) if w == 'w1' else (basket >= 2 * e.tap(c) * sell_every)  # W2 idle if basket already stocked
            (paused.add if idle_ else paused.discard)(w)
          else:
            if w not in paused and energy[w] <= X['pause_at']: paused.add(w)
            elif w in paused and energy[w] >= X['resume_at']: paused.discard(w)
      if manage == 'managed' and hired and t - last_manage >= sp['manage_cd']:
        excl = set(hired) if P == 'yawn' else ({'w1', 'w2'} if P == 'yawn12' else set())
        low = [w for w in hired if energy[w] <= sp.get('manage_at', sp['tired_below']) and w not in excl]
        if low:
          if sp.get('manage_all') and (len(hired) if sp.get('manage_all_unlock_by_hired') else len(low)) >= sp.get('manage_all_min_workers', 3):
            for w in low: energy[w] = 100.0
          else: energy[min(low, key=lambda w: energy[w])] = 100.0
          last_manage = t; manages += 1
      if manage == 'managed' and X['ab']:  # Activate-all: every eligible (hired, not paused/asleep/unpaid, off cooldown)
        for w in X['ab']:
          if w in hired and state(w) in ('work', 'tired') and t >= ab_next.get(w, -1):
            ab_until[w] = t + X['ab_dur']; ab_next[w] = t + X['ab_cd']; ab_uses[w] = ab_uses.get(w, 0) + 1
    s1 = state('w1')
    if pt: last_sell = t
    fm_ = X['wmode'] == 'focus'
    ev = (X['wfocus_every'] if fm_ else sp['w1']['every']) if s1 == 'work' else (X['wfocus_every'] * sp['w1']['tired_every'] / sp['w1']['every'] if fm_ else sp['w1'].get('tired_every')) if s1 == 'tired' else None
    if s1 in ('work', 'tired') and abon('w1') and not X['ab_v2']: ev = ev * X['ab_w1_every'] / sp['w1']['every']
    if s1 in ('work', 'tired') and t >= w1_t and not (X['mh_hold'] is not None and not any(t - x_[4] >= defer1 for x_ in q)):
      w1_t = t + ev
      wg = sp['w1'].get('wage_per_f_min', 0) * f * (w1_t - t) / 60
      if UNP and coins < wg: unpaid.add('w1'); s1 = 'unpaid'
      else: wg = min(coins, wg); coins = cents(coins - pay(wg, 'w1')); wages += wg
      if s1 != 'unpaid':
        for x_ in (q[:1] if fm_ else q[:]):
          if basket <= 0: break
          if t - x_[4] < defer1: continue
          by_w1_[0] = True; sell(x_, X['wfocus_prem'] if fm_ else 0.0, sp['w1']['fee']); by_w1_[0] = False
    if pt:
      min_coins_after = min(min_coins_after, coins) if t > 600 else min_coins_after
      while True:
        bought = False
        for w in ('w1', 'w2', 'w3'):
          if w in use and w not in hired and f >= sp[w]['unlock'] and coins >= sp[w]['cost']:
            coins = cents(coins - sp[w]['cost']); hired[w] = 1; energy[w] = 100.0; bought = True
        if 'w4' in use and tiers_bought < len(sp['w4']) and f >= sp['w4'][tiers_bought][0]:
          cost = w4cost(sp["w4"][tiers_bought][0])
          if coins >= cost:
            coins = cents(coins - cost); grade = sp['w4'][tiers_bought][1]; tiers_bought += 1
            if 'w4' not in hired: hired['w4'] = 1; energy['w4'] = 100.0
            bought = True
        fc = e.fcost(f) if f < 30 else float('inf'); cc = e.ccost(c) if c < 30 else float('inf')
        if policy == 'seller15':
          kind = 'f' if coins >= fc else ('c' if coins >= cc and cc <= m.COLL_SHARE * fc else None)
        else:
          kind = ('c' if cc <= fc else 'f') if coins >= min(cc, fc) else None
        if kind == 'f': coins = cents(coins - fc); f += 1; reach[f] = t
        elif kind == 'c': coins = cents(coins - cc); c += 1
        if not kind and not bought: break
  return dict(reach=reach, f=f, coins=coins, lost=lost, lost_full=lost_full, partial=partial, spawned=spawned, sold=sold, fees=fees,
              wages=wages, income=income_log, manages=manages, filled=filled, egg=egg_stats, walk=walk_paid, minc=min_coins_after,
              earned=sum(g for _, _, g in income_log), ab_uses=ab_uses)

MODELS = {'seller15': dict(policy='seller15'), 'cheapest': dict(policy='cheapest'),
          'casual': dict(policy='seller15', **m.CASUAL), 'slow': dict(policy='seller15', **m.SLOW)}
E = m.Eco(m.CURRENT); W = m.M2_CURRENT; W_NO2 = (('w1', 'w3', 'w4'))
md = lambda v: (lambda w: st.median(w) if w else None)([x for x in v if x is not None])
fm = lambda x: 'n/r' if x is None else f'{x/60:.1f}'
def job(a):
  v, sc, mo, seed, x = a; mk = dict(MODELS[mo]); pol = mk.pop('policy')
  kw = {} if sc == 'M1' else dict(spec=W, manage='unmanaged' if sc == 'unmanaged' else 'managed')
  if sc == 'noW2': kw = dict(spec=W, use=W_NO2)
  r = run_m4(E, pol, seed, T=7200, x=x, **mk, **kw)
  steps = [r['reach'][L + 1] - r['reach'][L] for L in range(18, 25) if L + 1 in r['reach'] and L in r['reach']]
  inc = lambda a_, b_: sum(g for t, F, g in r['income'] if a_ <= t < b_) / (b_ - a_)
  return dict(k=(v, sc, mo, seed), t={L: r['reach'].get(L) for L in (10, 18, 25)}, l10=m.lvl_at(r, 600), l30=m.lvl_at(r, 1800),
              inc21=m.income_at_level(r, 21), maxstep=max(steps) if len(steps) == 7 else None, man15=r['manages'] / 8,
              i30=inc(0, 1800), i60=inc(0, 3600), i120=inc(0, 7200), wages=r['wages'], egg=r['egg'], walk=r['walk'], minc=r['minc'])

A05 = dict(cb=0.05); AF = dict(cb=0.05, focus=0.10)
VAR = {
  'base (current)': {}, 'A cb0.05': A05, 'A cb0.10': dict(cb=0.10),
  'A cb0.05 + focus0.10 manual 1 card/visit': dict(AF, focus_cards=1), 'A cb0.05 + focus0.10 manual 3 cards/visit': dict(AF, focus_cards=3),
  'B W1 bulk (A numbers)': dict(A05), 'B W1 focus 2s +5% x1.5 drain': dict(A05, wmode='focus'),
  'B W1 focus 2s +5% x1.0 drain': dict(A05, wmode='focus', wfocus_drain=1.0), 'B W1 focus 1s +5% x1.5 drain': dict(A05, wmode='focus', wfocus_every=1),
  'B2 pause W1/W2 @40 resume 100': dict(A05, pause='yawn12'), 'B2 pause W1/W2 @40 resume 70': dict(A05, pause='yawn12', resume_at=70),
  'B2 pause all @40 resume 100': dict(A05, pause='yawn'), 'B2 pause W1/W2 low-demand': dict(A05, pause='lowdemand'),
  'B2 low-demand, recovery 0 (counter)': dict(A05, pause='lowdemand', pause_rec=0.0),
  'C egg catch 100%': dict(A05, egg=True), 'C egg catch 60%': dict(A05, egg=True, egg_catch=0.6), 'C egg catch 30%': dict(A05, egg=True, egg_catch=0.3),
  'C egg 100% unlock L4': dict(A05, egg=True, egg_unlock=4), 'C egg 100% frenzy cap +50%': dict(A05, egg=True, egg_fr_capx=1.5),
  'C egg 100% cash capped by bank': dict(A05, egg=True, egg_cash_cap_bank=True),
  'D walkout fee 5% (floor $0)': dict(A05, walk_fee=0.05), 'D walkout fee 20% (stress)': dict(A05, walk_fee=0.20),
}
if __name__ == '__main__':
  ap = argparse.ArgumentParser(); ap.add_argument('--seeds', type=int, default=30); a = ap.parse_args(); N = a.seeds; S = range(N)
  jobs = [(v, sc, mo, s, VAR[v]) for v in VAR for sc in ('M1', 'managed', 'unmanaged') for mo in MODELS for s in S] + [(v, 'noW2', 'slow', s, VAR[v]) for v in VAR for s in S]
  import os, pickle; PK = f'/tmp/m4_R_{N}.pkl'
  if os.path.exists(PK): R = pickle.load(open(PK, 'rb'))
  else:
    with Pool(8) as p: R = {r['k']: r for r in p.map(job, jobs, chunksize=8)}
    pickle.dump(R, open(PK, 'wb'))
  g = lambda v, sc, mo: [R[(v, sc, mo, i)] for i in S]
  print(f'## M4 AC table ({N} seeds; run_m4 = run_m2 + hooks; CURRENT + M2_CURRENT)')
  print('| variant | AC7 s15 L@10/L@30 (M1) | cheap L@30 | AC7@30 band | W1 casual F10<=15 / F18 | W2 s15 dF10/dF18 | W3 unm F25 s15/ch vs M1 | W4 | W4b | W5 | W6 slow dF18 / dInc21 | F21 ratio s15/ch | s15 managed $/s 0-60m | s15 unmanaged $/s 0-60m | s15 wages 2h |')
  print('|' + '---|' * 15)
  out = {}
  D = lambda a_, b_: 'n/a' if a_ is None or b_ is None else f'{(a_-b_)/60:+.1f}'
  F2 = lambda x_: 'n/a' if x_ is None else f'{x_:.2f}'
  for v in VAR:
    M1s, M1c = g(v, 'M1', 'seller15'), g(v, 'M1', 'cheapest'); ms, mc, mca, msl = g(v, 'managed', 'seller15'), g(v, 'managed', 'cheapest'), g(v, 'managed', 'casual'), g(v, 'managed', 'slow')
    us, uc = g(v, 'unmanaged', 'seller15'), g(v, 'unmanaged', 'cheapest'); n2 = g(v, 'noW2', 'slow')
    T = lambda rs, L: md([r['t'][L] for r in rs])
    l10, l30, c30 = md([r['l10'] for r in M1s]), md([r['l30'] for r in M1s]), md([r['l30'] for r in M1c])
    band = 'PASS' if 18 <= l30 <= 22 and 18 <= c30 <= 22 else 'FAIL'
    w1 = sum(1 for r in mca if r['t'][10] and r['t'][10] <= 900)
    rat = lambda mm, uu: md([a_['inc21'] / b_['inc21'] if a_['inc21'] and b_['inc21'] else None for a_, b_ in zip(mm, uu)])
    i21 = lambda rs: md([r['inc21'] for r in rs])
    w6 = (T(n2, 18) - T(msl, 18)) / 60 if T(n2, 18) and T(msl, 18) else None
    w6i = i21(msl) / i21(n2) - 1 if i21(n2) else None
    o = dict(l10=l10, l30=l30, c30=c30, w4=md([r['maxstep'] for r in ms]), w4b=md([r['maxstep'] for r in mc]), r1=rat(ms, us), r2=rat(mc, uc),
             i60m=md([r['i60'] for r in ms]), i60u=md([r['i60'] for r in us]), wg=md([r['wages'] for r in ms]), i30M1=md([r['i30'] for r in M1s]))
    out[v] = o
    print(f"| {v} | {l10}/{l30} | {c30} | {band} | {w1}/{N} / {fm(T(mca, 18))} | {D(T(ms,10),T(M1s,10))}/{D(T(ms,18),T(M1s,18))} | {fm(T(us,25))} vs {fm(T(M1s,25))} / {fm(T(uc,25))} vs {fm(T(M1c,25))} | {fm(o['w4'])} | {fm(o['w4b'])} | {md([r['man15'] for r in ms]):.2f} | {'n/a' if w6 is None else f'{w6:+.1f}'} / {'n/a' if w6i is None else f'{w6i:+.0%}'} | {F2(o['r1'])}/{F2(o['r2'])} | {o['i60m']:.1f} | {o['i60u']:.1f} | {o['wg']:.0f} |")
  # pacing by model for B (manual-activity split)
  print('\n## Per-model income 0-60 min ($/s, managed / unmanaged) and F18 (managed)')
  print('| variant | ' + ' | '.join(MODELS) + ' |\n|' + '---|' * (len(MODELS) + 1))
  for v in VAR:
    print(f'| {v} | ' + ' | '.join(f"{md([r['i60'] for r in g(v,'managed',mo)]):.1f} / {md([r['i60'] for r in g(v,'unmanaged',mo)]):.1f} (F18 {fm(md([r['t'][18] for r in g(v,'managed',mo)]))})" for mo in MODELS) + ' |')
  # golden egg
  print('\n## Golden egg (seller15 managed / M1): spawns, caught, $ cash, free eggs, frenzy eggs lost to cap %')
  for v in [v for v in VAR if v.startswith('C')]:
    for sc in ('managed', 'M1'):
      rs = g(v, sc, 'seller15'); eg = [r['egg'] for r in rs]
      lostp = sum(x['fr_lost'] for x in eg) / max(1e-9, sum(x['fr_prod'] for x in eg))
      print(f"- {v} [{sc}]: spawns {md([x['spawn'] for x in eg])}, caught {md([x['caught'] for x in eg])}, frenzy lost {lostp:.1%}")
  print('\n## E5 frenzy eggs lost to coop cap by Farm level (all models, managed+M1, catch 100%; cap x1.0 vs x1.5)')
  print('| Farm L | lost % cap x1.0 | lost % cap x1.5 | n frenzy-eggs (x1.0) |\n|---|---|---|---|')
  agg = {}
  for v, key in (('C egg catch 100%', 0), ('C egg 100% frenzy cap +50%', 1)):
    for k_, r in R.items():
      if k_[0] != v or k_[1] not in ('managed', 'M1'): continue
      for L, (pp, ll) in r['egg']['fr_bylvl'].items():
        a_ = agg.setdefault(L, [[0, 0], [0, 0]]); a_[key][0] += pp; a_[key][1] += ll
  for L in sorted(agg):
    if L < 4: continue
    x0, x1 = agg[L]; print(f"| {L} | {x0[1]/max(1e-9,x0[0]):.1%} | {x1[1]/max(1e-9,x1[0]):.1%} | {x0[0]/1e3:.0f}k |")
  print('\n## Uplift vs A cb0.05 (same scenario): income 0-30 / 0-60 min, seller15')
  for v in [v for v in VAR if v.startswith(('C', 'D'))]:
    for sc in ('M1', 'managed'):
      b0 = md([r['i30'] for r in g('A cb0.05', sc, 'seller15')]); b1 = md([r['i60'] for r in g('A cb0.05', sc, 'seller15')])
      a0 = md([r['i30'] for r in g(v, sc, 'seller15')]); a1 = md([r['i60'] for r in g(v, sc, 'seller15')])
      print(f"- {v} [{sc}]: {a0/b0-1:+.1%} / {a1/b1-1:+.1%}")
  print('\n## D walkout fee: min coins after 10 min / fee paid (slow, casual managed)')
  for v in [v for v in VAR if v.startswith('D')]:
    for mo in ('slow', 'casual'):
      rs = g(v, 'managed', mo) + g(v, 'M1', mo)
      print(f"- {v} {mo}: min coins {min(r['minc'] for r in rs):.0f}, median fee paid ${md([r['walk'] for r in rs]):.0f}, F18 {fm(md([r['t'][18] for r in g(v,'M1',mo)]))}")
