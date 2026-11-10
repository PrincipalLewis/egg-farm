#!/usr/bin/env python3
"""INFORMAL PL-AC1 / PL-AC2 (+ PL-AC3 total) from pl.ts raws, per Card #4 L874-890. Scratch, ac_claim NONE.
Uses tools/vendor copy of repair-bg5-bg4/pkg gatecommon (q nearest-rank, load_raws fail-closed identity/parity/seed checks, reach_map exact Decimal).
time on L = reach(L+1) - reach(L); PL-AC1 tstep = round(P50(L)/P50(L-1), 3) (Decimal ROUND_HALF_UP) <= 2.000, L 11..29;
PL-AC2 P95(time on L) <= 180.0, L 11..29; any seed not reaching L30 -> FAIL. PL-AC3: |P50(reach30-reach10)/ref - 1| <= 0.10.
usage: metrics.py <rundir> [--out metrics.json]"""
import json, os, sys
from decimal import Decimal, ROUND_HALF_UP
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vendor'))  # vendored copy, HoP 00:07 no pinned-dir use
import gatecommon as G

PROFS = ['optimal', 'seller15', 'casual']
REF_TOT = {'optimal': Decimal('2116.0'), 'seller15': Decimal('2100.2'), 'casual': Decimal('2041.5')}
LS = range(11, 30)


def compute(rundir):
    auth = G.authority()
    files = [os.path.join(rundir, f'raw-{p}.json') for p in PROFS]
    by, errs, meta = G.load_raws(files, PROFS, (1, 200), auth, False, 'run')
    res = {'informal': True, 'ac_claim': 'NONE', 'rundir': rundir, 'seeds': [1, 200], 'errors': errs, 'meta': meta, 'prof': {}}
    if errs:
        res['PL_AC1'] = res['PL_AC2'] = 'ERROR'; return res
    a1 = a2 = True
    for p in PROFS:
        times = {L: [] for L in range(10, 30)}; tots = []; unreached = []; over2 = {L: 0 for L in LS}
        for s, row in sorted(by[p].items()):
            r = G.reach_map(row)
            if any(L not in r for L in range(10, 31)):
                unreached.append(s); continue
            for L in range(10, 30):
                times[L].append(r[L + 1] - r[L])
            for L in LS:
                if (r[L] - r[L - 1]) > 0 and (r[L + 1] - r[L]) > 2 * (r[L] - r[L - 1]):
                    over2[L] += 1
            tots.append(r[30] - r[10])
        pr = {'unreached_L30': unreached, 'level': {}}
        if unreached:
            a1 = a2 = False; pr['note'] = 'seeds not reaching L30 -> FAIL'
            res['prof'][p] = pr; continue
        P50 = {L: G.q(times[L], 0.5) for L in times}
        for L in LS:
            raw = P50[L] / P50[L - 1]
            ts = raw.quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)
            p95 = G.q(times[L], 0.95)
            pr['level'][L] = {'P50': str(P50[L]), 'P95': str(p95), 'tW': str(max(times[L])), 'tstep': str(ts),
                              'ac1_ok': ts <= 2, 'ac2_ok': p95 <= 180, 'seeds_over_2x': over2[L]}
            a1 &= ts <= 2; a2 &= p95 <= 180
        pr['P50_L10'] = str(P50[10])
        tot = G.q(tots, 0.5); d = tot / REF_TOT[p] - 1
        pr['tot10_30_P50_s'] = str(tot); pr['total_pm10'] = [str(d.quantize(Decimal('0.0001'))), abs(d) <= Decimal('0.10')]
        pr['ac1_fail'] = [f'L{L} x{v["tstep"]}' for L, v in pr['level'].items() if not v['ac1_ok']]
        pr['ac2_fail'] = [f'L{L} {Decimal(v["P95"]).quantize(Decimal("0.1"))}s' for L, v in pr['level'].items() if not v['ac2_ok']]
        res['prof'][p] = pr
    res['PL_AC1'] = 'PASS-INFORMAL' if a1 else 'FAIL'
    res['PL_AC2'] = 'PASS-INFORMAL' if a2 else 'FAIL'
    res['PL_AC3'] = 'PASS-INFORMAL' if all(res['prof'][p].get('total_pm10', [0, False])[1] for p in PROFS) else 'FAIL'
    return res


def summary(res):
    out = [f"PL-AC1 {res['PL_AC1']}  PL-AC2 {res['PL_AC2']}  PL-AC3 {res.get('PL_AC3')}"]
    for e in res['errors']:
        out.append('ERROR ' + e)
    for p, pr in res['prof'].items():
        out.append(f"{p}: AC1 fails {pr.get('ac1_fail')}  AC2 fails {pr.get('ac2_fail')}  tot {pr.get('tot10_30_P50_s')} {pr.get('total_pm10')}  unreached {len(pr['unreached_L30'])}")
    return '\n'.join(out)


if __name__ == '__main__':
    rd = sys.argv[1]
    res = compute(rd)
    outp = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else os.path.join(rd, 'metrics.json')
    with open(outp, 'w') as f:
        json.dump(res, f, indent=1, default=str)
    print(summary(res))
