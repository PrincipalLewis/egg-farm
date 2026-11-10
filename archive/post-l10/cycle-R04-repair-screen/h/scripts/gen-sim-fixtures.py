"""Generate parity fixtures from the vendored, sha-pinned reference sim (vendor/economy-sim/sim/economy_sim.py, config 'f1').
Run: npm run gen-fixtures  -> tests/fixtures/economy_sim.json"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'vendor', 'economy-sim', 'sim'))
import economy_sim as m  # noqa: E402
e = m.Eco(m.F1)
import collection_cost_table as cct  # noqa: E402  M4.1 D-HOP-23: balance.collection.costTable when present (flag on); no-op otherwise
cct.apply(e, *cct.read_table())
N = 30
rows = [dict(level=L, collection_cost=e.ccost(L), eggs_per_tap=e.tap(L), farm_cost=e.fcost(L), hens=e.hens(L), eggs_per_sec=e.rate(L),
             coop_capacity=e.cap(L), egg_price=e.price(L), customer_interval_s=e.iv(L), demand_min=e.dmin(L), demand_max=e.dmax(L),
             queue_max=e.qmax(L), offline_max_eggs_2h=e.offline(L, 7200)) for L in range(N + 1)]
prices = [dict(F=f, C=c, cents=round(m.cents((e.p['price_base'] + e.p['price_per'] * f) * (1 + e.p['c_price_bonus'] * c)) * 100))
          for f in range(N + 1) for c in range(N + 1)]
offline = [dict(F=f, secs=s, eggs=e.offline(f, s)) for f in (0, 7, 30) for s in (-5, 0, 59, 60, 61, 3600, 7200, 7201, 100000)]
out = dict(source='vendor/economy-sim/sim/economy_sim.py F1', params={k: v for k, v in e.p.items() if k != 'name'}, rows=rows, prices=prices, offline=offline)
path = os.path.join(HERE, '..', 'tests', 'fixtures', 'economy_sim.json')
with open(path, 'w') as fh: json.dump(out, fh, indent=1)
print('wrote', path, len(rows), 'rows', len(prices), 'prices')
