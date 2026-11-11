"""BG5 / BG5b regression (evidence-contract.md EC-4 + D-HOP-2026-11-09-05): free-text / path+sha256 / wrong-authority
refs remain NOT VERIFIED and keep P5IB / FAM at CONDITIONAL-UNMET. Verification that unlocks PASS is covered in
test_bg5_verify.py (TEMP decisions fixtures). Structurally invalid -> FAIL / input error.
SYNTHETIC fixtures only. Target code dir = $GB_TARGET (default ../pkg)."""
import copy, hashlib, json, os, subprocess, sys, unittest
HERE = os.path.dirname(os.path.abspath(__file__))
T = os.environ.get('GB_TARGET', os.path.join(os.path.dirname(HERE), 'pkg'))
sys.path[:0] = [T, os.path.join(T, 'tests')]
from fixtures import base_rows, to_csv, write, write_json, tmpdir
import csvcheck

REFS = ['SYN-A', 'D-HOP-2026-11-05-15', 'approved', 'PASS', 'x' * 200,
        json.dumps({'decision': 'D-HOP-2026-11-06-02', 'sha256': 'a' * 64, 'verified': True})]


class Base(unittest.TestCase):
    def setUp(self):
        self.d = tmpdir(); self.before = write(self.d, 'before.csv', to_csv(base_rows()))
        # an EXISTING file whose sha256 matches the ref text: still not independent verification
        self.art = write(self.d, 'approval.md', 'synthetic approval artifact\n')
        self.art_ref = f'path={self.art} sha256={hashlib.sha256(open(self.art, "rb").read()).hexdigest()}'

    def chk(self, rows, **kw):
        after = write(self.d, 'after.csv', to_csv(rows))
        for k in ('bc_listing', 'allow_families'):
            if isinstance(kw.get(k), dict): kw[k] = write_json(self.d, k + '.json', kw[k])
        return csvcheck.check(self.before, after, breeds=0, synthetic=True, **kw)

    def gates_except(self, r, cid):
        return sorted(k for k, c in r['checks'].items() if k != cid and c['verdict'] not in ('PASS', 'REPORT'))


class TestBG5_P5IB(Base):
    def bc_rows(self):
        rows = base_rows()
        for r in rows: r['bc_broody_cap_bp'] = '700'
        return rows

    def listing(self, a, b):
        return {'columns': {'bc_broody_cap_bp': {'value': '700', 'approval_ref': a, 'b4_run_ref': b}}}

    def test_free_text_refs_conditional_unmet_never_pass(self):
        for ref in REFS:
            with self.subTest(ref=ref[:40]):
                r = self.chk(self.bc_rows(), bc_listing=self.listing(ref, ref))
                self.assertEqual(r['checks']['P5IB']['verdict'], 'CONDITIONAL-UNMET')
                self.assertEqual(r['overall'], 'NOT-PASS'); self.assertEqual(self.gates_except(r, 'P5IB'), [])

    def test_hash_matching_existing_file_ref_still_conditional(self):
        r = self.chk(self.bc_rows(), bc_listing=self.listing(self.art_ref, self.art_ref))
        self.assertEqual(r['checks']['P5IB']['verdict'], 'CONDITIONAL-UNMET'); self.assertEqual(r['overall'], 'NOT-PASS')

    def test_refs_recorded_as_unverified_metadata(self):
        r = self.chk(self.bc_rows(), bc_listing=self.listing('SYN-A', 'SYN-B4'))
        d = r['checks']['P5IB']['detail']
        self.assertEqual(d['documentary_refs']['bc_broody_cap_bp'], {'approval_ref': 'SYN-A', 'b4_run_ref': 'SYN-B4'})
        self.assertIn('NOT VERIFIED', d['ref_verification'])

    def test_structural_errors_still_fail(self):
        ok = self.listing('a', 'b')
        for drop in ('approval_ref', 'b4_run_ref'):
            bad = copy.deepcopy(ok); del bad['columns']['bc_broody_cap_bp'][drop]
            self.assertEqual(self.chk(self.bc_rows(), bc_listing=bad)['checks']['P5IB']['verdict'], 'FAIL')
        bad = copy.deepcopy(ok); bad['columns']['bc_broody_cap_bp']['approval_ref'] = 7
        self.assertEqual(self.chk(self.bc_rows(), bc_listing=bad)['checks']['P5IB']['verdict'], 'FAIL')
        self.assertEqual(self.chk(self.bc_rows())['checks']['P5IB']['verdict'], 'FAIL')

    def test_no_bc_columns_unaffected(self):
        r = self.chk(base_rows()); self.assertEqual(r['checks']['P5IB']['verdict'], 'PASS'); self.assertEqual(r['overall'], 'PASS')


class TestBG5b_FAM(Base):
    def hens_rows(self):
        rows = base_rows(); rows[20]['hens_cost'] = str(int(rows[20]['hens_cost']) + 1); return rows

    def allow(self, ref):
        return {'families': [{'column': 'hens_cost', 'rows': [14, 29], 'authority': ref}]}

    def test_relied_on_allowlist_conditional_unmet_never_pass(self):
        for ref in REFS:
            with self.subTest(ref=ref[:40]):
                r = self.chk(self.hens_rows(), allow_families=self.allow(ref))
                self.assertEqual(r['checks']['FAM']['verdict'], 'CONDITIONAL-UNMET')
                self.assertEqual(r['overall'], 'NOT-PASS'); self.assertEqual(self.gates_except(r, 'FAM'), [])

    def test_hash_matching_existing_file_authority_still_conditional(self):
        r = self.chk(self.hens_rows(), allow_families=self.allow(self.art_ref))
        self.assertEqual(r['checks']['FAM']['verdict'], 'CONDITIONAL-UNMET')

    def test_authority_recorded_as_unverified_metadata(self):
        r = self.chk(self.hens_rows(), allow_families=self.allow('SYN-GO'))
        d = r['checks']['FAM']['detail']
        self.assertTrue(d['allowlisted']); self.assertIn('NOT VERIFIED', d['ref_verification'])

    def test_unapproved_change_still_fails_even_with_allowlist(self):
        rows = self.hens_rows(); rows[22]['egg_value_cost'] = str(int(rows[22]['egg_value_cost']) + 1)
        self.assertEqual(self.chk(rows, allow_families=self.allow('x'))['checks']['FAM']['verdict'], 'FAIL')

    def test_unused_allowlist_does_not_change_verdict(self):
        r = self.chk(base_rows(), allow_families=self.allow('x'))
        self.assertEqual(r['checks']['FAM']['verdict'], 'PASS')

    def test_farm_envelope_change_needs_no_allowlist(self):
        rows = base_rows(); rows[15]['farm_cost'] = str(int(rows[15]['farm_cost']) - 1)
        self.assertEqual(self.chk(rows)['checks']['FAM']['verdict'], 'PASS')

    def test_invalid_allowlist_still_input_error(self):
        with self.assertRaises(ValueError):
            self.chk(self.hens_rows(), allow_families={'families': [{'column': 'hens_cost', 'rows': [14, 29]}]})
        with self.assertRaises(ValueError):
            self.chk(self.hens_rows(), allow_families={'families': [{'column': 'hens_cost', 'rows': [14, 29], 'authority': '  '}]})


class TestBG5_CLI(Base):
    def run_cli(self, *extra):
        rows = base_rows(); rows[20]['hens_cost'] = str(int(rows[20]['hens_cost']) + 1)
        after = write(self.d, 'after.csv', to_csv(rows))
        al = write_json(self.d, 'al.json', {'families': [{'column': 'hens_cost', 'rows': [14, 29], 'authority': self.art_ref}]})
        out = os.path.join(self.d, 'r.json')
        p = subprocess.run([sys.executable, os.path.join(T, 'csvcheck.py'), '--before', self.before, '--after', after, '--breeds', '0',
                            '--allow-families', al, '--synthetic', '--out', out, *extra], capture_output=True, text=True, cwd=T)
        return p, out

    def test_cli_allowlisted_change_exits_1(self):
        p, out = self.run_cli()
        self.assertEqual(p.returncode, 1, p.stderr)
        self.assertEqual(json.load(open(out))['checks']['FAM']['verdict'], 'CONDITIONAL-UNMET')


if __name__ == '__main__':
    unittest.main()
