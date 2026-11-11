"""QA independent balance sim (v3, economy M1-R1). Reads product/economy.csv only (no Product code).
Model (core-loop-spec AC1-AC4, AC7 + HoP rulings 2026-10-15), 0.1 s ticks:
 coop fills at eggs_per_sec, capped; tap Collect 1/s (floor). Customers: first at first_customer_s, then every
 customer_interval_s (timer never pauses; optional Poisson). Arrival into a full queue (queue size from CSV queue_max,
 or --queue-base/--queue-step override) -> customer_lost(full_queue). Patience from arrival, not reset by sales.
 Timeout with 0 bought -> customer_lost(timeout); timeout after buying >=1 -> customer_partial. Customer leaves when fully served.
 Sell all every --sell-every s (front to back, partial fills), price = round(egg_price*(1+collection_price_bonus[C]),2), coins half-up.
 Purchases right after each sell. Policies: seller15 (Farm if affordable, else Collection if cost <= 50% next Farm cost), cheapest.
Usage: python3 balance_sim.py [--policy seller15|cheapest|both] [--seeds 20] [--demand-scale 1.0] [--poisson] [--sell-every 15]"""
import csv, math, random, argparse, statistics as st
from decimal import Decimal, ROUND_HALF_UP
ap = argparse.ArgumentParser()
ap.add_argument("--csv", default="../product/economy.csv"); ap.add_argument("--seeds", type=int, default=20)
ap.add_argument("--policy", default="both"); ap.add_argument("--secs", type=int, default=2400)
ap.add_argument("--sell-every", type=float, default=15); ap.add_argument("--demand-scale", type=float, default=1.0)
ap.add_argument("--poisson", action="store_true")
ap.add_argument("--queue-base", type=int); ap.add_argument("--queue-step", type=int, default=10); ap.add_argument("--queue-cap", type=int, default=5)
A = ap.parse_args()
R = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(open(A.csv))]; MAXL = len(R) - 1
def cents(x): return float(Decimal(str(x)).quantize(Decimal("0.01"), ROUND_HALF_UP))
def qmax(f): return min(A.queue_cap, A.queue_base + f // A.queue_step) if A.queue_base is not None else int(R[f]["queue_max"])
def price(f, c): return round(R[f]["egg_price"] * (1 + R[c]["collection_price_bonus"]), 2)

def run(policy, seed, a=A):
    rng = random.Random(seed); c = f = 0; coop = 0.0; basket = 0; coins = 0.0
    q = []; nxt = R[0]["first_customer_s"]; tap_t = 1.0; sell_t = a.sell_every
    reach = {0: 0.0}; buys = []; L = dict(spawned=0, full_queue=0, timeout=0, partial=0)
    for i in range(1, int(a.secs * 10) + 1):
        t = i / 10; r = R[f]
        coop = min(r["coop_capacity"], coop + r["eggs_per_sec"] * 0.1)
        while t >= nxt - 1e-9:
            L["spawned"] += 1
            if len(q) >= qmax(f): L["full_queue"] += 1
            else:
                d = max(1, round(rng.randint(int(r["demand_min"]), int(r["demand_max"])) * a.demand_scale))
                q.append({"want": d, "leave": nxt + r["customer_patience_s"], "bought": 0})
            nxt += rng.expovariate(1 / r["customer_interval_s"]) if a.poisson else r["customer_interval_s"]
        for x in [x for x in q if x["leave"] <= t + 1e-9]:
            L["partial" if x["bought"] else "timeout"] += 1; q.remove(x)
        if t >= tap_t - 1e-9:
            tap_t += 1; m = min(math.floor(coop), R[c]["eggs_per_tap"]); coop -= m; basket += m
        if t >= sell_t - 1e-9:
            sell_t += a.sell_every
            for x in list(q):
                if basket <= 0: break
                k = min(basket, x["want"]); basket -= k; x["want"] -= k; x["bought"] += k
                coins = cents(coins + k * price(f, c))
                if x["want"] == 0: q.remove(x)
            while True:
                fc = R[f]["farm_cost"] if f < MAXL else math.inf; cc = R[c]["collection_cost"] if c < MAXL else math.inf
                if policy == "seller15":
                    if coins >= fc: k = "f"
                    elif coins >= cc and cc <= 0.5 * fc: k = "c"
                    else: break
                else:
                    if coins < min(fc, cc): break
                    k = "c" if cc <= fc else "f"
                if k == "f": coins = cents(coins - fc); f += 1; reach[f] = t
                else: coins = cents(coins - cc); c += 1
                buys.append((t, k, c, f))
        if coins < 0 or not math.isfinite(coins): raise SystemExit(f"NUMERIC FLAG t={t} coins={coins}")
    lvl = lambda s: max(l for l, tt in reach.items() if tt <= s)
    return dict(first=buys[0][0] if buys else None, u5=sum(b[0] <= 300 for b in buys), f10=lvl(600), f30=lvl(1800),
                tF10=reach.get(10), tF18=reach.get(18), c=c, basket=basket, **L)

def sp(v, fmt="{:.1f}"):
    w = [x for x in v if x is not None]; miss = len(v) - len(w)
    return ("n/r" if not w else "/".join(fmt.format(x) for x in (min(w), st.median(w), max(w)))) + (f" ({miss} n/r)" if miss and w else "")
def evaluate(a=A, label=None):
    pols = ["seller15", "cheapest"] if a.policy == "both" else [a.policy]; res = {}
    print(f"\n## {label or 'run'}: seeds={a.seeds} sell_every={a.sell_every}s demand_scale={a.demand_scale} poisson={a.poisson}  (min/median/max)")
    for p in pols:
        rs = [run(p, s, a) for s in range(a.seeds)]; res[p] = rs
        pct = lambda k: sp([100 * r[k] / max(1, r["spawned"]) for r in rs])
        print(f"{p:9s} first {sp([r['first'] for r in rs],'{:.0f}')}s | upg@5m {sp([r['u5'] for r in rs],'{:.0f}')} | F@10m {sp([r['f10'] for r in rs],'{:.0f}')} | F@30m {sp([r['f30'] for r in rs],'{:.0f}')}"
              f" | t(F10) {sp([r['tF10'] and r['tF10']/60 for r in rs])}m | t(F18) {sp([r['tF18'] and r['tF18']/60 for r in rs])}m | C@end {sp([r['c'] for r in rs],'{:.0f}')}"
              f" | lost full_queue {pct('full_queue')}% timeout {pct('timeout')}% partial {pct('partial')}% | basket@end {sp([r['basket'] for r in rs],'{:.0f}')}")
    if "seller15" in res:
        s = res["seller15"]; m = lambda k, rs: st.median([r[k] for r in rs])
        chk = [("first upgrade <=30 s", m("first", s) <= 30),
               ("upgrades @5m >=9 (target 10)", m("u5", s) >= 9),
               ("F10 within 8-12 min", all(r["tF10"] is not None for r in s) and 8 <= m("tF10", s) / 60 <= 12),
               ("F18 within 24-36 min", all(r["tF18"] is not None for r in s) and 24 <= m("tF18", s) / 60 <= 36)]
        if "cheapest" in res:
            ch = res["cheapest"]; r10 = m("f10", ch) / m("f10", s); r30 = m("f30", ch) / m("f30", s)
            chk += [(f"cheapest F@10m >=70% of seller ({r10:.0%})", r10 >= 0.7), (f"cheapest F@30m >=70% of seller ({r30:.0%})", r30 >= 0.7)]
        for n, ok in chk: print(f"  {'PASS' if ok else 'FAIL'}  {n}")
    return res
if __name__ == "__main__": evaluate()
