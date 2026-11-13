# Procedural sfx generator (Art & UX, Egg Farm Studio). Deterministic; output is original work.
import numpy as np, subprocess, sys
SR=44100
def t(d): return np.arange(int(SR*d))/SR
def env(n,a=0.005,r=None):
    e=np.ones(n); na=max(1,int(a*SR)); e[:na]=np.linspace(0,1,na)
    e*=np.exp(-np.linspace(0,1,n)*(r or 5)); return e
def tone(f0,d,f1=None,wave='sine',r=5):
    x=t(d); f=np.linspace(f0,f1 or f0,len(x)); ph=2*np.pi*np.cumsum(f)/SR
    s=np.sin(ph) if wave=='sine' else (np.sign(np.sin(ph))*.5 if wave=='sq' else 2*(ph/(2*np.pi)%1)-1)
    return s*env(len(x),r=r)
def seq(*parts,gap=0.0):
    out=[]
    for p in parts: out+= [p, np.zeros(int(gap*SR))]
    return np.concatenate(out)
def noise(d,r=8): rng=np.random.default_rng(1); return rng.uniform(-1,1,int(SR*d))*env(int(SR*d),r=r)
S={
 'sfx-tap-start': seq(tone(523,.12),tone(659,.12),tone(784,.25,r=4)),
 'sfx-collect-pop': tone(400,.09,900,r=8)+.3*noise(.09,20)[:int(SR*.09)],
 'sfx-coop-full': seq(tone(660,.12,r=6),tone(660,.18,r=6),gap=.04)*.8,
 'sfx-sell-coin': seq(tone(1319,.08,r=6),tone(1760,.3,r=6),gap=0)+0,
 'sfx-customer-arrive': seq(tone(700,.08,r=6),tone(880,.14,r=6),gap=.02),
 'sfx-customer-leave': tone(500,.3,300,r=4)*.8,
 'sfx-upgrade': seq(*[tone(f,.08,r=4) for f in (523,659,784)],tone(1047,.35,r=3)),
 'sfx-cant-afford': tone(160,.18,120,wave='sq',r=6)*.7,
 'sfx-ui-open': tone(500,.1,800,r=7)*.6,
 'sfx-ui-close': tone(800,.1,500,r=7)*.6,
 'sfx-worker-yawn': (lambda x: (np.sin(2*np.pi*np.cumsum(np.concatenate([np.linspace(330,420,int(SR*.3)),np.linspace(420,200,int(SR*.6))])+8*np.sin(2*np.pi*5*x))/SR)*np.sin(np.pi*x/x[-1])**1.5*.8 + .15*np.random.default_rng(2).uniform(-1,1,len(x))*np.sin(np.pi*x/x[-1])))(t(.9)),
 'sfx-welcome-back': seq(tone(587,.15,r=3),tone(740,.15,r=3),tone(880,.4,r=2.5)),
}
for k,v in S.items():
    v=v/np.max(np.abs(v))*0.8; pcm=(v*32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg','-y','-loglevel','error','-f','s16le','-ar','44100','-ac','1','-i','-','-codec:a','libmp3lame','-b:a','96k','-ar','44100','-ac','1','-map_metadata','-1',f'{k}.mp3'],input=pcm,check=True)
