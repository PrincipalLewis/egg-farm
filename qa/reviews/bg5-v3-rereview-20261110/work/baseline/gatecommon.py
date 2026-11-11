"""Shared helpers for the PROVISIONAL scratch gate tools (Economy/R04-gate-build). Stdlib only.
Status: PROVISIONAL-UNCERTIFIED. Nothing here is a QA-pinned validator; outputs carry ac_claim NONE."""
import hashlib, json, math, os
from decimal import Decimal, InvalidOperation

HERE = os.path.dirname(os.path.abspath(__file__))
STATUS = 'PROVISIONAL-UNCERTIFIED (scratch build for independent review; not a QA-pinned validator; no AC PASS claim)'


def authority(path=None):
    with open(path or os.path.join(HERE, 'authority.json')) as f:
        return json.load(f)


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def q(a, p):
    """Nearest-rank quantile: sorted(a)[ceil(p*n)-1] (card L867). Exact for p given as float of a decimal."""
    if not a:
        raise ValueError('quantile of empty list')
    n = len(a)
    k = math.ceil(Decimal(str(p)) * n) - 1
    return sorted(a)[min(n - 1, max(0, k))]


def _reject_const(x):
    raise ValueError(f'non-finite JSON constant {x}')


def load_json_strict(path):
    with open(path) as f:
        return json.loads(f.read(), parse_constant=_reject_const)


def loads_strict(s):
    return json.loads(s, parse_constant=_reject_const)


def dec(x):
    """Exact Decimal of a CSV string or JSON number; raises ValueError on non-finite/malformed."""
    if isinstance(x, bool) or x is None:
        raise ValueError(f'not a number: {x!r}')
    try:
        d = Decimal(str(x)) if not isinstance(x, str) else Decimal(x.strip()) if x.strip() == x and x != '' else None
    except InvalidOperation:
        d = None
    if d is None or not d.is_finite():
        raise ValueError(f'not a finite number: {x!r}')
    return d


def overall(checks):
    """PASS only if every gating check is PASS. REPORT entries never gate; anything else is NOT-PASS (fail-closed)."""
    g = [c['verdict'] for c in checks.values() if c['verdict'] != 'REPORT']
    return 'PASS' if g and all(v == 'PASS' for v in g) else 'NOT-PASS'


def envelope(tool, synthetic, **extra):
    d = {'tool': tool, 'status': STATUS, 'ac_claim': 'NONE', 'synthetic': bool(synthetic)}
    if synthetic:
        d['synthetic_note'] = 'SYNTHETIC inputs/overrides allowed: result is a self-test only, never evidence'
    d.update(extra)
    return d


def load_raws(files, profiles, seeds, auth, synthetic, side):
    """Load pl.ts-shaped raw JSON files. Returns (by_profile{p:{seed:row}}, errors[], meta[]). Fail-closed on identity/provenance."""
    errs, meta, out = [], [], {}
    for f in files:
        try:
            o = load_json_strict(f)
        except (ValueError, OSError) as e:
            errs.append(f'{side} {f}: unreadable/non-finite JSON: {e}'); continue
        m = {'file': f, 'sha256_file': sha256(f), 'runner': o.get('runner'), 'cfg': o.get('cfg'), 'T': o.get('T'), 'csv_sha256': o.get('sha256')}
        meta.append(m)
        if o.get('runner') != auth['runner']:
            errs.append(f'{side} {f}: runner {o.get("runner")!r} != {auth["runner"]!r}')
        if o.get('cfg') != auth['cfg']:
            errs.append(f'{side} {f}: cfg {o.get("cfg")!r} != {auth["cfg"]!r}')
        if o.get('T') != auth['T']:
            errs.append(f'{side} {f}: T {o.get("T")!r} != {auth["T"]}')
        for p, po in (o.get('prof') or {}).items():
            if p in out:
                errs.append(f'{side}: profile {p} duplicated across files'); continue
            if po.get('parityMismatches') != 0:
                errs.append(f'{side} {p}: parityMismatches {po.get("parityMismatches")!r} != 0')
            rows = {}
            for r in po.get('rows', []):
                s = r.get('seed')
                if not isinstance(s, int) or isinstance(s, bool):
                    errs.append(f'{side} {p}: bad seed id {s!r}'); continue
                if s in rows:
                    errs.append(f'{side} {p}: duplicate seed {s}'); continue
                rows[s] = r
            out[p] = rows
    want = set(range(seeds[0], seeds[1] + 1))
    for p in profiles:
        if p not in out:
            errs.append(f'{side}: profile {p} missing'); continue
        got = set(out[p])
        if got - want:
            errs.append(f'{side} {p}: unexpected seeds {sorted(got - want)[:10]}')
        if want - got:
            errs.append(f'{side} {p}: missing seeds {sorted(want - got)[:10]} ({len(want - got)} total)')
    for p in out:
        if p not in profiles:
            errs.append(f'{side}: unexpected profile {p}')
    return out, errs, meta


def run_of_record(profiles, seeds, auth):
    return tuple(profiles) == tuple(auth['profiles']) and list(seeds) == list(auth['seeds'])


def reach_map(row):
    """reach dict {int L: Decimal t}; raises ValueError on malformed key/value."""
    r = {}
    for k, v in (row.get('reach') or {}).items():
        L = int(k) if str(k).lstrip('-').isdigit() else None
        if L is None:
            raise ValueError(f'bad reach key {k!r}')
        r[L] = dec(v)
    return r
