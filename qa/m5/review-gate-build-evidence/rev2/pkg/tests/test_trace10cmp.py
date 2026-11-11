"""trace10 COMPARATOR tests on SYNTHETIC JSONL traces. The trace PRODUCER (harness instrumentation) is NOT implemented."""
import copy, json, os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fixtures import write, tmpdir
import trace10cmp

PROFS = ('optimal', 'casual')
SEEDS = (1, 3)
TC = {'tc.streak_cap': 0.28}


def seed_events(p, s, reach10_tick=50, extra_same_tick=True, post=3):
    ev = []; F = 0
    for i in range(1, reach10_tick + 1, 7):
        ev.append({'rec': 'ev', 'profile': p, 'seed': s, 'i': i, 't': i / 10, 'type': 'sell', 'F': F,
                   'data': {'value': 5 + s}, 'state': {'coins': i * 3, 'F': F}, 'rng': {'R': i, 'V': i // 2, 'h': f'h{i}'}})
        if i % 14 == 1 and F < 9:
            F += 1
            ev.append({'rec': 'ev', 'profile': p, 'seed': s, 'i': i, 't': i / 10, 'type': 'buy', 'F': F,
                       'data': {'kind': 'f', 'row': F - 1, 'cost': 100 * F}, 'state': {'coins': 0, 'F': F}, 'rng': {'R': i, 'V': i // 2, 'h': f'h{i}'}})
    F = 10
    ev.append({'rec': 'ev', 'profile': p, 'seed': s, 'i': reach10_tick, 't': reach10_tick / 10, 'type': 'buy', 'F': F,
               'data': {'kind': 'f', 'row': 9, 'cost': 1368}, 'state': {'coins': 1, 'F': F}, 'rng': {'R': 99, 'V': 50, 'h': 'r10'}})
    if extra_same_tick:
        ev.append({'rec': 'ev', 'profile': p, 'seed': s, 'i': reach10_tick, 't': reach10_tick / 10, 'type': 'sell', 'F': F,
                   'data': {'value': 7}, 'state': {'coins': 8, 'F': F}, 'rng': {'R': 100, 'V': 50, 'h': 'r10b'}})
    for k in range(post):
        ev.append({'rec': 'ev', 'profile': p, 'seed': s, 'i': reach10_tick + 1 + k, 't': (reach10_tick + 1 + k) / 10, 'type': 'sell', 'F': F,
                   'data': {'value': 9}, 'state': {'coins': 20 + k, 'F': F}, 'rng': {'R': 101 + k, 'V': 51, 'h': f'p{k}'}})
    return ev


def manifest(p, s, tc=TC, K_on=False, streak=0.28, producer='SYNTHETIC-FIXTURE'):
    return {'rec': 'manifest', 'profile': p, 'seed': s, 'producer': producer, 'csv_sha256': '0' * 64, 'cfg': 'none',
            'K_on': K_on, 'runtime_streakCap': streak, 'balance_tc': dict(tc)}


def build(d, name, mut=None, profs=PROFS, seeds=SEEDS, mtc=TC):
    lines = []
    for p in profs:
        for s in range(seeds[0], seeds[1] + 1):
            m = manifest(p, s, tc=mtc); ev = seed_events(p, s)
            if mut: m, ev = mut(p, s, m, ev)
            if m is not None: lines.append(m)
            lines.extend(ev)
    return write(d, name, '\n'.join(json.dumps(x) for x in lines) + '\n')


class T(unittest.TestCase):
    def setUp(self): self.d = tmpdir()

    def cmp(self, b, a, **kw):
        kw.setdefault('profiles', PROFS); kw.setdefault('seeds', SEEDS); kw.setdefault('synthetic', True)
        return trace10cmp.compare(b, a, **kw)

    def test_identical_pass_comparator_only(self):
        rep = self.cmp(build(self.d, 'b'), build(self.d, 'a'))
        self.assertEqual(rep['overall'], 'PASS', rep)
        self.assertIn('NOT IMPLEMENTED', rep['producer_status'])
        self.assertEqual(rep['ac_claim'], 'NONE')
        self.assertIn('INCLUSIVE', rep['cut_rule'])

    def test_divergence_after_reach10_tick_ignored(self):
        def m(p, s, man, ev): ev[-1]['data']['value'] = 999; return man, ev
        self.assertEqual(self.cmp(build(self.d, 'b'), build(self.d, 'a', m))['overall'], 'PASS')

    def test_divergence_on_reach10_tick_same_tick_later_event_fails_inclusive(self):
        def m(p, s, man, ev):
            for e in ev:
                if e['state'].get('coins') == 8: e['data']['value'] = 8
            return man, ev
        rep = self.cmp(build(self.d, 'b'), build(self.d, 'a', m))
        self.assertEqual(rep['overall'], 'NOT-PASS')
        fd = rep['first_divergences'][0]
        self.assertEqual(fd['tick'], 50); self.assertEqual(fd['stream'], 'event'); self.assertEqual(fd['F'], 10)

    def test_buy_divergence_reports_stream_buy_and_identity(self):
        def m(p, s, man, ev):
            if p == 'casual' and s == 2:
                for e in ev:
                    if e['type'] == 'buy' and e['F'] == 3: e['data']['cost'] += 1
            return man, ev
        rep = self.cmp(build(self.d, 'b'), build(self.d, 'a', m))
        fd = rep['first_divergences'][0]
        self.assertEqual((fd['profile'], fd['seed'], fd['stream']), ('casual', 2, 'buy'))

    def test_state_and_rng_streams(self):
        def ms(p, s, man, ev): ev[2]['state']['coins'] += 1; return man, ev
        self.assertEqual(self.cmp(build(self.d, 'b'), build(self.d, 'a', ms))['first_divergences'][0]['stream'], 'state')
        def mr(p, s, man, ev): ev[2]['rng']['V'] += 1; return man, ev
        d = tmpdir(); self.assertEqual(self.cmp(build(d, 'b'), build(d, 'a', mr))['first_divergences'][0]['stream'], 'rng')

    def test_tick_divergence(self):
        def m(p, s, man, ev): ev[1]['t'] += 0.1; return man, ev
        self.assertEqual(self.cmp(build(self.d, 'b'), build(self.d, 'a', m))['first_divergences'][0]['stream'], 'tick')

    def test_extra_event_in_after_before_cut_fails(self):
        def m(p, s, man, ev): ev.insert(1, copy.deepcopy(ev[0])); return man, ev
        self.assertEqual(self.cmp(build(self.d, 'b'), build(self.d, 'a', m))['overall'], 'NOT-PASS')

    def test_no_reach10_in_before_fails(self):
        def m(p, s, man, ev): return man, [e for e in ev if e['F'] < 10]
        rep = self.cmp(build(self.d, 'b', m), build(self.d, 'a', m))
        self.assertEqual(rep['overall'], 'NOT-PASS')
        self.assertTrue(any(r['reason'] == 'no_reach10' for r in rep['seed_failures']))

    def test_after_truncated_before_cut_fails(self):
        def m(p, s, man, ev): return man, ev[:3]
        self.assertEqual(self.cmp(build(self.d, 'b'), build(self.d, 'a', m))['overall'], 'NOT-PASS')

    def test_missing_and_duplicate_identity_fail(self):
        def drop(p, s, man, ev): return (None, []) if (p, s) == ('optimal', 2) else (man, ev)
        self.assertEqual(self.cmp(build(self.d, 'b'), build(self.d, 'a', drop))['overall'], 'NOT-PASS')
        a = build(self.d, 'a2'); txt = open(a).read(); first = txt.splitlines()[0]
        open(a, 'w').write(txt + first + '\n')
        rep = self.cmp(build(self.d, 'b2'), a)
        self.assertEqual(rep['overall'], 'NOT-PASS'); self.assertTrue(any('duplicate' in e for e in rep['input_errors']))

    def test_events_without_manifest_fail(self):
        def m(p, s, man, ev): return (None, ev) if (p, s) == ('casual', 1) else (man, ev)
        self.assertEqual(self.cmp(build(self.d, 'b'), build(self.d, 'a', m))['overall'], 'NOT-PASS')

    def test_malformed_nonfinite_and_decreasing_tick_fail(self):
        for bad in ('{not json', json.dumps({'rec': 'ev'}).replace('}', ', "t": NaN}')):
            a = build(self.d, 'am'); open(a, 'a').write(bad + '\n')
            self.assertEqual(self.cmp(build(self.d, 'bm'), a)['overall'], 'NOT-PASS', bad)
        def m(p, s, man, ev): ev[3]['i'] = 0; return man, ev
        d = tmpdir(); self.assertEqual(self.cmp(build(d, 'b'), build(d, 'a', m))['overall'], 'NOT-PASS')

    def test_balance_diff_only_allowed_keys(self):
        ok_tc = {'tc.streak_cap': 0.27, 'tc.combo_window_s': 10, 'tc.combo_boost_duration_s': 45}
        rep = self.cmp(build(self.d, 'b'), build(self.d, 'a', mtc=ok_tc))
        self.assertEqual(rep['overall'], 'PASS', rep)
        self.assertTrue(rep['balance_diffs_allowed'])
        bad_tc = dict(ok_tc, **{'tc.ability_s': 31})
        d = tmpdir(); self.assertEqual(self.cmp(build(d, 'b'), build(d, 'a', mtc=bad_tc))['overall'], 'NOT-PASS')

    def test_manifest_flags_off_and_runtime_stack_equal(self):
        def kon(p, s, man, ev): man['K_on'] = True; return man, ev
        self.assertEqual(self.cmp(build(self.d, 'b'), build(self.d, 'a', kon))['overall'], 'NOT-PASS')
        def st(p, s, man, ev): man['runtime_streakCap'] = 0.27; return man, ev
        d = tmpdir(); self.assertEqual(self.cmp(build(d, 'b'), build(d, 'a', st))['overall'], 'NOT-PASS')

    def test_synthetic_producer_rejected_in_non_synthetic_mode(self):
        rep = self.cmp(build(self.d, 'b'), build(self.d, 'a'), synthetic=False)
        self.assertEqual(rep['overall'], 'NOT-PASS')


if __name__ == '__main__':
    unittest.main()
