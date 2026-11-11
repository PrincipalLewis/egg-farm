"""BG5 reference verification (D-HOP-2026-11-09-05 / EC-4 addendum).
A reference is VERIFIED only if ALL hold:
  (i)  cites an entry ID that exists in the decisions files passed in (TEMP fixtures in tests; never the real decisions.md);
  (ii) entry authority matches: D-HOP-… for bc_* approval_ref and FAM authority; QA-D-… for b4_run_ref;
  (iii) entry text contains the full 64-hex sha256 of the artifact AND the on-disk file hashes to it.
       bc_/FAM artifact = candidate CSV; B4 artifact = run manifest listing csv sha256, seeds, config, harness sha,
       and that manifest's csv sha256 equals the candidate's.
Anything else -> NOT VERIFIED -> CONDITIONAL-UNMET (or FAIL where structural).
SYNTHETIC fixtures only. Target = $GB_TARGET (default ../pkg)."""
import copy, hashlib, json, os, tempfile, unittest
HERE = os.path.dirname(os.path.abspath(__file__))
T = os.environ.get('GB_TARGET', os.path.join(os.path.dirname(HERE), 'pkg'))
import sys
sys.path[:0] = [T, os.path.join(T, 'tests')]
from fixtures import base_rows, to_csv, write, write_json, tmpdir
import csvcheck

HEX = '0123456789abcdef'


def sha256_file(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


class VerifyBase(unittest.TestCase):
    def setUp(self):
        self.d = tmpdir()
        self.before = write(self.d, 'before.csv', to_csv(base_rows()))
        self.decisions = os.path.join(self.d, 'decisions.md')  # TEMP fixture only

    def write_decisions(self, text):
        open(self.decisions, 'w').write(text)
        return self.decisions

    def after_csv(self, rows):
        return write(self.d, 'after.csv', to_csv(rows))

    def chk(self, rows, **kw):
        after = self.after_csv(rows)
        for k in ('bc_listing', 'allow_families'):
            if isinstance(kw.get(k), dict):
                kw[k] = write_json(self.d, k + '.json', kw[k])
        kw.setdefault('decisions_paths', [self.decisions])
        return csvcheck.check(self.before, after, breeds=0, synthetic=True, **kw)

    def bc_rows(self):
        rows = base_rows()
        for r in rows:
            r['bc_broody_cap_bp'] = '700'
        return rows

    def hens_rows(self):
        rows = base_rows()
        rows[20]['hens_cost'] = str(int(rows[20]['hens_cost']) + 1)
        return rows

    def listing(self, a, b):
        return {'columns': {'bc_broody_cap_bp': {'value': '700', 'approval_ref': a, 'b4_run_ref': b}}}

    def allow(self, ref):
        return {'families': [{'column': 'hens_cost', 'rows': [14, 29], 'authority': ref}]}

    def make_verified_pair(self, rows):
        """Build TEMP decisions + B4 manifest that verify for the candidate CSV under test."""
        after = self.after_csv(rows)
        csv_sha = sha256_file(after)
        # B4 run manifest artifact
        manifest = {
            'csv_sha256': csv_sha,
            'seeds': [1, 200],
            'config': 'CFG none',
            'harness_sha': 'a' * 64,
        }
        man_path = write_json(self.d, 'b4-run-manifest.json', manifest)
        man_sha = sha256_file(man_path)
        hop_id = 'D-HOP-2099-01-01-99'
        qa_id = 'QA-D-2099-SYNVERIFY'
        text = (
            f'## {hop_id} · synthetic HoP approval for fixture\n'
            f'- Approves bc_broody_cap_bp=700 and hens_cost allowlist for candidate sha256 `{csv_sha}`.\n\n'
            f'## {qa_id} · synthetic QA B4 run pin\n'
            f'- B4 run manifest sha256 `{man_sha}` (csv sha256 {csv_sha}, seeds 1-200, config CFG none).\n'
        )
        self.write_decisions(text)
        return after, hop_id, qa_id, man_path, csv_sha, man_sha


class TestVerifyRejects(VerifyBase):
    """v1 has no verification path: even a well-formed fixture must stay CONDITIONAL-UNMET until code lands.
    After the fix, the positive tests below expect PASS; these reject cases stay NOT VERIFIED."""

    def test_prefix_only_d_hop_not_verified(self):
        rows = self.bc_rows()
        after = self.after_csv(rows)
        csv_sha = sha256_file(after)
        self.write_decisions(f'## D-HOP-2099-01-01-01\n- sha256 `{csv_sha}`\n')
        # cite only an 8-hex prefix of an id that does not fully match a heading? use free text that looks like prefix
        r = self.chk(rows, bc_listing=self.listing('D-HOP-2099', 'QA-D-2099'), decisions_paths=[self.decisions])
        self.assertEqual(r['checks']['P5IB']['verdict'], 'CONDITIONAL-UNMET')
        self.assertIn('NOT VERIFIED', r['checks']['P5IB']['detail']['ref_verification'])

    def test_missing_entry_not_verified(self):
        self.write_decisions('## D-HOP-2099-01-01-01\n- nothing useful\n')
        r = self.chk(self.bc_rows(), bc_listing=self.listing('D-HOP-2099-01-01-99', 'QA-D-2099-MISSING'))
        self.assertEqual(r['checks']['P5IB']['verdict'], 'CONDITIONAL-UNMET')

    def test_wrong_authority_qa_for_approval_ref(self):
        rows = self.bc_rows()
        after, hop_id, qa_id, man_path, csv_sha, man_sha = self.make_verified_pair(rows)
        # swap authorities: put CSV hash only under QA-D, and cite QA-D as approval_ref
        self.write_decisions(
            f'## {qa_id}\n- candidate sha256 `{csv_sha}`\n\n## {hop_id}\n- manifest `{man_sha}`\n'
        )
        r = csvcheck.check(self.before, after, breeds=0, synthetic=True,
                           bc_listing=self.listing(qa_id, hop_id),  # wrong: approval=QA, b4=D-HOP
                           decisions_paths=[self.decisions])
        self.assertEqual(r['checks']['P5IB']['verdict'], 'CONDITIONAL-UNMET')

    def test_hash_mismatch_not_verified(self):
        rows = self.bc_rows()
        after = self.after_csv(rows)
        wrong = 'b' * 64
        self.write_decisions(f'## D-HOP-2099-01-01-02\n- sha256 `{wrong}`\n## QA-D-2099-X\n- sha256 `{wrong}`\n')
        r = csvcheck.check(self.before, after, breeds=0, synthetic=True,
                           bc_listing=self.listing('D-HOP-2099-01-01-02', 'QA-D-2099-X'),
                           decisions_paths=[self.decisions])
        self.assertEqual(r['checks']['P5IB']['verdict'], 'CONDITIONAL-UNMET')

    def test_entry_for_different_csv_not_verified(self):
        rows = self.bc_rows()
        other = write(self.d, 'other.csv', to_csv(base_rows()))  # different content? same base - make different
        # ensure different
        open(other, 'a').write('#x\n')
        other_sha = sha256_file(other)
        self.write_decisions(
            f'## D-HOP-2099-01-01-03\n- sha256 `{other_sha}`\n## QA-D-2099-Y\n- sha256 `{other_sha}`\n'
        )
        r = self.chk(rows, bc_listing=self.listing('D-HOP-2099-01-01-03', 'QA-D-2099-Y'))
        self.assertEqual(r['checks']['P5IB']['verdict'], 'CONDITIONAL-UNMET')

    def test_free_text_still_conditional(self):
        self.write_decisions('## D-HOP-2099-01-01-04\n- hi\n')
        r = self.chk(self.bc_rows(), bc_listing=self.listing('approved by HoP', 'b4-run-ok'))
        self.assertEqual(r['checks']['P5IB']['verdict'], 'CONDITIONAL-UNMET')

    def test_fam_unverified_authority_conditional(self):
        self.write_decisions('## D-HOP-2099-01-01-05\n- hi\n')
        r = self.chk(self.hens_rows(), allow_families=self.allow('D-HOP-2099-01-01-05'))
        self.assertEqual(r['checks']['FAM']['verdict'], 'CONDITIONAL-UNMET')

    def test_b4_manifest_csv_mismatch_not_verified(self):
        rows = self.bc_rows()
        after = self.after_csv(rows)
        csv_sha = sha256_file(after)
        # manifest points at a different csv sha
        man = write_json(self.d, 'man.json', {
            'csv_sha256': 'c' * 64, 'seeds': [1, 200], 'config': 'CFG none', 'harness_sha': 'd' * 64
        })
        man_sha = sha256_file(man)
        self.write_decisions(
            f'## D-HOP-2099-01-01-06\n- `{csv_sha}`\n## QA-D-2099-Z\n- `{man_sha}`\n'
        )
        r = csvcheck.check(self.before, after, breeds=0, synthetic=True,
                           bc_listing=self.listing('D-HOP-2099-01-01-06', f'QA-D-2099-Z path={man}'),
                           decisions_paths=[self.decisions])
        self.assertEqual(r['checks']['P5IB']['verdict'], 'CONDITIONAL-UNMET')


class TestVerifyAccepts(VerifyBase):
    """Positive path: fully verified refs unlock PASS. These FAIL on v1 (no verify mechanism)."""

    def test_p5ib_verified_pass(self):
        rows = self.bc_rows()
        after, hop_id, qa_id, man_path, csv_sha, man_sha = self.make_verified_pair(rows)
        listing = self.listing(hop_id, f'{qa_id} path={man_path}')
        r = csvcheck.check(self.before, after, breeds=0, synthetic=True,
                           bc_listing=listing, decisions_paths=[self.decisions])
        self.assertEqual(r['checks']['P5IB']['verdict'], 'PASS', r['checks']['P5IB'])
        self.assertIn('VERIFIED', r['checks']['P5IB']['detail']['ref_verification'])
        self.assertNotIn('NOT VERIFIED', r['checks']['P5IB']['detail']['ref_verification'])

    def test_fam_verified_pass(self):
        rows = self.hens_rows()
        after, hop_id, qa_id, man_path, csv_sha, man_sha = self.make_verified_pair(rows)
        r = csvcheck.check(self.before, after, breeds=0, synthetic=True,
                           allow_families=self.allow(hop_id), decisions_paths=[self.decisions])
        self.assertEqual(r['checks']['FAM']['verdict'], 'PASS', r['checks']['FAM'])
        self.assertIn('VERIFIED', r['checks']['FAM']['detail']['ref_verification'])

    def test_real_decisions_paths_not_written_by_tests(self):
        """Guard: synthetic tests must not touch the real decisions files."""
        real = [
            '/workspace/egg-farm-studio/product/decisions.md',
            '/workspace/egg-farm-studio/decisions.md',
        ]
        before = {p: (os.path.getmtime(p), sha256_file(p)) for p in real if os.path.isfile(p)}
        rows = self.bc_rows()
        after, hop_id, qa_id, man_path, csv_sha, man_sha = self.make_verified_pair(rows)
        csvcheck.check(self.before, after, breeds=0, synthetic=True,
                       bc_listing=self.listing(hop_id, f'{qa_id} path={man_path}'),
                       decisions_paths=[self.decisions])
        for p, (mt, h) in before.items():
            self.assertEqual(os.path.getmtime(p), mt)
            self.assertEqual(sha256_file(p), h)


class TestVerifyUnit(VerifyBase):
    """Direct unit checks of the verifier helper (must exist)."""

    def test_verify_ref_helper_exists_and_rejects_empty(self):
        self.assertTrue(hasattr(csvcheck, 'verify_ref'), 'csvcheck.verify_ref missing (v1)')
        v, reason = csvcheck.verify_ref('', kind='bc_approval', artifact_path='/dev/null',
                                        decisions_paths=[self.write_decisions('')], candidate_sha='a'*64)
        self.assertFalse(v)


if __name__ == '__main__':
    unittest.main()
