# Extract Saves-lane rows from qa/m5 test plans: any markdown table with a "Lane" column; row kept if its Lane cell mentions Saves.
import re, sys, glob, json, hashlib
out = []
for f in sorted(glob.glob('/workspace/egg-farm-studio/qa/m5/test-plan-*.md')):
    lines = open(f, encoding='utf-8').read().split('\n'); sha = hashlib.sha1(open(f,'rb').read()).hexdigest()[:8]
    hdr = None; sec = ''
    for i, l in enumerate(lines, 1):
        if l.startswith('#'): sec = l.strip('# ').strip()[:40]
        if l.startswith('|'):
            cells = [c.strip() for c in l.strip().strip('|').split('|')]
            if hdr is None:
                hdr = cells; continue
            if set(''.join(cells)) <= set('-: '): continue
            if 'Lane' in hdr and len(cells) >= len(hdr):
                lane = cells[hdr.index('Lane')]
                if 'Saves' in lane:
                    case = cells[1] if len(cells) > 1 else ''
                    out.append(dict(plan=f.split('/')[-1], sha1=sha, line=i, sec=sec, id=re.sub(r'\*', '', cells[0])[:40], lane=lane, need=re.sub(r'\s+', ' ', case)[:900], type=cells[hdr.index('Type')] if 'Type' in hdr else ''))
        else: hdr = None
json.dump(out, open(sys.argv[1], 'w'), indent=1, ensure_ascii=False)
from collections import Counter; c = Counter(r['plan'] for r in out); print(c, len(out))
