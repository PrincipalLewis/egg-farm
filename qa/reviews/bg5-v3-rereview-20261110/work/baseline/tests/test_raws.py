"""Tests for reachdiff (PL-AC5(ii)), bandguard (PL-AC4), tailstats (PL-AC3/PL-AC7) on SYNTHETIC pl.ts-shaped raws."""
import copy, json, os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fixtures import raw_rows, raw, write, write_json, tmpdir
import gatecommon, reachdiff, bandguard, tailstats

PROFS = ('optimal', 'seller15', 'casual')
SEEDS = (1, 20)


def make(d, tag, mut=None, profs=PROFS, seeds=SEEDS, **kw):
    files = []
    for p in profs:
        rows = raw_rows(range(seeds[0], seeds[1] + 1))
        obj = raw(p, rows, **kw)
        if mut: mut(p, obj)
        files.append(write_json(d, f'{tag}-{p}.json', obj))
    return files


class TestCommon(unittest.TestCase):
    def test_nearest_rank(self):
        a = list(range(1, 201))
        self.assertEqual(gatecommon.q(a, 0.5), 100)
        self.assertEqual(gatecommon.q(a, 0.95), 190)
        self.assertEqual(gatecommon.q(a, 0.10), 20)
        self.assertEqual(gatecommon.q(a, 0.90), 180)
        self.assertEqual(gatecommon.q([5.0], 0.95), 5.0)
        self.assertEqual(gatecommon.q(list(range(1, 20)), 0.95), 19)  # ceil(18.05)=19 -> idx 18 (not round)
        self.assertEqual(gatecommon.q(list(range(1, 21)), 0.10), 2)
        with self.assertRaises(ValueError):
            gatecommon.q([], 0.5)

    def test_json_nan_rejected(self):
        d = tmpdir(); p = write(d, 'x.json', '{"a": NaN}')
        with self.assertRaises(ValueError):
            gatecommon.load_json_strict(p)
        p = write(d, 'y.json', '{"a": Infinity}')
        with self.assertRaises(ValueError):
            gatecommon.load_json_strict(p)


class TestReachdiff(unittest.TestCase):
    def setUp(self): self.d = tmpdir()

    def chk(self, b, a, **kw):
        kw.setdefault('profiles', PROFS); kw.setdefault('seeds', SEEDS); kw.setdefault('synthetic', True)
        return reachdiff.check(b, a, **kw)

    def test_identical_pass_but_not_run_of_record(self):
        rep = self.chk(make(self.d, 'b'), make(self.d, 'a'))
        self.assertEqual(rep['overall'], 'PASS', rep)
        self.assertFalse(rep['run_of_record'])
        self.assertEqual(rep['ac_claim'], 'NONE')

    def test_reach_diff_at_l7_fails_with_identity(self):
        def m(p, o):
            if p == 'seller15': o['prof'][p]['rows'][3]['reach']['7'] += 0.1
        rep = self.chk(make(self.d, 'b'), make(self.d, 'a', m))
        self.assertEqual(rep['overall'], 'NOT-PASS')
        self.assertEqual(rep['mismatches'][0]['profile'], 'seller15'); self.assertEqual(rep['mismatches'][0]['seed'], 4)
        self.assertEqual(rep['mismatches'][0]['level'], 7)

    def test_diff_at_l11_is_out_of_scope(self):
        def m(p, o): o['prof'][p]['rows'][0]['reach']['11'] += 5
        rep = self.chk(make(self.d, 'b'), make(self.d, 'a', m))
        self.assertEqual(rep['overall'], 'PASS')

    def test_missing_seed_fails(self):
        def m(p, o):
            if p == 'casual': del o['prof'][p]['rows'][5]
        self.assertEqual(self.chk(make(self.d, 'b'), make(self.d, 'a', m))['overall'], 'NOT-PASS')

    def test_duplicate_seed_fails(self):
        def m(p, o):
            if p == 'casual': o['prof'][p]['rows'][5]['seed'] = 5
        rep = self.chk(make(self.d, 'b'), make(self.d, 'a', m))
        self.assertEqual(rep['overall'], 'NOT-PASS'); self.assertTrue(any('duplicate' in e for e in rep['input_errors']))

    def test_missing_profile_fails(self):
        rep = self.chk(make(self.d, 'b'), make(self.d, 'a', profs=('optimal', 'seller15')))
        self.assertEqual(rep['overall'], 'NOT-PASS')

    def test_profile_in_two_files_fails(self):
        a = make(self.d, 'a'); a.append(make(self.d, 'a2', profs=('optimal',))[0])
        self.assertEqual(self.chk(make(self.d, 'b'), a)['overall'], 'NOT-PASS')

    def test_bad_provenance_fails(self):
        for kw in ({'runner': 'run.ts'}, {'parity': 1}, {'cfg': 'all'}, {'T': 3000}):
            d = tmpdir()
            rep = self.chk(make(d, 'b'), make(d, 'a', **kw))
            self.assertEqual(rep['overall'], 'NOT-PASS', kw)

    def test_missing_reach10_fails(self):
        def m(p, o): del o['prof'][p]['rows'][2]['reach']['10']
        rep = self.chk(make(self.d, 'b'), make(self.d, 'a', m))
        self.assertEqual(rep['overall'], 'NOT-PASS')

    def test_nan_in_reach_fails(self):
        a = make(self.d, 'a'); txt = open(a[0]).read().replace('"5": ', '"5": NaN, "x5": ', 1)
        open(a[0], 'w').write(txt)
        self.assertEqual(self.chk(make(self.d, 'b'), a)['overall'], 'NOT-PASS')

    def test_non_synthetic_requires_pinned_before_sha(self):
        rep = self.chk(make(self.d, 'b'), make(self.d, 'a'), synthetic=False)
        self.assertEqual(rep['overall'], 'NOT-PASS')


class TestBandguard(unittest.TestCase):
    def setUp(self): self.d = tmpdir()

    def chk(self, b, a, **kw):
        kw.setdefault('profiles', PROFS); kw.setdefault('seeds', SEEDS); kw.setdefault('synthetic', True)
        return bandguard.check(b, a, **kw)

    def test_identical_passes_a_b_and_reports_c(self):
        rep = self.chk(make(self.d, 'b'), make(self.d, 'a'))
        self.assertEqual(rep['overall'], 'PASS', rep)
        self.assertEqual(rep['checks']['PL-AC4c']['verdict'], 'REPORT')

    def test_any_increase_fails_b(self):
        def m(p, o):
            if p == 'optimal':
                for r in o['prof'][p]['rows']: r['noAffByF']['22'] = r['noAffByF']['22'] + 1
        rep = self.chk(make(self.d, 'b'), make(self.d, 'a', m))
        self.assertEqual(rep['checks']['PL-AC4b']['verdict'], 'FAIL')
        self.assertEqual(rep['checks']['PL-AC4a']['verdict'], 'PASS')

    def test_180_boundary(self):
        def mk(v):
            def m(p, o):
                for r in o['prof'][p]['rows']: r['noAffByF']['27'] = v
            return m
        rep = self.chk(make(self.d, 'b', mk(180)), make(self.d, 'a', mk(180)))
        self.assertEqual(rep['checks']['PL-AC4a']['verdict'], 'PASS')
        d = tmpdir(); rep = self.chk(make(d, 'b', mk(181)), make(d, 'a', mk(181)))
        self.assertEqual(rep['checks']['PL-AC4a']['verdict'], 'FAIL')
        self.assertTrue(rep['checks']['PL-AC4c']['detail']['optimal']['seeds_over_180'])

    def test_missing_gap_key_is_unassessed_not_zero(self):
        # BG1 repair: replaces original test_missing_gap_key_counted_as_zero_and_flagged (it encoded the defect)
        def m(p, o): del o['prof'][p]['rows'][0]['noAffByF']['12']
        rep = self.chk(make(self.d, 'b'), make(self.d, 'a', m))
        self.assertGreater(rep['missing_gap_keys']['after'], 0)
        self.assertEqual(rep['checks']['PL-AC4a']['verdict'], 'UNASSESSED')
        self.assertEqual(rep['overall'], 'NOT-PASS')

    def test_negative_or_nonfinite_gap_fails(self):
        def m(p, o): o['prof'][p]['rows'][0]['noAffByF']['12'] = -1
        self.assertEqual(self.chk(make(self.d, 'b'), make(self.d, 'a', m))['overall'], 'NOT-PASS')
        def m2(p, o): o['prof'][p]['rows'][0]['noAffByF']['12'] = 'x'
        d = tmpdir(); self.assertEqual(self.chk(make(d, 'b'), make(d, 'a', m2))['overall'], 'NOT-PASS')

    def test_non_synthetic_cross_checks_card_before(self):
        rep = self.chk(make(self.d, 'b'), make(self.d, 'a'), synthetic=False)
        self.assertEqual(rep['overall'], 'NOT-PASS')


class TestTailstats(unittest.TestCase):
    def setUp(self): self.d = tmpdir()

    def chk(self, a, b=None, **kw):
        kw.setdefault('profiles', PROFS); kw.setdefault('seeds', SEEDS); kw.setdefault('synthetic', True)
        return tailstats.check(a, b, **kw)

    def _totals(self, total):
        def m(p, o):
            for r in o['prof'][p]['rows']:
                r10 = r['reach']['10']; r['reach']['30'] = round(r10 + total, 1)
        return m

    def test_pl_ac3_boundary_exact_minus_10_passes(self):
        a = make(self.d, 'a', self._totals(1000.0))
        refs = {p: '1111.1' for p in PROFS}  # 1000/1111.1 - 1 = -0.09999 -> pass
        rep = self.chk(a, refs_override=refs)
        self.assertEqual(rep['checks']['PL-AC3']['verdict'], 'PASS', rep['checks']['PL-AC3'])
        refs = {p: '1000.0' for p in PROFS}
        d = tmpdir(); a = make(d, 'a', self._totals(900.0))
        self.assertEqual(self.chk(a, refs_override=refs)['checks']['PL-AC3']['verdict'], 'PASS')
        d = tmpdir(); a = make(d, 'a', self._totals(899.9))
        self.assertEqual(self.chk(a, refs_override=refs)['checks']['PL-AC3']['verdict'], 'FAIL')

    def test_pl_ac3_reports_p10_p50_p90(self):
        rep = self.chk(make(self.d, 'a'), refs_override={p: '1800.0' for p in PROFS})
        det = rep['checks']['PL-AC3']['detail']['optimal']
        for k in ('P10', 'P50', 'P90', 'P95'): self.assertIn(k, det)
        self.assertLessEqual(det['P10'], det['P50']); self.assertLessEqual(det['P50'], det['P90'])

    def test_missing_reach30_fails(self):
        def m(p, o): del o['prof'][p]['rows'][0]['reach']['30']
        rep = self.chk(make(self.d, 'a', m), refs_override={p: '1800.0' for p in PROFS})
        self.assertEqual(rep['overall'], 'NOT-PASS')

    def test_refs_override_forbidden_outside_synthetic(self):
        with self.assertRaises(ValueError):
            self.chk(make(self.d, 'a'), refs_override={p: '1' for p in PROFS}, synthetic=False)

    def _band26(self, secs):
        def m(p, o):
            for r in o['prof'][p]['rows']: r['reach']['30'] = round(r['reach']['26'] + secs, 1)
        return m

    def test_pl_ac7_rounding_disagreement_is_ambiguous(self):
        # before band F26-30 = 459.0 s (7.65 min); after 367.1 s -> rounded 6.12/7.65 = 0.8 exactly (pass) vs unrounded 0.79978 (fail)
        b = make(self.d, 'b', self._band26(459.0)); a = make(self.d, 'a', self._band26(367.1))
        before_min = {p: ['1.00', '1.00', '1.00', '7.65'] for p in PROFS}
        rep = self.chk(a, b, before_min_override=before_min, refs_override={p: '1800.0' for p in PROFS}, bands_only=['F26-30'])
        self.assertEqual(rep['checks']['PL-AC7']['verdict'], 'AMBIGUOUS', rep['checks']['PL-AC7'])
        self.assertEqual(rep['overall'], 'NOT-PASS')

    def test_pl_ac7_without_before_raws_is_unassessed(self):
        rep = self.chk(make(self.d, 'a'), None, refs_override={p: '1800.0' for p in PROFS})
        self.assertEqual(rep['checks']['PL-AC7']['verdict'], 'UNASSESSED')
        self.assertEqual(rep['overall'], 'NOT-PASS')

    def test_tail_ratio_report_only(self):
        rep = self.chk(make(self.d, 'a'), refs_override={p: '1800.0' for p in PROFS})
        self.assertEqual(rep['checks']['TAIL']['verdict'], 'REPORT')
        self.assertIn('11', rep['checks']['TAIL']['detail']['optimal'])


if __name__ == '__main__':
    unittest.main()
