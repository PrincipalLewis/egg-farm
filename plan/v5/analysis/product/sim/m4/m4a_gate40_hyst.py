"""M4A-40 gate WITH M4A-18 v1.4 hysteresis (PM Farm copy of Economy's m4a_gate40.py, 2026-10-16; HoP 16:08).
Highlight keeps its current pick unless a new affordable row has payback <= 0.9x the current pick's (re-computed now) and the pick
has been held >= 2 s (always true here: choose() runs after each 15 s sell); switches at once if the current pick was bought or
is unaffordable. Original docstring follows.
M4A-40 gate, best-payback highlight (Economy 2026-10-16). python3 m4a_gate40.py <csv> [s15|casual]
Bots on m4_sim (table costs per row: farm_cost, hens_cost, egg_value_cost, collection_cost):
 greedy   : TR-5 reference.
 farmonly : Farm when affordable; Collection by the M4A-39 tap rule.
 highlight: like the game's highlightPick (src/ui/tracks-ui.ts): among AFFORDABLE Hens/Egg value/Farm rows, the best payback
            (payback = cost / gain in income/s; bundle look-ahead up to 3 buys starting with that row; ties lower cost,
            then Farm > Hens > Egg value). Buys it as soon as one is affordable. Collection by the same tap rule.
Pass: farmonly median L@30 <= greedy median - 3; highlight L@30 in L18-22 (median AND >= 24/30)."""
import os, sys, csv, math, statistics as st
P = os.path.abspath(sys.argv[1]); os.environ['ECON_CSV'] = P; model = sys.argv[2] if len(sys.argv) > 2 else 's15'
sys.path.insert(0, '/workspace/egg-farm-studio/product/farm/m4'); import m4_sim as m
R = list(csv.DictReader(open(P))); hc = [float(r['hens_cost']) for r in R]; vc = [float(r['egg_value_cost']) for r in R]; bc = m.cost
m.TUNE.update(hcap=int(float(R[0]['hens_cap_over_farm'])), vcap=int(float(R[0]['egg_value_cap_over_farm'])))
m.cost = lambda k, L, T=m.TUNE: math.inf if L >= 30 else hc[int(L)] if k == 'h' else vc[int(L)] if k == 'v' else bc(k, L, T)
ORDER = 'fhv'
def payback(s, k, dem, T):
  base = m.inc(s, dem); best = math.inf
  def walk(st_, c, depth):
    nonlocal best
    g = m.inc(st_, dem) - base
    if g > 0: best = min(best, c / g)
    if depth == 0: return
    for k2 in 'fhvc':
      if m.capok(k2, st_, T): walk(m.bump(st_, k2), c + m.cost(k2, st_[m.IDX[k2]], T), depth - 1)
  walk(m.bump(s, k), m.cost(k, s[m.IDX[k]], T), 2)
  return best
orig = m.choose
def choose(policy, s, coins, dem, T=m.TUNE):
  if policy not in ('farmonly', 'highlight'): return orig(policy, s, coins, dem, T)
  F, H, V, C = s; af = lambda k: m.capok(k, s, T) and coins >= m.cost(k, s[m.IDX[k]], T)
  rows = 'f' if policy == 'farmonly' else 'hvf'
  opn = [m.cost(k, s[m.IDX[k]], T) for k in rows if m.capok(k, s, T)]
  if opn and m.row(C)['eggs_per_tap'] < m.hens_rate(H) and af('c') and m.cost('c', C, T) <= 0.5 * min(opn): return 'c'
  ok = [k for k in rows if af(k)]
  if not ok: return None
  if policy == 'farmonly': return ok[0]
  global CUR, LAST
  if sum(s) == 0 or (LAST is not None and sum(s) < sum(LAST)): CUR = None  # new run
  bought = CUR is not None and LAST is not None and s != LAST and s[m.IDX[CUR[0]]] != LAST[m.IDX[CUR[0]]]
  best = min(ok, key=lambda k: (payback(s, k, dem, T), m.cost(k, s[m.IDX[k]], T), ORDER.index(k)))
  if CUR is None or bought or CUR[0] not in ok: pick = best
  else:
    pc = payback(s, CUR[0], dem, T); pb = payback(s, best, dem, T)
    pick = best if pb <= 0.9 * pc else CUR[0]
    if pick != best: STATS['kept'] += 1
  if CUR is not None and pick != CUR[0] and not bought and CUR[0] in ok: STATS['switch'] += 1
  CUR = (pick,); LAST = m.bump(s, pick) if pick != 'c' else s
  return pick
CUR = None; LAST = None; STATS = {'kept': 0, 'switch': 0}
m.choose = choose
res = {}
for pol in ('greedy', 'farmonly', 'highlight'):
  rs = [m.run((pol, s, model, 1800, None)) for s in range(30)]
  L = [r['L30'] for r in rs]; res[pol] = L
  print(f"{pol:9s} {model}: L@30 median L{st.median(L):g} (min {min(L)}, max {max(L)}, in L18-22 {sum(18<=x<=22 for x in L)}/30); F18 median {st.median(r['reach'].get(18, math.inf) for r in rs)/60:.2f} min; worst gap {max(r['gap'][0] for r in rs)/60:.2f} min; mix {dict(sum((r['mix'] for r in rs), __import__('collections').Counter()))}")
a = st.median(res['farmonly']) <= st.median(res['greedy']) - 3
b = 18 <= st.median(res['highlight']) <= 22 and sum(18 <= x <= 22 for x in res['highlight']) >= 24
print(f"hysteresis: picks kept over a <10%-better row {STATS['kept']}, threshold switches {STATS['switch']}")
print(f"M4A-40 farm-only behind by >=3: {'PASS' if a else 'FAIL'} | highlight in band: {'PASS' if b else 'FAIL'} -> {'PASS' if a and b else 'FAIL'}")
