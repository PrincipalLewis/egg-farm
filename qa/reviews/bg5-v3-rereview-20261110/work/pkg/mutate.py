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
    ('csvcheck.py', "elif breeds == 1:\n        cv = 'CONDITIONAL-UNMET'", "elif False:\n        cv = 'CONDITIONAL-UNMET'", 'B4 condition dropped (breeds=1 cap PASS)'),
    ('csvcheck.py', "if n in ah and (m is None or not m.get('renames')):", "if False:", 'rename without map accepted'),
    ('reachdiff.py', "if mb[L] != ma[L]:", "if False:", 'reach compare disabled'),
    ('bandguard.py', "if ab[k]['gP95'] > bb[k]['gP95']:", "if ab[k]['gP95'] > bb[k]['gP95'] + 1:", 'PL-AC4(b) tolerance added'),
    ('tailstats.py', "'PASS' if okA and okB", "'PASS' if okA", 'PL-AC7 rounded-only interpretation'),
    ('trace10cmp.py', "pb = [e for e in evb if e['i'] <= cut]; pa = [e for e in eva if e['i'] <= cut]", "pb = [e for e in evb if e['i'] < cut]; pa = [e for e in eva if e['i'] < cut]", 'trace cut made exclusive'),
    ('trace10cmp.py', "or m.get('K_on') is not False", "", 'flags-off manifest check dropped'),
    ('gatecommon.py', "k = math.ceil(Decimal(str(p)) * n) - 1", "k = round(Decimal(str(p)) * n) - 1", 'quantile not nearest-rank'),
    ('gatecommon.py', "if s in rows:", "if False:", 'duplicate seed accepted'),
    ('gatecommon.py', "if want - got:", "if False:", 'missing seeds accepted'),
    # --- repair-bg12: mutants reintroducing the exact BG1/BG2 defects and near variants ---
    ('csvcheck.py', "elif breeds == 1:\n        cv = 'CONDITIONAL-UNMET'", "elif breeds == 1 and not (b4_ref and str(b4_ref).strip()):\n        cv = 'CONDITIONAL-UNMET'", 'BG2 original: any --b4-ref string unlocks CAP PASS'),
    ('csvcheck.py', "elif breeds == 1:\n        cv = 'CONDITIONAL-UNMET'", "elif breeds == 1 and not (b4_ref and len(str(b4_ref)) >= 64):\n        cv = 'CONDITIONAL-UNMET'", 'BG2 variant: sha-looking --b4-ref unlocks CAP PASS'),
    ('gatecommon.py', "all(v == 'PASS' for v in g)", "all(v in ('PASS', 'CONDITIONAL-UNMET') for v in g)", 'BG2 variant: aggregation upgrades CONDITIONAL-UNMET'),
    ('bandguard.py', "miss[side] += 1; absent.append(L); continue", "miss[side] += 1; g = dict(g); g[str(L)] = 0", 'BG1 original: absent gap cell becomes measured 0'),
    ('bandguard.py', "va = 'FAIL' if (a_f or bad) else 'UNASSESSED' if ua else 'PASS'", "va = 'FAIL' if (a_f or bad) else 'PASS'", 'BG1 variant: after absence not gating (a)'),
    ('bandguard.py', "vb = 'FAIL' if (b_f or bad) else 'UNASSESSED' if ub else 'PASS'", "vb = 'FAIL' if (b_f or bad) else 'PASS'", 'BG1 variant: absence not gating (b)'),
    ('bandguard.py', "            if k in bu:\n", "            if False:\n", 'BG1 variant: before-side absence ignored'),
    ('bandguard.py', "errs.append(f'{side} seed {s} L{L}: gap null is not a measurement'); continue", "v = 0", 'BG1 variant: null gap becomes measured 0'),
    ('bandguard.py', "if per and b not in unassessed:", "if per:", 'BG1 variant: band stats from remaining seeds reported'),
    ('bandguard.py', "                if k in ab and ab[k]['gP95'] > cap:", "                if False:", 'BG1 variant: before absence skips after (a) cap check'),
    # --- repair-bg5-bg4: BG5 (P5IB) / BG5b (FAM) guards (v2 verification) ---
    ('csvcheck.py', "elif p5_verified:\n        p5_verdict = 'PASS'\n        p5_refv = REF_VERIFIED\n    else:\n        p5_verdict = 'CONDITIONAL-UNMET'", "elif True:\n        p5_verdict = 'PASS'\n        p5_refv = REF_VERIFIED\n    else:\n        p5_verdict = 'CONDITIONAL-UNMET'", 'BG5 original: skip verify -> P5IB PASS whenever structurally ok'),
    ('csvcheck.py', "elif fam_verified:\n        fam_verdict = 'PASS'\n        fam_refv = REF_VERIFIED\n    else:\n        fam_verdict = 'CONDITIONAL-UNMET'", "elif True:\n        fam_verdict = 'PASS'\n        fam_refv = REF_VERIFIED\n    else:\n        fam_verdict = 'CONDITIONAL-UNMET'", 'BG5b original: skip verify -> FAM PASS whenever allowlisted'),
    ('csvcheck.py', "if not defs:\n        return False, f'entry {eid} not defined as a ## heading in any decisions file'", "if not defs:\n        return True, f'entry {eid} forged'", 'BG5 variant: missing decisions entry still verifies'),
    ('csvcheck.py', "ids_src, rx, want_prefix = ref, _DHOP, 'D-HOP'", "ids_src, rx, want_prefix = ref, re.compile(_DHOP.pattern + '|' + _QAD.pattern), 'D-HOP'", 'BG5 variant: authority family check dropped (approval_ref accepts QA-D)'),
    ('csvcheck.py', "if art_sha not in _HEX64.findall(body):\n        return False, f'entry {eid} does not contain artifact sha256'", "if False:\n        return False, f'entry {eid} does not contain artifact sha256'", 'BG5 variant: entry hash presence not required'),
    ('csvcheck.py', "if csv_sha != candidate_sha:\n        return False, 'b4 manifest csv_sha256 != candidate'", "if False:\n        return False, 'b4 manifest csv_sha256 != candidate'", 'BG5 variant: B4 manifest csv sha need not match candidate'),
    ('csvcheck.py', "if not (isinstance(e.get(k), str) and e[k].strip()):", "if False:", 'BG5 variant: missing/invalid ref no longer structural FAIL'),
    ('csvcheck.py', "allowed.append(f'{orig} L{L} ({ok[0][\"authority\"]})'); continue", "continue", 'BG5b variant: allowlisted change not recorded (silently accepted)'),
    # --- repair-bg5-bg4 v3: QA-D-1110-BG54CERT D-1/D-2/D-3 + D-HOP-2026-11-10-06 (file authority) ---
    ('csvcheck.py', "ids_src, rx, want_prefix = _PATH.sub(' ', ref), _QAD, 'QA-D'", "ids_src, rx, want_prefix = _PATH.sub(' ', ref), re.compile(_DHOP.pattern + '|' + _QAD.pattern), 'QA-D'", 'v3: b4_run_ref accepts D-HOP family'),
    ('csvcheck.py', "if hm and _ENTRY_ID.fullmatch(hm.group(1)):\n                cur = [hm.group(1), []]", "ids = _ENTRY_ID.findall(line)\n            if line.startswith('## ') and ids:\n                cur = [ids[-1], []]", 'v3 D-1 P02/P03/F02: co-mention in heading registers ID'),
    ('csvcheck.py', "if hm and _ENTRY_ID.fullmatch(hm.group(1)):\n                cur = [hm.group(1), []]", "mm = _ENTRY_ID.search(hm.group(1)) if hm else None\n            if mm:\n                cur = [mm.group(0), []]", 'v3 prefix-spoof: leading token only needs to CONTAIN an ID (XQA-D-…, …x)'),
    ('csvcheck.py', "if len(defs) > 1:", "if False:", 'v3 D-1 P04: first-wins kept (duplicate definitions verify)'),
    ('csvcheck.py', "if role != want_role:", "if False:", 'v3 D-HOP-11-10-06: authority from prefix, not defining file (cross-file attack)'),
    ('csvcheck.py', "if fm and not (fm.group(1)[0] == '`' and '`' in line[fm.end():]):", "if False:", 'v3 D-1 P05: code fences not skipped'),
    ('csvcheck.py', "_FENCE_OPEN = re.compile(r' {0,3}(`{3,}|~{3,})')", "_FENCE_OPEN = re.compile(r' {0,3}(`{3,})')", 'v3 code-block: ~~~ fences not recognised'),
    ('csvcheck.py', "if m and m.group(1)[0] == fence[0] and len(m.group(1)) >= fence[1]:", "if m:", 'v3 code-block: fence closed by any/shorter/other-char fence'),
    ('csvcheck.py', "_H2 = re.compile(r'##[ \\t]+(\\S+)')\n_ENTRY_END = re.compile(r'#{1,2}(?:[ \\t]|$)')", "_H2 = re.compile(r'#{1,4}[ \\t]+(\\S+)')\n_ENTRY_END = re.compile(r'#{1,4}(?:[ \\t]|$)')", 'v3: heading levels other than ## define entries'),
    ('csvcheck.py', "_DHOP = re.compile(r'(?<![A-Za-z0-9_-])D-HOP-\\d{4}-\\d{2}-\\d{2}-\\d+(?![A-Za-z0-9_-])')", "_DHOP = re.compile(r'D-HOP-\\d{4}-\\d{2}-\\d{2}-\\d+')", 'v3 prefix-spoof: ref-side D-HOP regex unanchored'),
    ('csvcheck.py', "_QAD = re.compile(r'(?<![A-Za-z0-9_-])QA-D-[A-Z0-9]+(?:-[A-Z0-9]+)*(?![A-Za-z0-9_-])')", "_QAD = re.compile(r'QA-D-[A-Z0-9-]+')", 'v3 prefix-spoof: ref-side QA-D regex unanchored (v2)'),
    ('csvcheck.py', "if len(ids) > 1:", "if False:", 'v3: ambiguous multi-ID ref uses first ID'),
    ('csvcheck.py', "    return 'root'\n\n\ndef _decision_files", "    return 'product'\n\n\ndef _decision_files", 'v3 cross-file: unclassified/root file treated as product'),
    ('csvcheck.py', "if not (isinstance(seeds, list) and seeds and all(isinstance(x, int) and not isinstance(x, bool) for x in seeds)):", "if False:", 'v3 D-2 P22: empty/non-int seeds accepted'),
    ('csvcheck.py', "if hs != harness:", "if False:", 'v3 D-2: harness sha not checked against harness file on disk'),
    ('csvcheck.py', "decisions_paths = {} if synthetic else dict(_DEFAULT_DECISIONS)", "decisions_paths = dict(_DEFAULT_DECISIONS)", 'v3 D-3: synthetic mode falls back to live decisions files'),
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
    # repair-bg5-bg4: also run the top-level BG5 tests (../tests) against the mutant copy
    r2 = subprocess.run([sys.executable, '-m', 'unittest', 'discover', '-s', os.path.join(os.path.dirname(D), 'tests'), '-p', 'test_*.py'],
                        cwd=d, capture_output=True, text=True, env=dict(os.environ, GB_TARGET=d))
    killed = r.returncode != 0 or r2.returncode != 0
    if r.returncode == 0: r = r2
    last = [l for l in r.stderr.splitlines() if l.startswith(('FAILED', 'OK'))]
    print(f'mutant {n} [{why}] in {f}: {"KILLED" if killed else "SURVIVED"} ({last[-1] if last else "?"})')
    fails += 0 if killed else 1
    shutil.rmtree(d, ignore_errors=True)
print('ALL MUTANTS KILLED' if fails == 0 else f'{fails} MUTANT(S) SURVIVED/ERRORED')
sys.exit(1 if fails else 0)
