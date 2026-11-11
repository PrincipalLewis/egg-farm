"""TEMP decisions-file fixtures that mirror the live studio layout by EXACT relative path (D-HOP-2026-11-10-10, amends -06).
SYNTHETIC only; never touches real files. <root> is a temp stand-in for /workspace/egg-farm-studio:
  <root>/decisions.md              D-CEO-*
  <root>/product/decisions.md      D-HOP-*, D-PMW-*, D-COL-*, D-ECON-*, D-PMFU-*, D-PMM-*
  <root>/qa/decisions.md           QA-D-*
  <root>/engineering/decisions.md  D-HOE-*
Any other path (evidence copies, product/workers/decisions.md, a bare temp decisions.md, ...) never counts."""
import os, re

REL = {
    'root': 'decisions.md',
    'product': os.path.join('product', 'decisions.md'),
    'qa': os.path.join('qa', 'decisions.md'),
    'engineering': os.path.join('engineering', 'decisions.md'),
}
PRODUCT = ('D-HOP', 'D-PMW', 'D-COL', 'D-ECON', 'D-PMFU', 'D-PMM')
ROLE_OF_PREFIX = dict({p: 'product' for p in PRODUCT}, **{'QA-D': 'qa', 'D-CEO': 'root', 'D-HOE': 'engineering'})


class Layout:
    def __init__(self, base):
        self.root = os.path.join(base, 'studio')
        self.paths = {k: os.path.join(self.root, v) for k, v in REL.items()}
        for p in self.paths.values():
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'w').close()

    def put(self, role, text):
        with open(self.paths[role], 'w') as f:
            f.write(text)
        return self.root

    def put_rel(self, rel, text):
        """Write a file at an arbitrary path under <root> (e.g. an evidence copy); never an authority file unless exact."""
        p = os.path.join(self.root, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w') as f:
            f.write(text)
        return p

    def clear(self):
        for p in self.paths.values():
            open(p, 'w').close()

    def route(self, text):
        """Convenience for 'genuine' fixtures: split plain (fence-free) text on '## ' headings and write each section to the
        exact file owning its leading ID prefix; sections with no known prefix go to product."""
        self.clear()
        buf = {k: '' for k in REL}
        for sec in re.split(r'(?m)^(?=## )', text):
            if not sec:
                continue
            m = re.match(r'## (QA-D|D-[A-Z]+)-', sec)
            buf[ROLE_OF_PREFIX.get(m.group(1), 'product') if m else 'product'] += sec
        for k, v in buf.items():
            with open(self.paths[k], 'w') as f:
                f.write(v)
        return self.root
