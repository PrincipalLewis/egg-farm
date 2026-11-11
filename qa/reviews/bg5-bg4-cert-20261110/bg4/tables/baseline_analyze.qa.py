#!/usr/bin/env python3
"""Post-L10 baseline tables from out/raw-<prof>.json (pl.ts). Conventions = tests/pacing-guards.ts:
time on level n = reach(n+1) - reach(n); quantile = nearest rank s[ceil(p*n)-1]; gap(n) = longest nothing-affordable
stretch (any purchasable row, harness candidates()) that STARTS while at Farm level n (pinned G4 range F10..max-1)."""
import json, math, csv, sys
CSV = '/workspace/egg-farm-studio/qa/reviews/bg5-bg4-cert-20261110/bg4/s00-copy/cand.csv'
FC = [float(r['farm_cost']) for r in csv.DictReader(open(CSV))]
q = lambda a, p: sorted(a)[min(len(a) - 1, max(0, math.ceil(p * len(a)) - 1))]
PROFS = ('optimal', 'seller15', 'casual'); BANDS = {'F11-15': range(11, 16), 'F16-20': range(16, 21), 'F21-25': range(21, 26), 'F26-30': range(26, 31)}
out = {}; md = []
for pf in PROFS:
  d = json.load(open(f'out/raw-{pf}.json')); assert d['sha256'].startswith('a8c4e268') and d['seeds'] == [1, 200] and d['T'] == 4000
  P = d['prof'][pf]; rows = P['rows']; assert P['parityMismatches'] == 0 and len(rows) == 200
  reach = [{int(k): v for k, v in r['reach'].items()} for r in rows]; gapF = [{int(k): v for k, v in r['noAffByF'].items()} for r in rows]
  assert all(30 in r for r in reach), 'not every seed reaches L30'
  g4 = [r['longestNoAff'] for r in rows]
  o = {'G4_any_F10_29_P50_P95_worst': [q(g4, .5), q(g4, .95), max(g4)], 'spanBuy_total': sum(r['spanBuy'] for r in rows), 'spanFarm_total': sum(r['spanFarm'] for r in rows), 'level': {}, 'band': {}}
  for L in range(10, 31):
    arr = [r[L] for r in reach]; e = {'arrive_P50_min': round(q(arr, .5) / 60, 2), 'farm_cost_row': FC[L]}
    if L < 30:
      tl = [r[L + 1] - r[L] for r in reach]; g = [x.get(L, 0) for x in gapF]
      e.update(time_P50=q(tl, .5), time_P95=q(tl, .95), time_worst=max(tl), gap_P50=q(g, .5), gap_P95=q(g, .95), gap_worst=max(g), gap_P95_over_180=q(g, .95) > 180)
      if L > 10:
        e['cost_step'] = round(FC[L] / FC[L - 1], 3); pv = out.get('_p', {})
        e['time_step_P50ratio'] = round(e['time_P50'] / o['level'][L - 1]['time_P50'], 3) if o['level'][L - 1]['time_P50'] else None
        rs = [(r[L + 1] - r[L]) / (r[L] - r[L - 1]) for r in reach if r[L] - r[L - 1] > 0]
        e['time_step_perseed_P95'] = round(q(rs, .95), 3); e['time_step_perseed_worst'] = round(max(rs), 3); e['seeds_step_over_2x'] = sum(1 for x in rs if x > 2)
        e['time_over_2x_prev'] = (e['time_step_P50ratio'] or 0) > 2
    o['level'][L] = e
  for bn, rg in BANDS.items():
    lv = [L for L in rg if L < 30]
    bg = [max(x.get(L, 0) for L in lv) for x in gapF]; bt = [r[min(rg.stop, 30)] - r[rg.start] for r in reach]
    o['band'][bn] = {'levels_with_gap_metric': f'L{lv[0]}-L{lv[-1]}', 'gap_P50': q(bg, .5), 'gap_P95': q(bg, .95), 'gap_worst': max(bg),
                     'time_P50_min': round(q(bt, .5) / 60, 2), 'time_P95_min': round(q(bt, .95) / 60, 2), 'span': f'reach(L{rg.start})->reach(L{min(rg.stop, 30)})'}
  out[pf] = o
json.dump(out, open('out/baseline.json', 'w'), indent=1)
f = lambda x: f'{x:g}' if isinstance(x, (int, float)) else str(x)
for pf in PROFS:
  o = out[pf]; md.append(f'\n## {pf} (flags-off CFG none, seeds 1-200, T 4000 s; G4 any-row F10-29 P50/P95/worst = {"/".join(map(f, o["G4_any_F10_29_P50_P95_worst"]))} s)\n')
  md.append('| L | arrive P50 (min) | farm_cost row L (to L+1) | cost step | time on L P50/P95/worst (s) | time step P50 ratio | per-seed step P95/worst (seeds >2x) | gap P50/P95/worst (s) | flags |')
  md.append('|---|---|---|---|---|---|---|---|---|')
  for L in range(11, 31):
    e = o['level'][L]
    if L == 30: md.append(f'| 30 | {e["arrive_P50_min"]} | {f(e["farm_cost_row"])} (not buyable, maxLevel 30) | — | n/a (max level) | — | — | n/a (outside F10..max-1) | — |'); continue
    fl = (['P95 gap >180'] if e['gap_P95_over_180'] else []) + (['time >2x prev'] if e['time_over_2x_prev'] else [])
    md.append(f'| {L} | {e["arrive_P50_min"]} | {f(e["farm_cost_row"])} | ×{e["cost_step"]} | {f(e["time_P50"])}/{f(e["time_P95"])}/{f(e["time_worst"])} | ×{e["time_step_P50ratio"]} | ×{e["time_step_perseed_P95"]}/×{e["time_step_perseed_worst"]} ({e["seeds_step_over_2x"]}) | {f(e["gap_P50"])}/{f(e["gap_P95"])}/{f(e["gap_worst"])} | {"; ".join(fl) or "—"} |')
  md.append('\n| band | gap P50/P95/worst (s), per-seed max over band | band time P50/P95 (min) |\n|---|---|---|')
  for bn, b in o['band'].items(): md.append(f'| {bn} ({b["levels_with_gap_metric"]}; {b["span"]}) | {f(b["gap_P50"])}/{f(b["gap_P95"])}/{f(b["gap_worst"])} | {b["time_P50_min"]}/{b["time_P95_min"]} |')
open('out/tables.md', 'w').write('\n'.join(md) + '\n'); print('\n'.join(md))
