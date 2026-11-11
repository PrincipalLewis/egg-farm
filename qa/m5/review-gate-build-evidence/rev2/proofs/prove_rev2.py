#!/usr/bin/env python3
"""HoQA REV2 proofs against repaired pkg. Synthetic only."""
import json, os, sys, tempfile
PKG = os.path.join(os.path.dirname(__file__), '..', 'pkg')
sys.path.insert(0, PKG)
import bandguard, csvcheck, gatecommon as G
from tests.fixtures import raw, raw_rows, tmpdir, write_json, base_rows, to_csv, write, renamed, APPROVED_MAP

PROFS = ('optimal', 'seller15', 'casual')
SEEDS = (1, 5)
results = []

def record(name, closed_ok, detail):
    # closed_ok True => defect fixed / safe behaviour
    results.append({'case': name, 'status': 'CLOSED_OK' if closed_ok else 'STILL_OPEN_OR_NEW', 'detail': detail})
    print(('OK' if closed_ok else 'BLOCK'), name, '->', detail.get('note', detail.get('overall')))

def make(d, tag, mut=None, empty_noaff=False, omit_field=False, null_gap=False, list_noaff=False):
    paths = []
    for p in PROFS:
        rows = raw_rows(range(SEEDS[0], SEEDS[1]+1), gap=50)
        o = raw(p, rows)
        if empty_noaff:
            for r in o['prof'][p]['rows']:
                r['noAffByF'] = {}
        if omit_field:
            for r in o['prof'][p]['rows']:
                del r['noAffByF']
        if null_gap:
            for r in o['prof'][p]['rows']:
                r['noAffByF']['12'] = None
        if list_noaff:
            for r in o['prof'][p]['rows']:
                r['noAffByF'] = []
        if mut:
            mut(p, o)
        paths.append(write_json(d, f'{tag}-{p}.json', o))
    return paths

def not_pass(rep):
    return rep['overall'] != 'PASS'

def no_subset_stats(rep):
    """When after is unassessed, bands dict should not carry gP95 from remaining seeds."""
    c = rep['checks']['PL-AC4c']['detail']
    for p, d in c.items():
        if d.get('bands_unassessed'):
            # any unassessed band must not appear in bands with stats
            for b in d['bands_unassessed']:
                if b in d.get('bands', {}):
                    return False
    return True

# ===== BG-1 cases (prior A/B/D/G + adversarial) =====
d = tmpdir()
before = make(d, 'b')
rep = bandguard.check(before, make(d, 'a', empty_noaff=True), profiles=PROFS, seeds=SEEDS, synthetic=True)
record('A_empty_dict',
       not_pass(rep) and rep['checks']['PL-AC4a']['verdict'] == 'UNASSESSED' and no_subset_stats(rep),
       {'overall': rep['overall'], '4a': rep['checks']['PL-AC4a']['verdict'], '4b': rep['checks']['PL-AC4b']['verdict'],
        'bands': rep['checks']['PL-AC4c']['detail']['optimal']['bands'],
        'unassessed': rep['checks']['PL-AC4c']['detail']['optimal'].get('bands_unassessed'),
        'note': 'empty {} -> UNASSESSED, no gP95 subset'})

d = tmpdir()
def drop12(p, o):
    del o['prof'][p]['rows'][0]['noAffByF']['12']
rep = bandguard.check(make(d, 'b'), make(d, 'a', mut=drop12), profiles=PROFS, seeds=SEEDS, synthetic=True)
record('B_partial_missing_key',
       not_pass(rep) and rep['checks']['PL-AC4a']['verdict'] == 'UNASSESSED' and no_subset_stats(rep),
       {'overall': rep['overall'], '4a': rep['checks']['PL-AC4a']['verdict'], 'miss': rep['missing_gap_keys'],
        'bands': rep['checks']['PL-AC4c']['detail']['optimal']['bands'],
        'note': 'one missing key -> UNASSESSED, no subset stats'})

d = tmpdir()
def empty_seed1(p, o):
    o['prof'][p]['rows'][0]['noAffByF'] = {}
rep = bandguard.check(make(d, 'b'), make(d, 'a', mut=empty_seed1), profiles=PROFS, seeds=SEEDS, synthetic=True)
record('D_one_seed_empty',
       not_pass(rep) and rep['checks']['PL-AC4a']['verdict'] == 'UNASSESSED' and no_subset_stats(rep),
       {'overall': rep['overall'], '4a': rep['checks']['PL-AC4a']['verdict'],
        'bands': rep['checks']['PL-AC4c']['detail']['optimal']['bands'],
        'note': 'one seed empty map -> UNASSESSED whole band'})

d = tmpdir()
def explicit_zero(p, o):
    o['prof'][p]['rows'][0]['noAffByF']['12'] = 0
def absent(p, o):
    del o['prof'][p]['rows'][0]['noAffByF']['12']
before = make(d, 'b')
rep_z = bandguard.check(before, make(d, 'az', mut=explicit_zero), profiles=PROFS, seeds=SEEDS, synthetic=True)
rep_a = bandguard.check(before, make(d, 'aa', mut=absent), profiles=PROFS, seeds=SEEDS, synthetic=True)
record('G_measured_zero_vs_absent',
       rep_z['overall'] == 'PASS' and rep_a['overall'] != 'PASS'
       and rep_z['checks']['PL-AC4a']['verdict'] == 'PASS'
       and rep_a['checks']['PL-AC4a']['verdict'] == 'UNASSESSED',
       {'zero_overall': rep_z['overall'], 'absent_overall': rep_a['overall'],
        'zero_4a': rep_z['checks']['PL-AC4a']['verdict'], 'absent_4a': rep_a['checks']['PL-AC4a']['verdict'],
        'note': 'explicit 0 PASS; absent UNASSESSED'})

# null -> FAIL
d = tmpdir()
rep = bandguard.check(make(d, 'b'), make(d, 'a', null_gap=True), profiles=PROFS, seeds=SEEDS, synthetic=True)
record('X_null_gap_FAIL',
       not_pass(rep) and rep['checks']['PL-AC4a']['verdict'] == 'FAIL',
       {'overall': rep['overall'], '4a': rep['checks']['PL-AC4a']['verdict'],
        'errs': rep.get('input_errors', [])[:2], 'note': 'null -> FAIL'})

# empty array noAffByF -> FAIL
d = tmpdir()
rep = bandguard.check(make(d, 'b'), make(d, 'a', list_noaff=True), profiles=PROFS, seeds=SEEDS, synthetic=True)
record('X_empty_array_noAff_FAIL',
       not_pass(rep) and (rep['checks']['PL-AC4a']['verdict'] == 'FAIL' or bool(rep.get('input_errors'))),
       {'overall': rep['overall'], '4a': rep['checks']['PL-AC4a']['verdict'],
        'errs': rep.get('input_errors', [])[:2], 'note': '[] not a dict -> FAIL'})

# NaN in gap
d = tmpdir()
def nan_gap(p, o):
    o['prof'][p]['rows'][0]['noAffByF']['12'] = float('nan')
# JSON can't store nan via json.dump easily - write raw
paths_b = make(d, 'b')
# craft after with NaN textually
import copy
rows = raw_rows(range(SEEDS[0], SEEDS[1]+1), gap=50)
paths_a = []
for p in PROFS:
    o = raw(p, rows)
    # write with NaN via replace after dump
    pth = write_json(d, f'anan-{p}.json', o)
    txt = open(pth).read()
    # inject NaN for L12 seed 1
    txt = txt.replace('"12": 50', '"12": NaN', 1)  # first seed gap base 50
    open(pth, 'w').write(txt)
    paths_a.append(pth)
rep = bandguard.check(paths_b, paths_a, profiles=PROFS, seeds=SEEDS, synthetic=True)
record('X_nan_gap_FAIL',
       not_pass(rep),
       {'overall': rep['overall'], '4a': rep['checks']['PL-AC4a']['verdict'],
        'errs': rep.get('input_errors', [])[:3], 'note': 'NaN -> non-PASS'})

# missing file
d = tmpdir()
paths_b = make(d, 'b')
rep = bandguard.check(paths_b, [os.path.join(d, 'no-such-file.json')], profiles=PROFS, seeds=SEEDS, synthetic=True)
record('X_missing_file_FAIL',
       not_pass(rep),
       {'overall': rep['overall'], 'errs': rep.get('input_errors', [])[:2], 'note': 'missing file -> non-PASS'})

# omit field
d = tmpdir()
rep = bandguard.check(make(d, 'b'), make(d, 'a', omit_field=True), profiles=PROFS, seeds=SEEDS, synthetic=True)
record('C_omit_field_FAIL',
       not_pass(rep) and rep['checks']['PL-AC4a']['verdict'] == 'FAIL',
       {'overall': rep['overall'], '4a': rep['checks']['PL-AC4a']['verdict'], 'note': 'field absent -> FAIL'})

# partial-F: L29 absent on all seeds of after
d = tmpdir()
def drop29(p, o):
    for r in o['prof'][p]['rows']:
        del r['noAffByF']['29']
rep = bandguard.check(make(d, 'b'), make(d, 'a', mut=drop29), profiles=PROFS, seeds=SEEDS, synthetic=True)
# F26-30 includes 29 -> that band UNASSESSED; other bands may PASS
ua = rep['checks']['PL-AC4a']['verdict']
record('X_partial_F_L29_absent',
       not_pass(rep) and ua == 'UNASSESSED' and 'F26-30' in (rep['checks']['PL-AC4c']['detail']['optimal'].get('bands_unassessed') or {})
       and 'F26-30' not in rep['checks']['PL-AC4c']['detail']['optimal'].get('bands', {}),
       {'overall': rep['overall'], '4a': ua,
        'bands': list(rep['checks']['PL-AC4c']['detail']['optimal'].get('bands', {})),
        'unassessed': rep['checks']['PL-AC4c']['detail']['optimal'].get('bands_unassessed'),
        'note': 'L29 absent -> F26-30 UNASSESSED, no subset gP95 for that band'})

# complete maps still PASS
d = tmpdir()
rep = bandguard.check(make(d, 'b'), make(d, 'a'), profiles=PROFS, seeds=SEEDS, synthetic=True)
record('CTRL_complete_PASS',
       rep['overall'] == 'PASS',
       {'overall': rep['overall'], 'note': 'complete maps still PASS'})

# ===== BG-2 =====
d = tmpdir()
before_csv = write(d, 'before.csv', to_csv(base_rows()))
after_rows = renamed(base_rows(), cap='0.27')
after_csv = write(d, 'after.csv', to_csv(after_rows, header=list(after_rows[0].keys())))
rmap = write(d, 'map.json', json.dumps(APPROVED_MAP))

for ref in [None, 'documentary-only-no-evidence', 'I-am-not-a-B4-run',
            'a' * 64, '{"sha256":"deadbeef","seeds":[1,200]}']:
    rep = csvcheck.check(before_csv, after_csv, breeds=1, rename_map=rmap, b4_ref=ref, synthetic=True)
    cap = rep['checks']['CAP']['verdict']
    record(f'F_b4_ref_{ref!r}'[:60],
           cap == 'CONDITIONAL-UNMET' and rep['overall'] != 'PASS'
           and 'b4_ref' not in rep  # removed from top level
           and rep['checks']['CAP']['detail'].get('b4_evidence', '').startswith('NOT VERIFIED'),
           {'CAP': cap, 'overall': rep['overall'],
            'doc': rep['checks']['CAP']['detail'].get('b4_ref_documentary'),
            'ev': rep['checks']['CAP']['detail'].get('b4_evidence'),
            'note': f'breeds=1 ref={ref!r} -> CONDITIONAL-UNMET'})

# breeds=0 still PASS on literal 0.28
a28 = write(d, 'a28.csv', to_csv(base_rows()))
rep = csvcheck.check(before_csv, a28, breeds=0, synthetic=True)
record('CTRL_breeds0_literal_PASS',
       rep['checks']['CAP']['verdict'] == 'PASS' and rep['overall'] == 'PASS',
       {'CAP': rep['checks']['CAP']['verdict'], 'overall': rep['overall'], 'note': 'breeds=0 path unchanged'})

# ===== P5IB free-text hole =====
# Need bc_* columns + listing with junk approval_ref / b4_run_ref
d = tmpdir()
rows = renamed(base_rows(), cap='0.27')
# add a bc_ column constant
for r in rows:
    r['bc_lay_cap_bp_lt18'] = '700'
header = list(rows[0].keys())
after_bc = write(d, 'after_bc.csv', to_csv(rows, header=header))
listing = {
    'columns': {
        'bc_lay_cap_bp_lt18': {
            'value': '700',
            'approval_ref': 'I-am-not-an-approval',
            'b4_run_ref': 'documentary-only-no-B4-run'
        }
    }
}
lst = write(d, 'bc.json', json.dumps(listing))
rmap = write(d, 'map.json', json.dumps(APPROVED_MAP))
rep = csvcheck.check(before_csv, after_bc, breeds=1, rename_map=rmap, bc_listing=lst,
                     b4_ref='junk', synthetic=True)
p5ib = rep['checks']['P5IB']['verdict']
cap = rep['checks']['CAP']['verdict']
# CAP should be CONDITIONAL-UNMET (BG2); P5IB may still PASS on free text — that is the hole
record('P5IB_freetext_approval_and_b4_run_ref',
       p5ib != 'PASS',  # we WANT this to be non-PASS; if PASS, it's a NEW blocker
       {'P5IB': p5ib, 'CAP': cap, 'overall': rep['overall'],
        'P5IB_detail': {k: rep['checks']['P5IB']['detail'].get(k) for k in ('errors', 'bc_columns', 'note')},
        'note': 'P5IB must not PASS on free-text approval_ref/b4_run_ref; if PASS => NEW blocker'})

# Also: empty-ish but non-empty whitespace already rejected by strip check; confirm whitespace-only fails
listing2 = {
    'columns': {
        'bc_lay_cap_bp_lt18': {
            'value': '700',
            'approval_ref': '   ',
            'b4_run_ref': 'x'
        }
    }
}
lst2 = write(d, 'bc2.json', json.dumps(listing2))
rep2 = csvcheck.check(before_csv, after_bc, breeds=1, rename_map=rmap, bc_listing=lst2, synthetic=True)
record('P5IB_whitespace_approval_ref',
       rep2['checks']['P5IB']['verdict'] == 'FAIL',
       {'P5IB': rep2['checks']['P5IB']['verdict'], 'errors': rep2['checks']['P5IB']['detail'].get('errors'),
        'note': 'whitespace-only approval_ref should FAIL (strip check)'})

out = os.path.join(os.path.dirname(__file__), 'rev2-proofs.json')
bad = [r for r in results if r['status'] != 'CLOSED_OK']
summary = {'blocking_or_open': len(bad), 'open_cases': [r['case'] for r in bad], 'results': results}
open(out, 'w').write(json.dumps(summary, indent=2) + '\n')
print('---')
print(f'Wrote {out}; open={len(bad)}: {[r["case"] for r in bad]}')
sys.exit(0)
