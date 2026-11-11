import json,glob,sys,os
from PIL import Image,ImageDraw
os.makedirs('sheets',exist_ok=True)
for man in sorted(glob.glob('entries-*.jsonl')):
  es=[json.loads(l) for l in open(man)]
  if not es: continue
  for i in range(0,len(es),4):
    grp=es[i:i+4];ims=[]
    for e in grp:
      im=Image.open(e['file']).convert('RGB')
      if im.width>1000: im=im.crop((880,0,im.width,im.height))
      d=ImageDraw.Draw(im);d.rectangle((0,0,im.width,14),fill='black');d.text((2,1),e['step'],fill='yellow');ims.append(im)
    W=sum(x.width for x in ims)+6*len(ims);H=max(x.height for x in ims)
    s=Image.new('RGB',(W,H),'magenta');x=0
    for im in ims: s.paste(im,(x,0));x+=im.width+6
    out=f"sheets/{os.path.basename(man)[8:-6]}-{i//4}.png";s.save(out);print(out)
