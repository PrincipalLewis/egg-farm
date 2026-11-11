"""BG1 regression (HoQA qa/m5/review-gate-build.md §3 BG-1): an ABSENT required gap cell noAffByF[L] (L in every PL-AC4 band level,
11..29) is NOT a measured zero. Absent/empty on either side -> dependent check UNASSESSED (or FAIL), never PASS, never a number
derived from a substituted 0. Explicit measured 0 stays valid. SYNTHETIC fixtures only."""
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fixtures import raw_rows, raw, write_json, tmpdir
import bandguard

PROFS = ('optimal', 'seller15', 'casual'); SEEDS = (1, 20)


def make(d, tag, mut=None):
    out = []
    for p in PROFS:
        o = raw(p, raw_rows(range(SEEDS[0], SEEDS[1] + 1), gap=50))
        if mut: mut(p, o)
        out.append(write_json(d, f'{tag}-{p}.json', o))
    return out


R = lambda o, p: o['prof'][p]['rows']
def empty_all(p, o): [r.__setitem__('noAffByF', {}) for r in R(o, p)]
def empty_seed1(p, o): R(o, p)[0]['noAffByF'] = {}
def drop12(p, o): del R(o, p)[0]['noAffByF']['12']
def zero12(p, o): R(o, p)[0]['noAffByF']['12'] = 0
def all_zero(p, o): [r.__setitem__('noAffByF', {str(L): 0 for L in range(11, 30)}) for r in R(o, p)]
def drop29_all(p, o): [r['noAffByF'].pop('29') for r in R(o, p)]
def only_optimal(f):
    def m(p, o):
        if p == 'optimal': f(p, o)
    return m


class TestBG1(unittest.TestCase):
    def run_bg(self, bm=None, am=None):
        d = tmpdir(); return bandguard.check(make(d, 'b', bm), make(d, 'a', am), profiles=PROFS, seeds=SEEDS, synthetic=True)

    def v(self, r): return r['checks']['PL-AC4a']['verdict'], r['checks']['PL-AC4b']['verdict']

    # --- AFTER side ---
    def test_after_all_empty_maps_unassessed(self):
        r = self.run_bg(am=empty_all)
        self.assertEqual(self.v(r), ('UNASSESSED', 'UNASSESSED')); self.assertEqual(r['overall'], 'NOT-PASS')
        self.assertEqual(r['missing_gap_keys']['after'], 3 * 20 * 19)

    def test_after_one_seed_empty_map_unassessed(self):
        r = self.run_bg(am=empty_seed1)
        self.assertEqual(self.v(r), ('UNASSESSED', 'UNASSESSED')); self.assertEqual(r['overall'], 'NOT-PASS')

    def test_after_single_missing_cell_unassessed(self):
        r = self.run_bg(am=drop12)
        self.assertEqual(self.v(r), ('UNASSESSED', 'UNASSESSED')); self.assertEqual(r['missing_gap_keys']['after'], 3)

    def test_after_missing_in_one_profile_only_still_not_pass(self):
        r = self.run_bg(am=only_optimal(drop12))
        self.assertEqual(self.v(r), ('UNASSESSED', 'UNASSESSED')); self.assertEqual(r['missing_gap_keys']['after'], 1)

    def test_after_last_band_level_missing_unassessed(self):
        self.assertEqual(self.v(self.run_bg(am=drop29_all)), ('UNASSESSED', 'UNASSESSED'))

    def test_after_null_gap_is_not_a_measurement_fails(self):
        def m(p, o): R(o, p)[0]['noAffByF']['12'] = None
        r = self.run_bg(am=m); self.assertEqual(self.v(r), ('FAIL', 'FAIL'))

    # --- BEFORE side ---
    def test_before_all_empty_b_unassessed_a_measured(self):
        r = self.run_bg(bm=empty_all)
        self.assertEqual(self.v(r), ('PASS', 'UNASSESSED')); self.assertEqual(r['overall'], 'NOT-PASS')
        self.assertEqual(r['missing_gap_keys']['before'], 3 * 20 * 19)

    def test_before_single_missing_cell_b_unassessed(self):
        r = self.run_bg(bm=drop12)
        self.assertEqual(self.v(r), ('PASS', 'UNASSESSED')); self.assertEqual(r['overall'], 'NOT-PASS')

    def test_both_sides_empty_and_both_partial(self):
        self.assertEqual(self.v(self.run_bg(empty_all, empty_all)), ('UNASSESSED', 'UNASSESSED'))
        self.assertEqual(self.v(self.run_bg(drop12, drop12)), ('UNASSESSED', 'UNASSESSED'))

    # --- measured zero stays valid; absent != measured zero ---
    def test_explicit_measured_zero_cell_passes(self):
        r = self.run_bg(am=zero12)
        self.assertEqual(r['overall'], 'PASS'); self.assertEqual(r['missing_gap_keys'], {'before': 0, 'after': 0})

    def test_all_measured_zero_both_sides_passes_with_zero_gp95(self):
        r = self.run_bg(all_zero, all_zero)
        self.assertEqual(r['overall'], 'PASS')
        self.assertEqual(r['checks']['PL-AC4c']['detail']['optimal']['bands']['F11-15']['gP95'], '0')

    def test_absent_and_measured_zero_get_different_verdicts(self):
        self.assertNotEqual(self.run_bg(am=zero12)['overall'], self.run_bg(am=drop12)['overall'])

    def test_no_substituted_zero_in_report(self):
        r = self.run_bg(am=empty_all)
        for p in PROFS:
            self.assertEqual(r['checks']['PL-AC4c']['detail'][p]['bands'], {})
            self.assertTrue(r['checks']['PL-AC4c']['detail'][p]['bands_unassessed'])
        self.assertNotIn('counted as 0', r['missing_gap_policy'])

    def test_missing_does_not_mask_measured_violation_into_pass(self):
        def big(p, o): [r['noAffByF'].__setitem__('22', 999) for r in R(o, p)]
        def big_and_drop(p, o): big(p, o); drop12(p, o)
        self.assertNotEqual(self.run_bg(am=big_and_drop)['overall'], 'PASS')

    def test_before_absent_does_not_skip_after_cap_check(self):
        def big(p, o): [r['noAffByF'].__setitem__('22', 181) for r in R(o, p)]
        r = self.run_bg(bm=empty_all, am=big)
        self.assertEqual(self.v(r), ('FAIL', 'UNASSESSED'))

    def test_partial_absence_reports_no_band_statistic_from_remaining_seeds(self):
        r = self.run_bg(am=empty_seed1)
        for p in PROFS:
            self.assertEqual(r['checks']['PL-AC4c']['detail'][p]['bands'], {}, 'no gP95/gW from a seed subset')
            self.assertEqual(r['checks']['PL-AC4c']['detail'][p]['bands_unassessed']['F11-15']['after_seeds_with_absent_cells'], 1)


if __name__ == '__main__':
    unittest.main()
