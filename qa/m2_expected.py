"""M2 expected values for energy / Grader / wage cases, derived from game/src/config/balance.json (workers block)
and product/economy.csv. Rerun after any balance change (e.g. v1.1 energy approval): python3 m2_expected.py [balance.json]"""
import json, math, csv, sys
from decimal import Decimal, ROUND_HALF_UP
B = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "../game/src/config/balance.json"))
R = {int(r["level"]): r for r in csv.DictReader(open("../product/economy.csv"))}
# Worker values now come from economy.csv (source of truth, R1); balance.json is only cross-checked.
X = R[30]; f = lambda c: float(X[c]); n = lambda c: int(float(X[c]))
E = dict(drain_s_per_pct=n("drain_s_per_pct"), tired_below_pct=n("tired_below_pct"), yawn_at_pct=n("yawn_at_pct"),
         manage_cooldown_s=n("manage_cooldown_s"), manage_all_min_workers=n("manage_all_min_workers"))
tiers, seen = [], 0
for L in sorted(R):
    t = int(float(R[L]["w4_tier"]))
    if t > seen: tiers.append(dict(farm=L, mult=float(R[L]["w4_price_mult"]))); seen = t
G = dict(tiers=tiers, tier_cost_share_of_farm_cost=f("w4_tier_cost_share"), tired_bonus_share=f("w4_tired_bonus_share"), asleep_bonus_share=f("w4_asleep_bonus_share"))
W = dict(market_hand=dict(unlock_farm=n("w1_unlock_farm"), hire_cost=n("w1_cost"), wage_per_farm_per_min=f("w1_wage_per_min")/30),
         coop_hand=dict(unlock_farm=n("w2_unlock_farm"), hire_cost=n("w2_cost"), wage_per_farm_per_min=f("w2_wage_per_min")/30),
         hawker=dict(unlock_farm=n("w3_unlock_farm"), hire_cost=n("w3_cost"), demand_mult=f("w3_demand_mult"), tired_demand_mult=f("w3_tired_demand_mult")))
BW = B["workers"]; BE = BW["energy"]
bj = {k: BE.get(k) for k in E}; bj["asleep_bonus_share"] = BW["grader"].get("asleep_bonus_share")
cs = dict(E, asleep_bonus_share=G["asleep_bonus_share"])
print("CSV vs balance.json workers:", "OK" if bj == cs else f"DIFF csv={cs} json={bj}")
ri = lambda x: int(Decimal(str(round(x, 9))).quantize(Decimal("1"), ROUND_HALF_UP))
c2 = lambda x: Decimal(str(x)).quantize(Decimal("0.01"), ROUND_HALF_UP)
V11 = dict(drain_s_per_pct=9, tired_below_pct=30, yawn_at_pct=40, manage_cooldown_s=30, manage_all_min_workers=3, asleep_bonus_share=0.15)
cur = dict(E, asleep_bonus_share=G.get("asleep_bonus_share"))
diff = {k: (cur.get(k), v) for k, v in V11.items() if cur.get(k) != v}
print("CONFIG CHECK vs approved v1.1:", "OK" if not diff else "MISMATCH (balance.json, v1.1) " + str(diff))
d, t = E["drain_s_per_pct"], E["tired_below_pct"]; y = E.get("yawn_at_pct"); mall = E.get("manage_all_min_workers")
print(f"ENERGY (drain {d} s/%, Tired < {t}%, cooldown {E['manage_cooldown_s']} s global)")
print(f"  E-1 hire 100% -> last Working tick at {t}% = {(100-t)*d:.0f} s; Tired at {t-1}% = {(101-t)*d:.0f} s; Asleep (0%) = {100*d:.0f} s ({100*d/60:.1f} min)")
print(f"  E-1b yawn cue at {y}% = {(100-y)*d:.0f} s" if y else "  E-1b yawn cue: key yawn_at_pct missing in balance.json")
print(f"  E-3b Manage all shown at >= {mall} hired workers (hidden at {mall-1}); refills all to 100%; shares the global cooldown" if mall else "  E-3b Manage all: key manage_all_min_workers missing in balance.json")
print(f"  E-3 Manage at t=0 accepted; at {E['manage_cooldown_s']-0.1:.1f} s rejected (any worker); at {E['manage_cooldown_s']:.1f} s accepted")
print("GRADER (one worker, multiplier replaces previous tier)")
for i, tr in enumerate(G["tiers"], 1):
    m = tr["mult"]; F = tr["farm"]; cost = math.floor(G["tier_cost_share_of_farm_cost"] * int(R[F]["farm_cost"]))
    tired = 1 + (m - 1) * G["tired_bonus_share"]; asleep = 1 + (m - 1) * G["asleep_bonus_share"]
    base = float(R[F]["egg_price"]) * (1 + float(R[10]["collection_price_bonus"]))
    print(f"  tier {i} @F{F}: cost ${cost:,}; mult working {m} / tired {tired:g} / asleep {asleep:g}; "
          f"unit price at F{F}/C10: ${c2(base*m)} / ${c2(base*tired)} / ${c2(base*asleep)} (no grader ${c2(base)})")
print("WAGES ($/min at Farm L; Working and Tired pay, Asleep/Unpaid don't)")
for k in ("market_hand", "coop_hand"):
    w = W[k]; print(f"  {k}: unlock F{w['unlock_farm']} hire ${w['hire_cost']}; " + ", ".join(f"F{F} ${w['wage_per_farm_per_min']*F:.2f}" for F in (w['unlock_farm'], 10, 18, 24, 30))
          + f"; per 60 s at F10 = ${w['wage_per_farm_per_min']*10:.2f}; Unpaid resumes at coins >= ${w['wage_per_farm_per_min']*10:.2f} (1 min) at F10")
h = W["hawker"]; print(f"HAWKER unlock F{h['unlock_farm']} ${h['hire_cost']}: draw 8 -> working {max(1, ri(8*h['demand_mult']))} / tired {max(1, ri(8*h['tired_demand_mult']))}; draw 16 -> {ri(16*h['demand_mult'])} / {ri(16*h['tired_demand_mult'])}")
