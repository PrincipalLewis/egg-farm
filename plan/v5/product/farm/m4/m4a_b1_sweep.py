"""B1 reproduction (PM Farm Upgrades, 2026-10-16). v6 = economy.f1.csv (egg_price, collection_price_bonus, eggs_per_sec);
v7 = economy.m4-candidate.csv columns (M4A-5/8/9/10). Static flow model like the review: income = min(eggs/s, demand) x price.
Sweeps every (F,C) 0..30 with H=F. Prints failures under the approved rule and under candidate fixes."""
import csv, os, math
P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
v6 = list(csv.DictReader(open(os.path.join(P, 'economy.f1.csv'))))
v7 = list(csv.DictReader(open(os.path.join(P, 'economy.m4-candidate.csv'))))
g = lambda T, c, i: float(T[i][c]); C0 = v7[0]; MAX = 30; VC = int(C0['egg_value_cap_over_farm'])
def rh(x): return math.floor(x * 100 + 0.5 + 1e-9) / 100
def hms(H, kind='coop'):
  """Hens milestone mult (M1, HoP 14:45): reads hens_msK_{coop|offline}_mult, falls back to the pre-M1 hens_msK_mult."""
  def col(k): return C0.get(f'hens_ms{k}_{kind}_mult') or C0[f'hens_ms{k}_mult']
  return max([1.0] + [float(col(k)) for k in (1, 2, 3) if H >= float(C0[f'hens_ms{k}_level'])])
def grade(V, F):
  m = 1.0
  for k in (1, 2, 3):
    if V >= float(C0[f'egg_grade{k}_level']) and F >= float(C0[f'egg_grade{k}_farm_gate']): m = float(C0[f'egg_grade{k}_mult'])
    elif V >= float(C0[f'egg_grade{k}_level']): pass
  return m
def bal(F, H, V):
  mn = min(F, H, V); m = 1.0
  for k in range(1, 6):
    if mn >= float(C0[f'balanced{k}_level']): m = float(C0[f'balanced{k}_mult'])
  return m
bs, lb = float(C0['egg_value_base_step']), float(C0['egg_value_level_bonus'])
def base7(V, F, H): return (1 + bs * V) * (1 + lb * V) * grade(V, F) * bal(F, H, V)
def p7(F, H, V): return rh(base7(V, F, H))
def p6(F, C): return rh(g(v6, 'egg_price', F) * (1 + g(v6, 'collection_price_bonus', C)))
def dem(F): return (g(v7, 'demand_min', F) + g(v7, 'demand_max', F)) / 2 / g(v7, 'customer_interval_s', F)
def sup7(H): return g(v7, 'eggs_per_sec', H)  # in-tab lay rate: no Hens milestone (M1)
def i6(F, C): return min(g(v6, 'eggs_per_sec', F), dem(F)) * p6(F, C)
def lowV(F, C, vmax): return next((V for V in range(vmax + 1) if p7(F, F, V) >= p6(F, C)), None)
if __name__ == '__main__':
  fails = []; nomax = []
  for F in range(31):
    for C in range(31):
      if lowV(F, C, min(F + VC, MAX)) is None:
        fails.append((F, C)); vx = lowV(F, C, MAX)
        if vx is None: nomax.append((F, C))
  print(f'Approved rule (V<=min(F+3,30)): TR-4 price fails at {len(fails)}/961 saves')
  for F in range(31):
    cs = [C for f_, C in fails if f_ == F]
    if cs: print(f'  F{F}: fails C>={min(cs)} (C-F>={min(cs)-F}), worst C30 needs V{lowV(F,30,MAX)} vs cap {min(F+VC,MAX)}; p6 ${p6(F,30)} vs p7@cap ${p7(F,F,min(F+VC,MAX))}')
  print(f'Fix A (V may exceed cap at migration, up to maxLevel 30): unsolvable saves = {len(nomax)} {nomax[:10]}')
  over = [(F, C, lowV(F, C, MAX) - min(F + VC, MAX)) for F, C in fails]
  print('  max overshoot above cap (levels):', max(o[2] for o in over), 'at', max(over, key=lambda o: o[2]))
  # first-minute static ratios under Fix A, all saves
  rs = []
  for F in range(31):
    for C in range(31):
      V = lowV(F, C, MAX); rs.append((min(sup7(F), dem(F)) * p7(F, F, V) / i6(F, C), F, C, V))
  rs.sort(reverse=True)
  print('Fix A static first-minute ratio: max %.3f at F%d C%d V%d; >1.5x: %d/961; among B1 saves max %.3f' % (
    rs[0][0], rs[0][1], rs[0][2], rs[0][3], sum(r[0] > 1.5 for r in rs), max(r[0] for r in rs if (r[1], r[2]) in set(fails))))
  # Fix B: V=cap + per-save legacy price floor; ratio of floor to p7@cap
  print('Fix B (floor) worst floor/p7@cap: %.2fx' % max(p6(F, C) / p7(F, F, min(F + VC, MAX)) for F, C in fails))
  # how many V buys until a floored save's formula price passes the floor (i.e. dead buys)
  dead = []
  for F, C in fails:
    vx = lowV(F, C, MAX); dead.append((vx - min(F + VC, MAX), F, C))
  print('Fix B dead Egg value levels (formula below floor) worst:', max(dead))
  print('\nFixtures (F,C,H=F) -> V0 (Fix A), v6 -> v7 price, static ratio, overcap?')
  for F, C in [(0,0),(0,5),(0,30),(5,0),(5,2),(5,10),(5,30),(10,0),(10,7),(10,10),(10,15),(10,30),(15,0),(15,12),(15,15),(15,20),(15,30),(20,0),(20,17),(20,20),(20,25),(20,30),(29,30),(30,0),(30,27),(30,30),(12,1)]:
    V = lowV(F, C, MAX); cap = min(F + VC, MAX)
    print(f'  F{F}/C{C}: V{V}{" (cap "+str(cap)+", OVER)" if V>cap else ""}  ${p6(F,C):.2f} -> ${p7(F,F,V):.2f}  x{min(sup7(F),dem(F))*p7(F,F,V)/i6(F,C):.2f}')
  print('\nReachability: collection_cost<farm_cost at L', [L for L in range(31) if g(v6,'collection_cost',L) < g(v6,'farm_cost',L)])
