#!/usr/bin/env python3
"""DIAGNOSTIC: per-level composition of a trace: median time, income, mean spend by category (coins), H/V rows bought. usage: compose.py <tracedir> <csv> [profile] [levels]"""
import csv, json, sys, statistics as st
from collections import defaultdict, Counter
d, c = sys.argv[1], sys.argv[2]; p = sys.argv[3] if len(sys.argv) > 3 else 'casual'
rows = list(csv.DictReader(open(c)))
col = lambda k: [int(x[k]) for x in rows]
H, V, Fc, C = col('hens_cost'), col('egg_value_cost'), col('farm_cost'), col('collection_cost')
G = [int(x) for x in sorted({int(r['w4_tier_cost']) for r in rows if int(r['w4_tier_cost']) > 0})]
tr = json.load(open(f'{d}/trace-{p}.json'))['prof'][p]
for L in range(10, 30):
    ts, ys, sp, cnt = [], [], defaultdict(list), Counter()
    for r in tr:
        re = {int(k): v for k, v in r['reach'].items()}; t = re[L + 1] - re[L]; ts.append(t); ys.append(r['baseF'].get(str(L), 0) / 100 / t if t > 0 else 0)
        dd = defaultdict(int)
        for (tt, F, k, lv) in r['ev']:
            if F == L:
                dd[k[0]] += H[lv] if k == 'H' else V[lv] if k == 'V' else C[lv] if k == 'C' else G[lv] if k == 'G' else 0
                if k in 'HVCG': cnt[f'{k}{lv}'] += 1
        for k in 'HVCG': sp[k].append(dd[k])
    ts.sort()
    print(f"L{L} P50 {ts[99]:5.0f} P95 {ts[189]:5.0f} y {st.median(ys):6.0f} farm {Fc[L]:6d} H {st.mean(sp['H']):7.0f} V {st.mean(sp['V']):7.0f} C {st.mean(sp['C']):6.0f} G {st.mean(sp['G']):6.0f} | " + ' '.join(f'{k}:{v}' for k, v in sorted(cnt.items(), key=lambda x: -x[1]) if v >= 20))
