#!/usr/bin/env python3
"""tailstats.py — PROVISIONAL scratch pacing/tail statistics from pl.ts raws:
 PL-AC3 (Card #4 L882-886): P50 over seeds of reach(30)-reach(10) within +-10% of refs 2116.0/2100.2/2041.5 s; P10/P90 (D-HOP-37 D) and P95 reported.
 PL-AC7 (Card #4 L956-964): band time P50 within +-20% of before. The card's before values are minutes rounded to 2 dp and compare.py
   compares rounded minutes; the ruling does not say whether the bar applies to rounded or unrounded values. This tool evaluates BOTH
   (A: after P50 rounded to 2-dp minutes vs card minutes; B: unrounded after P50 s vs unrounded before P50 s from before raws) and reports
   AMBIGUOUS when they disagree — it never picks the favourable reading. Without before raws PL-AC7 is UNASSESSED.
 TAIL: per-level P95/P50 time-on-level ratio, L11..29 — REPORT only.
Quantiles nearest-rank (card L867). Exact Decimal arithmetic except path A's minute rounding, which replicates analyze.py
`round(x/60, 2)` on floats (PROVISIONAL: half-even float rounding). Not a QA-pinned validator; ac_claim NONE.
Usage: tailstats.py --after a*.json [--before b*.json] [--seeds 1 200] [--synthetic] [--out r.json]"""
import argparse, json, sys
from decimal import Decimal
import gatecommon as G


def _maps(P, side, errs):
    out = {}
    for s, r in sorted(P.items()):
        try:
            out[s] = G.reach_map(r)
        except ValueError as e:
            errs.append(f'{side} seed {s}: {e}')
    return out


def _span(maps, a, b, side, p, errs):
    v = []
    for s, m in maps.items():
        if a not in m or b not in m:
            errs.append(f'{side} {p} seed {s}: reach({a if a not in m else b}) missing'); continue
        v.append(m[b] - m[a])
    return v


def check(after_files, before_files=None, profiles=None, seeds=None, synthetic=False, refs_override=None,
          before_min_override=None, bands_only=None, authority_path=None):
    if not synthetic and (refs_override or before_min_override or bands_only):
        raise ValueError('overrides are only allowed with --synthetic (self-tests); production uses authority.json values')
    A = G.authority(authority_path)
    profiles = tuple(profiles or A['profiles']); seeds = tuple(seeds or A['seeds'])
    Ap, errs, am = G.load_raws(after_files, profiles, seeds, A, synthetic, 'after')
    Bp, bm = None, []
    if before_files:
        Bp, be, bm = G.load_raws(before_files, profiles, seeds, A, synthetic, 'before'); errs += be
        if not synthetic:
            errs += [f'before {m["file"]}: csv sha256 is not a8c4e268' for m in bm if m['csv_sha256'] != A['before_csv']['sha256']]
    refs = refs_override or A['pl_ac3']['refs_s']; tol3 = Decimal(A['pl_ac3']['tol'])
    bmin = before_min_override or A['pl_ac7']['before_min']; tol7 = Decimal(A['pl_ac7']['tol'])
    d3, f3, d7, v7, tail = {}, [], {}, [], {}
    for p in profiles:
        am_ = _maps(Ap.get(p, {}), 'after', errs)
        tot = _span(am_, 10, 30, 'after', p, errs)
        if tot:
            st = {k: G.q(tot, x) for k, x in (('P10', .10), ('P50', .50), ('P90', .90), ('P95', .95))}
            dev = st['P50'] / G.dec(refs[p]) - 1
            d3[p] = {k: str(v) for k, v in st.items()}; d3[p].update(ref=refs[p], dev=str(dev), n=len(tot))
            if abs(dev) > tol3:
                f3.append(f'{p}: P50 {st["P50"]} dev {dev:.5f} beyond +-{tol3}')
        tail[p] = {}
        for L in range(11, 30):
            t = _span(am_, L, L + 1, 'after', p, errs)
            if t:
                p50, p95 = G.q(t, .5), G.q(t, .95)
                tail[p][str(L)] = {'P50': str(p50), 'P95': str(p95), 'ratio': str(p95 / p50) if p50 else None}
        if Bp is None:
            continue
        bmaps = _maps(Bp.get(p, {}), 'before', errs); d7[p] = {}
        for i, (band, (a, b)) in enumerate(A['pl_ac7']['bands_reach'].items()):
            if bands_only and band not in bands_only:
                continue
            ta, tb = _span(am_, a, b, 'after', p, errs), _span(bmaps, a, b, 'before', p, errs)
            if not ta or not tb:
                continue
            pa, pb = G.q(ta, .5), G.q(tb, .5)
            card = G.dec(bmin[p][i])
            rb = Decimal(str(round(float(pb) / 60, 2)))
            if rb != card:
                errs.append(f'{p} {band}: before raws give {rb} min but card says {card} min (basis mismatch)')
            ra = Decimal(str(round(float(pa) / 60, 2)))
            devA, devB = ra / card - 1, pa / pb - 1
            okA, okB = abs(devA) <= tol7, abs(devB) <= tol7
            verdict = 'PASS' if okA and okB else 'FAIL' if not okA and not okB else 'AMBIGUOUS'
            d7[p][band] = {'after_P50_s': str(pa), 'before_P50_s': str(pb), 'A_rounded_min': f'{ra}/{card}', 'devA': str(devA),
                           'devB_unrounded': str(devB), 'verdict': verdict}
            v7.append(verdict)
    C = {'PL-AC3': {'verdict': 'FAIL' if (f3 or errs or len(d3) != len(profiles)) else 'PASS', 'detail': dict(d3, fails=f3)}}
    if Bp is None:
        C['PL-AC7'] = {'verdict': 'UNASSESSED', 'detail': {'reason': 'no before raws: unrounded path B cannot be computed; fail-closed'}}
    else:
        C['PL-AC7'] = {'verdict': 'FAIL' if ('FAIL' in v7 or errs or not v7) else 'AMBIGUOUS' if 'AMBIGUOUS' in v7 else 'PASS', 'detail': d7}
    C['TAIL'] = {'verdict': 'REPORT', 'detail': tail}
    rep = G.envelope('tailstats.py', synthetic, profiles=list(profiles), seeds=list(seeds), run_of_record=G.run_of_record(profiles, seeds, A),
                     after=am, before=bm, input_errors=errs[:100], checks=C,
                     note='PL-AC1/PL-AC2 are not re-implemented here (analyze.py remains the card tool; its pin drift e67f184b vs 8f6e4e9b is unresolved)')
    rep['overall'] = G.overall(C)
    return rep


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--after', nargs='+', required=True); ap.add_argument('--before', nargs='+')
    ap.add_argument('--seeds', nargs=2, type=int); ap.add_argument('--synthetic', action='store_true'); ap.add_argument('--out')
    a = ap.parse_args(argv)
    rep = check(a.after, a.before, seeds=a.seeds, synthetic=a.synthetic)
    s = json.dumps(rep, indent=1, default=str)
    open(a.out, 'w').write(s + '\n') if a.out else print(s)
    print(f'tailstats overall={rep["overall"]} (PROVISIONAL, ac_claim NONE)', file=sys.stderr)
    return 0 if rep['overall'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
