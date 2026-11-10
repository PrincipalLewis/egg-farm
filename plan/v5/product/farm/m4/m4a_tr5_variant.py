"""Run tr5_run.py with patched Hens milestone multipliers (m4_sim hardcodes 1.25/1.5/2.0).
Usage: python3 m4a_tr5_variant.py CSV m1,m2,m3 [extra tr5 args]"""
import os, sys, runpy
HERE = os.path.dirname(os.path.abspath(__file__)); csvp, ms = sys.argv[1], [float(x) for x in sys.argv[2].split(',')]
os.environ['ECON_CSV'] = os.path.abspath(csvp); sys.path.insert(0, HERE); import m4_sim as m
def hens_rate(H):
  r = 1.5 if H == 0 else 0.2 * (5 + 5 * H)
  return r * (ms[2] if H >= 30 else ms[1] if H >= 20 else ms[0] if H >= 10 else 1.0)
m.hens_rate = hens_rate
sys.argv = ['tr5_run.py', '--csv', os.path.abspath(csvp)] + sys.argv[3:]
runpy.run_path(os.path.join(HERE, 'tr5_run.py'), run_name='__main__')
