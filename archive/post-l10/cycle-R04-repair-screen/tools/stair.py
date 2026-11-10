#!/usr/bin/env python3
"""Staircase de-phase family (de-stack and relocate): hens/EV rows paid at HOT farm levels are kept flat (x(1+eps) of the previous
row); rows paid at COOL levels carry the jumps. Row R is paid at ~Farm R-2 (trace of a8c4). HOT rows = 19,20 (F17,F18),
22-26 (F20-24), 28,29 (F26,F27); COOL rows = 14-18 (F12-16), 21 (F19), 27 (F25). Farm = max 1.30 chain (optionally scaled)."""
import sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
import gen as g
HOT = {19, 20, 22, 23, 24, 25, 26, 28, 29}


def farm_max(r='1.30'):
    v, f = 1368, {}
    for L in range(11, 30): v = g.max_chain(v, r, 1); f[L] = v
    return f


def stair(base_row, m_early, m21, m27, eps=0.01, cap30=None):
    """base_row: list(31) of a8c4 costs. returns dict rows 14..29."""
    out = {}; prev = base_row[13]
    for R in range(14, 30):
        if R in HOT: v = int(prev * (1 + eps)) + 1
        else:
            m = m_early if R <= 18 else m21 if R == 21 else m27
            v = max(int(base_row[R] * m), int(prev * (1 + eps)) + 1)
        out[R] = v; prev = v
    if cap30 and out[29] >= cap30: raise ValueError('row 29 >= frozen row 30')
    return out
