#!/usr/bin/env python3
"""genA.py — round A generator (D-HOP-2026-11-10-11 add.3). INFORMAL scratch.
Tunables = round-1 envelope (a) tunables (farm_cost L11-29, hens_cost / egg_value_cost rows 14-29) PLUS ONE cell:
W4 tier-5 hire cost = w4_tier_cost on level rows 24-30 (CSV lines 26-32), identical on all 7 rows, integer,
> 28294 (tier 4) and within -35%..+10% of a8c4 51567 -> [33519, 56723] (ceil(0.65*51567), floor(1.10*51567)).
Every collection_cost cell and every other cell stays byte-equal to the round-1 reference (a8c4 values). All round-1 invariants
(V1-V5, tools/gen.py) still apply; the W4 cell is checked here (VA1 bounds, VA2 identical rows, VA3 > tier 4) and then handed to
gen.validate against a reference whose w4_tier_cost rows 24-30 equal the candidate's value (so no other cell can differ).
spec JSON: round-1 keys + optional "w4_tier5_cost": int. usage: genA.py --spec s.json --envelope ../../tools/envelope-a.json --out c.csv"""
import argparse, json, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
import gen as g
A8C4_T5, T4 = 51567, 28294
T5_LO, T5_HI = math.ceil(A8C4_T5 * 65 / 100), math.floor(A8C4_T5 * 110 / 100)
T5_ROWS = range(24, 31)


def with_t5(ref, v):
    h, rows = ref; rows = [list(r) for r in rows]; ci = h.index('w4_tier_cost')
    for L in T5_ROWS: rows[L][ci] = str(v)
    return h, rows


def check_t5_value(v):
    if not (isinstance(v, int) and not isinstance(v, bool)): return [f'VA1 w4 tier5 {v!r} not an int']
    e = []
    if not (T5_LO <= v <= T5_HI): e.append(f'VA1 w4 tier5 {v} outside [{T5_LO},{T5_HI}] (-35%..+10% of {A8C4_T5})')
    if not v > T4: e.append(f'VA3 w4 tier5 {v} not > tier4 {T4}')
    return e


def build(spec, ref):
    s = {k: v for k, v in spec.items() if k not in ('w4_tier5_cost',)}
    t5 = spec.get('w4_tier5_cost', A8C4_T5)
    e = check_t5_value(t5)
    if e: raise ValueError('; '.join(e))
    return g.build(s, with_t5(ref, t5)), t5


def validate(text, ref, env):
    h, rows = g.parse(text); ci = h.index('w4_tier_cost')
    vals = {rows[L][ci] for L in T5_ROWS if L < len(rows)}
    if len(vals) != 1: return [f'VA2 w4_tier_cost rows 24-30 not identical: {sorted(vals)}']
    v = next(iter(vals))
    if not v.isdigit(): return [f'VA1 w4 tier5 {v!r} not an int']
    e = check_t5_value(int(v))
    return e + g.validate(text, with_t5(ref, int(v)), env)


def main(argv=None):
    ap = argparse.ArgumentParser(); ap.add_argument('--spec', required=True); ap.add_argument('--envelope', required=True); ap.add_argument('--out', required=True)
    a = ap.parse_args(argv)
    try:
        spec, env, ref = json.load(open(a.spec)), json.load(open(a.envelope)), g.reference()
        text, t5 = build(spec, ref)
    except (ValueError, OSError, KeyError) as e:
        print(f'input error: {e}', file=sys.stderr); return 2
    errs = validate(text, ref, env)
    if errs:
        print('REJECTED:\n  ' + '\n  '.join(errs[:40]), file=sys.stderr)
        if os.path.exists(a.out): os.remove(a.out)
        return 1
    open(a.out, 'w', newline='').write(text)
    assert validate(open(a.out).read(), ref, env) == []
    print(json.dumps({'out': a.out, 'sha256': g.sha(text.encode()), 'w4_tier5': t5, 'o1a_left': g.o1a_flags(text)}))
    return 0


if __name__ == '__main__':
    sys.exit(main())
