#!/usr/bin/env python3
# f1-gap.py <economy.f1.csv>: F1-GAP fixed values. Farm row 18 farm_cost=11076, row 19=18201; w4_tier_cost 5538 / 9100.
import csv,sys
rows={int(r['level']):r for r in csv.DictReader(open(sys.argv[1],encoding='utf-8-sig'))}
exp=[(18,'farm_cost',11076),(19,'farm_cost',18201),(18,'w4_tier_cost',5538),(19,'w4_tier_cost',9100)]; f=0
for L,col,v in exp:
    got=rows.get(L,{}).get(col); ok=got is not None and float(got)==v; f+=not ok
    print(f"{'PASS' if ok else 'FAIL'} F1-GAP level {L} {col} = {got} (want {v:,})")
print(f"SUMMARY {len(exp)-f}/{len(exp)}"); sys.exit(1 if f else 0)
