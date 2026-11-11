#!/usr/bin/env python3
"""HoQA proof cases: missing/absent gap data must NOT silently become a successful zero/PASS.
Runs against the evidence copy of gate-build. Writes results JSON next to this script.
Does not modify Econ's original scratch/post-l10/gate-build package."""
import json, os, sys, tempfile
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'gate-build'))
import bandguard, gatecommon as G
from tests.fixtures import raw, raw_rows, tmpdir, write_json

PROFS = ('optimal', 'seller15', 'casual')
SEEDS = (1, 5)  # small synthetic

def make(d, tag, mut=None, empty_noaff=False, drop_all_keys=False, omit_field=False):
    paths = []
    for p in PROFS:
        rows = raw_rows(range(SEEDS[0], SEEDS[1]+1), gap=50)  # real gaps ~50-54
        o = raw(p, rows)
        if empty_noaff:
            for r in o['prof'][p]['rows']:
                r['noAffByF'] = {}
        if drop_all_keys:
            for r in o['prof'][p]['rows']:
                r['noAffByF'] = {}  # same
        if omit_field:
            for r in o['prof'][p]['rows']:
                del r['noAffByF']
        if mut:
            mut(p, o)
        paths.append(write_json(d, f'{tag}-{p}.json', o))
    return paths

results = []

def record(name, ok, detail):
    results.append({'case': name, 'proves_bug' if not ok else 'safe': True if not ok else True,
                    'finding': 'BLOCKING' if not ok else 'OK', 'detail': detail})
    print(('BLOCKING' if not ok else 'OK'), name, '->', detail.get('overall'), detail.get('note',''))

# --- Case A: AFTER has empty noAffByF {}; BEFORE has real gaps ---
# Expected under HoP rule: FAIL or UNASSESSED (absent required gap data).
# Actual: counts as 0 → gP95=0 → PL-AC4a/b PASS (silent success).
d = tmpdir()
before = make(d, 'b')
after = make(d, 'a', empty_noaff=True)
rep = bandguard.check(before, after, profiles=PROFS, seeds=SEEDS, synthetic=True)
a_ver = rep['checks']['PL-AC4a']['verdict']
b_ver = rep['checks']['PL-AC4b']['verdict']
# Prove silent success: overall PASS despite missing all gap keys
silent = (rep['overall'] == 'PASS' and a_ver == 'PASS' and b_ver == 'PASS'
          and rep['missing_gap_keys']['after'] > 0)
record('A_empty_noAffByF_dict_yields_PASS_via_zero',
       ok=not silent,
       detail={'overall': rep['overall'], 'PL-AC4a': a_ver, 'PL-AC4b': b_ver,
               'missing_gap_keys': rep['missing_gap_keys'],
               'sample_gP95': rep['checks']['PL-AC4c']['detail']['optimal']['bands'],
               'note': 'empty {} → every L treated as 0 → gP95=0 PASS; missing_gap_keys reported but does NOT gate'})

# --- Case B: single missing key still allows overall PASS (existing suite documents this) ---
d = tmpdir()
def drop12(p, o):
    del o['prof'][p]['rows'][0]['noAffByF']['12']
before = make(d, 'b')
after = make(d, 'a', mut=drop12)
rep = bandguard.check(before, after, profiles=PROFS, seeds=SEEDS, synthetic=True)
# With only one key missing, gP95 still from other levels; overall typically PASS
# and missing_gap_keys > 0 but does not force FAIL
gated_by_miss = rep['overall'] != 'PASS' and rep['missing_gap_keys']['after'] > 0
# The bug is: missing does not force FAIL/UNASSESSED
record('B_partial_missing_key_does_not_force_FAIL',
       ok=gated_by_miss,  # ok=True only if missing forces fail
       detail={'overall': rep['overall'], 'missing_gap_keys': rep['missing_gap_keys'],
               'missing_gap_policy': rep.get('missing_gap_policy'),
               'note': 'DESIGN provisional #7 + authority.json explicitly count missing as 0; counter is diagnostic only'})

# --- Case C: omit noAffByF field entirely ---
d = tmpdir()
before = make(d, 'b')
after = make(d, 'a', omit_field=True)
rep = bandguard.check(before, after, profiles=PROFS, seeds=SEEDS, synthetic=True)
# Should FAIL because noAffByF missing appends to errs
record('C_omit_noAffByF_field_fails',
       ok=(rep['overall'] != 'PASS'),
       detail={'overall': rep['overall'], 'input_errors_sample': rep.get('input_errors', [])[:3],
               'note': 'field absent → errs → FAIL (correct fail-closed for whole-field absence)'})

# --- Case D: max of empty seed contribution path — all keys missing for one seed only ---
# Seed 1 has empty map; others intact. Seed 1 contributes 0 to band max.
d = tmpdir()
def empty_seed1(p, o):
    o['prof'][p]['rows'][0]['noAffByF'] = {}  # seed 1
before = make(d, 'b')
after = make(d, 'a', mut=empty_seed1)
rep = bandguard.check(before, after, profiles=PROFS, seeds=SEEDS, synthetic=True)
# Can still PASS while missing_gap_keys > 0
record('D_one_seed_empty_map_still_PASS_with_zeros',
       ok=not (rep['overall'] == 'PASS' and rep['missing_gap_keys']['after'] > 0),
       detail={'overall': rep['overall'], 'missing_gap_keys': rep['missing_gap_keys'],
               'note': 'one seed all-zeros from absent keys dilutes band stats; still PASS'})

# --- Case E: gatecommon.q([]) raises (good) ---
try:
    G.q([], 0.95)
    q_ok = False
    q_note = 'q([]) did not raise'
except ValueError as e:
    q_ok = True
    q_note = str(e)
record('E_quantile_empty_raises', ok=q_ok, detail={'overall': 'N/A', 'note': q_note})

# --- Case F: B4 documentary ref — any non-empty string flips CAP to PASS ---
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'gate-build'))
import csvcheck
from tests.fixtures import base_rows, to_csv, write, renamed, APPROVED_MAP

d = tmpdir()
before_csv = write(d, 'before.csv', to_csv(base_rows()))
after_rows = renamed(base_rows(), cap='0.27')
after_csv = write(d, 'after.csv', to_csv(after_rows, header=list(after_rows[0].keys())))
rmap = write(d, 'map.json', json.dumps(APPROVED_MAP))
# without b4-ref → CONDITIONAL-UNMET
rep0 = csvcheck.check(before_csv, after_csv, breeds=1, rename_map=rmap, b4_ref=None, synthetic=True)
# with junk documentary string → PASS on CAP
rep1 = csvcheck.check(before_csv, after_csv, breeds=1, rename_map=rmap, b4_ref='documentary-only-no-evidence', synthetic=True)
cap0 = rep0['checks']['CAP']['verdict']
cap1 = rep1['checks']['CAP']['verdict']
# Bug for certification: documentary string alone suffices; no sha/run evidence required
doc_insufficient = (cap0 == 'CONDITIONAL-UNMET' and cap1 == 'PASS')
record('F_b4_ref_accepts_any_documentary_string',
       ok=not doc_insufficient,  # finding if it accepts junk
       detail={'CAP_without_ref': cap0, 'CAP_with_junk_ref': cap1,
               'note': 'D-HOP-29-08 requires Econ B4 re-run on seeds 1-200; a free-text --b4-ref is not that re-run'})

# --- Case G: measured zero vs absent — explicit gap 0 should be distinguishable ---
# Explicit "12": 0 in after should be fine as measured zero; absent key should not be equivalent for gating.
# Current code treats both as 0 for the max — only the counter distinguishes. Verdict identical.
d = tmpdir()
def explicit_zero(p, o):
    o['prof'][p]['rows'][0]['noAffByF']['12'] = 0
def absent(p, o):
    del o['prof'][p]['rows'][0]['noAffByF']['12']
before = make(d, 'b')
rep_z = bandguard.check(before, make(d, 'az', mut=explicit_zero), profiles=PROFS, seeds=SEEDS, synthetic=True)
rep_a = bandguard.check(before, make(d, 'aa', mut=absent), profiles=PROFS, seeds=SEEDS, synthetic=True)
# Verdicts equal (both PASS typically) — absent not distinguished at verdict level
same = (rep_z['overall'] == rep_a['overall'] == 'PASS'
        and rep_z['missing_gap_keys']['after'] == 0
        and rep_a['missing_gap_keys']['after'] > 0)
record('G_measured_zero_and_absent_key_same_verdict',
       ok=not same,
       detail={'explicit_zero_overall': rep_z['overall'], 'absent_overall': rep_a['overall'],
               'explicit_miss': rep_z['missing_gap_keys'], 'absent_miss': rep_a['missing_gap_keys'],
               'note': 'counter differs but verdict does not; absent conflated with measured 0 for PASS/FAIL'})

out = os.path.join(os.path.dirname(__file__), 'silent-zero-proofs.json')
blocking = [r for r in results if r['finding'] == 'BLOCKING']
summary = {
    'status': 'HoQA proof run (synthetic only)',
    'blocking_count': len(blocking),
    'blocking_cases': [r['case'] for r in blocking],
    'results': results,
}
open(out, 'w').write(json.dumps(summary, indent=2) + '\n')
print('---')
print(f'Wrote {out}; blocking={len(blocking)}')
sys.exit(0 if blocking else 0)  # always 0; proofs document findings
