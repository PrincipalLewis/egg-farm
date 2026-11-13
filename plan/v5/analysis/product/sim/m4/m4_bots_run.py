"""Task B: check 1 re-run with a bot set (no PM Farm Upgrades 3-track bots exist in product/). python3 m4_bots_run.py"""
from multiprocessing import Pool
import m4_active as a
TR = dict(a.TR, h_base=30, v_base=40, v_cap=3, price='A')  # approved 2026-10-16
if __name__ == '__main__':
  p = Pool(8); S = range(30)
  print('| bot | model | t18 min med (n/30) | L@30 med | H | V | C | max gap min |\n|---|---|---|---|---|---|---|---|')
  print('| F1 seller15 (reference) | seller15 |', a.prog_stats(None, S, 'seller15', p))
  for b in ('greedy', 'cheapest', 'balanced', 'hens_first', 'value_first', 'farm_first'):
    for mdl in ('seller15', 'casual'):
      r = a.prog_stats(TR, S, mdl, p, b)
      print(f"| {b} | {mdl} | {r['t18'] and round(r['t18'],2)} ({r['n18']}) | {r['L30']} | {r['H']} | {r['V']} | {r['C']} | {r['gap']:.2f} |")
