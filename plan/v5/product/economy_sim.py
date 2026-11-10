"""Economy table generator (M1-R1, 2026-10-15). Formulas + pacing sim live in sim/economy_sim.py (canonical).
python3 economy_sim.py  -> regenerates economy.csv from the 'current' config and prints AC7 pacing (20 seeds)."""
import os, sys
here = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(here, 'sim'))
import economy_sim as m
e = m.Eco(m.CURRENT); out = os.path.join(here, 'economy.csv')
m.write_csv_v11(e, m.M2_CURRENT, out)  # M1 columns (unchanged) + Workers v1.1 columns
back = m.spec_from_csv(out)
diff = [k for k in m.M2_CURRENT if m.M2_CURRENT[k] != back[k]]
print('workers spec <-> economy.csv round-trip:', 'OK' if not diff else f'MISMATCH {diff}')
m.report(e, 20, 30)
same = [L for L in range(31) if e.tap(L) > 0.5 * e.cap(L)]
print('tap>50%cap check (same L, CSV rows):', same or 'none')
r = m.run(e, 'seller15', 0); pairs = sorted({(c, f) for _, _, c, f in r['buys']} | {(0, 0)})
fl = [f'C{c}/F{f}' for c, f in pairs if e.tap(c) > 0.5 * e.cap(f)]
print('tap>50%cap check (sim-paired):', ', '.join(fl) or 'none')
