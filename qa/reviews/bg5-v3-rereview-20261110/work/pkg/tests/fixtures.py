"""SYNTHETIC fixtures only. Nothing here reads a real CSV, raw run, or harness output."""
import csv, io, json, os, tempfile

HEADER = ['level', 'farm_cost', 'hens_cost', 'egg_value_cost', 'collection_cost', 'w4_tier', 'w4_price_mult',
          'tc_streak_cap', 'combo_window_s', 'combo_boost_s', 'misc_x']
W4T = {18: 1, 19: 2, 20: 2, 21: 3, 22: 4, 23: 4}
W4M = {18: '1.5', 19: '2.0', 20: '2.0', 21: '2.5', 22: '3.0', 23: '3.0'}


def base_rows():
    rows = []
    farm = [100 + 127 * L for L in range(11)]  # row 10 = 1370 (synthetic frozen row)
    for L in range(11, 30):
        farm.append(int(farm[-1] * 1.25))
    farm.append(624316)
    for L in range(31):
        rows.append({'level': str(L), 'farm_cost': str(farm[L]), 'hens_cost': str(20 + 10 * L), 'egg_value_cost': str(30 + 11 * L),
                     'collection_cost': str(10 * (L + 1)), 'w4_tier': str(W4T.get(L, 5 if L >= 24 else 0)),
                     'w4_price_mult': W4M.get(L, '4.0' if L >= 24 else '0'), 'tc_streak_cap': '0.28',
                     'combo_window_s': '10', 'combo_boost_s': '45', 'misc_x': '7'})
    return rows


def to_csv(rows, header=None, newline='\n'):
    header = header or list(rows[0].keys())
    buf = io.StringIO()
    buf.write(','.join(header) + newline)
    for r in rows:
        buf.write(','.join(str(r.get(h, '')) for h in header) + newline)
    return buf.getvalue()


def write(tmp, name, text):
    p = os.path.join(tmp, name)
    with open(p, 'w', newline='') as f:
        f.write(text)
    return p


def write_json(tmp, name, obj):
    p = os.path.join(tmp, name)
    with open(p, 'w') as f:
        json.dump(obj, f)
    return p


def renamed(rows, cap='0.27'):
    """Approved combo rename (same positions) + cap set for breeds=1 on all rows."""
    out = []
    for r in rows:
        n = {}
        for k, v in r.items():
            n[{'combo_window_s': 'tc_combo_window_s', 'combo_boost_s': 'tc_combo_boost_duration_s'}.get(k, k)] = v
        n['tc_streak_cap'] = cap
        out.append(n)
    return out


APPROVED_MAP = {
    'renames': [
        {'old': 'combo_window_s', 'new': 'tc_combo_window_s', 'value': '10', 'unit': 's', 'clock': 'sim',
         'comparison': 'sim_ms_inclusive_le_10000', 'trigger': 'refill_used{by:manual} same worker only; auto refill never',
         'boost_source': 'shift_sheet_only', 'flags': 'abilities&&rc2Refill'},
        {'old': 'combo_boost_s', 'new': 'tc_combo_boost_duration_s', 'value': '45', 'unit': 's',
         'clock': 'focus_from_sheetCloseComplete', 'changes': 'duration_only',
         'unchanged': ['tc_ability_cd_s cooldown', 'multipliers', 'eligibility', 'early_end', 'menu_suspension'],
         'flags': 'abilities&&rc2Refill'}],
    'hoe_confirmation_ref': 'D-HOE-20261030-31'}


# ---------- synthetic pl.ts-shaped raws ----------
def raw_rows(seeds, base=60.0, jitter=1.0, gap=10, reach_max=30):
    rows = []
    for s in seeds:
        reach = {}
        t = 0.0
        for L in range(0, reach_max + 1):
            reach[str(L)] = round(t, 1)
            t += base + jitter * (s % 7)
        rows.append({'seed': s, 'reach': reach, 'noAffByF': {str(L): gap + (s % 5) for L in range(11, 30)},
                     'longestNoAff': gap + 4, 'spanBuy': 0, 'spanFarm': 0})
    return rows


def raw(prof, rows, sha='0' * 64, runner='pl.ts (SCRATCH)', cfg='none', T=4000, parity=0, seeds=(1, 200)):
    return {'runner': runner, 'csv': 'synthetic.csv', 'sha256': sha, 'seeds': list(seeds), 'T': T, 'cfg': cfg,
            'maxLevel': 30, 'prof': {prof: {'parityMismatches': parity, 'rows': rows}}}


_TMP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.tmp')


def tmpdir():
    """Synthetic scratch dirs live inside gate-build/.tmp (write scope); safe to delete."""
    os.makedirs(_TMP, exist_ok=True)
    return tempfile.mkdtemp(prefix='synth-', dir=_TMP)
