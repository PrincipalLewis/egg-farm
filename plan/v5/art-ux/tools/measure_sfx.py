#!/usr/bin/env python3
"""Measure SFX: duration, attack (1% of peak -> first peak within 20 ms), LUFS (10x loop), true peak (single play), size."""
import sys,os,subprocess,numpy as np
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))); from gen_juice_sfx import meas
print('| File | Container ms | Decoded ms | Attack ms | LUFS (10x loop) | True peak dBTP | Size B |'); print('|---|---|---|---|---|---|---|')
for f in sorted(sys.argv[1:]):
    r=subprocess.run(['ffmpeg','-v','error','-i',f,'-f','f32le','-ac','1','-ar','44100','-'],capture_output=True).stdout
    y=np.abs(np.frombuffer(r,np.float32)); k=np.argmax(y>.01*y.max()); pk=k+np.argmax(y[k:k+882]); ln=len(y)/44.1
    d=float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f],capture_output=True,text=True).stdout)
    I,_=meas(f); _,TP=meas(f,False)
    print(f'| {os.path.basename(f)} | {d*1000:.0f} | {ln:.0f} | {(pk-k)/44.1:.1f} | {I:.1f} | {TP:.1f} | {os.path.getsize(f)} |')
