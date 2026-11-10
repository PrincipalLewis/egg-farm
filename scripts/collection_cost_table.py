"""M4.1 D-HOP-23: Python side of the per-level Collection cost table (balance.collection.costTable, written by
scripts/sync-economy.ts when data/economy-config.json collectionCostFromCsv is on; absent by default).
The vendored reference sim (vendor/economy-sim/sim/*.py) is sha-pinned to Product's copy and is not edited here; instead
apply() overrides ccost on an Eco instance, exactly like the sim's own per-instance ccost overrides (economy_sim.py run_*).
Lookup mirrors TS formulas.collectionCost: level clamped to 0..maxLevel, table value when present, else the sim's formula.
CLI (used by tests/collection-cost-table.test.ts for TS/Python parity):
  python3 scripts/collection_cost_table.py <balance.json> [maxProbe]  -> JSON list of ccost(0..maxProbe)"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
BALANCE = os.path.join(ROOT, 'src', 'config', 'balance.json')

def read_table(path=BALANCE):
  """(table, maxLevel) from balance.json; table is None when collection.costTable is absent (flag off)."""
  b = json.load(open(path))
  t = (b.get('collection') or {}).get('costTable')
  if t is not None:
    if len(t) != b['maxLevel'] + 1 or any((not isinstance(v, int)) or v <= 0 for v in t):
      raise ValueError('balance.collection.costTable must be maxLevel+1 positive integers')
  return t, b['maxLevel']

def apply(e, table, max_level):
  """Make e.ccost read the table when present; a no-op (formula unchanged) when table is None."""
  if table is None: return e
  t = list(table)
  e.ccost = lambda c, t=t, m=max_level: t[max(0, min(int(c), m))]
  return e

if __name__ == '__main__':
  sys.path.insert(0, os.path.join(ROOT, 'vendor', 'economy-sim', 'sim'))
  import economy_sim as m  # noqa: E402
  path = sys.argv[1] if len(sys.argv) > 1 else BALANCE
  table, mx = read_table(path)
  probe = int(sys.argv[2]) if len(sys.argv) > 2 else mx
  e = apply(m.Eco(m.F1), table, mx)
  print(json.dumps([e.ccost(c) for c in range(probe + 1)]))
