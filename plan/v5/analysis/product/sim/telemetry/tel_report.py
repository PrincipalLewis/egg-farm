import json, statistics as st
R = json.load(open('tel_raw.json')); BANDS = ['F0-2', 'F3-7', 'F8-14', 'F15-19', 'F20-30']
def pct(v, p):
  v = sorted(v); 
  if not v: return None
  k = (len(v) - 1) * p; i = int(k); return v[i] + (v[min(i + 1, len(v) - 1)] - v[i]) * (k - i)
def f(x, s='{:.1f}'): return '—' if x is None else s.format(x)
def sel(**kw): return [r for r in R if all(r[k] == v for k, v in kw.items())]
out = []
out.append('## TTFU (first purchase, s), csv caps, nohand')
for prof in ('bot1hz', 'casual05', 'slow'):
  for pol in ('seller15', 'cheapest'):
    v = [r['first'] for r in sel(caps='csv', prof=prof, mode='nohand', pol=pol)]
    out.append(f'{prof} {pol}: min {min(v)} P50 {pct(v,.5)} P90 {pct(v,.9)} max {max(v)}')
out.append('\n## Taps per active minute (P10/P50/P90 over seeds) and effective-tap share, csv, managed')
for prof in ('bot1hz', 'casual05', 'slow'):
  for pol in ('seller15', 'cheapest'):
    rr = sel(caps='csv', prof=prof, mode='nohand', pol=pol)
    tpm = [sum(b['taps'] for b in r['tel']) / (sum(b['fg'] for b in r['tel']) / 60) for r in rr]
    eff = [sum(b['eff'] for b in r['tel']) / max(1, sum(b['taps'] for b in r['tel'])) for r in rr]
    out.append(f'{prof} {pol}: tpm {f(pct(tpm,.1))}/{f(pct(tpm,.5))}/{f(pct(tpm,.9))}; eff share P50 {pct(eff,.5):.2f}')
for metric in ('full', 'lost'):
  for caps in ('csv', 'cand'):
    out.append(f'\n## {"coop_full_share %" if metric=="full" else "eggs_lost_share %"} — caps={caps}; cells P10/P50/P90 across 30 seeds (seller15 | cheapest)')
    out.append('| profile | mode | ' + ' | '.join(BANDS) + ' |'); out.append('|---|---|' + '---|' * 5)
    for prof in ('bot1hz', 'casual05', 'slow'):
      for mode in ('nohand', 'unmanaged', 'managed'):
        cells = []
        for i in range(5):
          cc = []
          for pol in ('seller15', 'cheapest'):
            v = [100 * (r['tel'][i]['full'] / r['tel'][i]['fg'] if metric == 'full' else r['tel'][i]['lostc'] / r['tel'][i]['prod'])
                 for r in sel(caps=caps, prof=prof, mode=mode, pol=pol) if r['tel'][i]['fg'] > 30]
            cc.append(f'{f(pct(v,.1),"{:.0f}")}/{f(pct(v,.5),"{:.0f}")}/{f(pct(v,.9),"{:.0f}")}' if v else 'n/r')
          cells.append(' \\| '.join(cc))
        out.append(f'| {prof} | {mode} | ' + ' | '.join(cells) + ' |')
hand = [r['hand_t'] for r in sel(caps='csv', prof='bot1hz', mode='managed', pol='seller15') if r['hand_t']]
out.append(f'\nCoop Hand hire time (bot1hz seller15): P50 {pct(hand,.5):.0f} s')
open('tel_report.md', 'w').write('\n'.join(out)); print('\n'.join(out))
