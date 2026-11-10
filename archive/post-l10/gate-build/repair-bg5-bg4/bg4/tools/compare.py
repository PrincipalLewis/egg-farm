#!/usr/bin/env python3
"""Before (a8c4e268, sweep/s00-base) vs after (candidate dir) tables + bar verdicts. Usage: compare.py <cand-dir> <out.md> [<out.json>]"""
import json, sys
C = '/workspace/egg-farm-studio/scratch/post-l10/cand'
B = json.load(open(f'{C}/sweep/s00-base/metrics.json')); A = json.load(open(f'{sys.argv[1]}/metrics.json'))
P = ('optimal', 'seller15', 'casual'); md = []; V = {}
f = lambda x: f'{x:g}' if isinstance(x, (int, float)) else str(x)
md.append(f'# Post-L10 candidate vs a8c4e268 (flags-off CFG none, seeds 1-200, T 4000 s)\n\nBefore sha256 {B["sha256"]}  \nAfter sha256 {A["sha256"]}\n')
for p in P:
  b, a = B['prof'][p], A['prof'][p]; v = {}
  tb, ta = b['tot10_30_P50_s'], a['tot10_30_P50_s']; v['total_pm10'] = (round(ta / tb - 1, 4), abs(ta / tb - 1) <= 0.10)
  v['2x_P50'] = [(L, a['level'][str(L)]['tstep']) for L in range(11, 30) if (a['level'][str(L)]['tstep'] or 0) > 2]
  v['P95_180'] = [(L, round(a['level'][str(L)]['tP95'], 1)) for L in range(11, 30) if a['level'][str(L)]['tP95'] > 180]
  v['bandgap_P95_180'] = [(k, x['gP95']) for k, x in a['band'].items() if x['gP95'] > 180]
  v['bandgap_worst_180'] = [(k, x['gW']) for k, x in a['band'].items() if x['gW'] > 180]  # D-HOP-2026-10-30-34 / PL-AC4c: blocks at final RC
  v['maxstep_L11_29'] = [(L, a['level'][str(L)]['tstep']) for L in range(11, 30) if (a['level'][str(L)]['tstep'] or 0) > 2]
  v['perlevel_pm20'] = [(L, round(a['level'][str(L)]['tP50'] / b['level'][str(L)]['tP50'] - 1, 3)) for L in range(11, 30) if abs(a['level'][str(L)]['tP50'] / b['level'][str(L)]['tP50'] - 1) > 0.20]
  v['perband_pm20'] = [(k, round(a['band'][k]['tP50_min'] / b['band'][k]['tP50_min'] - 1, 3)) for k in a['band'] if abs(a['band'][k]['tP50_min'] / b['band'][k]['tP50_min'] - 1) > 0.20]
  v['gap_seeds_over_180'] = a['gap_seeds_over_180']; V[p] = v
  md.append(f'\n## {p}\n\nTotal L10→L30 median: before {tb:.1f} s, after {ta:.1f} s ({100*(ta/tb-1):+.1f} %). G4 any-row P50/P95/worst: before {"/".join(map(f, b["G4"]))}, after {"/".join(map(f, a["G4"]))} s.\n')
  md.append('| L | farm_cost before → after | cost step after | time P50 before → after (Δ%) | time P95 before → after | time worst after | P50 ratio before → after | seeds >2× after | gap P95 before → after (worst after) |')
  md.append('|---|---|---|---|---|---|---|---|---|')
  for L in range(11, 30):
    x, y = b['level'][str(L)], a['level'][str(L)]
    md.append(f'| {L} | {f(x["fc"])} → {f(y["fc"])} | ×{y["cstep"]} | {x["tP50"]:.1f} → {y["tP50"]:.1f} ({100*(y["tP50"]/x["tP50"]-1):+.0f} %) | {x["tP95"]:.1f} → {y["tP95"]:.1f}{" **>180**" if y["tP95"] > 180 else ""} | {y["tW"]:.1f} | ×{x["tstep"]} → ×{y["tstep"]}{" **>2×**" if (y["tstep"] or 0) > 2 else ""} | {y["seeds_over_2x"]} | {f(x["gP95"])} → {f(y["gP95"])} ({f(y["gW"])}) |')
  md.append('\n| band | gap P50/P95/worst before → after (s) | band time P50 before → after (min) |\n|---|---|---|')
  for k in a['band']:
    x, y = b['band'][k], a['band'][k]
    md.append(f'| {k} | {x["gP50"]}/{x["gP95"]}/{x["gW"]} → {y["gP50"]}/{y["gP95"]}/{y["gW"]} | {x["tP50_min"]} → {y["tP50_min"]} ({100*(y["tP50_min"]/x["tP50_min"]-1):+.0f} %) |')
  md.append(f'\nVerdicts: total ±10 % {v["total_pm10"]}; P50 ≤2× prev fails {v["2x_P50"] or "none"}; P95 ≤180 fails {v["P95_180"] or "none"}; band gap P95 ≤180 fails {v["bandgap_P95_180"] or "none"}; band gap WORST ≤180 (blocking, PL-AC4c) fails {v["bandgap_worst_180"] or "none"}; max-step (L11-29, incl. the L18+ check) fails {v["maxstep_L11_29"] or "none"}; L18+ subset {[x for x in v["maxstep_L11_29"] if x[0] >= 19] or "none"}; per-level ±20 % outside {v["perlevel_pm20"] or "none"}; per-band ±20 % outside {v["perband_pm20"] or "none"}; gap seeds >180 s: {v["gap_seeds_over_180"] or "none"}')
open(sys.argv[2], 'w').write('\n'.join(md) + '\n')
if len(sys.argv) > 3: json.dump(V, open(sys.argv[3], 'w'), indent=1)
print(json.dumps(V))
