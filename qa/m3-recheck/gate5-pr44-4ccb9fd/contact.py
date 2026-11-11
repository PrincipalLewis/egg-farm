import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
ims=[Image.open(f).convert('RGB') for f in files]; s=0.5
th=[im.resize((int(im.width*s),int(im.height*s))) for im in ims]
cols=4; rows=(len(th)+cols-1)//cols; cw=max(t.width for t in th); ch=max(t.height for t in th)+18
sheet=Image.new('RGB',(cols*cw,rows*ch),'white'); d=ImageDraw.Draw(sheet)
for i,(t,f) in enumerate(zip(th,files)):
  x,y=(i%cols)*cw,(i//cols)*ch; sheet.paste(t,(x,y+18)); d.text((x+2,y+2),f.split('/shots/')[-1][:70],fill='black')
sheet.save(out)
