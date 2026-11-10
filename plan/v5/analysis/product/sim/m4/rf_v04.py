"""Refill v0.4 progression check (Economy, 2026-10-16). python3 rf_v04.py [nseeds] > rf_v04_out.md
Base: m4_workers_prog.run (TR-5 bot + workers + Grader + abilities v0.3, realistic energy), patched at import (source replace; file unchanged):
- Charges: +1 per 150 s up to cap 2 (start full); regen only while the clock runs in-tab. Single-row refill: 1 charge -> one Refillable
  worker (energy <= 40%, incl. asleep) to 100%. Done at each player visit (s15 15 s / casual 20 s / slow 15 s), while charges >= 1.
- Pick = highest LIVE $/s at risk: per-worker contribution measured in-sim (EMA, 60 s, decays only while the worker is not asleep):
  W1 = its own sales, W2 = sales x share of basket eggs it collected, W3 = sales x (1 - 1/demand mult), W4 = 0.85 x sales x (1 - 1/g);
  minus wage (W1 0.25F/min, W2 0.5F/min). Ties: lower energy, then W1->W4.
- Combo: Activate-all on a worker refilled within the last 10 s lasts 45 s for that worker, else 30 s.
- rc1 = free refill at a visit, 30 s cooldown, all Refillable if >= 3 else the lowest. unm = never refills.
- Sessions ('sess'): per seed, offline 8-12 min away at U(8,12) min, hidden tab 40 s at U(18,20) (< 60 s: in-tab, clock runs, no visits),
  hidden 90 s at U(24,26) (>= 60 s: offline), offline 20 min at U(35,40). Offline/hidden>=60: sim clock does NOT run (energy, charges,
  ability timers, customers frozen); offline coins = 0.25 x lay x coop ms x price x min(dur, 7200). Frozen state is asserted on return.
  Reach times are on the active (in-tab) clock."""
import inspect, math, random, statistics as st, sys, collections
from multiprocessing import Pool
import m4_workers_prog as wp
src = inspect.getsource(wp.run).replace('def run(', 'def run_v4(')
R = [
("O = dict(refill_delay=None, jitter=0.0, skip=0.0, taps=None)", "O = dict(refill_delay=None, jitter=0.0, skip=0.0, taps=None, rf='rf', sess=False)"),
("  en = {}; low_since = {}\n", """  en = {}; low_since = {}
  ch = 2.0; CAP = 2; REG = 150.0; THR = float(__import__('os').environ.get('RF_THR', '40')); last_ref = {}; ab_w = {}; last_m = -1e9
  LV = collections.defaultdict(float); S_ = dict(refills=0, decided=0, notlow=0, dz=0, dzmax=0.0, short=0.0, act_t=0.0, frz=0, frz_ok=0, off_coins=0.0)
  dz_run = 0.0; srng = random.Random(seed * 31 + 7)
  EV = sorted([(srng.uniform(480, 720), srng.uniform(480, 720)), (srng.uniform(1080, 1200), 40.0), (srng.uniform(1440, 1560), 90.0), (srng.uniform(2100, 2400), 1200.0)]) if O['sess'] else []
  EV = [[round(a_, 1), d_] for a_, d_ in EV]
  abw = lambda w_: t < ab_w.get(w_, -1)
  wg = lambda w_: WK[w_]['wage'] * F / 60 if w_ in ('w1', 'w2') else 0.0
"""),
("    t = round(i * dt, 1); r = m.row(F); ab = t < ab_until\n", """    t = round(i * dt, 1); r = m.row(F); ab = t < ab_until
    present = True
    for e_ in EV:
      if e_[1] < 60 and e_[0] <= t < e_[0] + e_[1]: present = False
      if e_[1] >= 60 and abs(t - e_[0]) < 1e-6:  # offline jump: clock stops, credit offline coins, nothing else moves
        snap = (dict(en), ch, ab_next, ab_until, dict(ab_w))
        oc = 0.25 * m.hens_rate(H) * m.hens_ms(H) * m.price(F, H, V) * min(e_[1], 7200); coins = round(coins + oc, 2); S_['off_coins'] += oc
        S_['frz'] += 1; S_['frz_ok'] += snap == (dict(en), ch, ab_next, ab_until, dict(ab_w))
"""),
("    lay = m.hens_rate(H) * (a2 if ab and 'w2' in hired", "    lay = m.hens_rate(H) * (a2 if abw('w2') and 'w2' in hired"),
("+ (a4 if ab and gt and", "+ (a4 if abw('w4') and gt and"),
("      if ab and 'w3' in hired and stt('w3') != 'asleep': p *= a3", "      if abw('w3') and 'w3' in hired and stt('w3') != 'asleep': p *= a3"),
("      if ab and worker_sale and 'w1' in hired", "      if abw('w1') and worker_sale and 'w1' in hired"),
("        k = min(basket, c_[0]); basket -= k; c_[0] -= k; coins = round(coins + k * up(worker_sale), 2)",
 """        k = min(basket, c_[0]); basket -= k; c_[0] -= k; v_ = k * up(worker_sale); coins = round(coins + v_, 2)
        if worker_sale: LV['w1'] += v_
        if 'w2' in hired: LV['w2'] += v_ * LV['e2'] / max(1e-9, LV['e2'] + LV['e0'])
        if 'w3' in hired: LV['w3'] += v_ * (1 - 1 / {'work': 1.25, 'tired': 1.1, 'asleep': 1.0}[stt('w3')])
        if gt: g_ = 1 + (gmult - 1) * {'work': 1.0, 'tired': 0.5, 'asleep': 0.15}[stt('w4')]; LV['w4'] += 0.85 * v_ * (1 - 1 / g_)"""),
("    if t >= tap_t - 1e-9: tap_t += 1 / taps; k = min(math.floor(coop), int(m.row(C)['eggs_per_tap'])); coop -= k; basket += k",
 "    if t >= tap_t - 1e-9 and present: tap_t = t + 1 / taps; k = min(math.floor(coop), int(m.row(C)['eggs_per_tap'])); coop -= k; basket += k; LV['e0'] += k"),
("w2_t = t + (2 if stt('w2') == 'work' else 4); k = min(math.floor(coop), int(m.row(C)['eggs_per_tap'])); coop -= k; basket += k",
 "w2_t = t + (2 if stt('w2') == 'work' else 4); k = min(math.floor(coop), int(m.row(C)['eggs_per_tap'])); coop -= k; basket += k; LV['e2'] += k"),
("      else: ab_until = t + ab_s; ab_next = t + ab_cd + (arng.uniform(0, O['jitter']) if O['jitter'] else 0.0)",
 "      else:\n        ab_until = t + ab_s; ab_next = t + ab_cd + (arng.uniform(0, O['jitter']) if O['jitter'] else 0.0)\n        for w_ in en: ab_w[w_] = t + (45 if (O['rf'] == 'rf' and t - last_ref.get(w_, -1e9) <= 10) else ab_s)"),
("    if t >= sell_t - 1e-9:\n      sell_t += se; sell_to(list(q), False)\n      if realistic:  # refill at a visit once a worker has been at/below the 40% yawn for >= refill_delay s (30 s manage cooldown ignored)\n        due = [w_ for w_, t0 in low_since.items() if t - t0 >= O['refill_delay']]\n        for w_ in due: en[w_] = 100.0; low_since.pop(w_)\n",
 """    fk = math.exp(-dt / 60)
    for k_ in ('e0', 'e2'): LV[k_] *= fk
    for w_ in en:
      if stt(w_) != 'asleep': LV[w_] *= fk
    rfl = [w_ for w_ in en if en[w_] <= THR]
    if en:
      S_['act_t'] += dt
      if O['rf'] == 'rf':
        ch = min(CAP, ch + dt / REG)
        if len(rfl) > math.floor(ch + 1e-9): S_['short'] += dt
    if O['rf'] == 'rf' and rfl and ch >= 1 - 1e-9: dz_run += dt
    else: dz_run = 0.0
    if dz_run > 120 and dz_run - dt <= 120: S_['dz'] += 1
    S_['dzmax'] = max(S_['dzmax'], dz_run)
    if t >= sell_t - 1e-9 and present:
      sell_t = t + se; sell_to(list(q), False)
      if O['rf'] == 'rf':
        while ch >= 1 - 1e-9 and rfl:
          risk = {w_: LV[w_] / 60 - wg(w_) for w_ in rfl}
          pick = sorted(rfl, key=lambda w_: (-risk[w_], en[w_], w_))[0]
          if len(rfl) >= 2: S_['decided'] += 1; S_['notlow'] += pick != min(rfl, key=lambda w_: (en[w_], w_))
          en[pick] = 100.0; ch -= 1; last_ref[pick] = t; S_['refills'] += 1; rfl.remove(pick); dz_run = 0.0
      elif O['rf'] == 'rc1' and rfl and t - last_m >= 30:
        for w_ in (rfl if len(rfl) >= 3 else [min(rfl, key=lambda w_: en[w_])]): en[w_] = 100.0; S_['refills'] += 1
        last_m = t; rfl = [w_ for w_ in en if en[w_] <= THR]
"""),
("hired=sorted(hired), done=t_end if t_end < T_ else None)", "hired=sorted(hired), done=t_end if t_end < T_ else None, S=S_, wall=T_ + sum(e_[1] for e_ in EV if e_[1] >= 60 and e_[0] < t_end))"),
]
for o, n in R:
  assert src.count(o) == 1, o[:90]; src = src.replace(o, n)
g = dict(vars(wp)); g['collections'] = collections; exec(src, g); RUN = g['run_v4']
CSV = '/workspace/egg-farm-studio/product/economy.f1-m4cols.csv'
def job(j):
  name, mo, T, w, rf, sess, taps, s = j
  return j, RUN((CSV, s, mo, T, w, dict(refill_delay=0, rf=rf, sess=sess, taps=taps)))
CFG = dict(  # name: (model, T, workers, refill mode, sessions, taps)
  s15_rf=('s15', 3600, True, 'rf', False, None), s15_rc1=('s15', 3600, True, 'rc1', False, None), s15_unm=('s15', 3600, True, 'unm', False, None),
  s15_none=('s15', 3600, False, 'unm', False, None), cas_rf=('casual', 2700, True, 'rf', False, None), cas_rc1=('casual', 2700, True, 'rc1', False, None),
  cas_none=('casual', 2700, False, 'unm', False, None), slow_rf=('s15', 3600, True, 'rf', False, 0.5), slow_none=('s15', 3600, False, 'unm', False, 0.5),
  s15_rf_sess=('s15', 3600, True, 'rf', True, None), s15_rc1_sess=('s15', 3600, True, 'rc1', True, None), cas_rf_sess=('casual', 2700, True, 'rf', True, None))
if __name__ == '__main__':
  N = int(sys.argv[1]) if len(sys.argv) > 1 else 100; SEEDS = range(N)
  J = [(k,) + v + (s,) for k, v in CFG.items() for s in SEEDS]
  with Pool(4) as p: D = dict(p.map(job, J, chunksize=4))
  R_ = {k: [D[(k,) + v + (s,)] for s in SEEDS] for k, v in CFG.items()}
  med = lambda k, L: st.median(r['reach'].get(L, 1e9) for r in R_[k]) / 60
  fm = lambda x: '—' if x > 1e5 else f'{x:.2f}'
  print(f'# Refill v0.4 (150 s / cap 2 / thr {__import__('os').environ.get('RF_THR', '40')}% / combo 10 s->45 s, single-row, live risk), economy.f1-m4cols.csv, seeds 0-{N-1}\n')
  print('| config | F10 med | F18 med | F25 med | F30 med | L@30:00 med | worst gap min | refills/15 min (med) | not-lowest | dead zones (max s) | shortage share | freeze checks ok |')
  print('|---|---|---|---|---|---|---|---|---|---|---|---|')
  for k in CFG:
    rs = R_[k]; Ss = [r['S'] for r in rs]
    a15 = st.median(x['refills'] / max(1e-9, x['act_t']) * 900 for x in Ss)
    nl = sum(x['notlow'] for x in Ss) / max(1, sum(x['refills'] for x in Ss))
    sh = st.mean(x['short'] / max(1e-9, x['act_t']) for x in Ss)
    print(f"| {k} | {fm(med(k,10))} | {fm(med(k,18))} | {fm(med(k,25))} | {fm(med(k,30))} | {st.median(r['L30'] for r in rs):g} | {max(r['gap'][0] for r in rs)/60:.2f} | {a15:.1f} | {nl:.0%} | {sum(x['dz'] for x in Ss)} ({max(x['dzmax'] for x in Ss):.0f}) | {sh:.0%} | {sum(x['frz_ok'] for x in Ss)}/{sum(x['frz'] for x in Ss)} |")
  steps = lambda k: max(st.median(r['reach'].get(L + 1, 1e9) - r['reach'].get(L, 1e9) for r in R_[k]) for L in range(18, 25)) / 60
  f10ok = sum(r['reach'].get(10, 1e9) <= 900 for r in R_['cas_rf']) / N
  i21 = lambda k: st.median(r['reach'].get(22, 1e9) - r['reach'].get(20, 1e9) for r in R_[k])
  G = [
   ('AC-W1 casual F10 <=15 min in >=95% seeds, F18 med <=40', f'{f10ok:.0%}, {med("cas_rf",18):.1f}', f10ok >= 0.95 and med('cas_rf', 18) <= 40),
   ('AC-W2 s15 rf vs rc1 at F10/F18 <= +1 min', f'{med("s15_rf",10)-med("s15_rc1",10):+.2f} / {med("s15_rf",18)-med("s15_rc1",18):+.2f}', max(med('s15_rf', 10) - med('s15_rc1', 10), med('s15_rf', 18) - med('s15_rc1', 18)) <= 1.0),
   ('AC-W3 unmanaged F25 < no workers F25', f'{med("s15_unm",25):.1f} vs {med("s15_none",25):.1f}', med('s15_unm', 25) < med('s15_none', 25)),
   ('AC-W4 s15 rf steps F18-F25 <= 6 min (med), F25 <= 70', f'{steps("s15_rf"):.2f}, {med("s15_rf",25):.1f}', steps('s15_rf') <= 6 and med('s15_rf', 25) <= 70),
   ('AC-W5 >=1 refill/manage action per 15 min (telemetry)', f"{st.median(x['S']['refills']/max(1e-9,x['S']['act_t'])*900 for x in R_['s15_rf']):.1f}", st.median(x['S']['refills'] / max(1e-9, x['S']['act_t']) * 900 for x in R_['s15_rf']) >= 1),
   ('AC-W6 slow tapper: workers beat none by >=4 min at F18 and >=15% income F20-22 (proxy)', f'{med("slow_none",18)-med("slow_rf",18):.1f} min, {i21("slow_none")/i21("slow_rf")-1:+.0%}', med('slow_none', 18) - med('slow_rf', 18) >= 4 and i21('slow_none') / i21('slow_rf') - 1 >= 0.15),
   ('AC-W7 L@30:00 with workers L20-24, without L18-22', f"{st.median(r['L30'] for r in R_['s15_rf']):g} / {st.median(r['L30'] for r in R_['s15_none']):g}", 20 <= st.median(r['L30'] for r in R_['s15_rf']) <= 24 and 18 <= st.median(r['L30'] for r in R_['s15_none']) <= 22),
   ('Freeze: offline/hidden>=60 s leaves energy, charges, ability timers unchanged', f"{sum(r['S']['frz_ok'] for k in ('s15_rf_sess','cas_rf_sess') for r in R_[k])}/{sum(r['S']['frz'] for k in ('s15_rf_sess','cas_rf_sess') for r in R_[k])}", all(r['S']['frz_ok'] == r['S']['frz'] for k in ('s15_rf_sess', 'cas_rf_sess') for r in R_[k])),
   ('Sessions: no dead zone, F25 (active clock) loss vs rc1 sessions <= 10%', f"dz {sum(r['S']['dz'] for r in R_['s15_rf_sess'])}, {med('s15_rf_sess',25)/med('s15_rc1_sess',25)-1:+.1%}", sum(r['S']['dz'] for r in R_['s15_rf_sess']) == 0 and med('s15_rf_sess', 25) / med('s15_rc1_sess', 25) - 1 <= 0.10),
  ]
  print('\n| gate | value | result |\n|---|---|---|')
  for n_, v_, ok in G: print(f"| {n_} | {v_} | {'PASS' if ok else 'FAIL'} |")
