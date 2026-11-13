import json, statistics as st
D = {tuple(k): v for k, v in json.load(open('tel_sweeps_raw.json'))}
S = range(100); C = 0.4
def pct(v, p): v = sorted(v); k = (len(v)-1)*p; i = int(k); return v[i]+(v[min(i+1,len(v)-1)]-v[i])*(k-i)
def full(pl, sh, n, nh, G): return 100 * st.median(D[(F, pl.format(G), C, s, 3600, sh, n, nh)][1] for F in (11, 17, 23) for s in S)
def mu(F, pl, T, sh, n): return st.mean(D[(F, pl, C, s, T, sh, n, False)][0] for s in S)
def ratio(sh, n): return st.mean(mu(F, 'idle_mgd', 3600, sh, n) / mu(F, 'idle', 3600, sh, n) for F in (22, 23, 24))
def worst(sh, n):
  w = 0
  for F in (10, 18, 24):
    i_ = mu(F, 'idle', 600, sh, n); key = (lambda s: (F, 'optimal', C, s, 600, 0, n, False)) if (F, 'optimal', C, 0, 600, 0, n, False) in D else (lambda s: (F, 'optimal', C, s, 600, 0, 0, False))
    w = max(w, max(D[key(s)][0] / i_ for s in S))
  return w
out = ['### Task 2: w2_asleep_collect_share (unmanaged Coop Hand), F8+ median coop-full % (F11/F17/F23 pooled, 100 seeds, 60 min)',
       '| share | visit20 | visit45 (gate ≤35) | visit90 | F22-24 managed/unmanaged idle income (60 min) | worst-seed active/idle (10 min, optimal vs unmanaged idle) |', '|---|---|---|---|---|---|']
for sh in (0, .15, .2, .25, .3, .35, .4):
  out.append(f"| {sh} | {full('visit{}_unm', sh, 0, False, 20):.0f} | {full('visit{}_unm', sh, 0, False, 45):.0f} | {full('visit{}_unm', sh, 0, False, 90):.0f} | {ratio(sh, 0):.2f} | {worst(sh, 0):.2f} |")
out += ['', '### Task 3: coop-cap floor cap = max(cap, ceil(N x lay)) at F8+, NO Coop Hand, F8+ median coop-full %',
        '| N (s) | visit20 | visit45 (gate ≤35) | visit90 | F22-24 managed/unmanaged | worst-seed active/idle (10 min) |', '|---|---|---|---|---|---|']
for n in (0, 60, 90, 120, 180, 240):
  out.append(f"| {n} | {full('visit{}', 0, n, True, 20):.0f} | {full('visit{}', 0, n, True, 45):.0f} | {full('visit{}', 0, n, True, 90):.0f} | {ratio(0, n):.2f} | {worst(0, n):.2f} |")
open('tel_sweeps_report.md', 'w').write('\n'.join(out)); print('\n'.join(out))
