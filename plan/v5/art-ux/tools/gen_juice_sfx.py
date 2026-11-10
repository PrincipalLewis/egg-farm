#!/usr/bin/env python3
"""Audio & Juice Designer, 2026-10-16. Original CC0 synthesis (numpy + ffmpeg), no samples.
tap/collect/sell x 3 variants (0, +1, -1 semitone). Run: python3 art-ux/tools/gen_juice_sfx.py"""
import numpy as np, subprocess, os, wave, json, re
SR=44100; OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','assets','sfx'); rng=np.random.default_rng(7)
def t(d): return np.arange(int(round(SR*d)))/SR
def env(n,a,tau):
    x=np.arange(n)/SR; e=np.exp(-x/(tau/1000)); A=max(1,int(SR*a/1000)); e[:A]*=np.linspace(0,1,A); return e
def fade(y,ms): k=int(SR*ms/1000); y[-k:]*=np.linspace(1,0,k)**2; return y
def note(n_total,start,fr,a,tau,partials):
    y=np.zeros(n_total); i=int(SR*start); xx=np.arange(n_total-i)/SR
    y[i:]=sum(w*np.sin(2*np.pi*fr*m*xx) for m,w in partials)*env(len(xx),a,tau); return y
def tap(p):  # soft wooden tok, 2 ms attack, 120 ms
    x=t(.12); f=620*p*(1+.5*np.exp(-x/.004)); ph=2*np.pi*np.cumsum(f)/SR
    y=(np.sin(ph)+.25*np.sin(2*ph))*env(len(x),2,24)
    y+=.12*rng.standard_normal(len(x))*env(len(x),2,2.5); return fade(y,15)
def collect(p):  # two-note rise G5 -> C6 (2nd at 80 ms), 3 ms attack, 450 ms
    n=len(t(.45)); y=note(n,0,784*p,3,70,((1,1),(2,.2)))+note(n,.08,1047*p,3,110,((1,1),(2,.2),(3,.06))); return fade(y,40)
def sell(p):  # coin ding: 2 ms attack, bright inharmonic transient + B5->E6 ring, 500 ms
    n=len(t(.50)); y=note(n,0,988*p,2,60,((1,.7),(2.76,.35),(5.4,.2)))+note(n,.06,1319*p,2,140,((1,1),(2.76,.3),(5.4,.12)))
    y+=.15*rng.standard_normal(n)*env(n,2,3); return fade(y,40)
def upgrade(p):  # rising C5-E5-G5-C6 arpeggio, 3 ms attack, 550 ms
    n=len(t(.55)); y=sum(note(n,st,f*p,3,tau,((1,1),(2,.25),(3,.08))) for st,f,tau in((0,523,60),(.07,659,60),(.14,784,70),(.21,1047,150))); return fade(y,50)
def milestone(p):  # bell chime C6+E6+G6 over C5, 3 ms attack, 570 ms
    n=len(t(.57)); y=note(n,0,523*p,3,200,((1,.6),(2,.2)))
    y+=sum(note(n,st,f*p,2,180,((1,1),(2.76,.25),(5.4,.08))) for st,f in((.0,1047),(.06,1319),(.12,1568))); return fade(y,60)
def order(p):  # friendly "ta-da" E5 -> A5, 2 ms attack, 400 ms
    n=len(t(.40)); y=note(n,0,659*p,2,60,((1,1),(2,.3)))+note(n,.09,880*p,2,110,((1,1),(2,.3),(3,.1))); return fade(y,40)
def sparkle(p):  # glitter: 7 high pings 2.6-4.2 kHz, decaying, 550 ms (layer over sell)
    n=len(t(.55)); y=sum((.85**k)*note(n,.03+k*.06,f*p,1,40,((1,1),(2.76,.15))) for k,f in enumerate((2637,3136,2794,3520,3322,3951,4186))); return fade(y,50)
def cant(p):  # soft muted wood tock, gentle two-note dip A4 -> E4 (2nd at 60 ms), 180 ms, lowpassed feel
    n=len(t(.18)); y=note(n,0,440*p,4,30,((1,1),(2,.12)))+.8*note(n,.06,330*p,4,40,((1,1),(2,.1))); return fade(y,30)
def track_lvl(p):  # M4-A track level-up: quick D5-A5-D6 rise + soft shimmer, 2 ms attack, 420 ms
    n=len(t(.42)); y=sum(note(n,st,f*p,2,tau,((1,1),(2,.2),(3,.06))) for st,f,tau in((0,587,45),(.05,880,50),(.10,1175,120)))
    y+=.15*note(n,.10,2349*p,2,80,((1,1),)); return fade(y,40)
BAL=[523.25,587.33,659.26,783.99,880.0]  # C5 D5 E5 G5 A5 pentatonic ladder for steps 1..5
def bal_step(p):  # Balanced farm N/5 step: two-tone "tick-up" root -> fifth, 2 ms attack, 480 ms; p = step root
    n=len(t(.48)); y=note(n,0,p,2,70,((1,1),(2.76,.2)))+note(n,.07,p*1.5,2,150,((1,1),(2.76,.25),(5.4,.06))); return fade(y,40)
def bal_done(p):  # 5/5 +30%: celebration C-E-G-C up + held major chord bloom + sparkles, 760 ms (celebration exception)
    n=len(t(.76)); y=sum(note(n,st,f*p,3,tau,((1,1),(2,.2),(3,.05))) for st,f,tau in((0,523,60),(.06,659,60),(.12,784,70),(.18,1047,260)))
    y+=.5*sum(note(n,.18,f*p,8,280,((1,1),)) for f in(523,659,784))
    y+=.25*sum((.8**k)*note(n,.24+k*.07,f*p,1,40,((1,1),)) for k,f in enumerate((2093,2637,3136,2794,3520))); return fade(y,90)
def hire(p):  # worker hire: friendly "hey!" up-glide chirp + wood knock + bell, 3 ms attack, 500 ms
    n=len(t(.50)); x=np.arange(n)/SR; f=440*p*(1+.5*(1-np.exp(-x/.04))); ph=2*np.pi*np.cumsum(f)/SR
    y=.6*np.sin(ph)*env(n,3,60)+note(n,.12,1319*p,2,140,((1,1),(2.76,.25),(5.4,.08)))
    y+=.4*note(n,0,220*p,2,25,((1,1),)); return fade(y,40)
def refill(p):  # Coop Hand / Manage refill: rising filtered whoosh + sparkle pair, 4 ms attack, 450 ms
    n=len(t(.45)); x=np.arange(n)/SR; nz=rng.standard_normal(n); k=np.ones(12)/12; nz=nz-np.convolve(nz,k,'same')
    sw=np.sin(2*np.pi*np.cumsum(500*p*(1+3*x/.45))/SR); y=.35*nz*sw*np.sin(np.pi*np.clip(x/.30,0,1))*env(n,4,400)
    y+=note(n,.22,1568*p,2,70,((1,1),(2.76,.15)))+.8*note(n,.29,2093*p,2,90,((1,1),(2.76,.15))); return fade(y,40)
def welcome(p):  # welcome-back collect: warm G4-B4-D5 chord swell then G5 bell, 6 ms attack, 570 ms
    n=len(t(.57)); y=.6*sum(note(n,0,f*p,6,220,((1,1),(2,.15))) for f in(392,494,587))
    y+=note(n,.12,784*p,2,200,((1,1),(2.76,.25),(5.4,.08))); return fade(y,60)
def tick(p):  # count-up tick: tiny high wood click, 1 ms attack, 45 ms
    n=len(t(.045)); y=note(n,0,1760*p,1,8,((1,1),(2,.2)))+.1*rng.standard_normal(n)*env(n,1,1.5); return fade(y,8)
# ---- M5.0 set (m5-sound-spec v0.3, 2026-10-24) ----
BELL=((1,1),(2.76,.25),(5.4,.08))
def g_spawn(p):  # golden spawn: soft glassy glint E6->B6 + airy tail, 3 ms, 400 ms
    n=len(t(.40)); y=note(n,0,1319*p,3,90,BELL)+.8*note(n,.07,1976*p,3,130,BELL)
    x=np.arange(n)/SR; y+=.05*rng.standard_normal(n)*np.exp(-x/.12)*np.clip(x/.02,0,1); return fade(y,50)
def g_warn(p):  # golden warn at 27 s: gentle falling B5->G5, muted, 4 ms, 300 ms
    n=len(t(.30)); y=note(n,0,988*p,4,60,((1,1),(2,.1)))+note(n,.11,784*p,4,80,((1,1),(2,.1))); return fade(y,40)
def g_pop(n,p):
    x=np.arange(n)/SR; f=500*p*(1+1.5*(1-np.exp(-x/.015))); return np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,2,25)
def g_cash(p):  # golden collect cash: pop + coin ding pair (C7-ish), 2 ms, 540 ms
    n=len(t(.54)); y=g_pop(n,p)+.8*note(n,.07,1568*p,2,90,BELL)+note(n,.14,2093*p,2,160,BELL); return fade(y,50)
def g_eggs(p):  # golden collect eggs: pop + two bubbly bloops, 2 ms, 520 ms
    n=len(t(.52)); x=np.arange(n)/SR; y=g_pop(n,p)
    for st,f0 in((.08,520),(.18,700)):
        i=int(st*SR); xx=x[:n-i]; f=f0*p*(1+.8*(1-np.exp(-xx/.03))); yy=np.zeros(n); yy[i:]=np.sin(2*np.pi*np.cumsum(f)/SR)*env(n-i,3,70); y+=.8*yy
    return fade(y,50)
def lp(y,k=6): return np.convolve(y,np.ones(k)/k,'same')
def fr_start(p):  # Frenzy start: rounded rising G5-C6-E6 stab (low-passed square-ish) + glitter, 2 ms, 600 ms
    n=len(t(.60)); y=sum(note(n,st,f*p,2,tau,((1,1),(3,.25),(5,.08))) for st,f,tau in((0,784,60),(.07,1047,60),(.14,1319,170)))
    y+=.2*sum((.8**k)*note(n,.18+k*.05,f*p,1,35,((1,1),)) for k,f in enumerate((2637,3136,3520,3951))); return fade(lp(y,4),60)
def fr_end(p):  # Frenzy end: soft fall E6->C6, 3 ms, 330 ms
    n=len(t(.33)); y=note(n,0,1319*p,3,70,BELL)+note(n,.10,1047*p,3,110,BELL); return fade(y,40)
STK=[(1047,1175),(1175,1319),(1319,1568)]
def stk_tier(k):  # streak tier-up k=1..3: soft rising glint pair, 3 ms, 350 ms
    a,b=STK[k-1]; n=len(t(.35)); return fade(note(n,0,a,3,60,((1,1),(2.76,.12)))+note(n,.07,b,3,110,((1,1),(2.76,.12))),40)
def stk_max(p):  # streak cap chime: soft G6+C7 bell chord + tiny sparkle, 3 ms, 500 ms
    n=len(t(.50)); y=note(n,0,1568*p,3,180,((1,1),(2.76,.12)))+.8*note(n,.03,2093*p,3,170,((1,1),(2.76,.1)))
    y+=.12*sum(note(n,.10+k*.06,f*p,1,30,((1,1),)) for k,f in enumerate((3136,3520,4186))); return fade(y,50)
def stk_cool(p):  # streak cooling: soft falling sine + breath, 6 ms, 320 ms
    n=len(t(.32)); x=np.arange(n)/SR; f=700*p*(1-.35*x/.32); y=.8*np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,6,90)
    nz=lp(rng.standard_normal(n),20); y+=.6*nz*env(n,6,80); return fade(y,40)
def cluck(n,st,f0,p,a=3,tau=35):  # formant-ish chirp: falling pitch, odd partials, low-passed
    y=np.zeros(n); i=int(st*SR); xx=np.arange(n-i)/SR; f=f0*p*(1+.35*np.exp(-xx/.02))
    ph=2*np.pi*np.cumsum(f)/SR; y[i:]=(np.sin(ph)+.35*np.sin(2*ph)+.15*np.sin(3*ph))*env(n-i,a,tau); return y
def br_ready(p):  # broody ready: low warm coo-cluck, 8 ms, 320 ms
    n=len(t(.32)); y=cluck(n,0,350,p,8,60)+.8*cluck(n,.13,440,p,8,70); return fade(lp(y,8),50)
def br_collect(p):  # broody collect: happy two-cluck + small coin ding, 3 ms, 450 ms
    n=len(t(.45)); y=cluck(n,0,520,p)+cluck(n,.09,600,p)+.6*note(n,.18,1760*p,2,110,BELL); return fade(lp(y,3),50)
def wav(path,y):
    y=y/np.max(np.abs(y))*.7; w=wave.open(path,'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((y*32767).astype('<i2').tobytes()); w.close()
# Short files (<400 ms) give -inf integrated LUFS in a single pass, so loudness is measured on the
# sound looped 10x back-to-back (= rapid repeated play), then a static gain is applied (no compression).
# True-peak ceiling -1.5 dBTP wins over the -16 LUFS target if they conflict.
def meas(src,loop=True):
    f=('aloop=loop=9:size=44100,' if loop else '')+'ebur128=peak=true'
    e=subprocess.run(['ffmpeg','-hide_banner','-i',src,'-af',f,'-f','null','-'],capture_output=True,text=True).stderr
    e=e[e.rindex('Summary'):]
    I=float(re.search(r'I:\s+(-?[\d.inf]+)',e).group(1)); TP=float(re.search(r'Peak:\s+(-?[\d.inf]+)',e).group(1)); return I,TP
def enc(src,dst,codec):
    I,TP=meas(src); g=min(-16-I,-1.5-TP)
    subprocess.run(['ffmpeg','-y','-v','error','-i',src,'-af',f'volume={g:.2f}dB','-ac','1','-ar',str(SR),'-map_metadata','-1']+codec+[dst],check=True)
SEMIS=[1.0,2**(1/12),2**(-1/12)]
SETS={'tap':(tap,3),'collect':(collect,3),'sell':(sell,3),'upgrade':(upgrade,3),'order-complete':(order,3),'milestone':(milestone,1),'sell-sparkle':(sparkle,1),'cant-afford':(cant,3),'balanced-step':(bal_step,5),'track-levelup':(track_lvl,3),'balanced-complete':(bal_done,1),'worker-hire':(hire,3),'worker-refill':(refill,3),'welcome-collect':(welcome,1),'countup-tick':(tick,3),'golden-spawn':(g_spawn,3),'golden-warn':(g_warn,1),'golden-collect-cash':(g_cash,3),'golden-collect-eggs':(g_eggs,3),'frenzy-start':(fr_start,1),'frenzy-end':(fr_end,1),'streak-tier':(None,3),'streak-max':(stk_max,1),'streak-cool':(stk_cool,1),'broody-ready':(br_ready,1),'broody-collect':(br_collect,3)}
if __name__=='__main__':
    only=os.sys.argv[1:]
    for name,(fn,nv) in SETS.items():
        if only and name not in only: continue
        if name=='streak-tier': fn=lambda k: stk_tier(k)
        for i,p in (enumerate(BAL) if name=='balanced-step' else enumerate([1,2,3]) if name=='streak-tier' else enumerate(SEMIS[:nv])):
            b=os.path.join(OUT,f'sfx-{name}-{i+1:02d}'); tmp=f'/tmp/{os.path.basename(b)}.wav'; wav(tmp,fn(p))
            enc(tmp,b+'.ogg',['-c:a','libvorbis','-q:a','3'])
            enc(tmp,b+'.mp3',['-c:a','libmp3lame','-b:a','64k'])
