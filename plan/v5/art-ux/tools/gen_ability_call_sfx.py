#!/usr/bin/env python3
"""Audio & Juice Designer, 2026-10-30. Original CC0 synthesis (numpy + ffmpeg), no samples.
sfx-ability-call-01..04 (worker call activated: Rush, Sweep, Shout, Inspect).
Same bell/glint family as sfx-milestone-01 (BELL partials 1 / 2.76 / 5.4, C6-E6-G6 palette) but lighter:
fewer notes, no C5 bed, shorter tails. Reuses wav()/enc() from gen_juice_sfx.py (static gain to -16 LUFS on a
10x loop, -1.5 dBTP ceiling wins). Run: python3 art-ux/tools/gen_ability_call_sfx.py"""
import os, sys, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_juice_sfx import t, env, fade, note, wav, enc, OUT, SR
BELL=((1,1),(2.76,.25),(5.4,.08)); SOFT=((1,1),(2.76,.12))
def rush():     # quick upward G5-C6-E6, 35 ms steps, 2 ms attack, 340 ms
    n=len(t(.34)); y=sum(g*note(n,st,f,2,tau,BELL) for st,f,tau,g in((0,784,40,.7),(.035,1047,45,.8),(.07,1319,110,1))); return fade(y,40)
def sweep():    # gliding bright: C7 tick + bell partials glide C6->G6 over 90 ms, then a light G6 glint, 2 ms attack, 360 ms
    n=len(t(.36)); x=np.arange(n)/SR; f=1047*(1.5**np.clip(x/.09,0,1)); ph=2*np.pi*np.cumsum(f)/SR
    y=(np.sin(ph)+.2*np.sin(2.76*ph)+.06*np.sin(5.4*ph))*env(n,2,90)+.35*note(n,0,2093,1,20,((1,1),))
    y+=.6*note(n,.09,1568,2,100,BELL); return fade(y,40)
def shout():    # punchier: C6+E6 dyad struck together + tiny click transient, 2 ms attack, 300 ms
    n=len(t(.30)); y=note(n,0,1047,2,70,BELL)+.85*note(n,0,1319,2,80,BELL)+.3*note(n,0,523,2,25,((1,1),))
    y+=.05*np.random.default_rng(31).standard_normal(n)*env(n,1,2); return fade(y,40)
def inspect():  # soft two-note query E6 -> G6 (rising, question-like), muted partials, 3 ms attack, 380 ms
    n=len(t(.38)); y=.8*note(n,0,1319,3,60,SOFT)+note(n,.12,1568,3,100,SOFT); return fade(y,50)
VAR=[('01',rush),('02',sweep),('03',shout),('04',inspect)]
if __name__=='__main__':
    for k,fn in VAR:
        b=os.path.join(OUT,f'sfx-ability-call-{k}'); tmp=f'/tmp/{os.path.basename(b)}.wav'; wav(tmp,fn())
        enc(tmp,b+'.ogg',['-c:a','libvorbis','-q:a','3']); enc(tmp,b+'.mp3',['-c:a','libmp3lame','-b:a','64k'])
