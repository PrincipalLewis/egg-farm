"""rc2 Refill v0.3/v0.3a sweep (Economy, 2026-10-16). python3 rf_sweep.py > rf_sweep_out.md
m4_active.window (energy, W1-W4, Grader, ALL stack + abilities v0.3 = ab2) patched at import (m4_active.py unchanged):
- Charges: regenerate 1 per regen_s up to cap (start full); single-row refills only (Refill all dropped, v0.3a).
- A refill restores one Refillable worker (energy <= threshold, incl. asleep) to 100% and costs 1 charge.
- Managed players (optimal 3 s visits, seller15 15 s, casual 20 s) act at each visit: while charges >= 1 and a worker is Refillable,
  refill the highest "$/s at risk" (net contribution = income share - wage; Grader = 85% of its bonus), ties lower energy, then W1->W4.
  Static risk shares at the window state: W4 0.85*(g-1)/g*I, W2 I/3 - wage, W3 0.1*I, W1 0.1*I - wage (I = eggs/s x price).
- Combo: Activate-all on a worker refilled within the last 10 s lasts combo_s (45, cap) for that worker, else 30 s.
- rc1 baseline: free refill, 30 s global cooldown, all tired if >= 3 else the lowest (current window logic).
- In-tab only: offline/hidden >= 60 s freezes energy and charges, so they don't enter these windows.
Metrics per (regen, cap, threshold): F22-24 managed/unmanaged (30 min), managed/idle on the 10-min CEO window (worst seed),
shift actions / 15 min, decision proxy (share of refills not to the lowest-energy Refillable worker, AC-RF5 >= 25%),
dead zones (> 2 min with a Refillable worker and >= 1 charge but no refill; AC-RF8 count 0), income vs rc1 (AC-RF8 loss <= 10%),
shortage share (share of time with #Refillable > charges; v0.3a supply-below-demand gate, threshold >= 20%)."""
import inspect, statistics as st, math, sys
from multiprocessing import Pool
import m4_active as a, m4_final_run as fr
src = inspect.getsource(a.window).replace('def window(', 'def window_rf(')
R_ = [
("def window_rf(F, H, V, C, pl, x, seed, tr=TR, T=600, dt=0.1, workers=True, e0=100.0):",
 "def window_rf(F, H, V, C, pl, x, seed, tr=TR, T=600, dt=0.1, workers=True, e0=100.0, rf=None):"),
("  en = {w: e0 for w in W}; paused = set(); last_manage = -1e9\n",
 """  en = {w: e0 for w in W}; paused = set(); last_manage = -1e9
  RF = rf or {}; ch = float(RF.get('cap', 0)); last_ref = {}; ab_w = {}; nvis = 0.0
  S_ = dict(refills=0, decided=0, notlow=0, dz=0, dzmax=0.0, short=0.0, act=0); dz_run = 0.0
"""),
("    if X['ab2'] and t < ab_until:  # v0.2 Shout (all sales), Rush (W1 sales)\n      if 'w3' in en and st_('w3') != 'asleep': p *= X['a3']\n      if not manual and 'w1' in en and st_('w1') != 'asleep': p *= X['a1']",
 "    if X['ab2']:\n      if 'w3' in en and st_('w3') != 'asleep' and t < ab_w.get('w3', -1): p *= X['a3']\n      if not manual and 'w1' in en and st_('w1') != 'asleep' and t < ab_w.get('w1', -1): p *= X['a1']"),
("      if X['ab2'] and t < ab_until and s != 'asleep': g += X['a4']", "      if X['ab2'] and t < ab_w.get('w4', -1) and s != 'asleep': g += X['a4']"),
("    if X['ab2'] and t < ab_until and 'w2' in en and st_('w2') != 'asleep': r *= X['a2']", "    if X['ab2'] and t < ab_w.get('w2', -1) and 'w2' in en and st_('w2') != 'asleep': r *= X['a2']"),
("      ab_next = t + X['ab_cd'] / max(P['ab_use'], 1e-9); ab_until = t + X['ab_dur']",
 "      ab_next = t + X['ab_cd'] / max(P['ab_use'], 1e-9); ab_until = t + X['ab_dur']\n      for w_ in en: ab_w[w_] = t + (RF.get('combo_s', 45) if (RF.get('mode') == 'rf' and t - last_ref.get(w_, -1e9) <= 10) else X['ab_dur'])"),
("    if P['refill'] and en and t - last_manage >= SP['manage_cd']:",
 """    if RF.get('mode') == 'rf' and en:
      ch = min(RF['cap'], ch + dt / RF['regen'])
      thr = RF['thr']; rfl = [w_ for w_ in en if en[w_] <= thr]
      if len(rfl) > math.floor(ch + 1e-9): S_['short'] += dt
      if P['refill'] and t >= nvis:
        nvis = t + P['sell']
        while ch >= 1 - 1e-9 and rfl:
          I = rate * pr; wg = lambda w_: SP[w_]['wage_per_f_min'] * F / 60 if w_ in ('w1', 'w2') else 0.0
          risk = {'w4': 0.85 * (gmult - 1) / gmult * I, 'w2': I / 3 - wg('w2'), 'w3': 0.1 * I, 'w1': 0.1 * I - wg('w1')}
          pick = sorted(rfl, key=lambda w_: (-risk[w_], en[w_], w_))[0]
          if len(rfl) >= 2:
            S_['decided'] += 1; S_['notlow'] += pick != min(rfl, key=lambda w_: (en[w_], w_))
          en[pick] = 100.0; ch -= 1; last_ref[pick] = t; paused.discard(pick); S_['refills'] += 1; S_['act'] += 1; rfl.remove(pick); dz_run = 0.0
      if rfl and ch >= 1 - 1e-9: dz_run += dt
      else: dz_run = 0.0
      if dz_run > 120 and dz_run - dt <= 120: S_['dz'] += 1
      S_['dzmax'] = max(S_['dzmax'], dz_run)
    elif P['refill'] and en and t - last_manage >= SP['manage_cd']:"""),
("  return coins / T\n", "  return (coins / T, S_) if rf else coins / T\n"),
]
LIVE = '--live' in sys.argv; STAG = '--stagger' in sys.argv
if LIVE:  # v0.4: live per-worker net contribution (EMA 60 s, decays only while not asleep) replaces the static shares
  R_ += [
  ("  RF = rf or {};", "  LV = {'w1': 0.0, 'w2': 0.0, 'w3': 0.0, 'w4': 0.0, 'e0': 0.0, 'e2': 0.0}\n  RF = rf or {};"),
  ("up = unit_price(manual); coins += k * up",
   "up = unit_price(manual); coins += k * up; v_ = k * up\n    if not manual and 'w1' in en: LV['w1'] += v_\n    if 'w2' in en: LV['w2'] += v_ * LV['e2'] / max(1e-9, LV['e2'] + LV['e0'])\n    if 'w3' in en: LV['w3'] += v_ * (1 - 1 / {'work': SP['w3']['demand'], 'tired': SP['w3']['tired_demand']}.get(st_('w3'), 1.0))\n    if 'w4' in en: g_ = 1 + (gmult - 1) * {'work': 1.0, 'tired': 0.5}.get(st_('w4'), 0.15); LV['w4'] += 0.85 * v_ * (1 - 1 / g_)"),
  ("coop -= k; basket += k; last_tap = t", "coop -= k; basket += k; last_tap = t; LV['e0'] += k"),
  ("wt['w2'] = t + ev; k = min(math.floor(coop), tapn); coop -= k; basket += k", "wt['w2'] = t + ev; k = min(math.floor(coop), tapn); coop -= k; basket += k; LV['e2'] += k"),
  ("      ch = min(RF['cap'], ch + dt / RF['regen'])", "      ch = min(RF['cap'], ch + dt / RF['regen']); fk = math.exp(-dt / 60); LV['e0'] *= fk; LV['e2'] *= fk\n      for w_ in en:\n        if st_(w_) != 'asleep': LV[w_] *= fk"),
  ("          risk = {'w4': 0.85 * (gmult - 1) / gmult * I, 'w2': I / 3 - wg('w2'), 'w3': 0.1 * I, 'w1': 0.1 * I - wg('w1')}",
   "          risk = {w_: LV[w_] / 60 - wg(w_) for w_ in ('w1', 'w2', 'w3', 'w4')}"),
  ]
if STAG:  # staggered start energies U(40,100) instead of all 100 (desynchronised workers, as in a real progression)
  R_.append(("  en = {w: e0 for w in W};", "  _sr = __import__('random').Random(seed * 13 + 5); en = {w: (_sr.uniform(40, 100) if (rf or {}).get('mode') == 'rf' else e0) for w in W};"))
for o, n in R_:
  assert src.count(o) == 1, o[:80]; src = src.replace(o, n)
g = dict(vars(a)); g['math'] = math; exec(src, g); WRF = g['window_rf']
X = dict(fr.X['ALL_st0.4'], ab2=True); TR = fr.TR; DT = 0.2
def job(j):
  F, pl, rfk, s, T = j
  rf = None if rfk is None else (dict(mode='rc1') if rfk == 'rc1' else dict(mode='rf', regen=rfk[0], cap=rfk[1], thr=rfk[2], combo_s=rfk[3]))
  r = WRF(F, F, F, F - 3, pl, X if pl != 'idle' else {}, s, TR, T=T, dt=DT, rf=rf)
  return j, r
v = lambda r: r[0] if isinstance(r, tuple) else r
if __name__ == '__main__':
  SEEDS = range(int(sys.argv[1]) if len(sys.argv) > 1 else 100); LV = (22, 23, 24)
  thr_list = [40]; combos = [(150, 2)] if '--only150' in sys.argv else [(rg, cp) for rg in (90, 120, 150) for cp in (2, 3)]
  extra_thr = '--thr-sweep' in sys.argv
  if extra_thr: thr_list = [30, 35, 40, 45, 50]
  KEYS = [(rg, cp, th, 45) for rg, cp in combos for th in thr_list]
  if '--combos' in sys.argv:  # e.g. 240:2:40,150:1:40,150:2:50  (regen:cap:threshold)
    KEYS = [tuple(int(x) for x in c.split(':')) + (45,) for c in sys.argv[sys.argv.index('--combos') + 1].split(',')]
  J = [(F, pl, k, s, 1800) for F in LV for s in SEEDS for pl in ('seller15', 'casual') for k in KEYS]
  J += [(F, pl, 'rc1', s, 1800) for F in LV for s in SEEDS for pl in ('seller15', 'casual')]
  J += [(F, 'seller15_unm', None, s, 1800) for F in LV for s in SEEDS]
  J += [(F, 'optimal', k, s, 600) for F in LV for s in SEEDS for k in KEYS] + [(F, 'idle', None, s, 600) for F in LV for s in SEEDS]
  with Pool(4) as p: D = dict(p.map(job, J, chunksize=8))
  print(f'# Refill sweep (live risk={LIVE}, staggered start={STAG}): F22-24, seeds 0-{len(SEEDS)-1}, combo 45 s, single-row refills, ALL stack + abilities v0.3\n')
  print('| regen s | cap | thr | seller15 vs rc1 | casual vs rc1 | managed/unm min | optimal/idle worst (10 min) | actions/15 min (s15 med) | not-lowest share (s15 / casual) | dead zones (s15/casual, max s) | shortage share s15 / casual | RF5 | RF8 | supply<demand (>=20%) | ALL |')
  print('|' + '---|' * 15)
  for k in KEYS:
    rg, cp, th, cb = k
    def agg(pl):
      inc = [v(D[(F, pl, k, s, 1800)]) / v(D[(F, pl, 'rc1', s, 1800)]) - 1 for F in LV for s in SEEDS]
      S = [D[(F, pl, k, s, 1800)][1] for F in LV for s in SEEDS]
      dec = sum(x['decided'] for x in S); nl = sum(x['notlow'] for x in S); rfs = sum(x['refills'] for x in S)
      return dict(inc=st.mean(inc), worst=min(inc), act=st.median(x['act'] / 2 for x in S), nl=nl / max(1, rfs), dz=sum(x['dz'] for x in S), dzmax=max(x['dzmax'] for x in S), short=st.mean(x['short'] / 1800 for x in S))
    m, c = agg('seller15'), agg('casual')
    mu = min(v(D[(F, 'seller15', k, s, 1800)]) / D[(F, 'seller15_unm', None, s, 1800)] for F in LV for s in SEEDS)
    c2l = sorted(max(v(D[(F, 'optimal', k, s, 600)]) / D[(F, 'idle', None, s, 600)] for F in LV) for s in SEEDS)
    cap2 = c2l[-1]; cap2p = c2l[min(len(c2l) - 1, math.ceil(0.95 * len(c2l)) - 1)]
    rf5 = mu >= 1.5 and cap2p <= 2.0 and cap2 <= 2.25 and m['act'] >= 3 and m['nl'] >= 0.25
    rf8 = m['dz'] == 0 and c['dz'] == 0 and m['worst'] >= -0.10 and c['worst'] >= -0.10
    sd = m['short'] >= 0.20
    print(f"| {rg} | {cp} | {th}% | {m['inc']:+.1%} (worst {m['worst']:+.1%}) | {c['inc']:+.1%} (worst {c['worst']:+.1%}) | {mu:.2f} | P95 {cap2p:.2f} / worst {cap2:.2f} | {m['act']:g} | {m['nl']:.0%} / {c['nl']:.0%} | {m['dz']}/{c['dz']} ({m['dzmax']:.0f}/{c['dzmax']:.0f}) | {m['short']:.0%} / {c['short']:.0%} | {'PASS' if rf5 else 'FAIL'} | {'PASS' if rf8 else 'FAIL'} | {'PASS' if sd else 'FAIL'} | {'PASS' if rf5 and rf8 and sd else 'FAIL'} |")
