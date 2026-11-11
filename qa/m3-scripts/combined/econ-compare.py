#!/usr/bin/env python3
# econ-compare.py <a.csv> <b.csv>: cell-by-cell compare, line endings (CRLF/LF/CR, trailing newline) and BOM ignored. Exit 0 = identical.
import sys
def load(p):
    t=open(p,'rb').read().decode('utf-8-sig').replace('\r\n','\n').replace('\r','\n')
    return [l.split(',') for l in t.split('\n') if l!='']
a,b=load(sys.argv[1]),load(sys.argv[2]); bad=0
hdr=a[0] if a else []
for r in range(max(len(a),len(b))):
    ra=a[r] if r<len(a) else None; rb=b[r] if r<len(b) else None
    if ra is None or rb is None: print(f"FAIL row {r}: missing in {'A' if ra is None else 'B'}"); bad+=1; continue
    for c in range(max(len(ra),len(rb))):
        va=ra[c] if c<len(ra) else '<none>'; vb=rb[c] if c<len(rb) else '<none>'
        if va!=vb:
            bad+=1
            if bad<=20: print(f"FAIL row {r} col {hdr[c] if c<len(hdr) else c}: {va!r} != {vb!r}")
cells=sum(len(x) for x in b)
print(f"SUMMARY {'identical' if not bad else str(bad)+' cell(s) differ'}, {len(b)} rows, {cells} cells"); sys.exit(1 if bad else 0)
