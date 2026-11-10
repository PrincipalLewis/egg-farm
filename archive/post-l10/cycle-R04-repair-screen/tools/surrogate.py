#!/usr/bin/env python3
"""DIAGNOSTIC first-order surrogate (NOT evidence, NOT a screen): per seed, per Farm level L,
t'(L) = max(0.25 t(L), t(L) + dSpend(L) / y(L)), y(L) = baseF[L] (passive sale coins) / t(L);
dSpend(L) = farm[L]' - farm[L] + sum over H/V purchases made while at Farm L of (cost' - cost) of that row.
Base = a pl.ts-identical trace (tools/trace.ts) of the base CSV. Purchases keep their base Farm level (no re-phasing model)."""
import csv, json, math, sys
from decimal import Decimal
PROFS = ['optimal', 'seller15', 'casual']
REF = {'optimal': 2116.0, 'seller15': 2100.2, 'casual': 2041.5}
BANDS = {'F11-15': (11, 16), 'F16-20': (16, 21), 'F21-25': (21, 26), 'F26-30': (26, 30)}  # PL-AC7 bands (card L966)
BEFORE = {'optimal': [5.53, 11.22, 10.75, 7.15], 'seller15': [5.69, 10.31, 10.79, 7.44], 'casual': [5.48, 9.02, 11.13, 7.65]}  # card L967-970 (min)


def cols(path):
    r = list(csv.DictReader(open(path)))
    return {c: [int(x[c]) for x in r] for c in ('farm_cost', 'hens_cost', 'egg_value_cost')}


def q(a, p):
    s = sorted(a); return s[max(0, math.ceil(Decimal(str(p)) * len(s)) - 1)]


def load(tracedir):
    return {p: json.load(open(f'{tracedir}/trace-{p}.json'))['prof'][p] for p in PROFS}


def predict(tr, base, cand):
    dF = [cand['farm_cost'][L] - base['farm_cost'][L] for L in range(31)]
    dH = [cand['hens_cost'][L] - base['hens_cost'][L] for L in range(31)]
    dV = [cand['egg_value_cost'][L] - base['egg_value_cost'][L] for L in range(31)]
    out = {}
    for p in PROFS:
        T = {L: [] for L in range(10, 30)}; tot = []; band = {b: [] for b in BANDS}
        for row in tr[p]:
            r = {int(k): v for k, v in row['reach'].items()}; bf = {int(k): v / 100 for k, v in row['baseF'].items()}
            ds = {L: dF[L] for L in range(10, 30)}
            for t, F, kind, lv in row['ev']:
                if 10 <= F < 30:
                    if kind == 'H': ds[F] += dH[lv]
                    elif kind == 'V': ds[F] += dV[lv]
            s = 0
            for L in range(10, 30):
                t0 = r[L + 1] - r[L]; y = bf.get(L, 0) / t0 if t0 > 0 else 0
                t1 = max(0.25 * t0, t0 + ds[L] / y) if y > 0 else t0
                T[L].append(t1)
                s += t1
            tot.append(s)
            for b, (a, z) in BANDS.items(): band[b].append(sum(T[L][-1] for L in range(a, z)))
        P50 = {L: q(T[L], .5) for L in T}; P95 = {L: q(T[L], .95) for L in T}
        out[p] = {'P50': P50, 'P95': P95, 'tstep': {L: round(P50[L] / P50[L - 1], 3) for L in range(11, 30)},
                  'tot': q(tot, .5), 'tot_d': q(tot, .5) / REF[p] - 1,
                  'band_d': {b: q(band[b], .5) / (BEFORE[p][i] * 60) - 1 for i, b in enumerate(BANDS)}}
    return out


def score(pred, m2=2.0, m95=180.0):
    """violations: sum of excess over bars, plus PL-AC3 excess beyond +-0.10."""
    v = 0
    for p, o in pred.items():
        v += sum(max(0, o['tstep'][L] - m2) * 100 for L in o['tstep'])
        v += sum(max(0, o['P95'][L] - m95) for L in o['P95'])
        v += max(0, abs(o['tot_d']) - 0.10) * 1000
    return v


if __name__ == '__main__':
    tr = load(sys.argv[1]); base = cols(sys.argv[2])
    for c in sys.argv[3:]:
        pr = predict(tr, base, cols(c))
        print(c, 'score', round(score(pr), 1))
        for p, o in pr.items():
            print(f" {p} tot {o['tot']:.0f} ({o['tot_d']:+.3f}) AC1>2 {[L for L,v in o['tstep'].items() if v > 2]} AC2>180 {[(L, round(v)) for L,v in o['P95'].items() if v > 180]}")
