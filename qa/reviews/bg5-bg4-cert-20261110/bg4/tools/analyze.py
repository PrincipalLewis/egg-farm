#!/usr/bin/env python3
"""Post-L10 candidate metrics. Same conventions as baseline/analyze.py (pacing-guards.ts: time on L = reach(L+1)-reach(L);
nearest-rank quantiles; gap(L) = longest nothing-affordable stretch starting at Farm L). Usage: analyze.py <rawdir> <csv> [label]
reads <rawdir>/raw-<prof>*.json (seed chunks merged), writes <rawdir>/metrics.json and prints a summary."""
import json, math, csv, sys, glob, hashlib
D, CSV = sys.argv[1], sys.argv[2]; LABEL = sys.argv[3] if len(sys.argv) > 3 else D
SHA = hashlib.sha256(open(CSV, 'rb').read()).hexdigest()
FC = [float(r['farm_cost']) for r in csv.DictReader(open(CSV, newline=''))]
q = lambda a, p: sorted(a)[min(len(a) - 1, max(0, math.ceil(p * len(a)) - 1))]
PROFS = ('optimal', 'seller15', 'casual'); BANDS = {'F11-15': range(11, 16), 'F16-20': range(16, 21), 'F21-25': range(21, 26), 'F26-30': range(26, 31)}
out = {'csv': CSV, 'sha256': SHA, 'prof': {}}
for pf in PROFS:
  rows = []
  for fn in sorted(glob.glob(f'{D}/raw-{pf}*.json')):
    d = json.load(open(fn)); assert d['sha256'] == SHA, fn; assert d['T'] == 4000; rows += d['prof'][pf]['rows']
  rows.sort(key=lambda r: r['seed']); assert [r['seed'] for r in rows] == list(range(1, 201)), pf
  reach = [{int(k): v for k, v in r['reach'].items()} for r in rows]; gapF = [{int(k): v for k, v in r['noAffByF'].items()} for r in rows]
  miss = sum(1 for r in reach if 30 not in r); assert miss == 0, f'{pf}: {miss} seeds do not reach L30'
  g4 = [r['longestNoAff'] for r in rows]
  tot = [r[30] - r[10] for r in reach]
  o = {'G4': [q(g4, .5), q(g4, .95), max(g4)], 'tot10_30_P50_s': q(tot, .5), 'tot10_30_P95_s': q(tot, .95), 'level': {}, 'band': {}, 'gap_seeds_over_180': []}
  for L in range(10, 30):
    tl = [r[L + 1] - r[L] for r in reach]; g = [x.get(L, 0) for x in gapF]
    e = {'arrive_P50_min': round(q([r[L] for r in reach], .5) / 60, 2), 'fc': FC[L], 'tP50': q(tl, .5), 'tP95': q(tl, .95), 'tW': max(tl), 'gP50': q(g, .5), 'gP95': q(g, .95), 'gW': max(g)}
    if L > 10:
      e['cstep'] = round(FC[L] / FC[L - 1], 3); p = o['level'][L - 1]['tP50']; e['tstep'] = round(e['tP50'] / p, 3) if p else None
      rs = [(r[L + 1] - r[L]) / (r[L] - r[L - 1]) for r in reach if r[L] - r[L - 1] > 0]; e['seeds_over_2x'] = sum(1 for x in rs if x > 2)
    o['level'][L] = e
    for sd, x in zip(rows, gapF):
      if x.get(L, 0) > 180: o['gap_seeds_over_180'].append({'seed': sd['seed'], 'L': L, 'gap_s': x[L]})
  for bn, rg in BANDS.items():
    lv = [L for L in rg if L < 30]; bg = [max(x.get(L, 0) for L in lv) for x in gapF]; bt = [r[min(rg.stop, 30)] - r[rg.start] for r in reach]
    o['band'][bn] = {'gP50': q(bg, .5), 'gP95': q(bg, .95), 'gW': max(bg), 'tP50_min': round(q(bt, .5) / 60, 2), 'tP95_min': round(q(bt, .95) / 60, 2)}
  L = range(11, 30)
  o['bar_2x'] = [(l, o['level'][l]['tstep']) for l in L if (o['level'][l]['tstep'] or 0) > 2]
  o['bar_p95_180'] = [(l, o['level'][l]['tP95']) for l in L if o['level'][l]['tP95'] > 180]
  o['guard_band_gap'] = [(b, v['gP95']) for b, v in o['band'].items() if v['gP95'] > 180]
  o['maxstep_L11_29'] = [(l, o['level'][l]['tstep']) for l in range(11, 30) if (o['level'][l]['tstep'] or 0) > 2]  # 2x bar range L11-29 per D-HOP-15 (was L18-29)
  if 'mrLongest' in rows[0]:  # MEANINGFUL-ROW G4 (D-HOP-2026-10-30-49), flags-off approximation, range F10..max-1
    mr = [r['mrLongest'] for r in rows]; o['G4mr'] = [q(mr, .5), q(mr, .95), max(mr)]
    o['G4mr_worst_seeds'] = sorted(({'seed': r['seed'], 'L': int(max(r['mrByF'], key=lambda k: r['mrByF'][k])), 'gap_s': r['mrLongest']} for r in rows if r['mrByF']), key=lambda x: -x['gap_s'])[:10]
  o['G4_worst_seeds'] = sorted(({'seed': sd['seed'], 'L': max(x, key=x.get), 'gap_s': max(x.values())} for sd, x in zip(rows, gapF) if x), key=lambda x: -x['gap_s'])[:10]
  out['prof'][pf] = o
json.dump(out, open(f'{D}/metrics.json', 'w'), indent=1)
print(f'== {LABEL} sha {SHA[:8]}')
for pf in PROFS:
  o = out['prof'][pf]
  print(f'{pf:8s} G4 {o["G4"]} G4mr {o.get("G4mr")} tot10-30 P50 {o["tot10_30_P50_s"]:.0f}s  max tstep {max(o["level"][l]["tstep"] or 0 for l in range(11,30)):.2f}  >2x {o["bar_2x"]}  P95>180 {o["bar_p95_180"]}  bandgapP95 {[v["gP95"] for v in o["band"].values()]}')
  print('   tP50 ' + ' '.join(f'{l}:{o["level"][l]["tP50"]:.0f}' for l in range(11, 30)))
  print('   tP95 ' + ' '.join(f'{l}:{o["level"][l]["tP95"]:.0f}' for l in range(11, 30)))
