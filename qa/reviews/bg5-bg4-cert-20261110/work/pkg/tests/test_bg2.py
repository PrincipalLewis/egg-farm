"""BG2 regression (HoQA qa/m5/review-gate-build.md §3 BG-2): breeds=1 cap exception (0.27) must stay CONDITIONAL-UNMET / non-PASS.
This tool cannot independently verify an ACTUAL final combined B4 re-run, so --b4-ref is documentary metadata only and can never
upgrade CAP or overall to PASS (no evidence ingestion). SYNTHETIC fixtures only."""
import json, os, subprocess, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fixtures import base_rows, to_csv, write, write_json, tmpdir, renamed, APPROVED_MAP
import csvcheck, gatecommon as G

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REFS = ['SYNTHETIC-B4-REF', 'documentary-only-no-evidence', 'I-am-not-a-B4-run', 'x',
        'B4 re-run seeds 1-200 csv_sha256=' + 'a' * 64 + ' metrics_sha256=' + 'b' * 64 + ' PASS',
        json.dumps({'run_id': 'b4', 'csv_sha256': 'a' * 64, 'seeds': [1, 200], 'harness_sha': 'c' * 40, 'verdict': 'PASS'}),
        'PASS', 'CAP=PASS', '\u2713']


class TestBG2(unittest.TestCase):
    def setUp(self):
        self.d = tmpdir(); self.before = write(self.d, 'before.csv', to_csv(base_rows()))
        rows = renamed(base_rows(), cap='0.27'); self.after = write(self.d, 'after.csv', to_csv(rows, header=list(rows[0].keys())))
        self.map = write_json(self.d, 'map.json', APPROVED_MAP)

    def chk(self, ref, breeds=1):
        return csvcheck.check(self.before, self.after if breeds == 1 else self.before, breeds=breeds,
                              rename_map=self.map if breeds == 1 else None, b4_ref=ref, synthetic=True)

    def test_no_ref_conditional_unmet(self):
        r = self.chk(None); self.assertEqual(r['checks']['CAP']['verdict'], 'CONDITIONAL-UNMET'); self.assertEqual(r['overall'], 'NOT-PASS')

    def test_any_ref_string_stays_conditional_unmet_and_not_pass(self):
        for ref in REFS:
            with self.subTest(ref=ref):
                r = self.chk(ref)
                self.assertEqual(r['checks']['CAP']['verdict'], 'CONDITIONAL-UNMET')
                self.assertEqual(r['overall'], 'NOT-PASS')
                others = [k for k, c in r['checks'].items() if k != 'CAP' and c['verdict'] not in ('PASS', 'REPORT')]
                self.assertEqual(others, [], 'CAP must be the only non-PASS gate in this fixture')

    def test_ref_recorded_only_as_documentary_metadata(self):
        r = self.chk('documentary-only-no-evidence'); c = r['checks']['CAP']['detail']
        self.assertEqual(c['b4_ref_documentary'], 'documentary-only-no-evidence')
        self.assertIn('not B4 evidence', c['b4_evidence'])
        self.assertNotIn('b4_ref', r)  # no top-level field that could read as satisfied evidence

    def test_breeds0_literal_unaffected_by_ref(self):
        for ref in (None, 'x'):
            r = self.chk(ref, breeds=0)
            self.assertEqual(r['checks']['CAP']['verdict'], 'PASS'); self.assertEqual(r['overall'], 'PASS')

    def test_overall_aggregation_cannot_upgrade_conditional(self):
        self.assertEqual(G.overall({'CAP': {'verdict': 'CONDITIONAL-UNMET'}, 'X': {'verdict': 'PASS'}}), 'NOT-PASS')

    def test_cli_with_ref_exits_1(self):
        p = subprocess.run([sys.executable, os.path.join(D, 'csvcheck.py'), '--before', self.before, '--after', self.after, '--breeds', '1',
                            '--rename-map', self.map, '--b4-ref', 'SYNTHETIC-B4-REF', '--synthetic', '--out', os.path.join(self.d, 'r.json')],
                           capture_output=True, text=True, cwd=D)
        self.assertEqual(p.returncode, 1, p.stderr)
        self.assertEqual(json.load(open(os.path.join(self.d, 'r.json')))['checks']['CAP']['verdict'], 'CONDITIONAL-UNMET')


if __name__ == '__main__':
    unittest.main()
