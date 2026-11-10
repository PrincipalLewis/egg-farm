"""Runner for m4_active.py -> raw tables (stdout). python3 m4_active_run.py --seeds 30"""
import argparse, statistics as st
from multiprocessing import Pool
import m4_active as a
ap = argparse.ArgumentParser(); ap.add_argument('--seeds', type=int, default=30); N = ap.parse_args().seeds; S = range(N)
TRA = dict(a.TR, h_base=30, v_base=40, v_cap=3, price='A'); TRB = dict(a.TR, h_base=20, v_base=25, v_cap=3, price='B')
TRA0 = dict(a.TR, price='A'); TRB0 = dict(a.TR, price='B')
def job(arg):
  F, k, act, idl, trn = arg; x = VAR[k]; tr = dict(A=TRA, B=TRB)[trn]
  return arg, a.ratio(F, F, F, F - 3, x, S, act, idl, tr)
VAR = {'base (cb 0.05)': {}, 'cb 0': dict(cb=0), 'cb 0.10': dict(cb=0.10),
  'focus +10% 1 card': dict(focus=0.10), 'focus +10% 3 cards': dict(focus=0.10, focus_cards=3),
  'pause W1/W2 at yawn': dict(pause='yawn'),
  'golden egg (45% frenzy x7 60s / 55% lucky 60s)': dict(egg=True), 'egg frenzy only': dict(egg=True, egg_p_frenzy=1.0),
  'egg lucky only': dict(egg=True, egg_p_frenzy=0.0),
  'ability Activate-all 30s/5min': dict(abil=True), 'streak +25% price': dict(streak=True), 'streak +25% lay': dict(streak=True, st_target='lay'),
  'streak + frenzy': dict(streak=True, egg=True), 'streak + frenzy + focus': dict(streak=True, egg=True, focus=0.10),
  'ALL (egg+ability+streak+focus+cb)': dict(egg=True, abil=True, streak=True, focus=0.10),
  'ALL, streak cap 0.30 (fix)': dict(egg=True, abil=True, streak=True, focus=0.10, st_cap=0.30),
  'ALL, streak cap 0.40 (stress)': dict(egg=True, abil=True, streak=True, focus=0.10, st_cap=0.40),
  'ALL, frenzy x2 price 30s-equiv (lucky 90s)': dict(egg=True, abil=True, streak=True, focus=0.10, lucky_s=90)}
PL = [('optimal', 'idle'), ('seller15', 'idle'), ('casual', 'idle_casual')]
if __name__ == '__main__':
  p = Pool(8)
  print(f'## Progression, no workers, {N} seeds (t18 min median / n reaching / L@30 / H / V / C / max gap min)')
  for nm, tr in [('F1 single track', None), ('3-track A, upgrades.md 7.1 costs (60/80), no V cap', TRA0), ('3-track B, 7.1 costs, no V cap', TRB0),
                 ('3-track A tuned: Hens 30x1.30^H, Value 40x1.33^V, V<=F+3', TRA), ('3-track B tuned: Hens 20, Value 25, V<=F+3', TRB)]:
    for mdl in ('seller15', 'casual'):
      print('|', nm, '|', mdl, '|', a.prog_stats(tr, S, mdl, p), '|')
  print(f'\n## 10-min window ratios active/idle ({N} seeds), state H=V=F, C=F-3, all unlocked workers hired, energy start 100')
  args = [(F, k, act, idl, trn) for trn in ('A', 'B') for F in (10, 18, 24) for k in VAR for act, idl in PL]
  res = dict(p.map(job, args))
  for trn in ('A', 'B'):
    print(f'\n### price option {trn}\n| variant | F10 opt / s15 / casual | F18 | F24 | opt $/s F18 act/idle |\n|---|---|---|---|---|')
    for k, x in VAR.items():
      cells = []
      for F in (10, 18, 24):
        cells.append(' / '.join(f"{res[(F, k, act, idl, trn)][2]:.2f}" for act, idl in PL))
      r18 = res[(18, k, 'optimal', 'idle', trn)]
      print(f'| {k} | ' + ' | '.join(cells) + f' | {r18[0]:.0f} / {r18[1]:.0f} |')
  # pause: active-with-pause vs active-never-pause (idle player cannot pause)
  print('\n## Pause exploit: income with pause / income never pausing (same player)')
  for F in (10, 18, 24):
    for pl in ('optimal', 'casual'):
      y = st.mean(a.window(F, F, F, F - 3, pl, dict(pause='yawn'), s, TRA) for s in S)
      nv = st.mean(a.window(F, F, F, F - 3, pl, {}, s, TRA) for s in S)
      ns = st.mean(a.window(F, F, F, F - 3, pl, dict(pause='yawn'), s, TRA, T=1800) for s in S)
      nn = st.mean(a.window(F, F, F, F - 3, pl, {}, s, TRA, T=1800) for s in S)
      print(f'| F{F} | {pl} | 10 min {y:.1f}/{nv:.1f} = {y/nv:.3f} | 30 min {ns:.1f}/{nn:.1f} = {ns/nn:.3f} |')
  print('\n## Offline: optimal active (ALL) $/s vs offline $/s (eggs/s x rate x price, Grader not applied offline)')
  for F in (10, 18, 24):
    act = res[(F, 'ALL (egg+ability+streak+focus+cb)', 'optimal', 'idle', 'A')][0]; idl = res[(F, 'base (cb 0.05)', 'optimal', 'idle', 'A')][1]
    pr = a.price(F, F, F, F - 3, TRA); eps = a.hens_rate(F, TRA)
    print(f'| F{F} | active {act:.0f} | idle-in-tab {idl:.0f} | offline 0.25 {eps*0.25*pr:.1f} (x{act/(eps*0.25*pr):.1f}) | offline 0.15 {eps*0.15*pr:.1f} (x{act/(eps*0.15*pr):.1f}) |')
  print('\n## Price growth: Egg value A vs B, grades and Grader top end (V=F, C=F-3 for B; F1 = (1+0.05F)(1+0.12C))')
  for F in (5, 10, 15, 18, 20, 24, 30):
    g = [x[1] for x in a.SP['w4'] if F >= x[0]]; g = g[-1] if g else 1.0
    A = a.price(F, F, F, F - 3, dict(TRA, balanced=False)); B = a.price(F, F, F, F - 3, dict(TRB, balanced=False)); f1 = a.price(F, 0, 0, F - 3, None)
    print(f'| F{F} | F1 {f1:.2f} | A {A:.2f} (x{A/f1:.2f}) | B {B:.2f} (x{B/f1:.2f}) | grade x{a.grade(F, F):.2f} | Grader x{g} | A all-in x{A*g:.2f} | B all-in x{B*g:.2f} |')
