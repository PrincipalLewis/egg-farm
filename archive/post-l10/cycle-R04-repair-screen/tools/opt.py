#!/usr/bin/env python3
"""DIAGNOSTIC surrogate search (NOT evidence): random local search over tunables against tools/surrogate.py, emitting gen.py
spec JSONs. Constraints enforced: farm steps L11..29 in (1.00,1.30], gen.py V5 no-sawtooth, hens/EV strictly rising with row 13
and row 30 fixed. usage: opt.py <tracedir> <basecsv> <outspec.json> <seed> <iters> [m95] [m2] [totm] [fixfarm.json]"""
import json, math, random, sys
from fractions import Fraction
sys.path.insert(0, __import__('os').path.dirname(__file__))
import surrogate as S
tr = S.load(sys.argv[1]); base = S.cols(sys.argv[2]); out = sys.argv[3]; rng = random.Random(int(sys.argv[4])); N = int(sys.argv[5])
M95 = float(sys.argv[6]) if len(sys.argv) > 6 else 172; M2 = float(sys.argv[7]) if len(sys.argv) > 7 else 1.93; TM = float(sys.argv[8]) if len(sys.argv) > 8 else 0.085
RLO = float(__import__('os').environ.get('RLO', '0.4')); RHI = float(__import__('os').environ.get('RHI', '2.0')); JMP = float(__import__('os').environ.get('JMP', '1.8'))
BM = float(__import__('os').environ.get('BM', '0.18'))
FIXFARM = json.load(open(sys.argv[9])) if len(sys.argv) > 9 else None


def feasible(c):
    f = c['farm_cost']
    st = [Fraction(f[L], f[L - 1]) for L in range(11, 30)]
    if any(not (1 < s <= Fraction(13, 10)) for s in st): return False
    for i in range(1, 18):
        if st[i] < st[i - 1] and st[i + 1] - st[i] > Fraction(1, 20): return False
    for k in ('hens_cost', 'egg_value_cost'):
        v = c[k]
        if any(v[L] <= v[L - 1] for L in range(14, 31)): return False
        if any(v[L] > JMP * v[L - 1] for L in range(14, 30)): return False  # regulariser: no >1.8x row jump (surrogate keeps purchase phase)
        if any(not (RLO * base[k][L] <= v[L] <= RHI * base[k][L]) for L in range(14, 30)): return False  # stay near the traced base
    return True


def obj(c):
    pr = S.predict(tr, base, c); v = 0
    for p, o in pr.items():
        v += sum(max(0, o['tstep'][L] - M2) * 200 for L in o['tstep'])
        v += sum(max(0, o['P95'][L] - M95) for L in o['P95'])
        v += max(0, -o['tot_d'] - TM) * 3000 + max(0, o['tot_d'] - TM) * 3000
        v += sum(max(0, abs(d) - BM) * 1000 for d in o['band_d'].values())
    return v, pr


c = {k: list(v) for k, v in base.items()}
v = 1368
for L in range(11, 30): v = int(v * Fraction(129, 100)); c['farm_cost'][L] = v
if FIXFARM:
    for L, x in FIXFARM.items(): c['farm_cost'][int(L)] = x
assert feasible(c), 'start infeasible'
best, _ = obj(c); T0 = 3.0
for it in range(N):
    k = rng.choice(['farm_cost'] * (0 if FIXFARM else 2) + ['hens_cost', 'egg_value_cost'])
    rows = range(11, 30) if k == 'farm_cost' else range(14, 30)
    n = c.copy(); n[k] = list(c[k])
    if rng.random() < 0.3:  # block move
        a = rng.choice(rows); b = min(29, a + rng.randint(1, 4)); f = math.exp(rng.gauss(0, 0.08))
        for L in range(a, b + 1): n[k][L] = max(1, int(round(n[k][L] * f)))
    else:
        L = rng.choice(rows); n[k][L] = max(1, int(round(n[k][L] * math.exp(rng.gauss(0, 0.12)))))
    if not feasible(n): continue
    sc, _ = obj(n); T = T0 * (1 - it / N) + 1e-3
    if sc <= best or rng.random() < math.exp((best - sc) / T):
        c, best = n, sc
    if it % 2000 == 0: print(it, round(best, 1), flush=True)
sc, pr = obj(c)
spec = {'id': out, 'farm_cost': {str(L): c['farm_cost'][L] for L in range(11, 30)},
        'hens_cost': {str(L): c['hens_cost'][L] for L in range(14, 30)}, 'egg_value_cost': {str(L): c['egg_value_cost'][L] for L in range(14, 30)}}
json.dump({'spec': spec, 'score': sc, 'pred': {p: {'tot': o['tot'], 'tot_d': o['tot_d'], 'P95': o['P95'], 'tstep': o['tstep']} for p, o in pr.items()}}, open(out, 'w'), indent=0)
print('final', round(sc, 2))
for p, o in pr.items(): print(f" {p} tot {o['tot']:.0f} ({o['tot_d']:+.3f}) maxP95 {max(o['P95'].values()):.0f}@L{max(o['P95'], key=o['P95'].get)} maxstep {max(o['tstep'].values())} bands {[round(x,3) for x in o['band_d'].values()]}")
