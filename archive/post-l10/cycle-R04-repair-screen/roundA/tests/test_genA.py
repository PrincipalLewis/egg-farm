"""Round-A invariants for the W4 tier-5 cell (add.3). Run: python3 -m unittest discover -s roundA/tests"""
import json, os, sys, unittest
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(D, 'tools')); sys.path.insert(0, os.path.join(D, '..', 'tools'))
import genA as A, gen as g
ENV = json.load(open(os.path.join(D, '..', 'tools', 'envelope-a.json')))
REF = g.reference()
C06 = json.load(open(os.path.join(D, '..', 'round1', 'c06-stair-1.0-1.0-1.6', 'spec.json')))
SP = {k: v for k, v in C06.items() if k not in ('id', 'note')}


def edit(text, col, L, val):
    h, rows = g.parse(text); rows[L][h.index(col)] = val; return g.dump(h, rows)


class T(unittest.TestCase):
    def test_bounds_constants(self):
        self.assertEqual((A.T5_LO, A.T5_HI), (33519, 56723))
        self.assertGreater(A.T5_LO, A.T4)

    def test_c06_default_t5_is_a8c4_and_identical_to_round1(self):
        t, v = A.build(SP, REF); self.assertEqual(v, 51567)
        self.assertEqual(t, open(os.path.join(D, '..', 'round1', 'c06-stair-1.0-1.0-1.6', 'candidate.csv')).read())
        self.assertEqual(A.validate(t, REF, ENV), [])

    def test_in_bounds_ok(self):
        for v in (33519, 40000, 51567, 56723):
            t, _ = A.build(dict(SP, w4_tier5_cost=v), REF); self.assertEqual(A.validate(t, REF, ENV), [], v)

    def test_out_of_bounds_rejected(self):
        for v in (33518, 56724, 28294, 0, 51567.0, True, '40000'):
            with self.assertRaises(ValueError, msg=repr(v)): A.build(dict(SP, w4_tier5_cost=v), REF)

    def test_rows_must_be_identical(self):
        t, _ = A.build(dict(SP, w4_tier5_cost=40000), REF)
        for L in (24, 27, 30):
            self.assertTrue(any(e.startswith('VA2') for e in A.validate(edit(t, 'w4_tier_cost', L, '40001'), REF, ENV)), L)

    def test_out_of_bounds_csv_rejected(self):
        t, _ = A.build(SP, REF)
        for v in ('33518', '56724', '28000'):
            bad = t
            for L in range(24, 31): bad = edit(bad, 'w4_tier_cost', L, v)
            self.assertTrue(any(e.startswith('VA') for e in A.validate(bad, REF, ENV)), v)

    def test_other_w4_cells_frozen(self):
        t, _ = A.build(dict(SP, w4_tier5_cost=40000), REF)
        for L, v in ((22, '28295'), (23, '28295'), (21, '20331'), (18, '5539'), (17, '1')):
            self.assertTrue(any(e.startswith('V2 frozen w4_tier_cost') for e in A.validate(edit(t, 'w4_tier_cost', L, v), REF, ENV)), L)
        for c, L, v in (('w4_tier', 24, '4'), ('w4_price_mult', 24, '3.0'), ('w4_tier_cost_share', 24, '0.6')):
            self.assertTrue(any(e.startswith('V2') for e in A.validate(edit(t, c, L, v), REF, ENV)), c)

    def test_collection_cells_frozen(self):
        t, _ = A.build(dict(SP, w4_tier5_cost=40000), REF)
        for L in (17, 18, 19, 20, 21, 22, 24, 27):
            h, rows = g.parse(t); v = str(int(rows[L][h.index('collection_cost')]) - 1)
            self.assertTrue(any(e.startswith('V2 frozen collection_cost') for e in A.validate(edit(t, 'collection_cost', L, v), REF, ENV)), L)
        with self.assertRaises(ValueError): A.build(dict(SP, collection_cost={'19': 70000}), REF)

    def test_collection_bytes_equal_a8c4(self):
        t, _ = A.build(dict(SP, w4_tier5_cost=33519), REF)
        h, rows = g.parse(t); ah, arows = g.parse(open(g.A8C4).read())
        self.assertEqual([r[h.index('collection_cost')] for r in rows], [r[ah.index('collection_cost')] for r in arows])

    def test_round1_invariants_still_apply(self):
        t, _ = A.build(dict(SP, w4_tier5_cost=40000), REF)
        self.assertTrue(any(e.startswith('V3 hens_cost') for e in A.validate(edit(t, 'hens_cost', 20, '5'), REF, ENV)))
        self.assertTrue(any(e.startswith('V2 frozen farm_cost') for e in A.validate(edit(t, 'farm_cost', 30, '624317'), REF, ENV)))


if __name__ == '__main__':
    unittest.main()
