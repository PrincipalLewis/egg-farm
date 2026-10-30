#!/usr/bin/env python3
"""Full-file byte comparison of the smoke parity outputs: REF_DIR (Econ originals, ref.sh) vs PORT_DIR (B's drivers, smoke.sh).

Usage: compare-smoke.py REF_DIR PORT_DIR SEEDS
Both directories must contain exactly the expected file set for SEEDS (jobs.sh), nothing missing and nothing extra, and every
file must be byte-identical. No stripping: neither driver writes the 'ALLDONE' trailer (that came from Econ's 22eac98 wrapper,
F-PAR-1), so freshly generated references compare whole. Exit 0 only if every check passes; 1 on any mismatch, missing or extra
file; 2 on usage errors. Fails closed: an unreadable file counts as a mismatch.
"""
import hashlib, os, sys

PROFS = ("casual", "optimal", "seller15")


def expected(seeds):
    s = set()
    for p in PROFS:
        for c in ("on", "off"):
            for pert in (0, 1):
                s |= {f"pr.{p}.{c}.p{pert}.jsonl", f"pr.{p}.{c}.p{pert}.log"}
        for cfg in ("base", "auto"):
            s.add(f"ps-o1a.{cfg}.{p}.json")
    s |= {"nw-base.json", "nw-base.log", "nw-auto.json", "nw-auto.log", "g1.json", "g1.log"}
    if seeds == 200:
        s |= {"pool2.json", "pool2.stdout", "pool2b.json", "pool2b.stdout"}
    return s


def listing(d):
    out = set()
    for root, _, files in os.walk(d):
        for f in files:
            out.add(os.path.relpath(os.path.join(root, f), d))
    return out


def sha(path):
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def main(argv):
    if len(argv) != 4 or not argv[3].isdigit():
        print(__doc__, file=sys.stderr)
        return 2
    ref, port, seeds = argv[1], argv[2], int(argv[3])
    for d in (ref, port):
        if not os.path.isdir(d):
            print(f"FAIL not a directory: {d}")
            return 1
    exp, have_r, have_p = expected(seeds), listing(ref), listing(port)
    bad = 0
    for side, have in (("ref", have_r), ("port", have_p)):
        for f in sorted(exp - have):
            print(f"FAIL missing in {side}: {f}"); bad += 1
        for f in sorted(have - exp):
            print(f"FAIL extra in {side}: {f}"); bad += 1
    ok = 0
    for f in sorted(exp & have_r & have_p):
        try:
            a, b = sha(os.path.join(ref, f)), sha(os.path.join(port, f))
        except OSError as e:
            print(f"FAIL unreadable {f}: {e}"); bad += 1; continue
        if a == b and os.path.getsize(os.path.join(ref, f)) > 0:
            print(f"IDENTICAL {a} {f}"); ok += 1
        elif a == b:
            print(f"FAIL empty on both sides: {f}"); bad += 1
        else:
            print(f"FAIL differ {f}: ref {a} port {b}"); bad += 1
    print(f"RESULT expected={len(exp)} identical={ok} failures={bad} -> {'PASS' if bad == 0 and ok == len(exp) else 'FAIL'}")
    return 0 if bad == 0 and ok == len(exp) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
