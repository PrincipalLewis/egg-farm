"""CLI exit-code contract on SYNTHETIC inputs: 0 = overall PASS, 1 = NOT-PASS, 2 = usage/input error."""
import os, subprocess, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fixtures import base_rows, to_csv, write, tmpdir
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run(*args):
    return subprocess.run([sys.executable, os.path.join(D, 'csvcheck.py'), *args], capture_output=True, text=True, cwd=D)


class TestCli(unittest.TestCase):
    def setUp(self):
        self.d = tmpdir(); self.b = write(self.d, 'b.csv', to_csv(base_rows()))

    def test_missing_breeds_is_usage_error(self):
        self.assertEqual(run('--before', self.b, '--after', self.b, '--synthetic').returncode, 2)

    def test_identical_synthetic_exit0_and_real_mode_exit1(self):
        out = os.path.join(self.d, 'r.json')
        r = run('--before', self.b, '--after', self.b, '--breeds', '0', '--synthetic', '--out', out)
        self.assertEqual(r.returncode, 0, r.stderr); self.assertIn('ac_claim NONE', r.stderr)
        self.assertEqual(run('--before', self.b, '--after', self.b, '--breeds', '0').returncode, 1)

    def test_bad_allowlist_is_input_error(self):
        al = write(self.d, 'al.json', '{"families": [{"column": "hens_cost", "rows": [3, 29], "authority": "x"}]}')
        self.assertEqual(run('--before', self.b, '--after', self.b, '--breeds', '0', '--synthetic', '--allow-families', al).returncode, 2)


if __name__ == '__main__':
    unittest.main()
