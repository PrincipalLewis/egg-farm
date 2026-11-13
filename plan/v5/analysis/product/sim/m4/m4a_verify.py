"""Verify Claude M4-A review items with our m4_active model. python3 m4a_verify.py"""
import csv, m4_active as a
TR = dict(a.TR, h_base=36, v_base=48)
C6 = list(csv.DictReader(open('/workspace/egg-farm-studio/product/economy.f1-m4cols.csv')))
p6 = lambda F, C: a.price(F, 0, 0, C, None)
p7 = lambda F, H, V, C: a.price(F, H, V, C, TR)
print('## B1/M2 sweep F0-30 x C0-30 (H=F)')
fail = []; hi = []
for F in range(31):
  for C in range(31):
    cap = min(30, F + 3); V = next((v for v in range(cap + 1) if p7(F, F, v, C) >= p6(F, C)), None)
    Vu = next(v for v in range(31) if p7(F, F, v, C) >= p6(F, C)) if any(p7(F, F, v, C) >= p6(F, C) for v in range(31)) else None
    if V is None: fail.append((F, C, p6(F, C), p7(F, F, cap, C), Vu))
    else:
      r = p7(F, F, V, C) / p6(F, C); s = a.hens_rate(F, TR) / float(C6[F]['eggs_per_sec'])
      if r > 1.5 or r*s > 1.5: hi.append((F, C, V, round(r, 3), round(r * s, 3)))
print('fails', len(fail)); print('min C-F among fails', min(c - f for f, c, *_ in fail) if fail else None)
for x in fail[:12]: print(' F,C,p6,p7@cap,Vneeded', x)
print('unreachable even uncapped:', [x[:2] for x in fail if x[4] is None][:10])
print('static >1.5 (price, price*supply):', len(hi), sorted(hi, key=lambda x: -x[4])[:8])
print('## fixture cents: exact vs rounded')
for F, C, V in [(10, 7, 7), (15, 12, 10), (20, 17, 13), (20, 17, 14)]:
  print(F, C, V, 'p6', p6(F, C), 'p7', p7(F, F, V, C), 'csv egg_price', C6[F]['egg_price'], 'csv cpb', C6[C]['collection_price_bonus'])
print('## M4 stack')
g = max(float(r['w4_price_mult']) for r in C6); print('grader max', g, 'jumbo*bal5*grader', 1.5 * 1.3 * g, 'without balanced', 1.5 * g)
print('F25 H=V=25 price', p7(25, 25, 25, 25), 'x grader', round(p7(25, 25, 25, 25) * float(C6[25]['w4_price_mult']), 2))
print('## M1 payback per track (s) at H=V=F, demand = mean/interval; supply=hens_rate')
for F in range(5, 30):
  r = C6[F]; dem = (float(r['demand_min']) + float(r['demand_max'])) / 2 / float(r['customer_interval_s'])
  inc = lambda F_, H, V: min(a.hens_rate(H, TR), (float(C6[F_]['demand_min']) + float(C6[F_]['demand_max'])) / 2 / float(C6[F_]['customer_interval_s'])) * p7(F_, H, V, F_ - 3)
  b = inc(F, F, F); pb = lambda c, d: round(c / d) if d > 1e-9 else 'inf'
  print(F, 'sup', a.hens_rate(F, TR), 'dem', round(dem, 2), 'Farm', pb(float(r['farm_cost']), inc(F + 1, F, F) - b), 'Hens', pb(float(r['hens_cost']), inc(F, F + 1, F) - b), 'Egg', pb(float(r['egg_value_cost']), inc(F, F, F + 1) - b))
