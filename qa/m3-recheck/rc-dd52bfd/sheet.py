import sys,json,os
from PIL import Image, ImageDraw
D='shots'; os.makedirs('check-sheets',exist_ok=True)
for eng in sys.argv[1:]:
 ents=[json.loads(l) for l in open(f'{D}/entries-{eng}.jsonl')]
 for size in ['360x800','375x800','390x844','1280x800']:
  es=[e for e in ents if e['size']==size]; raw=[Image.open(f"{D}/{e['file']}") for e in es]
  sc=0.5 if size!='1280x800' else 0.45; cols=6 if size!='1280x800' else 3
  ims=[i.resize((int(i.width*sc),int(i.height*sc))) for i in raw]; cw=ims[0].width+10; ch=ims[0].height+40; rows=(len(ims)+cols-1)//cols
  S=Image.new('RGB',(cw*cols,ch*rows),'white'); d=ImageDraw.Draw(S)
  for k,(e,i,r) in enumerate(zip(es,ims,raw)):
    x=(k%cols)*cw; y=(k//cols)*ch; S.paste(i,(x,y+40)); d.text((x+2,y+2),e['file'][:50],fill='black'); d.text((x+2,y+18),f"{eng} {r.size}",fill='red')
  S.save(f'check-sheets/{eng}-{size}.png')
