#!/usr/bin/env python3
"""Mutation self-check: proves the synthetic suite DETECTS deliberate defects. Each mutant is a copy of the tools+tests under
.tmp/mut-<n>/ with one textual change; the suite must FAIL for every mutant. Writes only inside gate-build/.tmp and logs/."""
import os, shutil, subprocess, sys
D = os.path.dirname(os.path.abspath(__file__))
FILES = ['gatecommon.py', 'csvcheck.py', 'reachdiff.py', 'bandguard.py', 'tailstats.py', 'trace10cmp.py', 'authority.json']
M = [
    ('csvcheck.py', "a <= hi * b)", "a <= hi * b + 1)", 'P6B upper bound loosened'),
    ('csvcheck.py', "if av == cap_req:\n                    continue", "if G.dec(av) == G.dec(cap_req):\n                    continue", 'cap exception accepts string variants'),
    ('csvcheck.py', "fe.append(f'{orig} L{L}", "allowed.append(f'{orig} L{L}", 'FAM allows any family'),
    ('csvcheck.py', "elif breeds == 1 and not (b4_ref", "elif False and not (b4_ref", 'B4 condition dropped'),
    ('csvcheck.py', "if n in ah and (m is None or not m.get('renames')):", "if False:", 'rename without map accepted'),
    ('reachdiff.py', "if mb[L] != ma[L]:", "if False:", 'reach compare disabled'),
    ('bandguard.py', "if ab[k]['gP95'] > bb[k]['gP95']:", "if ab[k]['gP95'] > bb[k]['gP95'] + 1:", 'PL-AC4(b) tolerance added'),
    ('tailstats.py', "'PASS' if okA and okB", "'PASS' if okA", 'PL-AC7 rounded-only interpretation'),
    ('trace10cmp.py', "pb = [e for e in evb if e['i'] <= cut]; pa = [e for e in eva if e['i'] <= cut]", "pb = [e for e in evb if e['i'] < cut]; pa = [e for e in eva if e['i'] < cut]", 'trace cut made exclusive'),
    ('trace10cmp.py', "or m.get('K_on') is not False", "", 'flags-off manifest check dropped'),
    ('gatecommon.py', "k = math.ceil(Decimal(str(p)) * n) - 1", "k = round(Decimal(str(p)) * n) - 1", 'quantile not nearest-rank'),
    ('gatecommon.py', "if s in rows:", "if False:", 'duplicate seed accepted'),
    ('gatecommon.py', "if want - got:", "if False:", 'missing seeds accepted'),
]
fails = 0
for n, (f, old, new, why) in enumerate(M):
    d = os.path.join(D, '.tmp', f'mut-{n}')
    shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    for x in FILES: shutil.copy(os.path.join(D, x), d)
    shutil.copytree(os.path.join(D, 'tests'), os.path.join(d, 'tests'), ignore=shutil.ignore_patterns('__pycache__'))
    src = open(os.path.join(d, f)).read()
    if old not in src:
        print(f'mutant {n} [{why}]: PATTERN NOT FOUND -> mutation harness error'); fails += 1; continue
    open(os.path.join(d, f), 'w').write(src.replace(old, new))
    r = subprocess.run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py'], cwd=d, capture_output=True, text=True)
    killed = r.returncode != 0
    last = [l for l in r.stderr.splitlines() if l.startswith(('FAILED', 'OK'))]
    print(f'mutant {n} [{why}] in {f}: {"KILLED" if killed else "SURVIVED"} ({last[-1] if last else "?"})')
    fails += 0 if killed else 1
    shutil.rmtree(d, ignore_errors=True)
print('ALL MUTANTS KILLED' if fails == 0 else f'{fails} MUTANT(S) SURVIVED/ERRORED')
sys.exit(1 if fails else 0)
