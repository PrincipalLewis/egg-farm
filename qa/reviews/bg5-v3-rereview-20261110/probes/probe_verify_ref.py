#!/usr/bin/env python3
"""HoQA adversarial probes of csvcheck.verify_ref (BG5/BG5b).

Usage:
  probe_verify_ref.py <pkg_dir>
  GB_TARGET=<pkg_dir> probe_verify_ref.py

TEMP fixtures only. Authority layout mirrors D-HOP-2026-11-10-10:
  <tmp>/studio/decisions.md
  <tmp>/studio/product/decisions.md
  <tmp>/studio/qa/decisions.md
  <tmp>/studio/engineering/decisions.md

Prints a per-probe table. Exit 0 iff every probe meets its expect column.
expect values:
  PASS              - check verdict must be PASS
  NOT PASS          - verdict must not be PASS (v3 may use CONDITIONAL-UNMET)
  FAIL              - verdict must be exactly FAIL (-10 (1); v3 expected gap if CONDITIONAL-UNMET)
  UNPINNED          - verdict must be UNPINNED or detail carries UNPINNED (-10 (3); v3 expected gap)
  INPUT_ERROR       - check() / allowlist raises or returns non-PASS structural error
"""
from __future__ import annotations
import hashlib, json, os, sys, tempfile, traceback

def main():
    pkg = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('GB_TARGET')
    if not pkg or not os.path.isdir(pkg):
        print('usage: probe_verify_ref.py <pkg_dir>', file=sys.stderr); return 2
    pkg = os.path.abspath(pkg)
    sys.path[:0] = [pkg, os.path.join(pkg, 'tests')]
    from fixtures import base_rows, to_csv, write, write_json
    import csvcheck

    tmp = tempfile.mkdtemp(prefix='hoqa-probe-')
    studio = os.path.join(tmp, 'studio')
    paths = {
        'root': os.path.join(studio, 'decisions.md'),
        'product': os.path.join(studio, 'product', 'decisions.md'),
        'qa': os.path.join(studio, 'qa', 'decisions.md'),
        'engineering': os.path.join(studio, 'engineering', 'decisions.md'),
        # -06 path (should be ignored under -10; v3 still classifies it as 'workers')
        'workers': os.path.join(studio, 'product', 'workers', 'decisions.md'),
    }
    for p in paths.values():
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'w').close()

    def sha(p):
        return hashlib.sha256(open(p, 'rb').read()).hexdigest()

    def clear():
        for p in paths.values():
            open(p, 'w').close()

    def put(**role_text):
        clear()
        for role, text in role_text.items():
            open(paths[role], 'w').write(text)
        # Prefer dict-by-role when the tool accepts it; also pass path list for layout-classified tools.
        return {
            'dict': {r: paths[r] for r in ('root', 'product', 'qa', 'engineering', 'workers') if r in paths},
            'list': [paths[r] for r in ('root', 'product', 'qa', 'engineering', 'workers')],
            # -10 exact-path layout (no workers)
            'list10': [paths[r] for r in ('root', 'product', 'qa', 'engineering')],
        }

    before = write(tmp, 'before.csv', to_csv(base_rows()))
    rows = base_rows()
    for r in rows:
        r['bc_broody_cap_bp'] = '700'
    after = write(tmp, 'after.csv', to_csv(rows)); C = sha(after)
    hrows = base_rows(); hrows[20]['hens_cost'] = str(int(hrows[20]['hens_cost']) + 1)
    hafter = write(tmp, 'hafter.csv', to_csv(hrows)); HC = sha(hafter)
    harness = write(tmp, 'bot-m5.ts', '// synthetic harness\n'); HS = sha(harness)

    def man(**over):
        m = {'csv_sha256': C, 'seeds': [1, 200], 'config': 'CFG none',
             'harness_sha': HS, 'harness_path': harness}
        m.update(over)
        return write_json(tmp, 'man-%s.json' % hashlib.sha1(json.dumps(over, sort_keys=True).encode()).hexdigest()[:8], m)

    man0 = man(); M = sha(man0)
    man_link = os.path.join(tmp, 'man-link.json')
    if not os.path.exists(man_link):
        os.symlink(man0, man_link)

    H, Q = 'D-HOP-2099-01-01-77', 'QA-D-2099-B4RUN'
    results = []

    def decide_paths(layout):
        # v3 accepts dict role->path; prefer that for stable role binding
        return layout['dict']

    def run_p5(name, layout, a, b, expect, note=''):
        lst = write_json(tmp, 'l.json', {'columns': {'bc_broody_cap_bp': {
            'value': '700', 'approval_ref': a, 'b4_run_ref': b}}})
        try:
            r = csvcheck.check(before, after, breeds=0, synthetic=True, bc_listing=lst,
                               decisions_paths=decide_paths(layout))
            v = r['checks']['P5IB']['verdict']
            why = r['checks']['P5IB']['detail'].get('verify_reasons')
            refv = r['checks']['P5IB']['detail'].get('ref_verification')
        except Exception as e:
            v, why, refv = f'EXC {type(e).__name__}', str(e), ''
        results.append(('P5IB', name, v, expect, why, refv, note))

    def run_fam(name, layout, auth, expect, note=''):
        al = write_json(tmp, 'al.json', {'families': [{'column': 'hens_cost', 'rows': [14, 29], 'authority': auth}]})
        try:
            r = csvcheck.check(before, hafter, breeds=0, synthetic=True, allow_families=al,
                               decisions_paths=decide_paths(layout))
            v = r['checks']['FAM']['verdict']
            why = r['checks']['FAM']['detail'].get('verify_reasons')
            refv = r['checks']['FAM']['detail'].get('ref_verification')
        except Exception as e:
            v, why, refv = f'EXC {type(e).__name__}', str(e), ''
        results.append(('FAM', name, v, expect, why, refv, note))

    # ---------- controls (correct multi-file layout) ----------
    lay = put(product=f'## {H} · HoP approval\n- candidate `{C}`\n',
              qa=f'## {Q} · QA B4 run\n- manifest `{M}`\n')
    run_p5('P01 control: genuine HoP+QA-D in authority files', lay, H, f'{Q} path={man0}', 'PASS')
    lay_fam = put(product=f'## {H} · HoP\n- `{HC}`\n')
    run_fam('F01 control: genuine HoP FAM', lay_fam, H, 'PASS')

    # ---------- D-1 co-mention / fence / duplicate ----------
    lay = put(product=f'## D-PMW-2099-01-01-01 · PMW note (re {H}; {Q})\n- candidate `{C}`; manifest `{M}`\n')
    run_p5('P02 PMW heading co-mentions both IDs; no HoP/QA entry', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(product=f'## {H} · HoP approval (B4 per {Q})\n- candidate `{C}`; manifest `{M}`\n')
    run_p5('P03 HoP heading mentions QA-D; no QA-D entry', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(product=f'## D-ECON-2099-01-01-01 · awaiting {H}\n- `{C}`\n\n## {H} · HoP\n- rejected; no sha\n',
              qa=f'## {Q}\n- `{M}`\n')
    run_p5('P04 spoof precedes genuine without sha (dup/first-wins)', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(product=f'## D-PMM-2099-01-01-01 · notes\n```\n## {H}\n- `{C}`\n## {Q}\n- `{M}`\n```\n')
    run_p5('P05 headings inside ``` fence', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(product=f'## D-PMW-2099-01-01-02 · cites {H}\n- `{HC}`\n')
    run_fam('F02 FAM credited to PMW co-mention', lay, H, 'NOT PASS')

    # ---------- body / sha / id tricks ----------
    lay = put(product=f'## D-PMW-2099-01-01-03 · notes\n> {H}: candidate `{C}`\n{Q} manifest `{M}`\n')
    run_p5('P06 IDs only in body/blockquote', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(product=f'## {H}\n- `{C[:8]}`\n', qa=f'## {Q}\n- `{M[:8]}`\n')
    run_p5('P07 8-hex prefix sha', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(product=f'## {H}\n- `{C.upper()}`\n', qa=f'## {Q}\n- `{M.upper()}`\n')
    run_p5('P08 uppercase sha in entry', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(product=f'## {H}\n- `a{C}`\n', qa=f'## {Q}\n- `{M}b`\n')
    run_p5('P09 sha in 65-hex run', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(product=f'## {H}\n- `{C[:32]} {C[32:]}`\n', qa=f'## {Q}\n- `{M}`\n')
    run_p5('P10 sha split by whitespace', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(product=f'## {H}\n- `{C[:63]}`\n', qa=f'## {Q}\n- `{M}`\n')
    run_p5('P11 63-hex truncated sha', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(product=f'## {H} · HoP\n- `{C}`\n', qa=f'## {Q}\n- `{M}`\n')
    run_p5('P12 lowercase ids in ref', lay, H.lower(), f'{Q.lower()} path={man0}', 'NOT PASS')
    run_p5('P13 id prefix of real id', lay, 'D-HOP-2099-01-01-7', f'{Q} path={man0}', 'NOT PASS')
    run_p5('P14 authorities swapped', lay, Q, f'{H} path={man0}', 'NOT PASS')
    run_p5('P15 QA-D as approval + D-HOP as b4', lay, Q, f'{H} path={man0}', 'NOT PASS')
    run_p5('P16 whitespace + extra text around genuine ids', lay, f'  see {H}  ', f'  {Q} path={man0}  ', 'PASS')

    lay = put(product=f'#### {H}\n- `{C}`\n', qa=f'#### {Q}\n- `{M}`\n')
    run_p5('P17 level-4 heading', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(product=f'## {H}\n- `{C}`\n', qa=f'## {Q}\n- `{M}`\n')
    run_p5('P18 B4 manifest path missing', lay, H, f'{Q} path={tmp}/nope.json', 'NOT PASS')
    run_p5('P19 B4 ref without path=', lay, H, f'{Q}', 'NOT PASS')
    run_p5('P20 B4 manifest via symlink (content hash)', lay, H, f'{Q} path={man_link}', 'PASS')

    m2 = man(**{'csv_sha256': C.upper()})
    lay = put(product=f'## {H}\n- `{C}`\n', qa=f'## {Q}\n- `{sha(m2)}`\n')
    run_p5('P21 B4 manifest csv sha uppercase', lay, H, f'{Q} path={m2}', 'NOT PASS')

    m3 = man(seeds=[])
    lay = put(product=f'## {H}\n- `{C}`\n', qa=f'## {Q}\n- `{sha(m3)}`\n')
    run_p5('P22 B4 empty seeds list', lay, H, f'{Q} path={m3}', 'NOT PASS')

    lay = put(product=f'## {H}\n- REJECTED candidate `{C}`\n', qa=f'## {Q}\n- `{M}`\n')
    run_p5('P23 REJECTED text but sha present (text-presence only)', lay, H, f'{Q} path={man0}', 'PASS')

    lay = put(product=f'## {H}\n- `{HC}`\n')
    run_fam('F03 FAM authority is a list', lay, [H], 'INPUT_ERROR')
    run_fam('F04 FAM authority empty string', lay, '', 'NOT PASS')

    # ---------- D-2 seed / harness probes ----------
    for label, over in [
        ('D2 seeds=None missing', {'seeds': None}),
        ('D2 seeds=[] empty', {'seeds': []}),
        ('D2 seeds=[True] bool', {'seeds': [True]}),
        ('D2 seeds=[1.5] float', {'seeds': [1.5]}),
        ('D2 seeds=["1"] string', {'seeds': ['1']}),
        ('D2 seeds=123 not list', {'seeds': 123}),
    ]:
        # rebuild without None values properly
        base = {'csv_sha256': C, 'config': 'CFG', 'harness_sha': HS, 'harness_path': harness}
        if over['seeds'] is None:
            pass  # omit seeds
        else:
            base['seeds'] = over['seeds']
        mp = write_json(tmp, 'd2-%s.json' % (abs(hash(label)) % 10**8), base)
        lay = put(product=f'## {H}\n- `{C}`\n', qa=f'## {Q}\n- `{sha(mp)}`\n')
        run_p5(label, lay, H, f'{Q} path={mp}', 'NOT PASS')

    # harness file missing / mismatch
    mp = man(harness_path=os.path.join(tmp, 'no-such-harness.ts'))
    lay = put(product=f'## {H}\n- `{C}`\n', qa=f'## {Q}\n- `{sha(mp)}`\n')
    run_p5('D2 harness file missing', lay, H, f'{Q} path={mp}', 'NOT PASS')
    mp = man(harness_sha='a' * 64)
    lay = put(product=f'## {H}\n- `{C}`\n', qa=f'## {Q}\n- `{sha(mp)}`\n')
    run_p5('D2 harness sha mismatch vs disk', lay, H, f'{Q} path={mp}', 'NOT PASS')

    # ---------- extra adversarial ----------
    lay = put(product='  ## %s\n- `%s`\n' % (H, C), qa='  ## %s\n- `%s`\n' % (Q, M))
    run_p5('X01 indented heading (2 spaces)', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(product='### %s\n- `%s`\n' % (H, C), qa='### %s\n- `%s`\n' % (Q, M))
    run_p5('X02 ### heading (level 3)', lay, H, f'{Q} path={man0}', 'NOT PASS')

    # CRLF file
    clear()
    open(paths['product'], 'wb').write(('## %s\r\n- `%s`\r\n' % (H, C)).encode())
    open(paths['qa'], 'wb').write(('## %s\r\n- `%s`\r\n' % (Q, M)).encode())
    lay = {'dict': {r: paths[r] for r in ('root', 'product', 'qa', 'engineering', 'workers')}}
    run_p5('X03 CRLF line endings (should still PASS if parser splitslines)', lay, H, f'{Q} path={man0}', 'PASS')

    lay = put(product='##\t%s\n- `%s`\n' % (H, C), qa='##\t%s\n- `%s`\n' % (Q, M))
    run_p5('X04 tab after ##', lay, H, f'{Q} path={man0}', 'PASS')  # _H2 allows ##[ \t]+

    lay = put(product='## %s:\n- `%s`\n' % (H, C), qa='## %s:\n- `%s`\n' % (Q, M))
    run_p5('X05 trailing colon after ID token', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(product='## %s,\n- `%s`\n' % (H, C), qa='## %s.\n- `%s`\n' % (Q, M))
    run_p5('X06 trailing punctuation after ID', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(product='## D-PMM-2099-X\n~~~\n## %s\n- `%s`\n' % (H, C),  # unclosed ~~~
              qa='## QA-D-2099-X\n```\n## %s\n- `%s`\n' % (Q, M))
    run_p5('X07 unclosed fence swallows rest of file', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(product='## D-PMM-2099-Y\n~~~\n## %s\n- `%s`\n```\n' % (H, C),
              qa='## QA-D-2099-Y\n```\n## %s\n- `%s`\n~~~\n' % (Q, M))
    run_p5('X08 fence opened ~~~ closed ``` (mismatched)', lay, H, f'{Q} path={man0}', 'NOT PASS')

    # symlink authority file (content should hash/read; role from path)
    clear()
    real_prod = os.path.join(tmp, 'real-product-decisions.md')
    open(real_prod, 'w').write('## %s\n- `%s`\n' % (H, C))
    if os.path.islink(paths['product']) or os.path.exists(paths['product']):
        os.remove(paths['product'])
    os.symlink(real_prod, paths['product'])
    open(paths['qa'], 'w').write('## %s\n- `%s`\n' % (Q, M))
    lay = {'dict': {r: paths[r] for r in ('root', 'product', 'qa', 'engineering', 'workers')}}
    run_p5('X09 symlinked authority file (content read)', lay, H, f'{Q} path={man0}', 'PASS')
    # restore regular file
    os.remove(paths['product']); open(paths['product'], 'w').close()

    # path traversal in decisions_paths
    trav = os.path.join(studio, 'product', '..', 'qa', 'decisions.md')
    open(paths['qa'], 'w').write('## %s\n- `%s`\n' % (Q, M))
    open(paths['product'], 'w').write('## %s\n- `%s`\n' % (H, C))
    # Pass a traversal path as the 'product' role value — tool must not mis-classify
    lay = {'dict': {'product': trav, 'qa': paths['qa'], 'root': paths['root'],
                    'engineering': paths['engineering']}}
    run_p5('X10 path-traversal role path (product -> ../qa)', lay, H, f'{Q} path={man0}', 'NOT PASS')

    # case variants
    lay = put(product='## d-hop-2099-01-01-77\n- `%s`\n' % C, qa='## qa-d-2099-B4RUN\n- `%s`\n' % M)
    run_p5('X11 lowercase heading ID', lay, H, f'{Q} path={man0}', 'NOT PASS')

    # unicode lookalikes (Cyrillic А in D-HOP, Homoglyph)
    fake = 'D-HОР-2099-01-01-77'  # Cyrillic О U+041E instead of Latin O
    # Actually use Cyrillic 'Н' lookalike more carefully: Latin D-HOP vs D-HОP (Cyrillic О)
    fake = 'D-H\u041eP-2099-01-01-77'  # CYRILLIC CAPITAL LETTER O
    lay = put(product='## %s\n- `%s`\n' % (fake, C), qa='## %s\n- `%s`\n' % (Q, M))
    run_p5('X12 unicode lookalike ID (Cyrillic О)', lay, H, f'{Q} path={man0}', 'NOT PASS')

    # ---------- cross-file authority (D-1 / -06 / -10) ----------
    lay = put(qa=f'## {H}\n- `{C}`\n', product=f'## {Q}\n- `{M}`\n')  # swapped files
    run_p5('X13 D-HOP defined in qa file; QA-D in product', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(engineering=f'## {H}\n- `{C}`\n', qa=f'## {Q}\n- `{M}`\n')
    run_p5('X14 D-HOP defined in engineering file', lay, H, f'{Q} path={man0}', 'NOT PASS')

    lay = put(workers=f'## {H}\n- `{C}`\n', qa=f'## {Q}\n- `{M}`\n')
    run_p5('X15 D-HOP defined only in product/workers ( -06 path )', lay, H, f'{Q} path={man0}', 'NOT PASS')

    # D-PMW as FAM authority: under -10 D-PMW lives in product/, but kind still requires D-HOP prefix
    lay = put(product=f'## D-PMW-2099-01-01-99\n- `{HC}`\n')
    run_fam('X16 D-PMW heading in product used as FAM authority', lay, 'D-PMW-2099-01-01-99', 'NOT PASS')

    # Duplicate heading same file
    lay = put(product=f'## {H}\n- `{C}`\n\n## {H}\n- also `{C}`\n', qa=f'## {Q}\n- `{M}`\n')
    run_p5('X17 duplicate ## heading same file', lay, H, f'{Q} path={man0}', 'NOT PASS')

    # ---------- -10 specific expectations (v3 expected gaps) ----------
    # (1) failed ref must be FAIL not CONDITIONAL-UNMET
    lay = put(product=f'## D-PMW-2099-ZZ\n- no\n')
    run_p5('T10-1 failed ref reports FAIL (not CONDITIONAL-UNMET)', lay, H, f'{Q} path={man0}', 'FAIL',
           note='-10 (1); v3 gap if CONDITIONAL-UNMET')

    # (2) D-PMW in product/ should be a valid *definition site* (even if FAM kind still wants D-HOP)
    # Probe: D-HOP in product PASS already covered. Probe unknown prefix FAIL:
    lay = put(product=f'## D-ZZZ-2099-01-01-01\n- `{C}`\n', qa=f'## {Q}\n- `{M}`\n')
    # Using D-ZZZ as approval_ref: no D-HOP id cited -> NOT PASS; under -10 unknown prefix FAILs
    run_p5('T10-2 unknown prefix D-ZZZ never verifies', lay, 'D-ZZZ-2099-01-01-01', f'{Q} path={man0}', 'NOT PASS',
           note='-10 (2) unknown prefix')

    # (3) harness UNPINNED: with valid refs+manifest but no R-1 pin, must not be PASS
    lay = put(product=f'## {H}\n- `{C}`\n', qa=f'## {Q}\n- `{M}`\n')
    run_p5('T10-3 valid refs but no R-1 pin => UNPINNED (never PASS)', lay, H, f'{Q} path={man0}', 'UNPINNED',
           note='-10 (3); v3 gap if PASS')

    # ---------- D-3 hermetic: synthetic with empty decisions_paths ----------
    try:
        lst = write_json(tmp, 'l3.json', {'columns': {'bc_broody_cap_bp': {
            'value': '700', 'approval_ref': H, 'b4_run_ref': f'{Q} path={man0}'}}})
        r = csvcheck.check(before, after, breeds=0, synthetic=True, bc_listing=lst, decisions_paths=None)
        # Also ensure it did not need live files: verdict must not be PASS (no entries)
        v = r['checks']['P5IB']['verdict']
        results.append(('P5IB', 'D3 synthetic decisions_paths=None never PASS', v, 'NOT PASS',
                        r['checks']['P5IB']['detail'].get('verify_reasons'),
                        r['checks']['P5IB']['detail'].get('ref_verification'), 'D-3'))
    except Exception as e:
        results.append(('P5IB', 'D3 synthetic decisions_paths=None never PASS', f'EXC {type(e).__name__}', 'NOT PASS',
                        str(e), '', 'D-3'))

    # ---------- score ----------
    def ok_row(v, expect):
        if v.startswith('EXC'):
            return expect in ('INPUT_ERROR', 'NOT PASS')
        if expect == 'PASS':
            return v == 'PASS'
        if expect == 'FAIL':
            return v == 'FAIL'
        if expect == 'UNPINNED':
            return v == 'UNPINNED' or (isinstance(v, str) and 'UNPINNED' in v)
        if expect == 'NOT PASS':
            return v != 'PASS'
        if expect == 'INPUT_ERROR':
            return v != 'PASS'  # raise or FAIL/CONDITIONAL both acceptable as not-pass
        return False

    # Print table
    print(f'TARGET {pkg}')
    print(f'csvcheck sha256={sha(os.path.join(pkg, "csvcheck.py"))}')
    print(f'{"OK?":<4} {"CHK":<5} {"GOT":<22} {"EXPECT":<12} NAME')
    print('-' * 100)
    bad = 0
    gaps = []
    for chk, name, v, expect, why, refv, note in results:
        ok = ok_row(v, expect)
        # For -10 probes, soft-classify expected gaps
        gap = False
        if not ok and note.startswith('-10'):
            gap = True
        if not ok and not gap:
            bad += 1
        mark = 'OK' if ok else ('GAP' if gap else 'BAD')
        if gap:
            gaps.append((name, v, expect, note))
        got = (v[:20] + '..') if len(str(v)) > 22 else v
        print(f'{mark:<4} {chk:<5} {got:<22} {expect:<12} {name}')
        if mark == 'BAD':
            print(f'     reasons={why}')
            if refv:
                print(f'     ref_verification={refv}')
    print('-' * 100)
    print(f'probes={len(results)} hard_fails={bad} expected_gaps_vs_-10={len(gaps)}')
    for name, v, expect, note in gaps:
        print(f'  GAP {name}: got={v} expect={expect} ({note})')
    return 1 if bad else 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception:
        traceback.print_exc()
        sys.exit(2)
