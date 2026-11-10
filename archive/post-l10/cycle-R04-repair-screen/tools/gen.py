#!/usr/bin/env python3
"""gen.py — INFORMAL scratch candidate generator + invariant validator for HoP/R04-repair-screen (D-HOP-2026-11-09-04/-05).
Base = R04 CSV d1cff5ac (sha256 verified). FIXED overlay = a8c4e268 w4_price_mult rows 21-30 (HoP fixed list; R04's own w4 cells
are unapproved). Only tunable cells may change: farm_cost L11-29, hens_cost rows 14-29, egg_value_cost rows 14-29.
Every emitted CSV is re-validated from bytes; any failing CSV is rejected (not written, or deleted).
Invariants (validate()):
  V1 structure: same header, 31 rows (levels 0..30, no L31+), LF, every tunable cell a positive integer.
  V2 frozen: every non-tunable cell byte-equal to the reference (= R04 base with the a8c4 w4 overlay); w4 rows 21-30 equal the
     approved a8c4 values; tc_streak_cap = 0.27 every row.
  V3 strictly rising: farm_cost rows 0..30, hens_cost rows 0..30, egg_value_cost rows 0..30, collection_cost rows 0..30.
  V4 envelope (parameter): anchors equal; step(L)=farm[L]/farm[L-1] exact rational with lo < step <= cap for L in steps range.
  V5 no sawtooth (parameter): over step(L), L in sawtooth_range: a 'sawtooth' is a decrease followed immediately by an increase
     larger than the threshold, i.e. step(L) < step(L-1) and step(L+1) - step(L) > threshold (absolute ratio units).
     PROVISIONAL definition (not in authority): threshold default 0.05 from envelope JSON. Milestone discounts deeper than the
     threshold would also be flagged — PL-AC6(c) is a target, HoP's 'no sawtooth' is a constraint, so the constraint wins here.
Usage: gen.py --spec spec.json --envelope env.json --out cand.csv   (exit 0 written, 1 rejected, 2 input error)"""
import argparse, csv, hashlib, io, json, os, sys
from fractions import Fraction

D = os.path.dirname(os.path.abspath(__file__))
BASE = '/workspace/egg-farm-studio/scratch/post-l10/cycle-2320/R04/candidate.csv'
BASE_SHA = 'd1cff5ac76e6015f6127d859a9b9c94d5c15da2ac64aad1314f8e7adfd173b65'
A8C4 = '/workspace/scratch-econ-m51pr/data/economy.csv'
A8C4_SHA = 'a8c4e26836bf7af98cb51f8e3e8a646750e82a4cdc18be450afe2f86eeeeb07f'
TUNABLE = {'farm_cost': range(11, 30), 'hens_cost': range(14, 30), 'egg_value_cost': range(14, 30)}
W4 = {21: '2.5', 22: '3.0', 23: '3.0', 24: '4.0', 25: '4.0', 26: '4.0', 27: '4.0', 28: '4.0', 29: '4.0', 30: '4.0'}
TRACKS = ('farm_cost', 'hens_cost', 'egg_value_cost', 'collection_cost')
O1A = {27: 160000, 28: 175000, 29: 190000}


def sha(b): return hashlib.sha256(b).hexdigest()


def parse(text):
    if '\r' in text: raise ValueError('CR in CSV')
    rows = list(csv.reader(io.StringIO(text)))
    return rows[0], rows[1:]


def dump(header, rows):
    s = io.StringIO(); w = csv.writer(s, lineterminator='\n'); w.writerow(header); w.writerows(rows); return s.getvalue()


def reference(base_bytes=None, a8c4_bytes=None, check_sha=True):
    bb = base_bytes if base_bytes is not None else open(BASE, 'rb').read()
    ab = a8c4_bytes if a8c4_bytes is not None else open(A8C4, 'rb').read()
    if check_sha and (sha(bb) != BASE_SHA or sha(ab) != A8C4_SHA):
        raise ValueError(f'base/a8c4 sha mismatch: {sha(bb)} / {sha(ab)}')
    h, rows = parse(bb.decode()); ah, arows = parse(ab.decode())
    wi, awi = h.index('w4_price_mult'), ah.index('w4_price_mult')
    rows = [list(r) for r in rows]
    for L in W4:
        rows[L][wi] = arows[L][awi]
    return h, rows


def build(spec, ref):
    h, rows = ref; rows = [list(r) for r in rows]
    for col, cells in spec.items():
        if col in ('id', 'note'): continue
        if col not in TUNABLE: raise ValueError(f'{col} is not tunable')
        ci = h.index(col)
        for k, v in cells.items():
            L = int(k)
            if L not in TUNABLE[col]: raise ValueError(f'{col} row {L} is not tunable')
            if not (isinstance(v, int) and not isinstance(v, bool) and v > 0): raise ValueError(f'{col} row {L}: {v!r} not a positive int')
            rows[L][ci] = str(v)
    return dump(h, rows)


def steps(fc, lo, hi): return {L: Fraction(fc[L]) / Fraction(fc[L - 1]) for L in range(lo, hi + 1)}


def validate(text, ref, env):
    errs = []
    try:
        h, rows = parse(text)
    except ValueError as e:
        return [f'V1 {e}']
    rh, rr = ref
    if not text.endswith('\n'): errs.append('V1 no trailing LF')
    if h != rh: return errs + ['V1 header differs']
    if len(rows) != 31 or [r[0] for r in rows] != [str(i) for i in range(31)]: return errs + ['V1 rows must be levels 0..30 exactly']
    if any(len(r) != len(h) for r in rows): return errs + ['V1 ragged row']
    for ci, c in enumerate(h):
        for L in range(31):
            if c in TUNABLE and L in TUNABLE[c]:
                if not rows[L][ci].isdigit() or int(rows[L][ci]) <= 0: errs.append(f'V1 {c} L{L} {rows[L][ci]!r} not a positive int')
            elif rows[L][ci] != rr[L][ci]:
                errs.append(f'V2 frozen {c} L{L}: {rr[L][ci]!r} -> {rows[L][ci]!r}')
    wi = h.index('w4_price_mult')
    errs += [f'V2 w4 L{L} {rows[L][wi]!r} != a8c4 {v!r}' for L, v in W4.items() if rows[L][wi] != v]
    ci = h.index('tc_streak_cap')
    errs += [f'V2 tc_streak_cap L{L} {rows[L][ci]!r} != 0.27' for L in range(31) if rows[L][ci] != '0.27']
    if errs: return errs
    tr = {c: [int(rows[L][h.index(c)]) for L in range(31)] for c in TRACKS}
    for c, v in tr.items():
        errs += [f'V3 {c} L{L}: {v[L-1]} -> {v[L]} not strictly rising' for L in range(1, 31) if not v[L] > v[L - 1]]
    fc = tr['farm_cost']
    for k, v in env['anchors'].items():
        if fc[int(k)] != int(v): errs.append(f'V4 anchor L{k} {fc[int(k)]} != {v}')
    lo, cap = Fraction(env['lo_exclusive']), Fraction(env['cap'])
    st = steps(fc, *env['steps'])
    errs += [f'V4 step L{L} = {float(s):.6f} not in ({env["lo_exclusive"]},{env["cap"]}]' for L, s in st.items() if not (lo < s <= cap)]
    a, b = env['sawtooth_range']; thr = Fraction(env['sawtooth_threshold']); sw = steps(fc, a, b)
    for L in range(a + 1, b):
        if sw[L] < sw[L - 1] and sw[L + 1] - sw[L] > thr:
            errs.append(f'V5 sawtooth at L{L}: steps {float(sw[L-1]):.4f} > {float(sw[L]):.4f} < {float(sw[L+1]):.4f} (rise > {env["sawtooth_threshold"]})')
    return errs


def o1a_flags(text):
    h, rows = parse(text); ci = h.index('farm_cost')
    return [f'F{L} farm_cost {rows[L][ci]} != o1a {v}' for L, v in O1A.items() if int(rows[L][ci]) != v]


def max_chain(start, cap, n):
    """Largest integer chain start -> n steps each <= cap (floor at every step)."""
    v = start
    for _ in range(n): v = int(Fraction(v) * Fraction(cap))  # floor
    return v


def main(argv=None):
    ap = argparse.ArgumentParser(); ap.add_argument('--spec', required=True); ap.add_argument('--envelope', required=True); ap.add_argument('--out', required=True)
    a = ap.parse_args(argv)
    try:
        spec, env, ref = json.load(open(a.spec)), json.load(open(a.envelope)), reference()
        text = build(spec, ref)
    except (ValueError, OSError, KeyError) as e:
        print(f'input error: {e}', file=sys.stderr); return 2
    errs = validate(text, ref, env)
    if errs:
        print('REJECTED:\n  ' + '\n  '.join(errs[:40]), file=sys.stderr)
        if os.path.exists(a.out): os.remove(a.out)
        return 1
    open(a.out, 'w', newline='').write(text)
    assert validate(open(a.out).read(), ref, env) == []
    print(json.dumps({'out': a.out, 'sha256': sha(text.encode()), 'o1a_left': o1a_flags(text)}))
    return 0


if __name__ == '__main__':
    sys.exit(main())
