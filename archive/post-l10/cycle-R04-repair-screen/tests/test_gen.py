"""Unit tests for tools/gen.py invariants (INFORMAL scratch). Run: python3 -m unittest discover -s tests -v"""
import json, os, subprocess, sys, tempfile, unittest
from fractions import Fraction
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(D, 'tools'))
import gen as g

ENV = json.load(open(os.path.join(D, 'tools', 'envelope-a.json')))
REF = g.reference()


def chain(r=Fraction(13, 10)):
    """A valid farm chain L11..29 from 1368 at a constant step just under cap (floor), for positive-path tests."""
    v, out = 1368, {}
    for L in range(11, 30):
        v = int(Fraction(v) * Fraction('1.29')); out[str(L)] = v
    return out


def edit(text, col, L, val):
    h, rows = g.parse(text); rows[L][h.index(col)] = val; return g.dump(h, rows)


class Base(unittest.TestCase):
    def test_base_sha_verified(self):
        with self.assertRaises(ValueError):
            g.reference(base_bytes=open(g.BASE, 'rb').read() + b'x')

    def test_a8c4_sha_verified(self):
        with self.assertRaises(ValueError):
            g.reference(a8c4_bytes=open(g.A8C4, 'rb').read().replace(b'624316', b'624317', 1))

    def test_roundtrip_only_w4_differs(self):
        base = open(g.BASE).read()
        out = g.build({}, REF)
        bh, br = g.parse(base); oh, orr = g.parse(out)
        diff = {(L, bh[c]) for L in range(31) for c in range(len(bh)) if br[L][c] != orr[L][c]}
        self.assertTrue(diff <= {(L, 'w4_price_mult') for L in range(21, 31)})
        self.assertEqual(len(base.splitlines()), len(out.splitlines()))

    def test_r04_base_fails_envelope(self):  # R04 farm L11 = 2756 / 1368 > 1.30
        errs = g.validate(g.build({}, REF), REF, ENV)
        self.assertTrue(any(e.startswith('V4 step L11') for e in errs))


class Valid(unittest.TestCase):
    def test_valid_candidate_passes(self):
        t = g.build({'farm_cost': chain()}, REF)
        self.assertEqual(g.validate(t, REF, ENV), [])

    def test_cli_writes_and_rejects(self):
        with tempfile.TemporaryDirectory() as td:
            sp, out = os.path.join(td, 's.json'), os.path.join(td, 'c.csv')
            json.dump({'id': 't', 'farm_cost': chain()}, open(sp, 'w'))
            r = subprocess.run([sys.executable, os.path.join(D, 'tools', 'gen.py'), '--spec', sp, '--envelope', os.path.join(D, 'tools', 'envelope-a.json'), '--out', out], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr); self.assertTrue(os.path.exists(out))
            self.assertEqual(len(json.loads(r.stdout)['o1a_left']), 3)
            open(out, 'w').write('stale')
            json.dump({'id': 't'}, open(sp, 'w'))  # R04 farm chain -> envelope violation
            r = subprocess.run([sys.executable, os.path.join(D, 'tools', 'gen.py'), '--spec', sp, '--envelope', os.path.join(D, 'tools', 'envelope-a.json'), '--out', out], capture_output=True, text=True)
            self.assertEqual(r.returncode, 1); self.assertFalse(os.path.exists(out))
            json.dump({'id': 't', 'farm_cost': {'30': 1}}, open(sp, 'w'))
            r = subprocess.run([sys.executable, os.path.join(D, 'tools', 'gen.py'), '--spec', sp, '--envelope', os.path.join(D, 'tools', 'envelope-a.json'), '--out', out], capture_output=True, text=True)
            self.assertEqual(r.returncode, 2)


class V1Structure(unittest.TestCase):
    def setUp(self): self.t = g.build({'farm_cost': chain()}, REF)

    def test_cr_rejected(self): self.assertTrue(g.validate(self.t.replace('\n', '\r\n'), REF, ENV))

    def test_extra_row_rejected(self):
        last = self.t.splitlines()[-1]; extra = '31' + last[2:]
        self.assertTrue(any('V1' in e for e in g.validate(self.t + extra + '\n', REF, ENV)))

    def test_missing_row_rejected(self):
        self.assertTrue(any('V1' in e for e in g.validate('\n'.join(self.t.splitlines()[:-1]) + '\n', REF, ENV)))

    def test_header_change_rejected(self):
        self.assertTrue(any('V1 header' in e for e in g.validate(self.t.replace('farm_cost', 'farm_costx', 1), REF, ENV)))

    def test_non_int_tunable_rejected(self):
        for bad in ('12.5', '-3', '0', '', '1e3'):
            self.assertTrue(any(e.startswith('V1') for e in g.validate(edit(self.t, 'hens_cost', 20, bad), REF, ENV)), bad)

    def test_build_rejects_bad_spec(self):
        for spec in ({'farm_cost': {'10': 1000}}, {'farm_cost': {'30': 1}}, {'hens_cost': {'13': 1}}, {'egg_value_cost': {'30': 1}},
                     {'collection_cost': {'15': 1}}, {'w4_price_mult': {'21': 3}}, {'farm_cost': {'15': 1.5}}, {'farm_cost': {'15': True}}, {'farm_cost': {'15': 0}}):
            with self.assertRaises(ValueError, msg=str(spec)): g.build(spec, REF)

    def test_no_trailing_lf(self):
        self.assertIn('V1 no trailing LF', g.validate(self.t.rstrip('\n'), REF, ENV))


class V2Frozen(unittest.TestCase):
    def setUp(self): self.t = g.build({'farm_cost': chain()}, REF)

    def _frozen(self, col, L, val):
        errs = g.validate(edit(self.t, col, L, val), REF, ENV)
        self.assertTrue(any(e.startswith('V2') for e in errs), (col, L, errs))

    def test_rows_0_10(self):
        for L in (0, 5, 10): self._frozen('farm_cost', L, str(int(g.parse(self.t)[1][L][g.parse(self.t)[0].index('farm_cost')]) + 1))

    def test_hens_row13_out(self): self._frozen('hens_cost', 13, '1091')
    def test_row30(self):
        self._frozen('farm_cost', 30, '624317'); self._frozen('hens_cost', 30, '94320'); self._frozen('egg_value_cost', 30, '249340')
    def test_collection(self): self._frozen('collection_cost', 20, '1')
    def test_egg_price_and_other_sinks(self):
        h = g.parse(self.t)[0]
        others = [c for c in h if c not in g.TUNABLE and c not in ('level',) and not c.startswith('bc_')][:60]
        for c in others: self._frozen(c, 15, 'X9')
    def test_bc(self):
        h = g.parse(self.t)[0]
        for c in [c for c in h if c.startswith('bc_')]: self._frozen(c, 3, 'X9')
    def test_tc_combo_and_cap(self):
        self._frozen('tc_streak_cap', 20, '0.28'); self._frozen('tc_combo_window_s', 0, '11')
    def test_w4_must_be_a8c4(self):
        self._frozen('w4_price_mult', 21, '2.25'); self._frozen('w4_price_mult', 30, '2.75')
        h, rows = g.parse(self.t); wi = h.index('w4_price_mult')
        self.assertEqual({L: rows[L][wi] for L in range(21, 31)}, g.W4)

    def test_r04_w4_cells_rejected(self):  # reference with R04's own w4 would fail
        h, rows = g.parse(open(g.BASE).read()); wi = h.index('w4_price_mult')
        t = self.t
        for L in range(21, 31): t = edit(t, 'w4_price_mult', L, rows[L][wi])
        self.assertTrue(any('w4' in e for e in g.validate(t, REF, ENV)))


class V3Rising(unittest.TestCase):
    def setUp(self): self.t = g.build({'farm_cost': chain()}, REF)

    def test_hens_flat_rejected(self):
        h, rows = g.parse(self.t); v = rows[19][h.index('hens_cost')]
        self.assertTrue(any(e.startswith('V3 hens_cost L20') for e in g.validate(edit(self.t, 'hens_cost', 20, v), REF, ENV)))

    def test_ev_decrease_rejected(self):
        self.assertTrue(any(e.startswith('V3 egg_value_cost') for e in g.validate(edit(self.t, 'egg_value_cost', 25, '5'), REF, ENV)))

    def test_hens_row29_vs_frozen30(self):
        self.assertTrue(any('V3 hens_cost L30' in e for e in g.validate(edit(self.t, 'hens_cost', 29, '94319'), REF, ENV)))

    def test_hens_row14_vs_frozen13(self):
        self.assertTrue(any('V3 hens_cost L14' in e for e in g.validate(edit(self.t, 'hens_cost', 14, '1090'), REF, ENV)))


class V4Envelope(unittest.TestCase):
    def test_step_over_cap(self):
        c = chain(); c['15'] = int(c['14'] * Fraction('1.31')) + 1
        c2 = dict(c); c2['16'] = c['15'] + 10
        for k in range(17, 30): c2[str(k)] = max(c2[str(k)], c2[str(k - 1)] + 1)
        errs = g.validate(g.build({'farm_cost': c2}, REF), REF, ENV)
        self.assertTrue(any(e.startswith('V4 step L15') for e in errs), errs)

    def test_cap_exact_allowed(self):
        c = chain(); c['11'] = 1778  # 1778/1368 = 1.2997 ; 1368*1.3=1778.4
        self.assertFalse(any('L11' in e for e in g.validate(g.build({'farm_cost': c}, REF), REF, ENV)))
        env = dict(ENV, cap='1778/1368')
        self.assertFalse(any('V4 step L11' in e for e in g.validate(g.build({'farm_cost': c}, REF), REF, env)))
        env = dict(ENV, cap='1777/1368')
        self.assertTrue(any('V4 step L11' in e for e in g.validate(g.build({'farm_cost': c}, REF), REF, env)))

    def test_l30_step_excluded(self):  # option (a): 624316 / FC29 >> 1.30 is allowed
        t = g.build({'farm_cost': chain()}, REF)
        self.assertEqual(g.validate(t, REF, ENV), [])
        fc29 = int(chain()['29']); self.assertGreater(Fraction(624316, fc29), Fraction('1.3'))
        env = dict(ENV, steps=[11, 30])
        self.assertTrue(any('V4 step L30' in e for e in g.validate(t, REF, env)))

    def test_anchor_checked(self):
        env = dict(ENV, anchors={'10': '1368', '30': '624315'})
        self.assertTrue(any('V4 anchor L30' in e for e in g.validate(g.build({'farm_cost': chain()}, REF), REF, env)))


class V5Sawtooth(unittest.TestCase):
    def _farm(self, ratios):
        v, c = 1368, {}
        for L, r in zip(range(11, 30), ratios):
            v = int(Fraction(v) * Fraction(r)); c[str(L)] = v
        return c

    def test_sawtooth_rejected(self):
        r = ['1.25'] * 19; r[5] = '1.10'; r[6] = '1.29'  # step L16 dips, L17 rebounds by .19 > .05
        errs = g.validate(g.build({'farm_cost': self._farm(r)}, REF), REF, ENV)
        self.assertTrue(any(e.startswith('V5 sawtooth at L16') for e in errs), errs)

    def test_small_wiggle_allowed(self):
        r = ['1.25'] * 19; r[5] = '1.23'; r[6] = '1.27'
        self.assertEqual(g.validate(g.build({'farm_cost': self._farm(r)}, REF), REF, ENV), [])

    def test_monotone_decreasing_steps_allowed(self):
        r = [f'{1.30 - i / 100:.2f}' for i in range(19)]
        self.assertEqual(g.validate(g.build({'farm_cost': self._farm(r)}, REF), REF, ENV), [])


class Feasibility(unittest.TestCase):
    def test_infeasible_cap_130_twenty_steps(self):
        """Proof reproduction: with L10=1368 and every step L11..L30 <= 1.30, FC30 <= 1368*1.3^20 < 624316 (needed ratio 456.37)."""
        self.assertLess(Fraction(1368) * Fraction(13, 10) ** 20, 624316)
        self.assertLess(g.max_chain(1368, '1.30', 20), 624316)
        self.assertEqual(round(624316 / 1368, 2), 456.37)
        self.assertEqual(round(1.3 ** 20, 2), 190.05)

    def test_option_a_feasible(self):
        self.assertLessEqual(g.max_chain(1368, '1.30', 19), int(1368 * Fraction(13, 10) ** 19))
        self.assertGreater(g.max_chain(1368, '1.30', 19), 199000)

    def test_option_b_140_feasible(self):
        self.assertGreater(Fraction(1368) * Fraction(14, 10) ** 20, 624316)

    def test_o1a_f27_f28_forced_off(self):
        self.assertGreater(160000, 1368 * Fraction(13, 10) ** 17)
        self.assertGreater(175000, 1368 * Fraction(13, 10) ** 18)
        self.assertLessEqual(190000, 1368 * Fraction(13, 10) ** 19)


if __name__ == '__main__':
    unittest.main()
