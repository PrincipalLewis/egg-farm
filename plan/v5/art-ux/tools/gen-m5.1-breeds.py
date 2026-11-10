#!/usr/bin/env python3
"""M5.1 breed hen sprites (Q-Art-2). Studio-owned, CC0. Head of Art & UX, 2026-10-24.
Base: assets/char-chicken.svg (viewBox 0 0 48 48, body ellipse 24,29 15x13, head 30,16 r8, faces right).
Writes assets/char-breed-*.svg, assets/char-breed-silhouette.svg and the preview sheet SVGs in mocks/."""
import math, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = '#3E2C23'
S = f'stroke="{OUT}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"'
YARD = '#BFE6A8'

def fluffy(cx, cy, rx, ry, n=14, amp=0.10, a0=0, a1=360):
    """Ellipse whose arc a0..a1 (deg, 0=right, 90=down) is scalloped; rest smooth."""
    pts = []
    for i in range(n + 1):
        t = math.radians(i * 360 / n)
        pts.append((cx + rx * math.cos(t), cy + ry * math.sin(t), i * 360 / n))
    d = f'M{pts[0][0]:.2f} {pts[0][1]:.2f}'
    for i in range(1, n + 1):
        tm = math.radians((i - 0.5) * 360 / n)
        deg = (i - 0.5) * 360 / n
        k = 1 + amp if a0 <= deg <= a1 else 1.0
        # for smooth sections use control at ellipse tangent-ish point
        if k == 1.0:
            k = 1 / math.cos(math.radians(180 / n))
        qx, qy = cx + rx * k * math.cos(tm), cy + ry * k * math.sin(tm)
        d += f' Q{qx:.2f} {qy:.2f} {pts[i][0]:.2f} {pts[i][1]:.2f}'
    return d + 'Z'

def ell_path(cx, cy, rx, ry):
    return f'M{cx-rx} {cy} A{rx} {ry} 0 1 0 {cx+rx} {cy} A{rx} {ry} 0 1 0 {cx-rx} {cy}Z'

BASE_COMB = 'M27 8 q2-5 5 0 q3-3 3 3'
BASE_BEAK = 'M37 16 l6 2 -6 2z'
BASE_WING = 'M14 28 q6 6 12 0'
BODY = ell_path(24, 29, 15, 13)
HEAD = ell_path(30, 16, 8, 8)

def shape(d, fill, extra=''):
    return f'<path d="{d}" fill="{fill}" {S}{extra}/>'

def eye(c='#3E2C23'):
    return f'<circle cx="32" cy="15" r="1.5" fill="{c}"/>'

def wing(c=OUT, d=BASE_WING):
    return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'

def svg(title, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">'
            f'<title>{title}</title>{body}</svg>\n')

# ---- tails (behind body) ----
TAIL_UP   = 'M16 22 Q10 15 9 5 Q12.5 7 14.5 10.5 Q15 6 18.5 6 Q20 13 21 19Z'   # Leghorn: tall, narrow, upright
TAIL_FAN  = 'M15 23 Q8 17 5 8 Q9 8.5 11 11.5 Q11 6 15 5.5 Q18 12 21 19Z'        # Sussex / Legbar: upright fan
TAIL_45   = 'M15 24 Q7 21 3 13 Q7 12.5 9.5 15 Q8 10 11.5 9.5 Q15 15 19 19Z'     # RIR: angled back ~45°
TAIL_STUB = 'M13 24 Q9 20 9 15 Q12 15.5 13.5 17.5 Q14 14 17 14.5 Q18 18 19 21Z'  # Brahma: short
TAIL_SICKLE_A = 'M17 21 C14 5 3 3 1.5 16 C2 18.5 4.5 18.5 5 16.5 C6.5 10 12 10 13 24Z'  # Cemani long sickles
TAIL_SICKLE_B = 'M15 23 C11 13 5 13 4 22 C5 23.5 7 23 7 22 C8 18 11 18 12 26Z'

def feet(kind, fill, tex):
    if kind == 'brahma':
        out = ''
        for x in (0, 9):
            out += shape(f'M{17.5+x} 38 Q{15.5+x} 43 {11.5+x} 46 Q{17+x} 47.2 {22.5+x} 46 Q{22+x} 42 {21.5+x} 38Z', fill)
            out += f'<path d="M{16.5+x} 43 l-2 2.2 M{19.5+x} 43 l-0.3 2.5" fill="none" stroke="{tex}" stroke-width="1" stroke-linecap="round"/>'
        return out
    if kind == 'cochin':  # heavy skirts, scalloped hems
        out = ''
        for x in (0, 11):
            out += shape(f'M{16+x} 37 Q{13+x} 42 {9+x} 45 Q{10.5+x} 47 {12.5+x} 45.8 Q{14+x} 47.2 {16+x} 46 Q{17.5+x} 47.2 {19.5+x} 46 Q{21.5+x} 47 {23+x} 45 Q{22.5+x} 41 {23+x} 37Z', fill)
            out += f'<path d="M{15+x} 42 l-2 2.5 M{18+x} 41.5 l-1 3 M{21+x} 42 l0 2.5" fill="none" stroke="{tex}" stroke-width="1" stroke-linecap="round"/>'
        return out
    return ''

RIM = '#6B5B73'

def rimmed(d, fill, cid, rim=RIM, w=4.6):
    """Dark 2px outline with a lighter inner rim band (for all-black birds)."""
    return (f'<clipPath id="{cid}"><path d="{d}"/></clipPath>'
            f'<path d="{d}" fill="{fill}"/>'
            f'<path d="{d}" fill="none" stroke="{rim}" stroke-width="{w}" clip-path="url(#{cid})"/>'
            f'<path d="{d}" fill="none" {S}/>')

def barring(cid, d, col, ys, x0=6, x1=42, w=1.6):
    lines = ''.join(f'<path d="M{x0} {y} q{(x1-x0)/2} 3.5 {x1-x0} 0" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round"/>' for y in ys)
    return f'<clipPath id="{cid}"><path d="{d}"/></clipPath><g clip-path="url(#{cid})">{lines}</g>'

def hackle(col, lace):
    # neck cape: flows from the back of the head down onto the shoulders (drawn after body, before head)
    d = 'M24.5 9 Q16.5 12.5 17 21 Q18 26.5 24.5 27.8 Q31.5 28.2 36.5 22 Q30.5 24.8 26.5 21.5 Q23 17.5 24.5 9Z'
    return shape(d, col) + f'<path d="M20 16 q-0.8 3.5 0.5 6.5 M22.5 22.5 q1.5 2.3 4 2.8" fill="none" stroke="{lace}" stroke-width="1" stroke-linecap="round"/>'

COMB_RED = '#D9534F'; BEAK = '#FFC93C'

B = {}
# 1 Leghorn — white, big floppy single comb (+ tall slim tail)
LEG_COMB = 'M24.5 10.5 L23.5 5 L26.8 7.6 L28 2 L30.6 6.4 L33 1.8 L34.2 7 L37.6 5.4 Q38 9.6 33.6 10.6 Q29 10.2 25.8 13.6 Q23.4 16.2 20.6 17.6 Q20.6 12.6 24.5 10.5Z'
B['leghorn'] = ('Leghorn hen', shape(TAIL_UP, '#FFFFFF') + shape(BODY, '#FFFFFF') + shape(HEAD, '#FFFFFF')
    + shape(LEG_COMB, COMB_RED) + shape(BASE_BEAK, BEAK) + '<path d="M36.5 21 q1 4 -1.5 4.5 q-1.5-2 0-4.5" fill="#D9534F" stroke="#3E2C23" stroke-width="1.5" stroke-linejoin="round"/>' + eye() + wing())
# 2 Sussex — white, black hackle + black upright fan tail
B['sussex'] = ('Sussex hen', shape(TAIL_FAN, '#2B2523') + '<path d="M11 11 q3 3 4.5 8" fill="none" stroke="#5A504C" stroke-width="1" stroke-linecap="round"/>'
    + shape(BODY, '#FFFFFF') + hackle('#2B2523', '#6E6460') + shape(HEAD, '#FFFFFF')
    + shape(BASE_COMB, COMB_RED) + shape(BASE_BEAK, BEAK) + eye() + wing())
# 3 Orpington — buff, round & fluffy, wider body, low rounded tail mound
ORP_BODY = fluffy(24, 28.5, 17.5, 13.5, n=16, amp=0.09, a0=0, a1=230)
B['orpington'] = ('Orpington hen', shape('M12 24 Q6.5 19 8 13.5 Q12 14 15.5 18Z', '#E2AE5C')
    + shape(ORP_BODY, '#EDBE6E') + shape(HEAD, '#EDBE6E') + shape(BASE_COMB, COMB_RED) + shape(BASE_BEAK, BEAK)
    + eye() + wing(d='M12.5 28 q7 7 14 0') + '<path d="M18 36.5 q2 1.5 4 0 M27 37 q2 1.5 4 0" fill="none" stroke="#C99545" stroke-width="1.2" stroke-linecap="round"/>')
# 4 Rhode Island Red — deep mahogany, near-black tail held back at ~45°
B['rhode-island-red'] = ('Rhode Island Red hen', shape(TAIL_45, '#231816') + '<path d="M8 15 q4 3 8 5.5" fill="none" stroke="#4E3A2E" stroke-width="1" stroke-linecap="round"/>'
    + shape(BODY, '#8E2F1C') + shape(HEAD, '#8E2F1C') + shape(BASE_COMB, '#E0473F') + shape(BASE_BEAK, BEAK)
    + '<circle cx="32" cy="15" r="2.2" fill="#E9A23B"/>' + eye() + wing('#3E2C23') + '<path d="M15 27.5 q5.5 4.5 10.5 0" fill="none" stroke="#B5523A" stroke-width="1" stroke-linecap="round"/>')
# 5 Brahma — light, dark laced hackle, short tail, feathered feet, low pea comb
B['brahma'] = ('Brahma hen', feet('brahma', '#F2EEE6', '#8F8A84') + shape(TAIL_STUB, '#2B2523')
    + shape(BODY, '#F2EEE6') + hackle('#2B2523', '#6E6460') + shape(HEAD, '#F2EEE6')
    + shape('M27.5 9.5 q1-2.2 2.5-1 q1.2-1.6 2.6-0.2 q1.4-0.6 1.6 1.4 q-3.5 1.2 -6.7 -0.2Z', COMB_RED) + shape(BASE_BEAK, BEAK) + eye() + wing())
# 6 Ayam Cemani — all black, lighter inner rim, black comb with sheen, long sickle tail
CEM = '#1C1A1F'
B['ayam-cemani'] = ('Ayam Cemani hen', rimmed(TAIL_SICKLE_B, CEM, 'cm-t2') + rimmed(TAIL_SICKLE_A, CEM, 'cm-t1')
    + rimmed(BODY, CEM, 'cm-b') + rimmed(HEAD, CEM, 'cm-h')
    + rimmed(BASE_COMB + 'Z', CEM, 'cm-c', rim='#4E4559', w=4) + '<path d="M28.6 7.4 q1.2-2.2 2.8-0.6" fill="none" stroke="#9A8CA8" stroke-width="1" stroke-linecap="round"/>'
    + shape(BASE_BEAK, '#3A3440') + '<circle cx="32" cy="15" r="2.4" fill="#8E7F99"/>' + eye('#141216') + wing(RIM))
# 7 Cochin — lavender, very fluffy, heavy feathered feet, short tail hidden in a fluff mound
COCH_BODY = fluffy(24, 29.5, 17.5, 12.5, n=18, amp=0.11, a0=0, a1=250)
B['cochin'] = ('Cochin hen', feet('cochin', '#B9B1C6', '#7D7490') + shape(fluffy(13, 21, 6, 5.5, n=8, amp=0.14), '#ADA4BC')
    + shape(COCH_BODY, '#B9B1C6') + shape(HEAD, '#B9B1C6') + shape(BASE_COMB, COMB_RED) + shape(BASE_BEAK, BEAK)
    + eye() + wing(d='M12.5 28.5 q7 7 14 0'))
# 8 Cream Legbar — cream with grey barring, small swept-back crest
LB_BODY = '#EFE3C2'; BAR = '#9A968E'
B['cream-legbar'] = ('Cream Legbar hen', shape(TAIL_FAN, '#D9D3C4') + barring('lb-t', TAIL_FAN, BAR, [8, 12, 16, 20], 4, 22, 1.4) + shape(TAIL_FAN, 'none')
    + shape(BODY, LB_BODY) + barring('lb-b', BODY, BAR, [19, 24, 29, 34, 39]) + shape(BODY, 'none')
    + shape(HEAD, LB_BODY) + shape('M25 10.5 Q20 6.5 17 9.5 Q19.5 9.5 20.5 11 Q18 11.5 17.5 14 Q21 12.5 23.5 14Z', '#C9C2B2')
    + shape(BASE_COMB, COMB_RED) + shape(BASE_BEAK, BEAK) + eye() + wing())

# Silhouette (unrevealed) — generic base hen, single colour #3E2C23 @ 35%
SIL = ('<g opacity="0.55" fill="#3E2C23" stroke="#3E2C23" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">'
       f'<path d="{BODY}"/><path d="{HEAD}"/><path d="{BASE_COMB}"/><path d="{BASE_BEAK}"/></g>')

ORDER = ['leghorn', 'sussex', 'orpington', 'rhode-island-red', 'brahma', 'ayam-cemani', 'cochin', 'cream-legbar']
for k in ORDER:
    with open(f'{ROOT}/assets/char-breed-{k}.svg', 'w') as f:
        f.write(svg(*B[k]))
with open(f'{ROOT}/assets/char-breed-silhouette.svg', 'w') as f:
    f.write(svg('Unrevealed breed', SIL))

# ---- preview sheet ----
def inner(k):
    t, b = B[k] if k != 'silhouette' else ('', SIL)
    return b.replace('id="', f'id="{k}-').replace('url(#', f'url(#{k}-')
def place(k, x, y, size):
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="0 0 48 48">{inner(k)}</svg>'
names = {'leghorn': 'Leghorn', 'sussex': 'Sussex', 'orpington': 'Orpington', 'rhode-island-red': 'Rhode Is. Red',
         'brahma': 'Brahma', 'ayam-cemani': 'Ayam Cemani', 'cochin': 'Cochin', 'cream-legbar': 'Cream Legbar', 'silhouette': 'Unrevealed'}
cols = ORDER + ['silhouette']; CW = 112; X0 = 20
W = X0 * 2 + CW * len(cols); band_h = 200
parts = [f'<rect width="{W}" height="{60 + 2*band_h + 20}" fill="#FFFFFF"/>',
         f'<text x="{X0}" y="34" font-family="DejaVu Sans" font-size="18" font-weight="bold" fill="#3E2C23">M5.1 breeds (Q-Art-2): 1x and 2x on yard {YARD} and on white</text>']
for bi, bg in enumerate([YARD, '#FFFFFF']):
    y0 = 50 + bi * band_h
    parts.append(f'<rect x="0" y="{y0}" width="{W}" height="{band_h}" fill="{bg}"/>')
    if bg == '#FFFFFF':
        parts.append(f'<line x1="0" y1="{y0}" x2="{W}" y2="{y0}" stroke="#DDD" />')
    for i, k in enumerate(cols):
        cx = X0 + i * CW
        parts.append(place(k, cx + (CW - 48) / 2 - 4, y0 + 14, 48))
        parts.append(place(k, cx + (CW - 96) / 2 - 4, y0 + 70, 96))
        parts.append(f'<text x="{cx + CW/2 - 4}" y="{y0 + 186}" text-anchor="middle" font-family="DejaVu Sans" font-size="12" fill="#3E2C23">{names[k]}</text>')
H = 60 + 2 * band_h + 10
sheet = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">' + ''.join(parts) + '</svg>'
os.makedirs(f'{ROOT}/mocks', exist_ok=True)
with open(f'{ROOT}/mocks/m5.1-breeds-preview.svg', 'w') as f:
    f.write(sheet)
print('ok', W, H)
