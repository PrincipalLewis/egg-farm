"""M2 recheck after M1 fix (no lay milestones): static first-minute income ratio v7/v6, H=F, grandfathered V. python3 m4a_m2_newhens.py"""
import csv, m4_active as a
TR = dict(a.TR, h_base=36, v_base=48)
R = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(open('/workspace/egg-farm-studio/product/economy.f1-m4cols.csv'))]
p6 = lambda F, C: a.price(F, 0, 0, C, None); p7 = lambda F, V, C: a.price(F, F, V, C, TR)
out = []
for F in range(31):
  r = R[F]; d = (r['demand_min'] + r['demand_max']) / 2 / r['customer_interval_s']
  for C in range(31):
    V = next(v for v in range(31) if p7(F, v, C) >= p6(F, C)); tap = R[C]['eggs_per_tap']
    i6 = min(r['eggs_per_sec'], d, tap) * p6(F, C); i7 = min(a.hens_rate(F, TR), d, tap) * p7(F, V, C)
    out.append((round(i7 / i6, 3), F, C, V, p6(F, C), p7(F, V, C)))
d = {(x[1], x[2]): x for x in out}
print('F12/C1', d[(12, 1)]); print('fixtures', d[(10, 7)], d[(15, 12)], d[(20, 17)])
print('>1.5:', sum(x[0] > 1.5 for x in out), 'top5:', sorted(out)[-5:][::-1])
