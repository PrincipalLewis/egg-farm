#!/usr/bin/env python3
"""reachdiff.py — PROVISIONAL scratch PL-AC5(ii): for every (profile, seed), reach(0..10) in the AFTER pl.ts raws equals the BEFORE
raws exactly (Card #4 L926-935). Fail-closed on missing/duplicate identity, provenance (runner/cfg/T/parity), non-finite values,
missing reach(L<=10). Not a QA-pinned validator; ac_claim NONE.
Usage: reachdiff.py --before b1.json [b2.json ...] --after a1.json [...] [--seeds 1 200] [--synthetic] [--out r.json]"""
import argparse, json, sys
import gatecommon as G


def check(before_files, after_files, profiles=None, seeds=None, synthetic=False, authority_path=None):
    A = G.authority(authority_path)
    profiles = tuple(profiles or A['profiles']); seeds = tuple(seeds or A['seeds'])
    Bp, be, bm = G.load_raws(before_files, profiles, seeds, A, synthetic, 'before')
    Ap, ae, am = G.load_raws(after_files, profiles, seeds, A, synthetic, 'after')
    errs = be + ae
    if not synthetic:
        for m in bm:
            if m['csv_sha256'] != A['before_csv']['sha256']:
                errs.append(f'before {m["file"]}: csv sha256 {m["csv_sha256"]} is not a8c4e268')
    mism, checked = [], 0
    for p in profiles:
        for s in range(seeds[0], seeds[1] + 1):
            rb, ra = Bp.get(p, {}).get(s), Ap.get(p, {}).get(s)
            if rb is None or ra is None:
                continue
            try:
                mb, ma = G.reach_map(rb), G.reach_map(ra)
            except ValueError as e:
                errs.append(f'{p} seed {s}: {e}'); continue
            for L in range(0, 11):
                if L not in mb or L not in ma:
                    errs.append(f'{p} seed {s}: reach({L}) missing ({"before" if L not in mb else "after"})'); break
                if mb[L] != ma[L]:
                    mism.append({'profile': p, 'seed': s, 'level': L, 'before': str(mb[L]), 'after': str(ma[L])}); break
            else:
                checked += 1
    C = {'PL-AC5ii': {'verdict': 'FAIL' if (mism or errs) else 'PASS', 'detail': {'seed_runs_equal': checked, 'mismatches': len(mism), 'input_errors': len(errs)}}}
    rep = G.envelope('reachdiff.py', synthetic, profiles=list(profiles), seeds=list(seeds), run_of_record=G.run_of_record(profiles, seeds, A),
                     before=bm, after=am, input_errors=errs[:100], mismatches=mism[:200], checks=C,
                     note='compares reach(0..10) only; pl.ts parity (same CSV, two runners) is NOT this check, and this is NOT trace10 (PL-AC5(iii))')
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
    print(f'reachdiff overall={rep["overall"]} run_of_record={rep["run_of_record"]} (PROVISIONAL, ac_claim NONE)', file=sys.stderr)
    return 0 if rep['overall'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
