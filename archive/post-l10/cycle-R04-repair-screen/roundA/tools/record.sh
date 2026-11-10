#!/bin/bash
# record.sh: (re)build roundA/RESULT.md from every finished candidate, refresh roundA/MANIFEST.sha256, append a HANDOFF line. Idempotent.
cd /workspace/egg-farm-studio/scratch/post-l10/cycle-R04-repair-screen || exit 3; export PYTHONDONTWRITEBYTECODE=1
python3 - <<'PY'
import json, os, glob
out = ['# roundA RESULT (D-HOP-2026-11-10-11 add.3; INFORMAL, ac_claim NONE)',
       'Cells: envelope (a) tunables + W4 tier-5 w4_tier_cost rows 24-30 only; collection_cost byte-identical to a8c4; economy-config 1e7148b2 unchanged (collectionCostFromCsv OFF).',
       'pl.ts flags-off CFG none, seeds 1-200, T 4000, 3 profiles; metrics: PYTHONDONTWRITEBYTECODE=1 python3 tools/metrics.py <cand>/run ; control = control/run/metrics.json ae491312 (not re-run).', '']
for d in sorted(glob.glob('roundA/A*/')):
    d = d.rstrip('/'); sp = json.load(open(f'{d}/spec.json'))
    m = f'{d}/run/metrics.json'
    if not os.path.exists(m): out.append(f'## {os.path.basename(d)}: PENDING — {sp["note"]}'); continue
    r = json.load(open(m)); csvsha = open(f'{d}/run/csv.sha256').read().split()[0]
    allp = r['PL_AC1'].startswith('PASS') and r['PL_AC2'].startswith('PASS') and r['PL_AC3'].startswith('PASS')
    out.append(f'## {os.path.basename(d)}: PL-AC1 {r["PL_AC1"]} · PL-AC2 {r["PL_AC2"]} · PL-AC3 {r["PL_AC3"]} · ALL3 {"PASS" if allp else "NO"}')
    out.append(f'- note: {sp["note"]}; w4_tier5 {sp.get("w4_tier5_cost", 51567)}; csv sha256 {csvsha}; metrics sha256 {__import__("hashlib").sha256(open(m,"rb").read()).hexdigest()}')
    for p, pr in r['prof'].items():
        out.append(f'- {p}: AC1 fails {pr["ac1_fail"]} · AC2 fails {pr["ac2_fail"]} · tot {pr["tot10_30_P50_s"]} {pr["total_pm10"]}')
    out.append('')
open('roundA/RESULT.md', 'w').write('\n'.join(out) + '\n')
PY
(cd roundA && find . -type f ! -name MANIFEST.sha256 ! -path '*/.claim/*' | sort | xargs sha256sum > MANIFEST.sha256)
echo "- $(date -Iseconds) roundA record: RESULT.md $(sha256sum roundA/RESULT.md | cut -c1-16) MANIFEST $(sha256sum roundA/MANIFEST.sha256 | cut -c1-16) ($(ls roundA/A*/run/metrics.json 2>/dev/null | wc -l) candidates finished)" >> HANDOFF.md
