#!/usr/bin/env python3
"""bandguard.py — PROVISIONAL scratch PL-AC4 from pl.ts raws (Card #4 L887-914):
 (a) band gap P95 <= 180 s per profile x band (blocking flags-off);
 (b) after band gap P95 <= before band gap P95, zero tolerance, same seeds/harness (blocking);
 (c) worst band gap gW and every (seed, L) with gap > 180 s — REPORT only flags-off (blocks only flags-on final RC, D-HOP-37 C).
Gap(L) = noAffByF[L]; band gap per seed = max over band levels (F26-30 = L26..29); P95 nearest-rank over seeds.
A missing noAffByF[L] key is taken as 0 (analyze.py convention `x.get(L, 0)`) — PROVISIONAL; counted and reported, never hidden.
Non-synthetic mode cross-checks the computed BEFORE P95s against the card values (81/125/121/157 · 53/79/77/115 · 35/59/58/93).
Usage: bandguard.py --before ... --after ... [--seeds 1 200] [--synthetic] [--out r.json]"""
import argparse, json, sys
import gatecommon as G


def _bands(rows_by_seed, A, side, errs, miss):
    out = {}
    for b, (lo, hi) in A['pl_ac4']['bands'].items():
        per = []
        for s, r in sorted(rows_by_seed.items()):
            g = r.get('noAffByF')
            if not isinstance(g, dict):
                errs.append(f'{side} seed {s}: noAffByF missing'); continue
            best, bestL = None, None
            for L in range(lo, hi + 1):
                v = g.get(str(L))
                if v is None:
                    miss[side] += 1; v = 0
                try:
                    d = G.dec(v)
                except ValueError:
                    errs.append(f'{side} seed {s} L{L}: gap {v!r} not finite'); d = None
                if d is None:
                    continue
                if d < 0:
                    errs.append(f'{side} seed {s} L{L}: negative gap {v}'); continue
                if best is None or d > best:
                    best, bestL = d, L
            if best is not None:
                per.append((best, s, bestL))
        if per:
            vals = [x[0] for x in per]
            out[b] = {'gP95': G.q(vals, 0.95), 'gW': max(vals), 'over180': [{'seed': s, 'L': L, 'gap_s': str(v)} for v, s, L in per if v > 180]}
    return out


def check(before_files, after_files, profiles=None, seeds=None, synthetic=False, authority_path=None):
    A = G.authority(authority_path)
    profiles = tuple(profiles or A['profiles']); seeds = tuple(seeds or A['seeds'])
    Bp, be, bm = G.load_raws(before_files, profiles, seeds, A, synthetic, 'before')
    Ap, ae, am = G.load_raws(after_files, profiles, seeds, A, synthetic, 'after')
    errs = be + ae; miss = {'before': 0, 'after': 0}
    cap = G.dec(A['pl_ac4']['cap_s'])
    a_f, b_f, c_d, card = [], [], {}, []
    for p in profiles:
        bb = _bands(Bp.get(p, {}), A, 'before', errs, miss); ab = _bands(Ap.get(p, {}), A, 'after', errs, miss)
        c_d[p] = {'bands': {k: {'gP95': str(v['gP95']), 'gW': str(v['gW'])} for k, v in ab.items()},
                  'seeds_over_180': [dict(x, band=k) for k, v in ab.items() for x in v['over180']]}
        for i, k in enumerate(A['pl_ac4']['bands']):
            if k not in ab or k not in bb:
                errs.append(f'{p} {k}: band not computable'); continue
            if ab[k]['gP95'] > cap:
                a_f.append(f'{p} {k}: after gP95 {ab[k]["gP95"]} > 180')
            if ab[k]['gP95'] > bb[k]['gP95']:
                b_f.append(f'{p} {k}: after gP95 {ab[k]["gP95"]} > before {bb[k]["gP95"]}')
            cv = A['pl_ac4']['before_gP95'][p][i]
            if not synthetic and bb[k]['gP95'] != cv:
                card.append(f'{p} {k}: computed before gP95 {bb[k]["gP95"]} != card {cv} (harness/basis mismatch -> before must be re-derived per card L890)')
    if not synthetic:
        for m in bm:
            if m['csv_sha256'] != A['before_csv']['sha256']:
                errs.append(f'before {m["file"]}: csv sha256 is not a8c4e268')
    errs += card
    bad = bool(errs)
    C = {'PL-AC4a': {'verdict': 'FAIL' if (a_f or bad) else 'PASS', 'detail': {'fails': a_f}},
         'PL-AC4b': {'verdict': 'FAIL' if (b_f or bad) else 'PASS', 'detail': {'fails': b_f}},
         'PL-AC4c': {'verdict': 'REPORT', 'detail': c_d}}
    rep = G.envelope('bandguard.py', synthetic, profiles=list(profiles), seeds=list(seeds), run_of_record=G.run_of_record(profiles, seeds, A),
                     before=bm, after=am, input_errors=errs[:100], missing_gap_keys=miss,
                     missing_gap_policy='PROVISIONAL: absent noAffByF[L] counted as 0 (analyze.py x.get(L,0)); QA must confirm pl.ts omits zero-gap levels',
                     checks=C)
    rep['overall'] = G.overall(C)
    return rep


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--before', nargs='+', required=True); ap.add_argument('--after', nargs='+', required=True)
    ap.add_argument('--seeds', nargs=2, type=int); ap.add_argument('--synthetic', action='store_true'); ap.add_argument('--out')
    a = ap.parse_args(argv)
    rep = check(a.before, a.after, seeds=a.seeds, synthetic=a.synthetic)
    s = json.dumps(rep, indent=1, default=str)
    open(a.out, 'w').write(s + '\n') if a.out else print(s)
    print(f'bandguard overall={rep["overall"]} (PROVISIONAL, ac_claim NONE)', file=sys.stderr)
    return 0 if rep['overall'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
