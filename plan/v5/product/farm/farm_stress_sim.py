"""Farm Upgrades pacing stress test (Monte Carlo) — M1-R1. PM, Farm Upgrades, 2026-10-15.
ALL economy values are read from product/economy.csv (single source of truth); no formulas are hard-coded here,
so the sim cannot drift from the shipped table. v1 version kept as farm_stress_sim_v1.py (superseded).
Mechanics follow product/sim/economy_sim.py (canonical) and core-loop-spec AC3/AC7:
 dt ticks; coop fills at eggs_per_sec capped at coop_capacity; Collect taps at `taps`/s moving min(floor(coop), eggs_per_tap);
 first customer at first_customer_s, then every customer_interval_s(F) (or exponential if poisson); arrival timer never pauses;
 arrival into a full queue (queue_max(F)) is lost; patience from arrival; demand uniform int [demand_min, demand_max] at the
 Farm level when spawned, x demand_scale (rounded, >=1; same as qa/balance_sim.py); Sell all every sell_every s, front to back,
 partial fills stay queued; price = round(egg_price[F] x (1 + collection_price_bonus[C]), 2); coins half-up to cents.
Policies: seller15 (AC7: Farm if affordable, else Collection if cost <= 50% next Farm cost) and cheapest (cheapest affordable).
Usage: python3 farm_stress_sim.py [--seeds 100] > sim_results_v3.txt"""
import csv, math, os, random, statistics as st, argparse
from decimal import Decimal, ROUND_HALF_UP
HERE = os.path.dirname(os.path.abspath(__file__))
CSV = os.environ.get('ECON_CSV') or os.path.join(HERE, '..', 'economy.csv')  # ECON_CSV=economy_p1q.csv for variant runs (canonical file untouched)
R = [{k: float(v) for k, v in row.items()} for row in csv.DictReader(open(CSV))]
MAXL = len(R) - 1
def cents(x): return float(Decimal(str(x)).quantize(Decimal('0.01'), ROUND_HALF_UP))
def price(f, c): return round(R[f]['egg_price'] * (1 + R[c]['collection_price_bonus']), 2)

def run(seed, T=2400, dt=0.1, taps=1.0, poisson=False, sell_every=15, dem_scale=1.0, policy='seller15'):
  rng = random.Random(seed); c = f = 0; coop = 0.0; basket = 0; coins = 0.0; q = []
  nxt = R[0]['first_customer_s']; tap_t = 1.0 / taps; sell_t = sell_every
  reach = {0: 0.0}; spawned = lost = 0; n = int(round(T / dt))
  for i in range(1, n + 1):
    t = round(i * dt, 2); r = R[f]
    coop = min(r['coop_capacity'], coop + r['eggs_per_sec'] * dt)
    while t >= nxt:
      spawned += 1
      if len(q) < r['queue_max']:
        d = max(1, round(rng.randint(int(r['demand_min']), int(r['demand_max'])) * dem_scale)); q.append([d, nxt + r['customer_patience_s']])
      else: lost += 1
      nxt = round(nxt + (rng.expovariate(1 / r['customer_interval_s']) if poisson else r['customer_interval_s']), 2)
    if q and min(x[1] for x in q) <= t:
      lost += sum(1 for x in q if x[1] <= t); q = [x for x in q if x[1] > t]
    while t >= tap_t - 1e-9:
      tap_t += 1.0 / taps; m = min(math.floor(coop), int(R[c]['eggs_per_tap'])); coop -= m; basket += m
    if t >= sell_t - 1e-9:
      sell_t += sell_every
      for x in q[:]:
        if basket <= 0: break
        k = min(basket, x[0]); basket -= k; x[0] -= k; coins = cents(coins + k * price(f, c))
        if x[0] == 0: q.remove(x)
      while True:
        fc = R[f]['farm_cost'] if f < MAXL else math.inf; cc = R[c]['collection_cost'] if c < MAXL else math.inf
        if policy == 'seller15':
          if coins >= fc: kind = 'f'
          elif coins >= cc and cc <= 0.5 * fc: kind = 'c'
          else: break
        else:
          if coins < min(cc, fc): break
          kind = 'c' if cc <= fc else 'f'
        if kind == 'f': coins = cents(coins - fc); f += 1; reach[f] = t
        else: coins = cents(coins - cc); c += 1
      if f >= MAXL: break
  return dict(reach=reach, c=c, f=f, basket=basket, lost=lost / max(1, spawned))

LV = (5, 10, 15, 18, 20, 25, 30)
def summarize(name, seeds, **kw):
  res = [run(s, **kw) for s in range(seeds)]
  def cell(L):
    v = [r['reach'].get(L) for r in res]; ok = sorted(x for x in v if x is not None)
    if len(ok) < len(v) / 2: return f'n/r ({len(v)-len(ok)}/{len(v)} n/r)'
    allv = sorted(x if x is not None else math.inf for x in v)
    p = lambda q: allv[int(q * (len(allv) - 1))]
    f = lambda x: '>T' if x == math.inf else f'{x/60:.1f}'
    return f'{f(p(.1))}/{f(p(.5))}/{f(p(.9))}' + (f' (max {f(allv[-1])})' if L == 10 else '')
  T = kw.get('T', 2400)
  print(f'\n## {name}  [{seeds} seeds, horizon {T/60:.0f} min]')
  print('| ' + ' | '.join(f'L{L}' for L in LV) + ' | lost cust % | basket end (med) | C end (med) |')
  print('|' + '---|' * (len(LV) + 3))
  print('| ' + ' | '.join(cell(L) for L in LV) + f" | {100*st.mean(r['lost'] for r in res):.1f} | {st.median(r['basket'] for r in res):.0f} | {st.median(r['c'] for r in res):.0f} |")
  return res

if __name__ == '__main__':
  ap = argparse.ArgumentParser(); ap.add_argument('--seeds', type=int, default=100); ap.add_argument('--long-seeds', type=int, default=20)
  ap.add_argument('--long-T', type=int, default=6 * 3600); a = ap.parse_args()
  print(f'# Farm stress sim v3, economy table: {os.path.relpath(CSV, HERE)}. Cells: Farm L reached, p10/p50/p90 minutes; "n/r" = not reached in horizon.')
  S = a.seeds
  summarize('Baseline seller15 (AC7 player: tap 1/s, Sell all every 15 s)', S)
  summarize('Cheapest-first (AC7 robustness)', S, policy='cheapest')
  summarize('Active seller (Sell all every 1 s)', S, sell_every=1)
  summarize('Poisson arrivals', S, poisson=True)
  summarize('Low tapper 0.5 tap/s', S, taps=0.5)
  summarize('Low tapper 0.25 tap/s', S, taps=0.25)
  summarize('Casual seller (every 20 s)', S, sell_every=20)
  summarize('Demand -25%', S, dem_scale=0.75)
  summarize('Demand +25%', S, dem_scale=1.25)
  summarize('Worst combo (Poisson + every 20 s + demand -25%; = AC7-soft casual)', S, poisson=True, sell_every=20, dem_scale=0.75)
  summarize('Worst combo + 0.5 tap/s', S, poisson=True, sell_every=20, dem_scale=0.75, taps=0.5)
  long = summarize('LONG baseline seller15 (late curve)', a.long_seeds, T=a.long_T)
  print('\n## Late curve, baseline seller15 (median over long run): step time and income needed for <=180 s')
  print('| to L | step s | farm cost | implied income $/s | needed $/s | x current |'); print('|---|---|---|---|---|---|')
  for L in range(15, MAXL + 1):
    steps = [r['reach'][L] - r['reach'][L-1] for r in long if L in r['reach']]
    if len(steps) < len(long) / 2: print(f'| {L} | n/r | {R[L-1]["farm_cost"]:.0f} | | | |'); continue
    s = st.median(steps); cost = R[L-1]['farm_cost']; inc = cost / s
    print(f'| {L} | {s:.0f} | {cost:.0f} | {inc:.1f} | {cost/180:.1f} | {cost/180/inc:.2f} |')
