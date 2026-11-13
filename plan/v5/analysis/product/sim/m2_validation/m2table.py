import json, statistics as st, sys
R = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'm2val.json'))
from collections import defaultdict
G = defaultdict(list)
for r in R: G[(r['label'], r['model'])].append(r)
base = {(r['model'], r['seed']): r for r in R if r['label'] == 'M1 (no workers)'}
def md(v):
  v = [x for x in v if x is not None]; return st.median(v) if v else None
f = lambda x: 'n/r' if x is None else f'{x/60:.1f}'
labels = list(dict.fromkeys(r['label'] for r in R))
for model in ('seller15', 'cheapest', 'casual'):
  print(f'\n### {model} (100 seeds, 2 h)\n| scenario | F10 | F18 | F20 | F25 | F10≤15m | F18≤45m | income ×M1 @F21 | max step F18→25 (min) | lost % | W1 fees $ | W2 wages $ |\n|---|---|---|---|---|---|---|---|---|---|---|---|')
  for lab in labels:
    rs = G[(lab, model)]; n = len(rs)
    t = lambda L: md([r['t'][str(L)] for r in rs])
    p10 = sum(1 for r in rs if r['t']['10'] and r['t']['10'] <= 900); p18 = sum(1 for r in rs if r['t']['18'] and r['t']['18'] <= 2700)
    ratio = md([r['inc21'] / base[(model, r['seed'])]['inc21'] if r['inc21'] and base[(model, r['seed'])]['inc21'] else None for r in rs])
    ms = md([r['maxstep'] for r in rs]); n25 = sum(1 for r in rs if not r['t']['25'])
    print(f"| {lab} | {f(t(10))} | {f(t(18))} | {f(t(20))} | {f(t(25))}{f' ({n25} n/r)' if n25 else ''} | {p10}% | {p18}% | {'—' if ratio is None else f'{ratio:.2f}'} | {f(ms)} | {100*md([r['lost'] for r in rs]):.0f} | {md([r['fees'] for r in rs]):.0f} | {md([r['wages'] for r in rs]):.0f} |")
