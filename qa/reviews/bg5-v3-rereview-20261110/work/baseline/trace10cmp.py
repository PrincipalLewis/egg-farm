#!/usr/bin/env python3
"""trace10cmp.py — PROVISIONAL scratch COMPARATOR for Card #4 PL-AC5(iii) (L936-938): per (profile, seed), the event/state/buy/RNG
trace of the AFTER run must equal the BEFORE run up to and INCLUDING the reach(10) tick.

*** The trace PRODUCER (harness instrumentation emitting these JSONL records) is NOT IMPLEMENTED. This comparator has only been
exercised on SYNTHETIC traces. It cannot measure PL-AC5(iii) until a QA-reviewed producer exists; until then (iii) is "not measured" = FAIL. ***

Cut rule (PROVISIONAL, awaiting QA agreement): reach10 tick = tick index `i` of the first BEFORE event whose post-event Farm level F >= 10.
Compared: every event with i <= that tick (INCLUSIVE: later events in the same tick are compared too), in order, on both sides.
Streams per event, reported in this priority on first divergence: tick (i, t) -> buy (type=='buy': data) / event (type, data, F)
-> state -> rng. Extra or missing events before/at the cut are divergences. Event exclusions: NONE.
Input schema (JSONL, one object per line):
  {"rec":"manifest","profile","seed","producer","csv_sha256","cfg","K_on","runtime_streakCap","balance_tc":{...}}  (exactly one per profile+seed)
  {"rec":"ev","profile","seed","i":int,"t":num,"type":str,"F":int,"data":{},"state":{},"rng":{}}
Manifest rules: cfg none and K_on false on both sides (flags-off); runtime_streakCap equal on both sides (pl.ts hardcodes 0.28, inert with
K_on false — it is NOT the CSV tc_streak_cap); balance_tc may differ ONLY in authority trace10.allowed_balance_diff_keys
(tc.streak_cap per D-HOP-11-05-15 (1); tc.combo_* per the approved rename). Non-synthetic mode rejects producer names starting SYNTHETIC.
Usage: trace10cmp.py --before b.jsonl --after a.jsonl [--seeds 1 200] [--synthetic] [--out r.json]"""
import argparse, json, math, sys
import gatecommon as G

PRODUCER_STATUS = 'NOT IMPLEMENTED (comparator tested on synthetic traces only; no harness instrumentation exists)'
CUT_RULE = 'INCLUSIVE reach10 tick: all events with i <= first BEFORE event tick where F >= 10 (PROVISIONAL, awaiting QA agreement)'


def _finite(x, path, errs):
    if isinstance(x, float) and not math.isfinite(x):
        errs.append(f'non-finite at {path}')
    elif isinstance(x, dict):
        for k, v in x.items():
            _finite(v, f'{path}.{k}', errs)
    elif isinstance(x, list):
        for k, v in enumerate(x):
            _finite(v, f'{path}[{k}]', errs)


def load(path, side, profiles, seeds):
    man, ev, errs = {}, {}, []
    with open(path) as f:
        for n, line in enumerate(f, 1):
            if not line.strip():
                continue
            try:
                o = G.loads_strict(line)
            except ValueError as e:
                errs.append(f'{side} line {n}: malformed/non-finite JSON: {e}'); continue
            if not isinstance(o, dict):
                errs.append(f'{side} line {n}: not an object'); continue
            _finite(o, f'{side} line {n}', errs)
            key = (o.get('profile'), o.get('seed'))
            if o.get('rec') == 'manifest':
                if key in man:
                    errs.append(f'{side}: duplicate manifest for {key}')
                man[key] = o
            elif o.get('rec') == 'ev':
                miss = [k for k in ('i', 't', 'type', 'F', 'data', 'state', 'rng') if k not in o]
                if miss or not isinstance(o.get('i'), int) or not isinstance(o.get('F'), int) or isinstance(o.get('t'), bool) or not isinstance(o.get('t'), (int, float)):
                    errs.append(f'{side} line {n}: malformed event (missing {miss} or bad i/F/t types)'); continue
                lst = ev.setdefault(key, [])
                if lst and o['i'] < lst[-1]['i']:
                    errs.append(f'{side} {key}: tick decreases at line {n} ({lst[-1]["i"]} -> {o["i"]})')
                lst.append(o)
            else:
                errs.append(f'{side} line {n}: unknown rec {o.get("rec")!r}')
    want = {(p, s) for p in profiles for s in range(seeds[0], seeds[1] + 1)}
    for k in sorted(want - set(man), key=str):
        errs.append(f'{side}: missing manifest for {k}')
    for k in sorted(set(man) - want, key=str):
        errs.append(f'{side}: unexpected identity {k}')
    for k in sorted(set(ev) - set(man), key=str):
        errs.append(f'{side}: events without manifest for {k}')
    return man, ev, errs


def _stream(b, a):
    if b['i'] != a['i'] or b['t'] != a['t']:
        return 'tick'
    if b['type'] != a['type'] or b['F'] != a['F'] or b['data'] != a['data']:
        return 'buy' if 'buy' in (b['type'], a['type']) else 'event'
    if b['state'] != a['state']:
        return 'state'
    if b['rng'] != a['rng']:
        return 'rng'
    return None


def compare(before, after, profiles=None, seeds=None, synthetic=False, authority_path=None):
    A = G.authority(authority_path)
    profiles = tuple(profiles or A['profiles']); seeds = tuple(seeds or A['seeds'])
    bm, be, errs = load(before, 'before', profiles, seeds)
    am, ae, e2 = load(after, 'after', profiles, seeds); errs += e2
    allowed = set(A['trace10']['allowed_balance_diff_keys'])
    bal_diffs, firsts, seedfail, matched = set(), [], [], 0
    for key in sorted(set(bm) & set(am), key=str):
        mb, ma = bm[key], am[key]
        for side, m in (('before', mb), ('after', ma)):
            if m.get('cfg') != 'none' or m.get('K_on') is not False:
                errs.append(f'{side} {key}: manifest not flags-off (cfg={m.get("cfg")!r}, K_on={m.get("K_on")!r})')
            if not synthetic and str(m.get('producer', '')).upper().startswith('SYNTHETIC'):
                errs.append(f'{side} {key}: synthetic producer not accepted outside --synthetic')
            if not m.get('producer'):
                errs.append(f'{side} {key}: producer not identified')
        if mb.get('runtime_streakCap') != ma.get('runtime_streakCap'):
            errs.append(f'{key}: runtime stack streakCap differs ({mb.get("runtime_streakCap")} vs {ma.get("runtime_streakCap")})')
        tb, ta = mb.get('balance_tc') or {}, ma.get('balance_tc') or {}
        for k in set(tb) | set(ta):
            if tb.get(k) != ta.get(k):
                (bal_diffs.add(k) if k in allowed else errs.append(f'{key}: balance key {k} differs ({tb.get(k)!r} vs {ta.get(k)!r}) — not an allowed difference'))
        evb, eva = be.get(key, []), ae.get(key, [])
        cut = next((e['i'] for e in evb if e['F'] >= 10), None)
        if cut is None:
            seedfail.append({'profile': key[0], 'seed': key[1], 'reason': 'no_reach10'}); continue
        pb = [e for e in evb if e['i'] <= cut]; pa = [e for e in eva if e['i'] <= cut]
        div = None
        for k in range(max(len(pb), len(pa))):
            x = pb[k] if k < len(pb) else None; y = pa[k] if k < len(pa) else None
            s = 'missing_event' if (x is None or y is None) else _stream(x, y)
            if s:
                ref = x or y
                div = {'profile': key[0], 'seed': key[1], 'index': k, 'tick': ref['i'], 't': ref['t'], 'F': ref['F'], 'stream': s,
                       'before': x, 'after': y}
                break
        if div:
            firsts.append(div); seedfail.append({'profile': key[0], 'seed': key[1], 'reason': 'divergence', 'tick': div['tick']})
        else:
            matched += 1
    bad = bool(errs or seedfail)
    C = {'PL-AC5iii-comparator': {'verdict': 'FAIL' if bad else 'PASS',
                                 'detail': {'matched_seed_runs': matched, 'failed_seed_runs': len(seedfail), 'input_errors': len(errs)}}}
    rep = G.envelope('trace10cmp.py', synthetic, producer_status=PRODUCER_STATUS, cut_rule=CUT_RULE, profiles=list(profiles), seeds=list(seeds),
                     run_of_record=G.run_of_record(profiles, seeds, A), before=before, after=after,
                     before_sha256=G.sha256(before), after_sha256=G.sha256(after), input_errors=errs[:100],
                     balance_diffs_allowed=sorted(bal_diffs), first_divergences=firsts[:100], seed_failures=seedfail[:200], checks=C,
                     note='PASS here means only that two supplied trace files agree; it is not PL-AC5(iii) evidence without a QA-certified producer')
    rep['overall'] = G.overall(C)
    return rep


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--before', required=True); ap.add_argument('--after', required=True)
    ap.add_argument('--seeds', nargs=2, type=int); ap.add_argument('--synthetic', action='store_true'); ap.add_argument('--out')
    a = ap.parse_args(argv)
    rep = compare(a.before, a.after, seeds=a.seeds, synthetic=a.synthetic)
    s = json.dumps(rep, indent=1, default=str)
    open(a.out, 'w').write(s + '\n') if a.out else print(s)
    print(f'trace10cmp overall={rep["overall"]} producer={PRODUCER_STATUS} (PROVISIONAL, ac_claim NONE)', file=sys.stderr)
    return 0 if rep['overall'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
