"""AC6 check: product/economy.csv vs M1-R1 formulas + P1q/P3 (QA, independent; P1q per product/economy-p1q-diff.md, Oct 15)."""
import csv, math, sys
R = list(csv.DictReader(open(sys.argv[1] if len(sys.argv) > 1 else "../product/economy.csv")))
bad = []
for r in R:
    L = int(r["level"]); eps = 1.5 if L == 0 else 0.2 * (5 + 5 * L)  # P3: L0 starter nest 1.5 eggs/s
    iv = max(1.5, round(5 * 0.95 ** L, 2)); k = eps * iv  # P1q v2 (economy-p1q-diff.md, 23:48): interval max(1.5, round(5*0.95^F,2)); demand 0.8/1.6 x eps x new interval
    exp = dict(collection_cost=math.floor(10 * 1.6 ** L), eggs_per_tap=5 + 5 * L, farm_cost=math.floor(100 * 1.35 ** L),
               hens=5 + 5 * L, eggs_per_sec=eps, coop_capacity=50 + 50 * L, egg_price=round(1 + 0.05 * L, 2),
               customer_interval_s=iv, demand_min=math.ceil(0.8 * k - 1e-9), demand_max=math.ceil(1.6 * k - 1e-9),
               offline_eggs_per_sec=math.floor(0.25 * eps * 100 + 0.5) / 100, offline_max_eggs_2h=math.floor(7200 * 0.25 * eps),
               customer_patience_s=30, queue_max=min(10, 6 + L // 5), first_customer_s=10,
               collection_price_bonus=round(0.12 * L, 2))
    for c, v in exp.items():
        if abs(float(r[c]) - v) > 1e-6: bad.append((L, c, r[c], v))
print(f"rows {len(R)}; mismatches: {len(bad)}")
for b in bad: print("  L%d %s csv=%s expected=%s" % b)
# --- M2 worker columns (v1.1, product/economy.md) ---
CONST = dict(w1_unlock_farm=3, w1_every_s=1, w1_tired_every_s=3, w2_unlock_farm=7, w2_every_s=2, w2_tired_every_s=4,
             w3_unlock_farm=8, w3_demand_mult=1.25, w3_tired_demand_mult=1.1, w4_tier_cost_share=0.5, w4_tired_bonus_share=0.5,
             w4_asleep_bonus_share=0.15, energy_start_pct=100, drain_s_per_pct=9, tired_below_pct=30, yawn_at_pct=40,
             manage_cooldown_s=30, manage_all_min_workers=3, unpaid_resume_wage_min=1, coop_full_tip_s=10)
TIERS = [(18, 1.5), (19, 2.0), (21, 2.5), (22, 3.0), (24, 4.0)]
FC = {int(r["level"]): int(r["farm_cost"]) for r in R}
wb = []
for r in R:
    L = int(r["level"])
    for c, v in CONST.items():
        if abs(float(r[c]) - v) > 1e-9: wb.append((L, c, r[c], v))
    t = sum(1 for f, _ in TIERS if L >= f)
    exp = dict(w1_cost=40 if L >= 3 else 0, w1_wage_per_min=0.25 * L if L >= 3 else 0, w2_cost=150 if L >= 7 else 0,
               w2_wage_per_min=0.5 * L if L >= 7 else 0, w3_cost=800 if L >= 8 else 0, w4_tier=t,
               w4_price_mult=TIERS[t - 1][1] if t else 1.0, w4_tier_cost=math.floor(0.5 * FC[TIERS[t - 1][0]]) if t else 0)
    for c, v in exp.items():
        if abs(float(r[c]) - v) > 1e-6: wb.append((L, c, r[c], v))
wcols = [c for c in R[0] if c.startswith(("w1_", "w2_", "w3_", "w4_")) or c in CONST]
print(f"worker columns {len(wcols)} (expect 28); worker mismatches: {len(wb)}")
for b in wb: print("  L%d %s csv=%s expected=%s" % b)
sys.exit(1 if bad or wb or len(wcols) != 28 else 0)
