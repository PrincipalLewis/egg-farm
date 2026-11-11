"""QA reference implementation of the AC6 D1 rule, to cross-check the Designer's script.
D1 = >=1 session_start with ts in [first + 20 h, first + 48 h] (inclusive). Files with 0 or >1 install_id are flagged, not counted."""
import json, sys, glob, os, statistics as st
H = 3_600_000
def d1(path):
    ev = json.load(open(path))['events']; ss = sorted((e for e in ev if e['type'] == 'session_start'), key=lambda e: e['ts'])
    ids = {e.get('install_id') for e in ss}
    if len(ids) != 1 or None in ids: return dict(flag='install_id', d1=None)
    t0 = ss[0]['ts']; ends = [e for e in ev if e['type'] == 'session_end' and e['ts'] >= t0]
    first_min = (min(e['ts'] for e in ends) - t0) / 60000 if ends else None
    return dict(d1=any(t0 + 20 * H <= e['ts'] <= t0 + 48 * H for e in ss[1:]), first_session_min=round(first_min, 2) if first_min else None)
if __name__ == '__main__':
    D = sys.argv[1]; exp = json.load(open(os.path.join(D, 'expected.json'))); ok = 0; res = {}
    for f in sorted(glob.glob(os.path.join(D, 'S*.json'))):
        n = os.path.basename(f)[:-5]; r = d1(f); res[n] = r; good = r['d1'] == exp[n]['d1']; ok += good
        print(f"{n:24} D1={r['d1']!s:5} expected={exp[n]['d1']!s:5} first={r.get('first_session_min')} {'OK' if good else 'MISMATCH'}")
    counted = [r for r in res.values() if r['d1'] is not None]
    print(f"{ok}/{len(res)} match; counted n={len(counted)} -> {'insufficient data (n<10)' if len(counted) < 10 else ''}; "
          f"median first session {st.median([r['first_session_min'] for r in counted]):.1f} min")
