#!/usr/bin/env python3
"""HoQA adversarial probes of verify_ref (BG5/BG5b). SYNTHETIC TEMP fixtures only, under this review folder.
Target = $GB_TARGET (a byte copy of repair-bg5-bg4/pkg). EXPECT = what D-HOP-2026-11-09-05 requires."""
import hashlib, json, os, sys
T = os.environ['GB_TARGET']; sys.path[:0] = [T, os.path.join(T, 'tests')]
from fixtures import base_rows, to_csv, write, write_json, tmpdir
import csvcheck
d = tmpdir()
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
before = write(d, 'before.csv', to_csv(base_rows()))
rows = base_rows()
for r in rows: r['bc_broody_cap_bp'] = '700'
after = write(d, 'after.csv', to_csv(rows)); C = sha(after)
hrows = base_rows(); hrows[20]['hens_cost'] = str(int(hrows[20]['hens_cost']) + 1)
hafter = write(d, 'hafter.csv', to_csv(hrows)); HC = sha(hafter)
man = write_json(d, 'man.json', {'csv_sha256': C, 'seeds': [1, 200], 'config': 'CFG none', 'harness_sha': 'a' * 64}); M = sha(man)
os.symlink(man, os.path.join(d, 'man-link.json')); MAN_LINK = os.path.join(d, 'man-link.json')
dec = os.path.join(d, 'decisions.md')
res = []

def p5(name, text, a, b, expect):
    open(dec, 'w').write(text)
    lst = write_json(d, 'l.json', {'columns': {'bc_broody_cap_bp': {'value': '700', 'approval_ref': a, 'b4_run_ref': b}}})
    try:
        r = csvcheck.check(before, after, breeds=0, synthetic=True, bc_listing=lst, decisions_paths=[dec])
        v = r['checks']['P5IB']['verdict']; why = r['checks']['P5IB']['detail'].get('verify_reasons')
    except Exception as e:
        v, why = f'EXC {type(e).__name__}', str(e)
    res.append((name, 'P5IB', v, expect, why))

def fam(name, text, auth, expect):
    open(dec, 'w').write(text)
    al = write_json(d, 'al.json', {'families': [{'column': 'hens_cost', 'rows': [14, 29], 'authority': auth}]})
    try:
        r = csvcheck.check(before, hafter, breeds=0, synthetic=True, allow_families=al, decisions_paths=[dec])
        v = r['checks']['FAM']['verdict']; why = r['checks']['FAM']['detail'].get('verify_reasons')
    except Exception as e:
        v, why = f'EXC {type(e).__name__}', str(e)
    res.append((name, 'FAM', v, expect, why))

H, Q = 'D-HOP-2099-01-01-77', 'QA-D-2099-B4RUN'
good = f'## {H} · HoP approval\n- candidate `{C}`\n\n## {Q} · QA B4 run\n- manifest `{M}`\n'
p5('P01 control: genuine HoP + QA-D entries', good, H, f'{Q} path={man}', 'PASS')
# --- authority confusion via heading co-mention ---
p5('P02 one PMW-authored heading co-mentions both IDs; no HoP or QA-D entry exists',
   f'## D-PMW-2099-01-01-01 · PMW note (re {H}; {Q})\n- candidate `{C}`; manifest `{M}`\n', H, f'{Q} path={man}', 'NOT PASS')
p5('P03 HoP-authored heading mentions the QA-D id; no QA-D entry exists (HoP body credited as QA-D)',
   f'## {H} · HoP approval (B4 per {Q})\n- candidate `{C}`; manifest `{M}`\n', H, f'{Q} path={man}', 'NOT PASS')
p5('P04 spoof heading precedes genuine entry; genuine entry lacks sha (first-wins)',
   f'## D-ECON-2099-01-01-01 · Econ proposal awaiting {H}\n- `{C}`\n\n## {H} · HoP\n- rejected; no sha here\n\n## {Q}\n- `{M}`\n', H, f'{Q} path={man}', 'NOT PASS')
p5('P05 heading inside a fenced code block in another entry',
   f'## D-PMM-2099-01-01-01 · notes\n```\n## {H}\n- `{C}`\n## {Q}\n- `{M}`\n```\n', H, f'{Q} path={man}', 'NOT PASS')
fam('F01 control: genuine HoP entry for FAM', f'## {H} · HoP\n- `{HC}`\n', H, 'PASS')
fam('F02 FAM authority credited to PMW heading co-mention', f'## D-PMW-2099-01-01-02 · cites {H}\n- `{HC}`\n', H, 'NOT PASS')
# --- id-in-body / quote only ---
p5('P06 IDs only in body text / blockquote of another entry',
   f'## D-PMW-2099-01-01-03 · notes\n> {H}: candidate `{C}`\n{Q} manifest `{M}`\n', H, f'{Q} path={man}', 'NOT PASS')
# --- sha tricks ---
p5('P07 8-hex prefix of the sha', f'## {H}\n- `{C[:8]}`\n## {Q}\n- `{M[:8]}`\n', H, f'{Q} path={man}', 'NOT PASS')
p5('P08 uppercase sha in entry', f'## {H}\n- `{C.upper()}`\n## {Q}\n- `{M.upper()}`\n', H, f'{Q} path={man}', 'NOT PASS')
p5('P09 sha embedded in 65-hex run', f'## {H}\n- `a{C}`\n## {Q}\n- `{M}b`\n', H, f'{Q} path={man}', 'NOT PASS')
p5('P10 sha split by whitespace', f'## {H}\n- `{C[:32]} {C[32:]}`\n## {Q}\n- `{M}`\n', H, f'{Q} path={man}', 'NOT PASS')
p5('P11 63-hex truncated sha', f'## {H}\n- `{C[:63]}`\n## {Q}\n- `{M}`\n', H, f'{Q} path={man}', 'NOT PASS')
# --- id tricks ---
p5('P12 lowercase id in ref', good, H.lower(), f'{Q.lower()} path={man}', 'NOT PASS')
p5('P13 id prefix of real id', good, 'D-HOP-2099-01-01-7', f'{Q} path={man}', 'NOT PASS')
p5('P14 authorities swapped', f'## {Q}\n- `{C}`\n## {H}\n- `{M}`\n', Q, f'{H} path={man}', 'NOT PASS')
p5('P15 QA-D id as approval_ref + D-HOP as b4', good, Q, f'{H} path={man}', 'NOT PASS')
p5('P16 ref with leading/trailing whitespace + extra text', good, f'  see {H}  ', f'  {Q} path={man}  ', 'PASS (benign: genuine entries)')
p5('P17 heading with level-4 ####', f'#### {H}\n- `{C}`\n#### {Q}\n- `{M}`\n', H, f'{Q} path={man}', 'NOT PASS (fail-closed ok)')
# --- B4 manifest tricks ---
p5('P18 B4 manifest path missing', good, H, f'{Q} path={d}/nope.json', 'NOT PASS')
p5('P19 B4 ref without path=', good, H, f'{Q}', 'NOT PASS')
p5('P20 B4 manifest via symlink (content hashed)', good, H, f'{Q} path={MAN_LINK}', 'PASS (acceptable: content-hashed)')
m2 = write_json(d, 'man2.json', {'csv_sha256': C.upper(), 'seeds': [1, 200], 'config': 'x', 'harness_sha': 'a' * 64})
p5('P21 B4 manifest csv sha uppercase', f'## {H}\n- `{C}`\n## {Q}\n- `{sha(m2)}`\n', H, f'{Q} path={m2}', 'NOT PASS')
m3 = write_json(d, 'man3.json', {'csv_sha256': C, 'seeds': [], 'config': 'x', 'harness_sha': 'a' * 64})
p5('P22 B4 manifest with empty seeds list', f'## {H}\n- `{C}`\n## {Q}\n- `{sha(m3)}`\n', H, f'{Q} path={m3}', 'NOT PASS')
p5('P23 entry body says REJECTED but contains sha', f'## {H}\n- REJECTED candidate `{C}`\n## {Q}\n- `{M}`\n', H, f'{Q} path={man}', 'PASS (rule (iii) is text-presence only; semantic, advisory)')
fam('F03 FAM authority is a list (type trick)', good, [H], 'NOT PASS / input error')
fam('F04 FAM authority empty string', good, '', 'NOT PASS')

bad = 0
for n, chk, v, exp, why in res:
    ok = (v == 'PASS') == exp.startswith('PASS') if not v.startswith('EXC') else not exp.startswith('PASS')
    bad += not ok
    print(f"{'OK  ' if ok else 'BYPASS'} {n} [{chk}] got={v} expect={exp}" + ('' if ok else f'\n        reasons={why}'))
print(f'--- bypasses={bad} of {len(res)} probes'); sys.exit(1 if bad else 0)
