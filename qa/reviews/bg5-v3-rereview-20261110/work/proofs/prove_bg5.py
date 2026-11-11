#!/usr/bin/env python3
"""BG5/BG5b reproduction (SYNTHETIC). Required (evidence-contract EC-4): documentary approval_ref / b4_run_ref / FAM authority
never unlock P5IB / FAM PASS; relied-on -> CONDITIONAL-UNMET. 'defect' = PASS reached via a ref. Target = $GB_TARGET."""
import hashlib, json, os, sys
T = os.environ['GB_TARGET']; sys.path[:0] = [T, os.path.join(T, 'tests')]
from fixtures import base_rows, to_csv, write, write_json, tmpdir
import csvcheck
d = tmpdir(); before = write(d, 'before.csv', to_csv(base_rows()))
art = write(d, 'approval.md', 'synthetic approval artifact\n')
art_ref = f'path={art} sha256={hashlib.sha256(open(art, "rb").read()).hexdigest()}'
OUT = []
for ref in ('SYN-A', 'I-am-not-an-approval', art_ref):
    rows = base_rows()
    for r in rows: r['bc_broody_cap_bp'] = '700'
    lst = write_json(d, 'l.json', {'columns': {'bc_broody_cap_bp': {'value': '700', 'approval_ref': ref, 'b4_run_ref': ref}}})
    r = csvcheck.check(before, write(d, 'a.csv', to_csv(rows)), breeds=0, bc_listing=lst, synthetic=True)
    OUT.append({'case': f'P5IB bc_broody_cap_bp=700 refs={ref[:50]!r}', 'P5IB': r['checks']['P5IB']['verdict'], 'overall': r['overall']})
    rows = base_rows(); rows[20]['hens_cost'] = str(int(rows[20]['hens_cost']) + 1)
    al = write_json(d, 'al.json', {'families': [{'column': 'hens_cost', 'rows': [14, 29], 'authority': ref}]})
    r = csvcheck.check(before, write(d, 'a.csv', to_csv(rows)), breeds=0, allow_families=al, synthetic=True)
    OUT.append({'case': f'FAM hens_cost L20 +1 authority={ref[:50]!r}', 'FAM': r['checks']['FAM']['verdict'], 'overall': r['overall']})
for o in OUT:
    v = o.get('P5IB') or o.get('FAM'); o['defect'] = v == 'PASS' or o['overall'] == 'PASS'
    print(f"{'DEFECT' if o['defect'] else 'OK    '} {o['case']}: {v} overall={o['overall']}")
n = sum(o['defect'] for o in OUT)
json.dump({'target': T, 'synthetic': True, 'ac_claim': 'NONE', 'defect_count': n, 'cases': OUT}, open(os.environ['GB_OUT'], 'w'), indent=1)
print(f'--- defects={n}'); sys.exit(1 if n else 0)
