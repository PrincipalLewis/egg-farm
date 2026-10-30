#!/usr/bin/env python3
"""F-PAR-1 strip-and-compare (HoE ruling 2026-10-30 11:59, HoQA RF1 on #94). Usage: fpar1-strip-compare.py REF PORT [STRIPPED_OUT]
Fails closed (exit 1) unless ALL hold: REF ends with exactly b'\\nALLDONE\\n'; b'ALLDONE' occurs exactly once in REF; REF minus its last
8 bytes (b'ALLDONE\\n') is byte-identical to PORT. Exit 2 on usage / unreadable file. Prints sha256 + sizes of REF, stripped REF, PORT."""
import hashlib, sys
def main(a):
    if len(a) not in (3, 4): print(__doc__, file=sys.stderr); return 2
    try: ref, port = open(a[1], 'rb').read(), open(a[2], 'rb').read()
    except OSError as e: print(f'FAIL unreadable: {e}', file=sys.stderr); return 2
    h = lambda b: f'{hashlib.sha256(b).hexdigest()} ({len(b)} B)'
    if not ref.endswith(b'\nALLDONE\n'): print(f'FAIL {a[1]}: last bytes are {ref[-9:]!r}, not \\nALLDONE\\n'); return 1
    if ref.count(b'ALLDONE') != 1: print(f'FAIL {a[1]}: ALLDONE occurs {ref.count(b"ALLDONE")} times, not exactly once'); return 1
    st = ref[:-8]
    if len(a) == 4: open(a[3], 'wb').write(st)
    ok = st == port
    if not ok:
        i = next((i for i, (x, y) in enumerate(zip(st, port)) if x != y), min(len(st), len(port)))
        print(f'FAIL {a[2]}: stripped REF and PORT differ at byte {i} (sizes {len(st)} vs {len(port)})')
    print(f'ref {a[1]} {h(ref)} | ref-stripped {h(st)} | port {a[2]} {h(port)} | {"IDENTICAL" if ok else "DIFFERENT"}')
    return 0 if ok else 1
if __name__ == '__main__': sys.exit(main(sys.argv))
