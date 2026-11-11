"""Synthetic playtest exports for AC6 D1-script verification (QA). Same shape as the pt1 Export log."""
import json, os
T0 = 1_760_860_800_000  # 2025-10-19 08:00 UTC epoch ms base (relative times are what matter)
H = 3_600_000
D = os.path.join(os.path.dirname(__file__), '..', 'm3-fixtures', 'exports')
def sess(iid, t, mins, build='m3-pt1'):
    return [dict(type='session_start', ts=t, sessionMs=0, install_id=iid, build=build),
            dict(type='upgrade', ts=t + 20_000, sessionMs=20_000, upgrade='collection', newLevel=1),
            dict(type='session_end', ts=t + int(mins * 60_000), sessionMs=int(mins * 60_000))]
CASES = {  # name: (sessions as (hours after first, minutes long), expected D1, note)
  'S1-yes': ([(0, 10), (26, 5)], True, ''), 'S2-no-too-soon': ([(0, 10), (5, 4), (19.9, 3)], False, ''),
  'S3-no-late': ([(0, 10), (48.1, 5)], False, ''), 'S4-edge-20h': ([(0, 10), (20.0, 5)], True, 'inclusive'),
  'S5-edge-48h': ([(0, 10), (48.0, 5)], True, 'inclusive'), 'S7a-first-7.9min': ([(0, 7.9)], False, 'first session 7.9 min'),
  'S7b-first-8.1min': ([(0, 8.1), (24, 3)], True, 'first session 8.1 min')}
os.makedirs(D, exist_ok=True); expected = {}
for i, (n, (ss, d1, note)) in enumerate(CASES.items()):
    iid = f'00000000-0000-4000-8000-{i:012d}'; ev = []
    for h, m in ss: ev += sess(iid, T0 + int(h * H), m)
    json.dump(dict(exportedAt=ev[-1]['ts'] + 1000, events=ev), open(f'{D}/{n}.json', 'w'))
    expected[n] = dict(d1=d1, first_session_min=ss[0][1], note=note)
ev = sess('aaaaaaaa-0000-4000-8000-000000000001', T0, 10) + sess('bbbbbbbb-0000-4000-8000-000000000002', T0 + 25 * H, 5)
json.dump(dict(exportedAt=T0 + 26 * H, events=ev), open(f'{D}/S6a-two-install-ids.json', 'w'))
ev = sess('x', T0, 10); ev += sess('x', T0 + 24 * H, 5); [e.pop('install_id') for e in ev if e['type'] == 'session_start']
json.dump(dict(exportedAt=T0 + 25 * H, events=ev), open(f'{D}/S6b-missing-install-id.json', 'w'))
expected['S6a-two-install-ids'] = dict(d1=None, note='flag, not counted'); expected['S6b-missing-install-id'] = dict(d1=None, note='flag, not counted')
json.dump(expected, open(f'{D}/expected.json', 'w'), indent=1); print(len(expected), 'exports ->', os.path.abspath(D))
