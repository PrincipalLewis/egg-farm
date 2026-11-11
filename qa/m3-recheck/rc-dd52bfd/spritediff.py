import sys,os
from PIL import Image, ImageChops
B='p3-fix-462a071'; N='rc-dd52bfd/p3'
for e in sys.argv[1:]:
  for s in ['360x800','375x700','390x844','375x800']:
    b=f'{B}/sprite-{e}-462a071-{s}.png'; n=f'{N}/sprite-{e}-dd52bfd-{s}.png'
    if not (os.path.exists(b) and os.path.exists(n)): print(e,s,'MISSING', os.path.exists(b), os.path.exists(n)); continue
    A=Image.open(b).convert('RGBA'); C=Image.open(n).convert('RGBA')
    if A.size!=C.size: print(e,s,'SIZE',A.size,C.size); continue
    d=ImageChops.difference(A,C); px=sum(1 for p in d.getdata() if any(p))
    print(e,s,A.size,'diffpx',px)
