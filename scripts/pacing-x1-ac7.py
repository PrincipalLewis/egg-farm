#!/usr/bin/env python3
"""pacing-x1-stack row 904 helper (AC7 2x active/idle gate, QA-D-1030-X1-TREE; R6 of QA-D-1030-PR93-1).
Called by scripts/pacing-x1-run.sh; unit-tested by tests/pacing-x1-ac7.test.ts. Every subcommand prints one JSON object.
  inputs <studio>                         sha256 of the studio files the gate imports (R4): m4_active.py, economy_sim.py,
                                          product/economy.f1.csv, product/economy.f1-m4cols.csv. Exit 1 if one is missing.
  sim <repo> <commit> <studio>            HoE (b): m4_active.py as imported (studio) vs the --ac7-from commit's copy:
                                          MATCH / MISMATCH / not-in-commit; commit copy written to <outdir> if given (5th arg).
  run <script> <csv> <sha256> <log>       run `python3 <script> 30 --csv <csv>` (stdout+stderr to <log>). Behavioural check
                                          only (R2): PASS iff exit 0 AND the stderr line `CSV-RECORD path=<realpath csv>
                                          sha256=<sha256>` is present AND the gate header names that realpath AND the CSV on
                                          disk hashes to <sha256>. A script that ignores --csv (argv[1] only) never has a
                                          matching CSV-RECORD, so it FAILS; there is no static source check.
"""
import hashlib, json, os, subprocess, sys

def sha(p):
    with open(p, 'rb') as f: return hashlib.sha256(f.read()).hexdigest()

SIM_INPUTS = ['product/sim/m4/m4_active.py', 'product/sim/economy_sim.py', 'product/economy.f1.csv', 'product/economy.f1-m4cols.csv']

def inputs(studio):
    out, missing = [], []
    for rel in SIM_INPUTS:
        p = os.path.join(studio, rel)
        if os.path.isfile(p) and os.path.getsize(p) > 0: out.append({'path': p, 'sha256': sha(p)})
        else: missing.append(p)
    print(json.dumps({'inputs': out, 'missing': missing})); return 1 if missing else 0

def git(repo, *a):
    return subprocess.run(['git', '-C', repo, *a], capture_output=True)

def sim(repo, commit, studio, outdir=None):
    p = os.path.join(studio, 'product/sim/m4/m4_active.py')
    j = {'path': p, 'sha256': sha(p) if os.path.isfile(p) else '', 'source': 'studio', 'commit': commit or None, 'commitSha256': None, 'match': 'n/a'}
    if commit:
        r = git(repo, 'show', f'{commit}:product/sim/m4/m4_active.py')
        if r.returncode != 0: j['match'] = 'not-in-commit'
        else:
            j['commitSha256'] = hashlib.sha256(r.stdout).hexdigest(); j['match'] = 'MATCH' if j['commitSha256'] == j['sha256'] else 'MISMATCH'
            if outdir:
                os.makedirs(outdir, exist_ok=True)
                with open(os.path.join(outdir, 'm4_active.py'), 'wb') as f: f.write(r.stdout)
    print(json.dumps(j)); return 1 if j['match'] == 'MISMATCH' or not j['sha256'] else 0

def run(script, csv, want, log):
    csvabs = os.path.realpath(csv)
    j = {'status': 'FAIL', 'why': '', 'csvNamed': False, 'csvRecord': None, 'csvRecordOk': False, 'exitCode': None, 'result': None}
    if not (os.path.isfile(script) and os.path.getsize(script) > 0):
        j['why'] = f'AC7 script missing: {script}'; open(log, 'w').write(j['why'] + '\n')
    elif not os.path.isfile(csvabs) or sha(csvabs) != want:
        j['why'] = f'CSV {csvabs} missing or sha256 != {want}'; open(log, 'w').write(j['why'] + '\n')
    else:
        with open(log, 'wb') as f: rc = subprocess.run(['python3', script, '30', '--csv', csvabs], stdout=f, stderr=subprocess.STDOUT).returncode
        txt = open(log, encoding='utf-8', errors='replace').read().splitlines()
        j['exitCode'] = rc
        j['result'] = next((l for l in txt if l.startswith('RESULT:')), None)
        j['csvRecord'] = next((l for l in txt if l.startswith('CSV-RECORD ')), None)
        j['csvRecordOk'] = j['csvRecord'] == f'CSV-RECORD path={csvabs} sha256={want}'
        j['csvNamed'] = any(f'CSV {csvabs} |' in l for l in txt)
        if not j['csvRecordOk']:
            j['why'] = (f"CSV-RECORD missing or wrong: got {j['csvRecord'] or 'none'!r}, want 'CSV-RECORD path={csvabs} sha256={want}'"
                        ' (--csv not honoured: argv[1]-only scripts read their built-in CSV)')
        elif not j['csvNamed']: j['why'] = f'AC7 header does not name {csvabs}'
        elif rc != 0: j['why'] = f"AC7 exit {rc}: {j['result'] or 'no RESULT line'}"
        else: j['status'] = 'PASS'
    print(json.dumps(j)); return 0 if j['status'] == 'PASS' else 1

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['inputs'] and len(a) == 2: sys.exit(inputs(a[1]))
    if a[:1] == ['sim'] and len(a) in (4, 5): sys.exit(sim(*a[1:]))
    if a[:1] == ['run'] and len(a) == 5: sys.exit(run(*a[1:]))
    print(__doc__, file=sys.stderr); sys.exit(2)
