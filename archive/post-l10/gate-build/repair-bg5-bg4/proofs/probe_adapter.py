#!/usr/bin/env python3
"""Read-only adapter for HoQA's v3 probe (written against the v3 decisions_paths API) so it exercises the v3.1 exact-path
code path instead of the legacy-API rejection. It rewrites ONLY the call shape: a role dict whose authority paths equal
EXACTLY <root>/decisions.md, <root>/product/decisions.md, <root>/qa/decisions.md, <root>/engineering/decisions.md becomes
decisions_root=<root> (the -06 'workers' key is dropped: v3.1 never reads that path). Any non-exact dict (e.g. X10 traversal)
or list is passed through unchanged, so it still FAILS. ADAPT_PIN=none -> no R-1 pin (expect UNPINNED for valid refs);
ADAPT_PIN=fixed -> pin = sha256 of the probe's fixed synthetic harness text '// synthetic harness\\n'.
Usage: GB_TARGET=<pkg copy> ADAPT_PIN=none|fixed python3 probe_adapter.py <probe.py>"""
import hashlib, os, runpy, sys
T = os.environ['GB_TARGET']; sys.path[:0] = [T, os.path.join(T, 'tests')]
import csvcheck
_orig = csvcheck.check
PIN = hashlib.sha256(b'// synthetic harness\n').hexdigest() if os.environ.get('ADAPT_PIN') == 'fixed' else None
REL = {'root': 'decisions.md', 'product': 'product/decisions.md', 'qa': 'qa/decisions.md', 'engineering': 'engineering/decisions.md'}


def check(*a, **kw):
    dp = kw.get('decisions_paths')
    if isinstance(dp, dict) and 'root' in dp:
        root = os.path.dirname(dp['root'])
        if all(dp.get(r) == os.path.join(root, *rel.split('/')) for r, rel in REL.items()):
            kw.pop('decisions_paths'); kw['decisions_root'] = root
    kw.setdefault('harness_pin', PIN)
    return _orig(*a, **kw)


csvcheck.check = check
sys.argv = [sys.argv[1]]
runpy.run_path(sys.argv[0], run_name='__main__')
