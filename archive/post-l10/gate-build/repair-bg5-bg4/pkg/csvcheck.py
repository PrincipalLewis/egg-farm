#!/usr/bin/env python3
"""csvcheck.py — PROVISIONAL scratch check of a candidate economy CSV against a8c4e268 (Card #4 PL-AC5(i)/(i-b), PL-AC6(a)-(d),
E-G9, D-HOP-2026-11-05-15 W4 baseline + sole tc_streak_cap exception, D-HOE-20261030-30/31 combo rename). Stdlib only.
NOT a QA-pinned validator; ac_claim is always NONE. Fail-closed: any check that is not PASS makes overall NOT-PASS.
Usage: csvcheck.py --before A.csv --after B.csv --breeds {0,1} [--rename-map M.json] [--bc-listing L.json]
                   [--allow-families F.json] [--b4-ref REF] [--synthetic] [--out report.json]
Exit: 0 overall PASS, 1 NOT-PASS, 2 usage/input error.
BG2 repair (repair-bg12): with --breeds 1 the 0.27 cap exception is ALWAYS CONDITIONAL-UNMET (overall NOT-PASS) because this tool
cannot independently verify the ACTUAL final combined B4 re-run (D-HOP-2026-10-29-08 addendum; D-HOP-2026-11-05-15 (1)).
--b4-ref is recorded only as documentary metadata inside the CAP check; it is never evidence and never changes any verdict.
BG5/BG5b repair (repair-bg5-bg4, evidence-contract.md EC-4 + D-HOP-2026-11-09-05): bc_ listing approval_ref/b4_run_ref and
--allow-families `authority` PASS only when independently VERIFIED: (i) cite an entry ID in decisions files; (ii) owning authority
(D-HOP for bc_/FAM, QA-D for B4); (iii) entry contains full 64-hex sha256 of the artifact and on-disk file matches. Otherwise
CONDITIONAL-UNMET (structural errors still FAIL). Synthetic tests pass TEMP decisions files via decisions_paths; never write real decisions.md.
v3 (QA-D-1110-BG54CERT D-1/D-2/D-3 + D-HOP-2026-11-10-06): authority = the FILE an ID is defined in (D-HOP product/decisions.md,
QA-D qa/decisions.md, D-CEO root decisions.md, D-HOE engineering/decisions.md, D-PMW product/workers/decisions.md); an entry is
the exact leading token of a `## ` heading outside ``` / ~~~ fences; duplicate definitions never verify; B4 manifest needs
non-empty integer seeds and a harness sha matching the harness file on disk; synthetic mode reads no live decisions file.
v3.1 (D-HOP-2026-11-10-10, amends -06): (1) every ref that is not VERIFIED makes P5IB / FAM **FAIL** (CONDITIONAL-UNMET is
kept only for the non-ref breeds=1 CAP item). (2) Authority by EXACT path relative to the studio root (--decisions-root,
default /workspace/egg-farm-studio; synthetic default none): D-CEO decisions.md; D-HOE engineering/decisions.md; QA-D
qa/decisions.md; D-HOP/D-PMW/D-COL/D-ECON/D-PMFU/D-PMM product/decisions.md; any other prefix FAILS; no other path is ever
read. (3) R-1 harness: with a pin (--harness-pin / R1_HARNESS_PIN) the manifest harness sha must equal it -> PINNED; without
a pin the manifest-named file is still checked and P5IB reads UNPINNED, which is never PASS."""
REF_UNVERIFIED = 'NOT VERIFIED: reference failed D-HOP-2026-11-09-05 checks (entry/authority/artifact sha256)'
REF_VERIFIED = 'VERIFIED: entry ID + owning authority + artifact sha256 match on disk (D-HOP-2026-11-09-05)'
REF_UNPINNED = 'UNPINNED: refs verified but no R-1 harness-of-record pin exists (D-HOP-2026-11-10-03/-10 (3)); never PASS'
import argparse, csv, io, json, os, re, sys
from decimal import Decimal
import gatecommon as G

_HEX64 = re.compile(r'\b[a-f0-9]{64}\b')
# ref-side IDs: exact tokens, not glued to other ID characters (QA-D-1110-BG54CERT D-1; D-HOP-2026-11-10-06)
_DHOP = re.compile(r'(?<![A-Za-z0-9_-])D-HOP-\d{4}-\d{2}-\d{2}-\d+(?![A-Za-z0-9_-])')
_QAD = re.compile(r'(?<![A-Za-z0-9_-])QA-D-[A-Z0-9]+(?:-[A-Z0-9]+)*(?![A-Za-z0-9_-])')
_PATH = re.compile(r'path=(\S+)')
# heading-side: the ENTIRE leading token of a level-2 `## ` heading must be the ID
_ENTRY_ID = re.compile(r'(?:QA-D|D-[A-Z]+)-[A-Z0-9]+(?:-[A-Z0-9]+)*')  # any prefix is parsed; unknown prefixes FAIL in resolve_entry
_H2 = re.compile(r'##[ \t]+(\S+)')
_ENTRY_END = re.compile(r'#{1,2}(?:[ \t]|$)')
_FENCE_OPEN = re.compile(r' {0,3}(`{3,}|~{3,})')
# D-HOP-2026-11-10-10 (2) (amends -06): authority = the EXACT file (relative to the studio root) an ID is defined in
_PRODUCT_PREFIXES = ('D-HOP', 'D-PMW', 'D-COL', 'D-ECON', 'D-PMFU', 'D-PMM')
_AUTHORITY_FILE = dict({p: 'product/decisions.md' for p in _PRODUCT_PREFIXES},
                       **{'D-CEO': 'decisions.md', 'D-HOE': 'engineering/decisions.md', 'QA-D': 'qa/decisions.md'})
_DEFAULT_DECISIONS_ROOT = '/workspace/egg-farm-studio'
# D-HOP-2026-11-10-10 (3): R-1 harness-of-record sha (D-HOP-2026-11-10-03). None until HoP pins it.
R1_HARNESS_PIN = None


def _id_prefix(eid):
    return 'QA-D' if eid.startswith('QA-D-') else '-'.join(eid.split('-')[:2])


def _entries_in_text(text):
    """Yield (entry_id, body) for each `## <ID>` heading outside code fences whose leading token IS a known ID.
    Body runs to the next level-1/2 heading outside fences (### subheadings stay in the body)."""
    fence = None  # (char, length) while inside a fenced block
    cur = None    # [id, body_lines]
    for line in text.splitlines():
        if fence is not None:
            m = re.match(r' {0,3}(`{3,}|~{3,})[ \t]*$', line)
            if m and m.group(1)[0] == fence[0] and len(m.group(1)) >= fence[1]:
                fence = None
            if cur is not None:
                cur[1].append(line)
            continue
        fm = _FENCE_OPEN.match(line)
        if fm and not (fm.group(1)[0] == '`' and '`' in line[fm.end():]):
            fence = (fm.group(1)[0], len(fm.group(1)))
            if cur is not None:
                cur[1].append(line)
            continue
        if _ENTRY_END.match(line):
            if cur is not None:
                yield cur[0], '\n'.join(cur[1])
                cur = None
            hm = _H2.match(line)
            if hm and _ENTRY_ID.fullmatch(hm.group(1)):
                cur = [hm.group(1), []]
            continue
        if cur is not None:
            cur[1].append(line)
    if cur is not None:
        yield cur[0], '\n'.join(cur[1])


def _read_entries(decisions_root):
    """-> {id: [(relpath, body), ...]} over the exact authority files under decisions_root (every definition kept)."""
    out = {}
    if not decisions_root:
        return out
    for rel in sorted(set(_AUTHORITY_FILE.values())):
        path = os.path.join(decisions_root, *rel.split('/'))
        if not os.path.isfile(path):
            continue
        text = open(path, encoding='utf-8', errors='replace').read()
        for eid, body in _entries_in_text(text):
            out.setdefault(eid, []).append((rel, body))
    return out


def resolve_entry(eid, decisions_root):
    """-> (ok, relpath, body, reason). ok only if the prefix is in the authority table and the ID is the leading token of
    exactly ONE `##` heading (outside fences) across the authority files, and that file is the prefix's own file."""
    if not decisions_root:
        return False, None, None, 'no decisions root (synthetic mode reads no live decisions file)'
    pre = _id_prefix(eid)
    want = _AUTHORITY_FILE.get(pre)
    if want is None:
        return False, None, None, f'unknown prefix {pre} (not in the D-HOP-2026-11-10-10 authority table)'
    defs = _read_entries(decisions_root).get(eid, [])
    if not defs:
        return False, None, None, f'entry {eid} not defined as a ## heading in any authority file'
    if len(defs) > 1:
        return False, None, None, f'entry {eid} defined by {len(defs)} headings (duplicate)'
    rel, body = defs[0]
    if rel != want:
        return False, rel, None, f'entry {eid} defined in {rel}; {pre} authority file is {want}'
    return True, rel, body, 'ok'


def _artifact_sha(path):
    if not path or not os.path.isfile(path):
        return None
    return G.sha256(path)


def _b4_manifest_ok(path, candidate_sha, harness_pin=None):
    """B4 artifact: JSON run manifest listing csv sha256, non-empty seeds, config, harness sha + harness path; csv sha ==
    candidate; harness file on disk hashes to the listed harness sha (QA-D-1110-BG54CERT D-2).
    -> (status, reason, harness_status): status VERIFIED | UNPINNED | FAIL; harness_status PINNED | UNPINNED | None."""
    if not path or not os.path.isfile(path):
        return 'FAIL', 'b4 manifest missing', None
    try:
        m = json.load(open(path))
    except Exception as e:
        return 'FAIL', f'b4 manifest not JSON: {e}', None
    if not isinstance(m, dict):
        return 'FAIL', 'b4 manifest not an object', None

    def _get(*keys):
        for k in keys:
            if k in m and m[k] not in (None, ''):
                return m[k]
        return None

    csv_sha = _get('csv_sha256', 'csvSha256', 'sha256_csv', 'candidate_sha256')
    if csv_sha is None and isinstance(m.get('csv'), dict):
        csv_sha = m['csv'].get('sha256')
    seeds = _get('seeds')
    config = _get('config', 'cfg')
    harness = _get('harness_sha', 'harnessSha', 'harness_sha256')
    hpath = _get('harness_path', 'harnessPath')
    if isinstance(m.get('harness'), dict):
        harness = harness if harness is not None else m['harness'].get('sha256')
        hpath = hpath if hpath is not None else m['harness'].get('path')
    missing = [n for n, v in (('csv_sha256', csv_sha), ('seeds', seeds), ('config', config), ('harness_sha', harness),
                              ('harness_path', hpath)) if v in (None, '')]
    if missing:
        return 'FAIL', f'b4 manifest missing fields: {missing}', None
    if not (isinstance(csv_sha, str) and _HEX64.fullmatch(csv_sha)):
        return 'FAIL', 'b4 manifest csv_sha256 not 64-hex', None
    if csv_sha != candidate_sha:
        return 'FAIL', 'b4 manifest csv_sha256 != candidate', None
    if not (isinstance(seeds, list) and seeds and all(isinstance(x, int) and not isinstance(x, bool) for x in seeds)):
        return 'FAIL', 'b4 manifest seeds must be a non-empty list of integers', None
    if not (isinstance(harness, str) and _HEX64.fullmatch(harness)):
        return 'FAIL', 'b4 manifest harness_sha not 64-hex', None
    if not isinstance(hpath, str):
        return 'FAIL', 'b4 manifest harness_path not a string', None
    hp = hpath if os.path.isabs(hpath) else os.path.join(os.path.dirname(os.path.abspath(path)), hpath)
    hs = _artifact_sha(hp)
    if hs is None:
        return 'FAIL', f'b4 harness file missing: {hpath!r}', None
    if hs != harness:
        return 'FAIL', 'b4 manifest harness_sha != sha256 of harness file on disk', None
    if harness_pin is None:
        return 'UNPINNED', 'harness UNPINNED: manifest-named file matches, no R-1 pin to check against', 'UNPINNED'
    if harness != harness_pin:
        return 'FAIL', 'b4 manifest harness_sha != R-1 harness-of-record pin', None
    return 'VERIFIED', 'ok', 'PINNED'


def _verify(ref, *, kind, artifact_path, decisions_root, candidate_sha, harness_pin=None):
    """-> (status, reason, harness_status). status: VERIFIED | UNPINNED (b4_run only) | FAIL.
    kind: 'bc_approval' | 'fam_authority' (D-HOP) | 'b4_run' (QA-D, manifest via path=)."""
    if not (isinstance(ref, str) and ref.strip()):
        return 'FAIL', 'empty ref', None
    if kind in ('bc_approval', 'fam_authority'):
        ids_src, rx, want_prefix = ref, _DHOP, 'D-HOP'
    elif kind == 'b4_run':
        m = _PATH.search(ref)
        artifact_path = m.group(1) if m else None
        ids_src, rx, want_prefix = _PATH.sub(' ', ref), _QAD, 'QA-D'
    else:
        return 'FAIL', f'unknown kind {kind}', None
    ids = sorted(set(rx.findall(ids_src)))
    if not ids:
        return 'FAIL', f'no {want_prefix}- entry ID cited', None
    if len(ids) > 1:
        return 'FAIL', f'ambiguous ref: cites {len(ids)} distinct {want_prefix}- IDs', None
    eid = ids[0]
    if _id_prefix(eid) != want_prefix:
        return 'FAIL', f'{eid} is not a {want_prefix} entry', None
    ok, rel, body, why = resolve_entry(eid, decisions_root)
    if not ok:
        return 'FAIL', why, None
    if kind == 'b4_run' and artifact_path is None:
        return 'FAIL', 'b4_run_ref has no path= to the run manifest', None
    art_sha = _artifact_sha(artifact_path)
    if art_sha is None:
        return 'FAIL', f'artifact missing: {artifact_path!r}', None
    if art_sha not in _HEX64.findall(body):
        return 'FAIL', f'entry {eid} does not contain artifact sha256', None
    if kind == 'b4_run':
        st, why, hst = _b4_manifest_ok(artifact_path, candidate_sha, harness_pin)
        return st, (f'{eid} ok; {why}' if st != 'FAIL' else why), hst
    if art_sha != candidate_sha:
        return 'FAIL', 'artifact sha != candidate csv sha', None
    return 'VERIFIED', f'{eid} ok', None


def verify_ref(ref, *, kind, artifact_path, candidate_sha, decisions_root=None, harness_pin=None, decisions_paths=None):
    """Return (verified: bool, reason: str). verified only for status VERIFIED (UNPINNED is not verified).
    decisions_paths (v2/v3 file-list API) is no longer accepted: any value FAILS (D-HOP-2026-11-10-10 (2), exact paths)."""
    if decisions_paths is not None:
        return False, 'decisions_paths file list is not an exact-path layout (D-HOP-2026-11-10-10 (2)); use decisions_root'
    st, why, _ = _verify(ref, kind=kind, artifact_path=artifact_path, decisions_root=decisions_root,
                         candidate_sha=candidate_sha, harness_pin=harness_pin)
    return st == 'VERIFIED', why


def parse(path):
    """Return (header, rows[list[dict]], errors[]) with strict structural checks."""
    errs = []
    raw = open(path, 'rb').read()
    if raw.startswith(b'\xef\xbb\xbf'):
        errs.append('BOM present')
    if b'\r' in raw:
        errs.append('CR line ending present')
    if not raw.endswith(b'\n'):
        errs.append('no trailing LF')
    try:
        text = raw.decode('utf-8')
    except UnicodeDecodeError as e:
        return [], [], errs + [f'not UTF-8: {e}']
    lines = list(csv.reader(io.StringIO(text.replace('\r', ''))))
    if not lines:
        return [], [], errs + ['empty file']
    header = lines[0]
    if len(set(header)) != len(header):
        errs.append('duplicate header names: ' + ','.join(sorted({h for h in header if header.count(h) > 1})))
    rows = []
    for n, r in enumerate(lines[1:], start=2):
        if r == []:
            errs.append(f'blank line {n}'); continue
        if len(r) != len(header):
            errs.append(f'line {n}: {len(r)} cells != {len(header)} header cells'); continue
        rows.append(dict(zip(header, r)))
    lv = []
    for r in rows:
        try:
            lv.append(int(r.get('level', 'x')))
        except ValueError:
            errs.append(f'bad level {r.get("level")!r}')
    if lv and lv != list(range(len(lv))):
        errs.append(f'levels not consecutive from 0: {lv[:5]}...')
    if lv and max(lv) < 30:
        errs.append(f'max level {max(lv)} < 30')
    return header, rows, errs


def _load(p):
    return None if p is None else (json.load(open(p)) if isinstance(p, str) else p)


def _allow(path, auth, rename_targets):
    a = _load(path)
    if a is None:
        return []
    fams = a.get('families')
    if not isinstance(fams, list):
        raise ValueError('allow-families: "families" list required')
    w4 = set(auth['w4_baseline']['columns'])
    for f in fams:
        col, rg, ref = f.get('column'), f.get('rows'), f.get('authority')
        if not (isinstance(ref, str) and ref.strip()):
            raise ValueError(f'allow-families {col}: non-empty "authority" reference required')
        if not (isinstance(rg, list) and len(rg) == 2 and all(isinstance(x, int) for x in rg) and 11 <= rg[0] <= rg[1] <= 30):
            raise ValueError(f'allow-families {col}: rows must be [a,b] with 11<=a<=b<=30 (rows 0-10 are never openable)')
        if col in w4 or col == auth['streak_cap']['column'] or col.startswith(auth['bc']['prefix']) or col in rename_targets:
            raise ValueError(f'allow-families: {col} is governed by its own rule and cannot be opened by an allowlist')
        if col == 'farm_cost' and rg[1] >= 30:
            raise ValueError('allow-families: farm_cost row 30 is anchored (PL-AC6(a))')
    return fams


def chk(verdict, **detail):
    return {'verdict': verdict, 'detail': detail}


def check(before, after, breeds, rename_map=None, bc_listing=None, allow_families=None, b4_ref=None, synthetic=False, authority_path=None, decisions_paths=None,
          decisions_root=None, harness_pin=None):
    if breeds not in (0, 1):
        raise ValueError('--breeds must be given explicitly as 0 or 1 (no default: the cap rule depends on it)')
    A = G.authority(authority_path)
    approved = A['rename_map']['approved']
    fams = _allow(allow_families, A, set(approved.values()))
    # D-3: synthetic (self-test) mode never reads the live decisions files; real mode uses the studio root.
    # D-HOP-2026-11-10-10 (2): the legacy decisions_paths file list is not an exact-path layout -> every ref FAILS.
    legacy_paths = decisions_paths is not None
    if decisions_root is None and not synthetic:
        decisions_root = _DEFAULT_DECISIONS_ROOT
    hpin = harness_pin if harness_pin is not None else R1_HARNESS_PIN
    if hpin is not None and not (isinstance(hpin, str) and _HEX64.fullmatch(hpin)):
        raise ValueError('--harness-pin must be a full lowercase 64-hex sha256')

    def vref(ref, kind, artifact_path):
        if legacy_paths:
            return 'FAIL', 'decisions_paths file list is not an exact-path layout (D-HOP-2026-11-10-10 (2)); use decisions_root', None
        return _verify(ref, kind=kind, artifact_path=artifact_path, decisions_root=decisions_root, candidate_sha=asha,
                       harness_pin=hpin)
    C = {}
    bsha = G.sha256(before)
    asha = G.sha256(after)
    if bsha == A['before_csv']['sha256']:
        C['BEFORE_PIN'] = chk('PASS', sha256=bsha)
    elif synthetic:
        C['BEFORE_PIN'] = chk('PASS', sha256=bsha, note='SYNTHETIC: before is not a8c4e268; pin not enforced (self-test only)')
    else:
        C['BEFORE_PIN'] = chk('FAIL', sha256=bsha, expected=A['before_csv']['sha256'])
    bh, br, be = parse(before)
    ah, ar, ae = parse(after)
    if be:
        C['BEFORE_STRUCT'] = chk('FAIL', errors=be)
    # ---- rename map ----
    m = _load(rename_map)
    ren, rerr = {}, []
    added = [h for h in ah if h not in bh]
    removed = [h for h in bh if h not in ah]
    if m is not None:
        ents = m.get('renames')
        if not isinstance(ents, list):
            rerr.append('rename map: "renames" list required'); ents = []
        pairs = {(e.get('old'), e.get('new')) for e in ents}
        if ents and pairs != set(approved.items()):
            rerr.append(f'rename map must be empty or exactly the approved set {sorted(approved.items())}; got {sorted(pairs, key=str)}')
        if ents and m.get('hoe_confirmation_ref') != A['rename_map']['hoe_confirmation_ref']:
            rerr.append(f'hoe_confirmation_ref must be {A["rename_map"]["hoe_confirmation_ref"]!r}')
        for e in ents:
            o, n = e.get('old'), e.get('new')
            if approved.get(o) != n:
                continue
            sem = A['rename_map']['semantics'][n]
            for k, v in sem.items():
                if e.get(k) != v:
                    rerr.append(f'{o}->{n}: semantics field {k!r} = {e.get(k)!r}, approved {v!r}')
            if o in ah:
                rerr.append(f'{o}: stale old key still present alongside {n}')
            if n not in ah:
                rerr.append(f'{n}: new key absent from after header')
            elif o in bh and ah.index(n) != bh.index(o):
                rerr.append(f'{n}: position {ah.index(n)} != old position {bh.index(o)} (D-HOE-31 same positions)')
            elif o in bh:
                diff = [r['level'] for r0, r in zip(br, ar) for r in [r] if r0.get(o) != r.get(n)]
                if diff:
                    rerr.append(f'{o}->{n}: values differ on rows {diff[:10]}')
                else:
                    ren[o] = n
    for o in removed:
        if o not in ren and not (m and any(e.get('old') == o for e in m.get('renames', []) if isinstance(e, dict))):
            rerr.append(f'pre-existing column {o} removed without a rename map entry')
    for o, n in approved.items():
        if n in ah and o in ah:
            rerr.append(f'{o} and {n} both present (duplicate alias; D-HOE-30 "no other alias")')
        if n in ah and (m is None or not m.get('renames')):
            rerr.append(f'{n} present but no rename map lists {o}->{n}')
    C['RENAME'] = chk('FAIL' if rerr else 'PASS', errors=rerr, applied=ren,
                      note='no renames and no/empty map: OK (D-HOP-37 B)' if not rerr and not ren else '')
    # ---- structural (after) ----
    newcols = [h for h in ah if h not in bh and h not in ren.values()]
    serr = list(ae)
    for r in ar:
        for h in ah:
            v = r[h]
            if v == '' and h in newcols:
                continue
            try:
                G.dec(v)
            except ValueError:
                serr.append(f'L{r.get("level")} {h}: {v!r} not a finite number')
    C['STRUCT'] = chk('FAIL' if serr else 'PASS', errors=serr[:50], n_errors=len(serr))
    lv = [int(r['level']) for r in ar if str(r.get('level', '')).isdigit()]
    C['P6D'] = chk('PASS' if lv and max(lv) == 30 else 'FAIL', max_level=max(lv) if lv else None)
    if ae and any('cells !=' in e for e in ae):
        for k in ('P5I', 'P5IB', 'NEWCOL', 'CAP', 'W4', 'FAM', 'P6A', 'P6B', 'EG9'):
            C[k] = chk('UNASSESSED', reason='after CSV not parseable row-wise')
        C['P6C'] = chk('REPORT', steps={})
        return _finish(C, A, synthetic, before, after, breeds, b4_ref)
    B = {int(r['level']): r for r in br}
    Af = {int(r['level']): r for r in ar if str(r.get('level', '')).isdigit()}
    col = lambda c: ren.get(c, c)
    cap_c = A['streak_cap']['column']
    cap_req = A['streak_cap']['breeds_1']['value']
    # ---- PL-AC5(i) ----
    fails, amb = [], []
    for c in bh:
        if col(c) not in ah:
            fails.append(f'column {c} missing (no valid rename)'); continue
        for L in range(0, 11):
            if L not in Af or L not in B:
                fails.append(f'row {L} missing'); continue
            bv, av = B[L][c], Af[L][col(c)]
            if c == cap_c and breeds == 1:
                if av == cap_req:
                    continue
                try:
                    if G.dec(av) == G.dec(cap_req):
                        amb.append(f'L{L} {c}: {av!r} numerically equals {cap_req!r} but is not string-identical'); continue
                except ValueError:
                    pass
                fails.append(f'L{L} {c}: {av!r} != exception value {cap_req!r} (breeds=1)')
            elif bv != av:
                fails.append(f'L{L} {c}: {bv!r} -> {av!r}')
    C['P5I'] = chk('FAIL' if fails else 'AMBIGUOUS' if amb else 'PASS', fails=fails[:50], n_fails=len(fails), ambiguous=amb[:20],
                   exception=f'{cap_c}={cap_req} on rows 0-10 only if breeds=1 (D-HOP-2026-11-05-15 (1)); breeds={breeds}')
    # ---- tc_streak_cap global ----
    cf, ca = [], []
    for L, r in sorted(Af.items()):
        av = r.get(cap_c)
        want = cap_req if breeds == 1 else B.get(L, {}).get(cap_c)
        if av == want:
            continue
        try:
            if want is not None and G.dec(av) == G.dec(want):
                ca.append(L); continue
        except ValueError:
            pass
        cf.append(f'L{L}: {av!r} != {want!r}')
    if cf:
        cv = 'FAIL'
    elif ca:
        cv = 'AMBIGUOUS'
    elif breeds == 1:
        cv = 'CONDITIONAL-UNMET'  # BG2: unconditional for breeds=1; no metadata path to PASS
    else:
        cv = 'PASS'
    C['CAP'] = chk(cv, fails=cf[:20], ambiguous_rows=ca, breeds=breeds, b4_ref_documentary=b4_ref,
                   b4_evidence='NOT VERIFIED: --b4-ref is documentary metadata, not B4 evidence; this tool has no B4 evidence ingestion',
                   rule=('breeds=1: 0.27 on all rows (rows 0-10 via D-HOP-11-05-15 (1); rows 11-30 via D-HOP-27/29-08, PROVISIONAL), conditional on the ACTUAL final combined B4 re-run, which this tool cannot verify -> always CONDITIONAL-UNMET'
                         if breeds == 1 else 'breeds=0: literal a8c4 value (0.28) on all rows (D-HOP-29-08 addendum)'))
    # ---- new columns ----
    bc = [h for h in newcols if h.startswith(A['bc']['prefix'])]
    other = [h for h in newcols if h not in bc]
    nf = [f'{h} L{L}={Af[L][h]!r}' for h in other for L in range(0, 11) if L in Af and Af[L][h] != '']
    C['NEWCOL'] = chk('FAIL' if nf else 'PASS', new_non_bc=other, fails=nf[:20])
    lst = _load(bc_listing)
    be2 = []
    if bc:
        if lst is None:
            be2.append('bc_* columns present but no per-column listing (PL-AC5(i-b))')
        else:
            cols = lst.get('columns') or {}
            for h in bc:
                e = cols.get(h)
                vals = {Af[L][h] for L in range(0, 11) if L in Af}
                if e is None:
                    be2.append(f'{h}: unlisted'); continue
                for k in ('approval_ref', 'b4_run_ref'):
                    if not (isinstance(e.get(k), str) and e[k].strip()):
                        be2.append(f'{h}: missing {k}')
                if len(vals) != 1:
                    be2.append(f'{h}: not a single constant on rows 0-10: {sorted(vals)}')
                elif vals != {e.get('value')}:
                    be2.append(f'{h}: rows 0-10 value {vals.pop()!r} != listed {e.get("value")!r}')
            for h in cols:
                if h not in bc:
                    be2.append(f'{h}: listed but not in CSV')
    docs = {h: {k: (lst.get('columns') or {}).get(h, {}).get(k) for k in ('approval_ref', 'b4_run_ref')} for h in bc} if (bc and lst) else {}
    p5_reasons = []
    p5_status = []    # per-ref status: VERIFIED | UNPINNED | FAIL
    p5_harness = []
    if bc and not be2 and lst:
        for h in bc:
            e = (lst.get('columns') or {}).get(h) or {}
            st_a, why_a, _ = vref(e.get('approval_ref'), 'bc_approval', after)
            st_b, why_b, hst = vref(e.get('b4_run_ref'), 'b4_run', None)
            p5_reasons.append(f'{h}: approval_ref={why_a}; b4_run_ref={why_b}')
            p5_status += [st_a, st_b]
            p5_harness.append(hst)
    elif bc:
        p5_status.append('FAIL')
    p5_verified = bool(p5_status) and all(x == 'VERIFIED' for x in p5_status)
    p5_unpinned = bool(p5_status) and 'FAIL' not in p5_status and 'UNPINNED' in p5_status
    p5_hstat = 'UNPINNED' if 'UNPINNED' in p5_harness else ('PINNED' if p5_harness and all(x == 'PINNED' for x in p5_harness) else None)
    if be2:
        p5_verdict = 'FAIL'
        p5_refv = REF_UNVERIFIED
    elif not bc:
        p5_verdict = 'PASS'
        p5_refv = 'n/a (no bc_ columns)'
    elif p5_verified:
        p5_verdict = 'PASS'
        p5_refv = REF_VERIFIED
    elif p5_unpinned:
        p5_verdict = 'UNPINNED'
        p5_refv = REF_UNPINNED
    else:
        p5_verdict = 'FAIL'
        p5_refv = REF_UNVERIFIED + (('; ' + ' | '.join(p5_reasons)) if p5_reasons else '')
    C['P5IB'] = chk(p5_verdict, bc_columns=bc, errors=be2, harness_status=p5_hstat,
                    documentary_refs=docs, ref_verification=p5_refv, verify_reasons=p5_reasons,
                    note='D-HOP-2026-11-05-15 (3) + D-HOP-2026-11-09-05: approval_ref=D-HOP+CSV sha; b4_run_ref=QA-D+manifest sha')
    # ---- W4 baseline ----
    we = []
    for c in A['w4_baseline']['columns']:
        if c not in bh:
            we.append(f'{c} missing from before'); continue
        for L in range(0, 31):
            if L in Af and L in B and Af[L].get(col(c)) != B[L][c]:
                we.append(f'L{L} {c}: {B[L][c]!r} -> {Af[L].get(col(c))!r}')
    for L, v in A['w4_baseline']['required_values_price_mult'].items():
        if B.get(int(L), {}).get('w4_price_mult') != v:
            we.append(f'before L{L} w4_price_mult {B.get(int(L), {}).get("w4_price_mult")!r} != approved {v!r}')
    C['W4'] = chk('FAIL' if we else 'PASS', fails=we[:30], rule='rows 21-30 per D-HOP-11-05-15 (2); rows 0-20 fail-closed (no approval located)')
    # ---- families rows 11-30 ----
    own = set(A['w4_baseline']['columns']) | {cap_c}
    fe, inscope, allowed = [], [], []
    for h in ah:
        orig = next((o for o, n in ren.items() if n == h), h)
        if orig in own or h in ren.values() or h in bc:
            continue
        for L in range(11, 31):
            if L not in Af:
                continue
            bv = B.get(L, {}).get(orig) if orig in bh else ''
            av = Af[L][h]
            if bv == av:
                continue
            if orig == 'farm_cost' and L <= 29:
                inscope.append(L); continue
            if orig == 'farm_cost' and L == 30:
                continue  # P6A
            ok = [f for f in fams if f['column'] == orig and f['rows'][0] <= L <= f['rows'][1]]
            if ok:
                allowed.append(f'{orig} L{L} ({ok[0]["authority"]})'); continue
            fe.append(f'{orig} L{L}: {bv!r} -> {av!r} (unapproved family/row)')
    fam_reasons = []
    fam_verified = True
    if allowed and not fe:
        # verify each distinct authority cited by allowlisted rows
        seen = []
        for f in fams:
            auth = f.get('authority')
            if auth in seen:
                continue
            seen.append(auth)
            # only those actually relied on
            if not any(auth in a for a in allowed):
                continue
            st, why, _ = vref(auth, 'fam_authority', after)
            fam_reasons.append(f'{auth}: {why}')
            if st != 'VERIFIED':
                fam_verified = False
    elif allowed:
        fam_verified = False
    if fe:
        fam_verdict = 'FAIL'
        fam_refv = REF_UNVERIFIED
    elif not allowed:
        fam_verdict = 'PASS'
        fam_refv = 'n/a (no allowlisted changes)'
    elif fam_verified:
        fam_verdict = 'PASS'
        fam_refv = REF_VERIFIED
    else:
        fam_verdict = 'FAIL'
        fam_refv = REF_UNVERIFIED + (('; ' + ' | '.join(fam_reasons)) if fam_reasons else '')
    C['FAM'] = chk(fam_verdict, fails=fe[:30], n_fails=len(fe), farm_rows_changed=inscope,
                   allowlisted=allowed[:30], ref_verification=fam_refv, verify_reasons=fam_reasons,
                   rule='fail-closed: rows 11-30 may differ only in farm_cost L11-29 (Card PL-AC6) or allowlisted families with a VERIFIED D-HOP authority ref')
    # ---- PL-AC6 / E-G9 ----
    fc = {L: Af[L].get('farm_cost') for L in Af}
    C['P6A'] = chk('PASS' if fc.get(30) == A['pl_ac6']['row30_farm_cost'] else 'FAIL', row30=fc.get(30))
    lo, hi = Decimal(A['pl_ac6']['step_min_exclusive']), Decimal(A['pl_ac6']['step_max_inclusive'])
    steps, se = {}, []
    for L in range(A['pl_ac6']['step_levels'][0], A['pl_ac6']['step_levels'][1] + 1):
        try:
            a, b = G.dec(fc[L]), G.dec(fc[L - 1])
        except (KeyError, ValueError):
            se.append(f'L{L}: missing/non-numeric'); continue
        steps[str(L)] = str(a / b)
        if not (a > lo * b and a <= hi * b):
            se.append(f'L{L}: step {a}/{b} = {a / b:.6f} not in ({lo},{hi}]')
    C['P6B'] = chk('FAIL' if se else 'PASS', fails=se, rule='exact decimal compare, unrounded (card L946-948)')
    C['P6C'] = chk('REPORT', steps={str(L): steps.get(str(L)) for L in A['pl_ac6']['milestones']},
                   note='target only (D-HOP-37 A2); the "curve default step" is candidate-specific, so met/not-met is not computed here')
    ee = []
    for t in A['eg9_tracks']['columns']:
        if col(t) not in ah:
            ee.append(f'{t} missing'); continue
        try:
            v = [G.dec(Af[L][col(t)]) for L in sorted(Af)]
        except ValueError as e:
            ee.append(f'{t}: {e}'); continue
        ee += [f'{t} L{L}: {v[L - 1]} -> {v[L]} not strictly rising' for L in range(1, len(v)) if not v[L] > v[L - 1]]
    C['EG9'] = chk('FAIL' if ee else 'PASS', fails=ee[:30], tracks=A['eg9_tracks']['columns'], note=A['eg9_tracks']['src'])
    return _finish(C, A, synthetic, before, after, breeds, b4_ref)


def _finish(C, A, synthetic, before, after, breeds, b4_ref):
    rep = G.envelope('csvcheck.py', synthetic, before=before, after=after, before_sha256=G.sha256(before), after_sha256=G.sha256(after),
                     breeds=breeds, checks=C,
                     notes={'streak_cap_runtime': A['streak_cap']['runtime_note'],
                            'scope': 'CSV-only checks; PL-AC5(ii)/(iii) need reachdiff.py / trace10; PL-AC1-4/7 need run outputs'})
    rep['overall'] = G.overall(C)
    return rep


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--before', required=True); ap.add_argument('--after', required=True)
    ap.add_argument('--breeds', type=int, required=True, choices=(0, 1))
    ap.add_argument('--rename-map'); ap.add_argument('--bc-listing'); ap.add_argument('--allow-families')
    ap.add_argument('--b4-ref'); ap.add_argument('--synthetic', action='store_true'); ap.add_argument('--out')
    ap.add_argument('--decisions-root', default=None, help='studio root holding decisions.md, product/, qa/, engineering/ decisions files (exact paths, D-HOP-2026-11-10-10); default /workspace/egg-farm-studio in real mode, none in --synthetic')
    ap.add_argument('--harness-pin', default=None, help='R-1 harness-of-record sha256 (D-HOP-2026-11-10-03); without it B4 refs read UNPINNED (never PASS)')
    a = ap.parse_args(argv)
    try:
        rep = check(a.before, a.after, a.breeds, a.rename_map, a.bc_listing, a.allow_families, a.b4_ref, a.synthetic,
                    decisions_root=a.decisions_root, harness_pin=a.harness_pin)
    except (ValueError, OSError) as e:
        print(f'input error: {e}', file=sys.stderr); return 2
    s = json.dumps(rep, indent=1, default=str)
    if a.out:
        open(a.out, 'w').write(s + '\n')
    else:
        print(s)
    print(f'csvcheck overall={rep["overall"]} (PROVISIONAL, ac_claim NONE)', file=sys.stderr)
    return 0 if rep['overall'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
