import copy, os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fixtures import base_rows, to_csv, write, write_json, renamed, APPROVED_MAP, tmpdir, HEADER
import csvcheck


class Base(unittest.TestCase):
    def setUp(self):
        self.d = tmpdir()
        self.before = write(self.d, 'before.csv', to_csv(base_rows()))

    def run_check(self, after_rows=None, after_text=None, breeds=0, **kw):
        if after_text is None:
            after_text = to_csv(after_rows if after_rows is not None else base_rows())
        after = write(self.d, 'after.csv', after_text)
        for k in ('rename_map', 'bc_listing', 'allow_families'):
            if isinstance(kw.get(k), dict):
                kw[k] = write_json(self.d, k + '.json', kw[k])
        kw.setdefault('synthetic', True)
        return csvcheck.check(self.before, after, breeds=breeds, **kw)

    def v(self, rep, cid):
        return rep['checks'][cid]['verdict']


class TestBaseline(Base):
    def test_identical_breeds0_all_pass_but_no_ac_claim(self):
        rep = self.run_check()
        self.assertEqual(rep['overall'], 'PASS', rep)
        self.assertEqual(rep['ac_claim'], 'NONE')
        self.assertTrue(rep['synthetic'])
        self.assertIn('PROVISIONAL', rep['status'])

    def test_non_synthetic_requires_a8c4_pinned_before(self):
        rep = self.run_check(synthetic=False)
        self.assertEqual(self.v(rep, 'BEFORE_PIN'), 'FAIL')
        self.assertEqual(rep['overall'], 'NOT-PASS')

    def test_breeds_mode_required(self):
        with self.assertRaises(ValueError):
            self.run_check(breeds=None)


class TestStructural(Base):
    def test_crlf_fails(self):
        rep = self.run_check(after_text=to_csv(base_rows(), newline='\r\n'))
        self.assertEqual(self.v(rep, 'STRUCT'), 'FAIL')

    def test_duplicate_header_fails(self):
        rows = base_rows(); text = to_csv(rows).replace('misc_x', 'hens_cost', 1)
        rep = self.run_check(after_text=text)
        self.assertEqual(self.v(rep, 'STRUCT'), 'FAIL')

    def test_nonfinite_and_malformed_cells_fail(self):
        for bad in ('nan', 'inf', '-Infinity', '', 'abc', '1,5'):
            rows = base_rows(); rows[15]['hens_cost'] = bad
            text = to_csv(rows) if bad != '1,5' else to_csv(rows).replace(',' + '1,5', ',"1,5"')
            rep = self.run_check(after_text=text)
            self.assertEqual(self.v(rep, 'STRUCT'), 'FAIL', bad)

    def test_row_l31_fails_p6d(self):
        rows = base_rows(); extra = dict(rows[-1]); extra['level'] = '31'; extra['farm_cost'] = '700000'; rows.append(extra)
        rep = self.run_check(rows)
        self.assertEqual(self.v(rep, 'P6D'), 'FAIL')

    def test_missing_level_row_fails(self):
        rows = base_rows(); del rows[12]
        rep = self.run_check(rows)
        self.assertEqual(self.v(rep, 'STRUCT'), 'FAIL')

    def test_missing_trailing_newline_fails(self):
        rep = self.run_check(after_text=to_csv(base_rows()).rstrip('\n'))
        self.assertEqual(self.v(rep, 'STRUCT'), 'FAIL')


class TestStreakCap(Base):
    def test_breeds0_cap_027_on_rows_0_10_fails(self):
        rep = self.run_check(renamed(base_rows()), breeds=0, rename_map=APPROVED_MAP)
        self.assertEqual(self.v(rep, 'P5I'), 'FAIL')

    def test_breeds1_cap_027_without_b4_is_conditional_unmet(self):
        rep = self.run_check(renamed(base_rows()), breeds=1, rename_map=APPROVED_MAP)
        self.assertEqual(self.v(rep, 'P5I'), 'PASS', rep['checks']['P5I'])
        self.assertEqual(self.v(rep, 'CAP'), 'CONDITIONAL-UNMET')
        self.assertEqual(rep['overall'], 'NOT-PASS')

    def test_breeds1_cap_027_with_b4_ref_passes_cap(self):
        rep = self.run_check(renamed(base_rows()), breeds=1, rename_map=APPROVED_MAP, b4_ref='SYNTHETIC-B4-REF')
        self.assertEqual(self.v(rep, 'CAP'), 'PASS')
        self.assertEqual(rep['overall'], 'PASS', rep)

    def test_breeds1_cap_028_fails(self):
        rep = self.run_check(renamed(base_rows(), cap='0.28'), breeds=1, rename_map=APPROVED_MAP, b4_ref='x')
        self.assertEqual(self.v(rep, 'P5I'), 'FAIL')
        self.assertEqual(self.v(rep, 'CAP'), 'FAIL')

    def test_breeds1_cap_string_variant_is_ambiguous_not_pass(self):
        rep = self.run_check(renamed(base_rows(), cap='0.270'), breeds=1, rename_map=APPROVED_MAP, b4_ref='x')
        self.assertEqual(self.v(rep, 'P5I'), 'AMBIGUOUS')
        self.assertEqual(rep['overall'], 'NOT-PASS')

    def test_cap_not_constant_on_rows_11_30_fails(self):
        rows = renamed(base_rows()); rows[20]['tc_streak_cap'] = '0.28'
        rep = self.run_check(rows, breeds=1, rename_map=APPROVED_MAP, b4_ref='x')
        self.assertEqual(self.v(rep, 'CAP'), 'FAIL')

    def test_runtime_note_present(self):
        rep = self.run_check()
        self.assertIn('inert', rep['notes']['streak_cap_runtime'])


class TestRows0to10(Base):
    def test_other_cell_change_rows_0_10_fails(self):
        rows = base_rows(); rows[5]['hens_cost'] = '71'
        rep = self.run_check(rows)
        self.assertEqual(self.v(rep, 'P5I'), 'FAIL')

    def test_missing_preexisting_column_fails(self):
        rows = base_rows(); h = [c for c in HEADER if c != 'misc_x']
        rep = self.run_check(after_text=to_csv(rows, header=h))
        self.assertEqual(self.v(rep, 'P5I'), 'FAIL')


class TestRename(Base):
    def test_rename_without_map_fails(self):
        rep = self.run_check(renamed(base_rows(), cap='0.28'))
        self.assertEqual(self.v(rep, 'RENAME'), 'FAIL')
        self.assertEqual(self.v(rep, 'P5I'), 'FAIL')

    def test_approved_rename_with_map_passes(self):
        rep = self.run_check(renamed(base_rows(), cap='0.28'), rename_map=APPROVED_MAP)
        self.assertEqual(self.v(rep, 'RENAME'), 'PASS', rep['checks']['RENAME'])
        self.assertEqual(self.v(rep, 'P5I'), 'PASS', rep['checks']['P5I'])

    def test_renamed_value_change_any_row_fails(self):
        rows = renamed(base_rows(), cap='0.28'); rows[20]['tc_combo_window_s'] = '11'
        rep = self.run_check(rows, rename_map=APPROVED_MAP)
        self.assertEqual(self.v(rep, 'RENAME'), 'FAIL')

    def test_stale_alias_alongside_new_fails(self):
        rows = renamed(base_rows(), cap='0.28')
        for r in rows: r['combo_window_s'] = '10'
        rep = self.run_check(rows, rename_map=APPROVED_MAP)
        self.assertEqual(self.v(rep, 'RENAME'), 'FAIL')

    def test_unapproved_extra_rename_fails(self):
        m = copy.deepcopy(APPROVED_MAP); m['renames'].append({'old': 'misc_x', 'new': 'tc_misc_x'})
        rows = renamed(base_rows(), cap='0.28')
        for r in rows: r['tc_misc_x'] = r.pop('misc_x')
        rep = self.run_check(rows, rename_map=m)
        self.assertEqual(self.v(rep, 'RENAME'), 'FAIL')

    def test_wrong_semantics_in_map_fails(self):
        m = copy.deepcopy(APPROVED_MAP); m['renames'][0]['clock'] = 'focus'
        rep = self.run_check(renamed(base_rows(), cap='0.28'), rename_map=m)
        self.assertEqual(self.v(rep, 'RENAME'), 'FAIL')

    def test_missing_hoe_ref_fails(self):
        m = copy.deepcopy(APPROVED_MAP); del m['hoe_confirmation_ref']
        rep = self.run_check(renamed(base_rows(), cap='0.28'), rename_map=m)
        self.assertEqual(self.v(rep, 'RENAME'), 'FAIL')

    def test_renamed_column_moved_fails(self):
        rows = renamed(base_rows(), cap='0.28')
        h = [c for c in rows[0].keys() if c != 'tc_combo_window_s'] + ['tc_combo_window_s']
        rep = self.run_check(after_text=to_csv(rows, header=h), rename_map=APPROVED_MAP)
        self.assertEqual(self.v(rep, 'RENAME'), 'FAIL')

    def test_new_tc_combo_columns_without_map_fail_even_if_before_lacks_old(self):
        h = [c for c in HEADER if c not in ('combo_window_s', 'combo_boost_s')]
        self.before = write(self.d, 'before.csv', to_csv(base_rows(), header=h))
        rows = base_rows()
        for r in rows: r['tc_combo_window_s'] = '10'
        rep = self.run_check(after_text=to_csv(rows, header=h + ['tc_combo_window_s']))
        self.assertEqual(self.v(rep, 'RENAME'), 'FAIL')

    def test_no_rename_empty_map_passes(self):
        rep = self.run_check(rename_map={'renames': []})
        self.assertEqual(self.v(rep, 'RENAME'), 'PASS')


class TestW4AndFamilies(Base):
    def test_w4_late_change_fails(self):
        rows = base_rows(); rows[24]['w4_price_mult'] = '2.75'
        rep = self.run_check(rows)
        self.assertEqual(self.v(rep, 'W4'), 'FAIL')

    def test_w4_mid_change_fails_closed(self):
        rows = base_rows(); rows[15]['w4_tier'] = '1'
        rep = self.run_check(rows)
        self.assertEqual(self.v(rep, 'W4'), 'FAIL')

    def test_farm_change_rows_11_29_in_envelope_is_in_scope(self):
        rows = base_rows(); rows[15]['farm_cost'] = str(int(rows[15]['farm_cost']) - 1)
        rep = self.run_check(rows)
        self.assertEqual(self.v(rep, 'FAM'), 'PASS', rep['checks']['FAM'])

    def test_hens_change_without_allowlist_fails_closed(self):
        rows = base_rows(); rows[20]['hens_cost'] = str(int(rows[20]['hens_cost']) + 1)
        rep = self.run_check(rows)
        self.assertEqual(self.v(rep, 'FAM'), 'FAIL')

    def test_allowlist_needs_authority_ref(self):
        rows = base_rows(); rows[20]['hens_cost'] = str(int(rows[20]['hens_cost']) + 1)
        with self.assertRaises(ValueError):
            self.run_check(rows, allow_families={'families': [{'column': 'hens_cost', 'rows': [14, 29]}]})
        rep = self.run_check(rows, allow_families={'families': [{'column': 'hens_cost', 'rows': [14, 29], 'authority': 'SYNTHETIC-GO-REF'}]})
        self.assertEqual(self.v(rep, 'FAM'), 'PASS')

    def test_allowlist_cannot_open_rows_0_10_or_w4(self):
        for fam in ({'column': 'hens_cost', 'rows': [5, 29], 'authority': 'x'}, {'column': 'w4_price_mult', 'rows': [21, 30], 'authority': 'x'}):
            with self.assertRaises(ValueError):
                self.run_check(allow_families={'families': [fam]})


class TestFarmAndEG9(Base):
    def _farm(self, rows, L, val):
        rows[L]['farm_cost'] = str(val); return rows

    def test_row30_changed_fails(self):
        rep = self.run_check(self._farm(base_rows(), 30, 624317))
        self.assertEqual(self.v(rep, 'P6A'), 'FAIL')

    def test_step_exactly_130_passes_and_above_fails(self):
        rows = base_rows(); prev = int(rows[10]['farm_cost'])  # 1370 -> 1781 is exactly 1.30
        rows = self._farm(rows, 11, prev * 13 // 10)
        self.assertEqual(prev * 13 % 10, 0)
        rep = self.run_check(rows)
        self.assertEqual(self.v(rep, 'P6B'), 'PASS', rep['checks']['P6B'])
        rows = self._farm(base_rows(), 11, prev * 13 // 10 + 1)
        rep = self.run_check(rows)
        self.assertEqual(self.v(rep, 'P6B'), 'FAIL')

    def test_step_equal_100_fails_p6b_and_eg9(self):
        rows = base_rows(); rows = self._farm(rows, 12, rows[11]['farm_cost'])
        rep = self.run_check(rows)
        self.assertEqual(self.v(rep, 'P6B'), 'FAIL')
        self.assertEqual(self.v(rep, 'EG9'), 'FAIL')

    def test_eg9_hens_flat_fails(self):
        rows = base_rows(); rows[25]['hens_cost'] = rows[24]['hens_cost']
        rep = self.run_check(rows, allow_families={'families': [{'column': 'hens_cost', 'rows': [14, 29], 'authority': 'x'}]})
        self.assertEqual(self.v(rep, 'EG9'), 'FAIL')

    def test_p6c_is_report_only(self):
        rep = self.run_check()
        self.assertEqual(self.v(rep, 'P6C'), 'REPORT')
        self.assertIn('15', rep['checks']['P6C']['detail']['steps'])


class TestBc(Base):
    def _with_bc(self, val='700', vary=False):
        rows = base_rows()
        for r in rows: r['bc_broody_cap_bp'] = val
        if vary: rows[3]['bc_broody_cap_bp'] = '701'
        return rows

    def test_bc_without_listing_fails(self):
        rep = self.run_check(self._with_bc())
        self.assertEqual(self.v(rep, 'P5IB'), 'FAIL')

    def test_bc_listing_requires_approval_and_b4_refs(self):
        ok = {'columns': {'bc_broody_cap_bp': {'value': '700', 'approval_ref': 'SYN-A', 'b4_run_ref': 'SYN-B4'}}}
        rep = self.run_check(self._with_bc(), bc_listing=ok)
        self.assertEqual(self.v(rep, 'P5IB'), 'PASS', rep['checks']['P5IB'])
        for drop in ('approval_ref', 'b4_run_ref'):
            bad = copy.deepcopy(ok); del bad['columns']['bc_broody_cap_bp'][drop]
            rep = self.run_check(self._with_bc(), bc_listing=bad)
            self.assertEqual(self.v(rep, 'P5IB'), 'FAIL', drop)

    def test_bc_value_mismatch_or_nonconstant_fails(self):
        lst = {'columns': {'bc_broody_cap_bp': {'value': '2000', 'approval_ref': 'a', 'b4_run_ref': 'b'}}}
        self.assertEqual(self.v(self.run_check(self._with_bc(), bc_listing=lst), 'P5IB'), 'FAIL')
        lst['columns']['bc_broody_cap_bp']['value'] = '700'
        self.assertEqual(self.v(self.run_check(self._with_bc(vary=True), bc_listing=lst), 'P5IB'), 'FAIL')

    def test_new_non_bc_column_with_rows_0_10_values_fails(self):
        rows = base_rows()
        for r in rows: r['new_col'] = '1'
        rep = self.run_check(rows)
        self.assertEqual(self.v(rep, 'NEWCOL'), 'FAIL')

    def test_new_non_bc_column_late_only_is_unapproved_family(self):
        rows = base_rows()
        for r in rows: r['new_col'] = '1' if int(r['level']) >= 11 else ''
        rep = self.run_check(rows)
        self.assertEqual(self.v(rep, 'NEWCOL'), 'PASS')
        self.assertEqual(self.v(rep, 'FAM'), 'FAIL')


if __name__ == '__main__':
    unittest.main()
