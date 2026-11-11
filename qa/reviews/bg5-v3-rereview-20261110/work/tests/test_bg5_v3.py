"""BG5/BG5b v3 regression: HoQA review QA-D-1110-BG54CERT (D-1/D-2/D-3, probes P01-P23, F01-F04) and the file-authority rule
D-HOP-2026-11-10-06. SYNTHETIC TEMP fixtures only, laid out to mirror the live decisions paths (see decfix.py); no live reads.
Rule: a ref verifies only if its ID is the exact leading token of exactly one level-2 `##` heading outside code fences, in its
own authority file (D-HOP -> product/decisions.md, QA-D -> qa/decisions.md, D-CEO -> root, D-HOE -> engineering,
D-PMW -> product/workers); the entry body holds the full 64-hex sha256 of the on-disk artifact; the B4 manifest has csv sha ==
candidate, non-empty seeds, config, and a harness sha that matches the harness file on disk. Anything else -> NOT PASS."""
import hashlib, json, os, sys, unittest
HERE = os.path.dirname(os.path.abspath(__file__))
T = os.environ.get('GB_TARGET', os.path.join(os.path.dirname(HERE), 'pkg'))
sys.path[:0] = [T, os.path.join(T, 'tests')]
from fixtures import base_rows, to_csv, write, write_json, tmpdir
import csvcheck
sys.path.insert(0, HERE)
from decfix import Layout

H, Q = 'D-HOP-2099-01-01-77', 'QA-D-2099-B4RUN'


def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


class Base(unittest.TestCase):
    def setUp(self):
        d = self.d = tmpdir()
        self.lay = Layout(d)
        self.before = write(d, 'before.csv', to_csv(base_rows()))
        rows = base_rows()
        for r in rows:
            r['bc_broody_cap_bp'] = '700'
        self.after = write(d, 'after.csv', to_csv(rows)); self.C = sha(self.after)
        hrows = base_rows(); hrows[20]['hens_cost'] = str(int(hrows[20]['hens_cost']) + 1)
        self.hafter = write(d, 'hafter.csv', to_csv(hrows)); self.HC = sha(self.hafter)
        self.harness = write(d, 'bot-m5.ts', '// synthetic harness of record\n'); self.HS = sha(self.harness)
        self.man = self.manifest('man.json'); self.M = sha(self.man)

    def manifest(self, name, **over):
        m = {'csv_sha256': self.C, 'seeds': [1, 200], 'config': 'CFG none', 'harness_sha': self.HS, 'harness_path': self.harness}
        for k, v in over.items():
            if v is KeyError:
                m.pop(k, None)
            else:
                m[k] = v
        return write_json(self.d, name, m)

    def files(self, product='', qa='', root='', engineering='', workers=''):
        for role, text in (('product', product), ('qa', qa), ('root', root), ('engineering', engineering), ('workers', workers)):
            self.lay.put(role, text)
        return self.lay.list()

    def good(self, man_sha=None):
        return self.files(product=f'## {H} · HoP approval\n- candidate `{self.C}`\n',
                          qa=f'## {Q} · QA B4 run\n- manifest `{man_sha or self.M}`\n')

    def p5(self, a=H, b=None, paths=None):
        b = f'{Q} path={self.man}' if b is None else b
        lst = write_json(self.d, 'l.json', {'columns': {'bc_broody_cap_bp': {'value': '700', 'approval_ref': a, 'b4_run_ref': b}}})
        r = csvcheck.check(self.before, self.after, breeds=0, synthetic=True, bc_listing=lst,
                           decisions_paths=self.lay.list() if paths is None else paths)
        return r['checks']['P5IB']['verdict'], r['checks']['P5IB']['detail'].get('verify_reasons')

    def fam(self, auth=H, paths=None):
        al = write_json(self.d, 'al.json', {'families': [{'column': 'hens_cost', 'rows': [14, 29], 'authority': auth}]})
        r = csvcheck.check(self.before, self.hafter, breeds=0, synthetic=True, allow_families=al,
                           decisions_paths=self.lay.list() if paths is None else paths)
        return r['checks']['FAM']['verdict'], r['checks']['FAM']['detail'].get('verify_reasons')

    def assertPass(self, res):
        self.assertEqual(res[0], 'PASS', res)

    def assertNotPass(self, res):
        self.assertNotEqual(res[0], 'PASS', res)
        self.assertEqual(res[0], 'CONDITIONAL-UNMET', res)


class TestQAProbes(Base):
    """HoQA probes (qa/reviews/bg5-bg4-cert-20261110/probes/probe_verify_ref.py a12ac3f8), ported to the mirrored layout."""

    def test_P01_control_genuine_entries_pass(self):
        self.good(); self.assertPass(self.p5())

    def test_P02_pmw_heading_comentions_both_ids(self):
        self.files(product=f'## D-PMW-2099-01-01-01 · PMW note (re {H}; {Q})\n- candidate `{self.C}`; manifest `{self.M}`\n',
                   qa=f'## D-PMW-2099-01-01-01 · PMW note (re {H}; {Q})\n- candidate `{self.C}`; manifest `{self.M}`\n')
        self.assertNotPass(self.p5())

    def test_P03_hop_heading_mentions_qad_id(self):
        self.files(product=f'## {H} · HoP approval (B4 per {Q})\n- candidate `{self.C}`; manifest `{self.M}`\n')
        self.assertNotPass(self.p5())

    def test_P04_spoof_heading_precedes_genuine_without_sha(self):
        self.files(product=f'## D-ECON-2099-01-01-01 · Econ proposal awaiting {H}\n- `{self.C}`\n\n## {H} · HoP\n- rejected; no sha here\n',
                   qa=f'## {Q}\n- `{self.M}`\n')
        self.assertNotPass(self.p5())

    def test_P05_headings_inside_backtick_fence(self):
        self.files(product=f'## D-PMM-2099-01-01-01 · notes\n```\n## {H}\n- `{self.C}`\n```\n',
                   qa=f'## QA-D-2099-NOTES · notes\n```\n## {Q}\n- `{self.M}`\n```\n')
        self.assertNotPass(self.p5())

    def test_F01_control_fam_genuine_pass(self):
        self.files(product=f'## {H} · HoP\n- `{self.HC}`\n'); self.assertPass(self.fam())

    def test_F02_fam_credited_to_pmw_comention(self):
        self.files(product=f'## D-PMW-2099-01-01-02 · cites {H}\n- `{self.HC}`\n'); self.assertNotPass(self.fam())

    def test_P06_ids_only_in_body_or_blockquote(self):
        self.files(product=f'## D-PMW-2099-01-01-03 · notes\n> {H}: candidate `{self.C}`\n',
                   qa=f'## QA-D-2099-OTHER\n{Q} manifest `{self.M}`\n')
        self.assertNotPass(self.p5())

    def test_P07_prefix_sha(self):
        self.files(product=f'## {H}\n- `{self.C[:8]}`\n', qa=f'## {Q}\n- `{self.M[:8]}`\n'); self.assertNotPass(self.p5())

    def test_P08_uppercase_sha(self):
        self.files(product=f'## {H}\n- `{self.C.upper()}`\n', qa=f'## {Q}\n- `{self.M.upper()}`\n'); self.assertNotPass(self.p5())

    def test_P09_sha_in_65hex_run(self):
        self.files(product=f'## {H}\n- `a{self.C}`\n', qa=f'## {Q}\n- `{self.M}b`\n'); self.assertNotPass(self.p5())

    def test_P10_sha_split_by_whitespace(self):
        self.files(product=f'## {H}\n- `{self.C[:32]} {self.C[32:]}`\n', qa=f'## {Q}\n- `{self.M}`\n'); self.assertNotPass(self.p5())

    def test_P11_truncated_63hex(self):
        self.files(product=f'## {H}\n- `{self.C[:63]}`\n', qa=f'## {Q}\n- `{self.M}`\n'); self.assertNotPass(self.p5())

    def test_P12_lowercase_ids_in_ref(self):
        self.good(); self.assertNotPass(self.p5(H.lower(), f'{Q.lower()} path={self.man}'))

    def test_P13_id_prefix_of_real_id(self):
        self.good(); self.assertNotPass(self.p5('D-HOP-2099-01-01-7'))

    def test_P14_authorities_swapped(self):
        self.files(product=f'## {H}\n- `{self.M}`\n', qa=f'## {Q}\n- `{self.C}`\n')
        self.assertNotPass(self.p5(Q, f'{H} path={self.man}'))

    def test_P15_qad_as_approval_and_dhop_as_b4(self):
        self.good(); self.assertNotPass(self.p5(Q, f'{H} path={self.man}'))

    def test_P16_ref_whitespace_and_extra_text_benign(self):
        self.good(); self.assertPass(self.p5(f'  see {H}  ', f'  {Q} path={self.man}  '))

    def test_P17_level4_heading(self):
        self.files(product=f'#### {H}\n- `{self.C}`\n', qa=f'#### {Q}\n- `{self.M}`\n'); self.assertNotPass(self.p5())

    def test_P18_b4_manifest_path_missing(self):
        self.good(); self.assertNotPass(self.p5(b=f'{Q} path={self.d}/nope.json'))

    def test_P19_b4_ref_without_path(self):
        self.good(); self.assertNotPass(self.p5(b=Q))

    def test_P20_b4_manifest_via_symlink_content_hashed(self):
        link = os.path.join(self.d, 'man-link.json'); os.symlink(self.man, link)
        self.good(); self.assertPass(self.p5(b=f'{Q} path={link}'))

    def test_P21_b4_manifest_csv_sha_uppercase(self):
        m2 = self.manifest('m2.json', csv_sha256=self.C.upper())
        self.good(sha(m2)); self.assertNotPass(self.p5(b=f'{Q} path={m2}'))

    def test_P22_b4_manifest_empty_seeds(self):
        m3 = self.manifest('m3.json', seeds=[])
        self.good(sha(m3)); self.assertNotPass(self.p5(b=f'{Q} path={m3}'))

    def test_P23_rejected_text_with_sha_is_text_presence_only(self):
        self.files(product=f'## {H}\n- REJECTED candidate `{self.C}`\n', qa=f'## {Q}\n- `{self.M}`\n')
        self.assertPass(self.p5())  # advisory per HoQA: rule (iii) is text-presence only

    def test_F03_fam_authority_list_is_input_error(self):
        self.good()
        with self.assertRaises(ValueError):
            self.fam([H])

    def test_F04_fam_authority_empty_is_input_error(self):
        self.good()
        with self.assertRaises(ValueError):
            self.fam('')


class TestFileAuthority(Base):
    """D-HOP-2026-11-10-06: authority = the file the ID is defined in."""

    def test_qad_defined_in_product_file_not_verified(self):
        self.files(product=f'## {H}\n- `{self.C}`\n\n## {Q}\n- `{self.M}`\n'); self.assertNotPass(self.p5())

    def test_dhop_defined_in_qa_file_not_verified(self):
        self.files(qa=f'## {H}\n- `{self.C}`\n\n## {Q}\n- `{self.M}`\n'); self.assertNotPass(self.p5())

    def test_dhop_defined_in_root_file_not_verified(self):
        self.files(root=f'## {H}\n- `{self.C}`\n', qa=f'## {Q}\n- `{self.M}`\n'); self.assertNotPass(self.p5())

    def test_dhop_defined_in_engineering_file_not_verified(self):
        self.files(engineering=f'## {H}\n- `{self.HC}`\n'); self.assertNotPass(self.fam())

    def test_dhop_defined_in_workers_file_not_verified(self):
        self.files(workers=f'## {H}\n- `{self.HC}`\n'); self.assertNotPass(self.fam())

    def test_qad_defined_in_root_file_not_verified(self):
        self.files(product=f'## {H}\n- `{self.C}`\n', root=f'## {Q}\n- `{self.M}`\n'); self.assertNotPass(self.p5())

    def test_fam_dhop_in_qa_file_not_verified(self):
        self.files(qa=f'## {H}\n- `{self.HC}`\n'); self.assertNotPass(self.fam())

    def test_qad_id_as_approval_defined_in_product_file(self):
        """Family check: approval_ref must cite a D-HOP ID even if a `## QA-D-…` heading sits in product/decisions.md."""
        self.files(product=f'## {Q}\n- candidate `{self.C}`\n', qa=f'## {Q}\n- `{self.M}`\n')
        self.assertNotPass(self.p5(Q))
        self.files(product=f'## {Q}\n- candidate `{self.C}`\n', qa=f'## QA-D-2099-B4RUN2\n- `{self.M}`\n')
        self.assertNotPass(self.p5(Q, f'QA-D-2099-B4RUN2 path={self.man}'))

    def test_dhop_id_as_b4_defined_in_qa_file(self):
        """Family check: b4_run_ref must cite a QA-D ID even if a `## D-HOP-…` heading sits in qa/decisions.md."""
        self.files(product=f'## {H}\n- candidate `{self.C}`\n', qa=f'## D-HOP-2099-01-01-88\n- manifest `{self.M}`\n')
        self.assertNotPass(self.p5(H, f'D-HOP-2099-01-01-88 path={self.man}'))

    def test_single_unclassified_file_fails_closed(self):
        """A bare <tmp>/decisions.md (HoQA probe layout) is the ROOT file: D-HOP/QA-D defined there never verify."""
        single = write(self.d, 'decisions.md', f'## {H}\n- `{self.C}`\n\n## {Q}\n- `{self.M}`\n')
        self.assertNotPass(self.p5(paths=[single]))

    def test_dict_paths_by_role_pass(self):
        self.good(); self.assertPass(self.p5(paths=dict(self.lay.paths)))

    def test_dict_paths_wrong_role_mapping_not_verified(self):
        self.good()
        swapped = dict(self.lay.paths); swapped['product'], swapped['qa'] = swapped['qa'], swapped['product']
        self.assertNotPass(self.p5(paths=swapped))

    def test_duplicate_heading_same_file_not_verified(self):
        self.files(product=f'## {H} · first\n- `{self.C}`\n\n## {H} · second\n- `{self.C}`\n', qa=f'## {Q}\n- `{self.M}`\n')
        self.assertNotPass(self.p5())

    def test_duplicate_definition_across_files_not_verified(self):
        self.files(product=f'## {H}\n- `{self.C}`\n', qa=f'## {Q}\n- `{self.M}`\n\n## {H} · stray copy\n- x\n')
        self.assertNotPass(self.p5())

    def test_duplicate_qad_definition_not_verified(self):
        self.files(product=f'## {H}\n- `{self.C}`\n', qa=f'## {Q}\n- `{self.M}`\n\n## {Q} · amended\n- `{self.M}`\n')
        self.assertNotPass(self.p5())

    def test_ref_citing_two_distinct_ids_not_verified(self):
        self.files(product=f'## {H}\n- `{self.C}`\n\n## D-HOP-2099-01-01-78\n- no sha\n', qa=f'## {Q}\n- `{self.M}`\n')
        self.assertNotPass(self.p5(f'D-HOP-2099-01-01-78 superseded by {H}'))


class TestPrefixSpoof(Base):
    def test_heading_x_prefixed_qad_token(self):
        self.files(product=f'## {H}\n- `{self.C}`\n', qa=f'## X{Q}\n- `{self.M}`\n'); self.assertNotPass(self.p5())

    def test_heading_x_prefixed_dhop_token(self):
        self.files(product=f'## X{H}\n- `{self.HC}`\n'); self.assertNotPass(self.fam())

    def test_heading_lowercase_suffixed_dhop_token(self):
        self.files(product=f'## {H}x\n- `{self.HC}`\n'); self.assertNotPass(self.fam())

    def test_heading_suffixed_qad_token(self):
        self.files(product=f'## {H}\n- `{self.C}`\n', qa=f'## {Q}X\n- `{self.M}`\n'); self.assertNotPass(self.p5())

    def test_heading_punctuation_glued_token(self):
        self.files(product=f'## {H}:\n- `{self.HC}`\n'); self.assertNotPass(self.fam())

    def test_heading_qad_text_inside_dhop_file(self):
        self.files(product=f'## {H}\n- `{self.C}`\n\n## {Q} · mirrored into product\n- `{self.M}`\n'); self.assertNotPass(self.p5())

    def test_heading_id_not_leading_token(self):
        self.files(product=f'## Note {H}\n- `{self.HC}`\n'); self.assertNotPass(self.fam())

    def test_ref_x_prefixed_dhop(self):
        self.good(); self.assertNotPass(self.p5(f'X{H}'))

    def test_ref_lowercase_suffixed_dhop(self):
        self.good(); self.assertNotPass(self.p5(f'{H}x'))

    def test_ref_digit_suffixed_dhop(self):
        self.good(); self.assertNotPass(self.p5(f'{H}0'))

    def test_ref_x_prefixed_qad(self):
        self.good(); self.assertNotPass(self.p5(b=f'X{Q} path={self.man}'))

    def test_ref_lowercase_suffixed_qad(self):
        self.good(); self.assertNotPass(self.p5(b=f'{Q}x path={self.man}'))

    def test_level1_heading_not_entry(self):
        self.files(product=f'# {H}\n- `{self.HC}`\n'); self.assertNotPass(self.fam())

    def test_level3_heading_not_entry(self):
        self.files(product=f'### {H}\n- `{self.HC}`\n'); self.assertNotPass(self.fam())

    def test_indented_heading_not_entry(self):
        self.files(product=f' ## {H}\n- `{self.HC}`\n'); self.assertNotPass(self.fam())

    def test_blockquoted_heading_not_entry(self):
        self.files(product=f'> ## {H}\n> - `{self.HC}`\n'); self.assertNotPass(self.fam())

    def test_no_space_after_hashes_not_entry(self):
        self.files(product=f'##{H}\n- `{self.HC}`\n'); self.assertNotPass(self.fam())


class TestCodeFence(Base):
    def test_backtick_fence(self):
        self.files(product=f'## D-HOP-2099-01-01-01 · notes\n```\n## {H}\n- `{self.HC}`\n```\n'); self.assertNotPass(self.fam())

    def test_tilde_fence(self):
        self.files(product=f'## D-HOP-2099-01-01-01 · notes\n~~~\n## {H}\n- `{self.HC}`\n~~~\n'); self.assertNotPass(self.fam())

    def test_fence_with_info_string(self):
        self.files(product=f'## D-HOP-2099-01-01-01\n```markdown\n## {H}\n- `{self.HC}`\n```\n'); self.assertNotPass(self.fam())

    def test_longer_fence_not_closed_by_shorter(self):
        self.files(product=f'## D-HOP-2099-01-01-01\n````\n```\n## {H}\n- `{self.HC}`\n```\n````\n'); self.assertNotPass(self.fam())

    def test_tilde_fence_not_closed_by_backticks(self):
        self.files(product=f'## D-HOP-2099-01-01-01\n~~~\n```\n## {H}\n- `{self.HC}`\n~~~\n'); self.assertNotPass(self.fam())

    def test_unclosed_fence_runs_to_eof(self):
        self.files(product=f'## D-HOP-2099-01-01-01\n```\n## {H}\n- `{self.HC}`\n'); self.assertNotPass(self.fam())

    def test_indented_fence_opener(self):
        self.files(product=f'## D-HOP-2099-01-01-01\n   ~~~\n## {H}\n- `{self.HC}`\n   ~~~\n'); self.assertNotPass(self.fam())

    def test_fenced_duplicate_does_not_count(self):
        """A genuine entry plus a fenced copy of the heading is ONE definition (fenced text is not a heading)."""
        self.files(product=f'## {H} · HoP\n- `{self.HC}`\n\n## D-HOP-2099-01-01-02\n```\n## {H}\n```\n')
        self.assertPass(self.fam())

    def test_entry_after_closed_fence_still_parsed(self):
        self.files(product=f'## D-HOP-2099-01-01-02\n~~~\nx\n~~~\n\n## {H} · HoP\n- `{self.HC}`\n'); self.assertPass(self.fam())

    def test_entry_body_ends_at_next_h2(self):
        self.files(product=f'## {H} · HoP\n- no sha here\n\n## D-HOP-2099-01-01-02\n- `{self.HC}`\n'); self.assertNotPass(self.fam())


class TestB4Manifest(Base):
    """D-2: empty/missing seeds and unverifiable harness sha -> NOT VERIFIED."""

    def _p5_with(self, **over):
        m = self.manifest('mx.json', **over); self.good(sha(m)); return self.p5(b=f'{Q} path={m}')

    def test_seeds_empty_list(self):
        self.assertNotPass(self._p5_with(seeds=[]))

    def test_seeds_missing(self):
        self.assertNotPass(self._p5_with(seeds=KeyError))

    def test_seeds_empty_string(self):
        self.assertNotPass(self._p5_with(seeds=''))

    def test_seeds_not_integers(self):
        self.assertNotPass(self._p5_with(seeds=['a', 'b']))

    def test_seeds_bool(self):
        self.assertNotPass(self._p5_with(seeds=[True]))

    def test_harness_sha_mismatch_with_disk(self):
        self.assertNotPass(self._p5_with(harness_sha='a' * 64))

    def test_harness_path_missing(self):
        self.assertNotPass(self._p5_with(harness_path=KeyError))

    def test_harness_file_missing(self):
        self.assertNotPass(self._p5_with(harness_path=os.path.join(self.d, 'nope.ts')))

    def test_harness_relative_path_resolved_from_manifest_dir(self):
        self.assertPass(self._p5_with(harness_path='bot-m5.ts'))

    def test_config_missing(self):
        self.assertNotPass(self._p5_with(config=KeyError))

    def test_csv_sha_mismatch_otherwise_valid(self):
        self.assertNotPass(self._p5_with(csv_sha256='c' * 64))

    def test_valid_manifest_pass(self):
        self.assertPass(self._p5_with())


class TestHermetic(Base):
    """D-3: synthetic mode never falls back to the live decisions files."""

    def test_synthetic_default_is_empty(self):
        self.good()
        saved = csvcheck._DEFAULT_DECISIONS
        csvcheck._DEFAULT_DECISIONS = dict(self.lay.paths)  # TEMP layout that would verify
        try:
            lst = write_json(self.d, 'l.json', {'columns': {'bc_broody_cap_bp': {'value': '700', 'approval_ref': H,
                                                                                 'b4_run_ref': f'{Q} path={self.man}'}}})
            r = csvcheck.check(self.before, self.after, breeds=0, synthetic=True, bc_listing=lst)
        finally:
            csvcheck._DEFAULT_DECISIONS = saved
        self.assertEqual(r['checks']['P5IB']['verdict'], 'CONDITIONAL-UNMET')

    def test_default_layout_covers_all_authorities(self):
        dd = csvcheck._DEFAULT_DECISIONS
        root = '/workspace/egg-farm-studio/'
        self.assertEqual(dd['product'], root + 'product/decisions.md')
        self.assertEqual(dd['qa'], root + 'qa/decisions.md')
        self.assertEqual(dd['root'], root + 'decisions.md')
        self.assertEqual(dd['engineering'], root + 'engineering/decisions.md')
        self.assertEqual(dd['workers'], root + 'product/workers/decisions.md')


if __name__ == '__main__':
    unittest.main()
