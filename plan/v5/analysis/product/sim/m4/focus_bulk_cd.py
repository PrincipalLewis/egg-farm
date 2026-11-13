"""M4 Market Hand Focus/Bulk mode-switch cooldown sweep (Economy, 2026-10-16). python3 focus_bulk_cd.py > focus_bulk_cd_out.md
Base: m4_active.window (workers W1-W4, energy, refills, ALL stack with abilities v0.3 = ab2 x1.15/x1.15/x1.15/+0.5),
patched at import (source replace, m4_active.py itself unchanged) to add the W1 mode:
  Bulk  = shipped W1: every 1 s (tired 3 s) sells to every customer waiting >= 2 s, no premium, drain x1.0.
  Focus = every 2 s (tired 6 s) sells to ONE customer (oldest waiting >= 2 s), +5% price on that sale, W1 drain x1.5 (m4-tracks-model B).
Switcher (managed, greedy short-horizon oracle): whenever the cooldown allows (re-evaluated every 1 s), estimate W1 income over the
next H = 10 s for each mode from the current queue/basket/patience and pick the higher (stay on ties); switch only if > 1% better.
Modes: 'focus' / 'bulk' static, 'switch' (cooldown cd). Unmanaged = seller15_unm (no refills), static Focus."""
import inspect, statistics as st, random, math
from multiprocessing import Pool
import m4_active as a, m4_final_run as fr
src = inspect.getsource(a.window).replace('def window(', 'def window_m(')
src = src.replace("def window_m(F, H, V, C, pl, x, seed, tr=TR, T=600, dt=0.1, workers=True, e0=100.0):",
                  "def window_m(F, H, V, C, pl, x, seed, tr=TR, T=600, dt=0.1, workers=True, e0=100.0, wmode='focus', cd=30, H_=10.0):")
rep = [
("  wt = {'w1': 0.0, 'w2': 0.0};", "  WM = ['bulk' if wmode == 'bulk' else 'focus']; last_sw = [-1e9]; next_eval = [0.0]; nsw = [0]; prem = [0.0]\n  wt = {'w1': 0.0, 'w2': 0.0};"),
("      elif s != 'asleep': en[w] = max(0.0, en[w] - dt / SP['drain_s_per_pct'])",
 "      elif s != 'asleep': en[w] = max(0.0, en[w] - dt / SP['drain_s_per_pct'] * (1.5 if (w == 'w1' and WM[0] == 'focus') else 1.0))"),
("    k = min(basket, cust[0]); basket -= k; cust[0] -= k; up = unit_price(manual); coins += k * up",
 "    k = min(basket, cust[0]); basket -= k; cust[0] -= k; up = unit_price(manual) * (1 + prem[0]); coins += k * up"),
("""    if 'w1' in en:
      s = st_('w1'); ev = SP['w1']['every'] if s == 'work' else SP['w1']['tired_every'] if s == 'tired' else None
      if ev and t >= wt['w1'] and basket > 0 and any(t - c_[3] >= SP['w1']['defer'] for c_ in q):
        wt['w1'] = t + ev
        for c_ in list(q):
          if basket <= 0: break
          if t - c_[3] >= SP['w1']['defer']: sell(c_, False)""",
"""    if 'w1' in en:
      if wmode == 'switch' and t >= next_eval[0] and t - last_sw[0] >= cd:
        next_eval[0] = t + 1.0
        el = sorted([c_ for c_ in q if c_[1] > t], key=lambda c_: c_[3])
        b_ = basket + rate * H_ * 0.5
        bulk_v = min(b_, sum(c_[0] for c_ in el)); n_f = int(H_ // 2) + 1; foc_v = 0.0; bb = b_
        for j, c_ in enumerate(el[:n_f]):
          if c_[1] - t < 2 * j: continue  # leaves before Focus reaches it
          k_ = min(bb, c_[0]); bb -= k_; foc_v += k_
        foc_v *= 1 + PREM
        want = 'bulk' if bulk_v > foc_v * 1.01 else 'focus' if foc_v > bulk_v * 1.01 else WM[0]
        if want != WM[0]: WM[0] = want; last_sw[0] = t; nsw[0] += 1
      s = st_('w1'); fm = WM[0] == 'focus'
      ev = (2 if fm else SP['w1']['every']) if s == 'work' else ((6 if fm else SP['w1']['tired_every']) if s == 'tired' else None)
      if ev and t >= wt['w1'] and basket > 0 and any(t - c_[3] >= SP['w1']['defer'] for c_ in q):
        wt['w1'] = t + ev
        for c_ in list(q):
          if basket <= 0: break
          if t - c_[3] >= SP['w1']['defer']:
            prem[0] = PREM if fm else 0.0; sell(c_, False); prem[0] = 0.0
            if fm: break"""),
("  return coins / T\n", "  return (coins / T, nsw[0]) if wmode == 'switch' else coins / T\n"),
]
for o, n in rep:
  assert src.count(o) == 1, o[:70]; src = src.replace(o, n)
import os
PREM = float(os.environ.get('PREM', '0.05'))
g = dict(vars(a)); g['PREM'] = PREM; exec(src, g); W = g['window_m']
X = dict(fr.X['ALL_st0.4'], ab2=True, abil=True)
if os.environ.get('RUSH'): X['a1'] = float(os.environ['RUSH'])  # fallback test: Rush (W1 ability) multiplier
TR = fr.TR
LV = (10, 18, 22, 23, 24); S = range(30); CDS = tuple(int(c) for c in os.environ.get('CDS', '0,15,30,60').split(',')); T = 1800
def job(j):
  F, pl, mode, cd, s = j[:5]; TT = j[5] if len(j) > 5 else T
  r = W(F, F, F, F - 3, pl, X if pl != 'idle' else {}, s, TR, T=TT, wmode=mode, cd=cd)
  return j, r
if __name__ == '__main__':
  J = [(F, 'seller15', 'focus', 0, s) for F in LV for s in S] + [(F, 'seller15', 'bulk', 0, s) for F in LV for s in S]
  J += [(F, 'seller15', 'switch', cd, s) for F in LV for cd in CDS for s in S]
  J += [(F, 'seller15_unm', 'focus', 0, s) for F in LV for s in S] + [(F, 'idle', 'focus', 0, s) for F in LV for s in S]
  J += [(F, 'seller15', 'switch', cd, s, 600) for F in (22, 23, 24) for cd in CDS for s in S] + [(F, 'idle', 'focus', 0, s, 600) for F in (22, 23, 24) for s in S]
  with Pool(4) as p: D = dict(p.map(job, J, chunksize=4))
  v = lambda r: r[0] if isinstance(r, tuple) else r
  print(f'# Focus/Bulk cooldown sweep (Focus premium {PREM:+.1%}): seller15 managed, ALL stack + abilities v0.3, {T//60}-min session, 30 seeds, economy.f1-m4cols.csv\n')
  print('| cooldown | F | switch vs Focus mean | worst seed | best seed | switches/session (med) | switch vs Bulk mean | managed/unmanaged min (all seeds) | managed/idle worst seed (CEO 10-min window) |')
  print('|---|---|---|---|---|---|---|---|---|')
  summ = {}
  for cd in CDS:
    for F in LV:
      d = [v(D[(F, 'seller15', 'switch', cd, s)]) / D[(F, 'seller15', 'focus', 0, s)] - 1 for s in S]
      db = st.mean(v(D[(F, 'seller15', 'switch', cd, s)]) / D[(F, 'seller15', 'bulk', 0, s)] - 1 for s in S)
      mu = [v(D[(F, 'seller15', 'switch', cd, s)]) / D[(F, 'seller15_unm', 'focus', 0, s)] for s in S]
      mi = [v(D[(F, 'seller15', 'switch', cd, s, 600)]) / D[(F, 'idle', 'focus', 0, s, 600)] for s in S] if F >= 22 else [float('nan')]
      ns = st.median(D[(F, 'seller15', 'switch', cd, s)][1] for s in S)
      summ[(cd, F)] = (st.mean(d), max(d), min(mu), max(mi) if F >= 22 else float('nan'))
      smi = sorted(mi); p95 = smi[min(len(smi) - 1, math.ceil(0.95 * len(smi)) - 1)]
      print(f'| {cd} s | F{F} | {st.mean(d):+.2%} | {max(d):+.2%} | {min(d):+.2%} | {ns:g} | {db:+.2%} | {min(mu):.2f} | {max(mi):.2f} (P95 {p95:.2f}) |')
  print('\nstatic: Focus vs Bulk mean by F:', {F: f"{st.mean(D[(F,'seller15','focus',0,s)]/D[(F,'seller15','bulk',0,s)]-1 for s in S):+.2%}" for F in LV})
  print('\n## Verdict per cooldown (criterion 1: switch gain over Focus <= 2% mean AND worst seed, all F; criterion 2: F22-24 managed/unmanaged >= 1.5 every seed, managed/idle <= 2.0 worst seed on the CEO 10-min in-tab window)')
  for cd in CDS:
    c1 = all(summ[(cd, F)][0] <= 0.02 and summ[(cd, F)][1] <= 0.02 for F in LV)
    c2 = all(summ[(cd, F)][2] >= 1.5 and summ[(cd, F)][3] <= 2.0 for F in (22, 23, 24))
    print(f'- {cd} s: (1) {"PASS" if c1 else "FAIL"} (2) {"PASS" if c2 else "FAIL"}')
