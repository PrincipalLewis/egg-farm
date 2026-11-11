# Screenshot manifest for #62 @ 09cee47: every shot in shots/<engine>/ mapped to the measurement record that produced it.
import json,glob,os,hashlib
Q=os.path.dirname(os.path.abspath(__file__));M=[];seen=set()
OPENED={'chromium/clip-09cee47-farmtab-hens-pct-star-w1280.png','chromium/value-truncated-nostar-chip-w360.png','chromium/lin-09cee47-closed-main-with-eggs-orders-w360.png','chromium/flip-income-tick-t60-w375.png'}
CONTACT={'contact/p62-strip-w360.png':'*-strip-w360','contact/p62-chip-w360.png':'*-chip-w360'}
def add(shot,src,meas):
    p=os.path.join(Q,shot);ok=os.path.exists(p)
    M.append({'shot':shot,'exists':ok,'sha256':hashlib.sha256(open(p,'rb').read()).hexdigest()[:16] if ok else None,'source':src,**meas});seen.add(shot)
for f in sorted(glob.glob(Q+'/browser/entries-*.jsonl')):
    for l in open(f):
        r=json.loads(l)
        if 'strip' in r:
            for s in r['shots']: add(s,os.path.basename(f),{'engine':r['engine'],'size':r['size'],'case':r['case'],'build_id':r['build_id'],'asserted_tab':r['asserted_tab'],'strip':r['strip']['text'],'status':r['strip']['status'],'name':r['a11y'].get('cdpName') or r['a11y'].get('pwName'),'desc':r['a11y'].get('cdpDesc'),'chip':r['chip']['key'],'view':'strip (sheet closed)' if s.endswith(f"-strip-w{r['size'].split('x')[0]}.png") else 'chip (sheet open)'})
        elif 'samples' in r:
            for s,when in zip(r['shots'],['before','t60','t1360']): add(s,os.path.basename(f),{'engine':r['engine'],'size':r['size'],'case':r['case'],'build_id':r['build_id'],'asserted_tab':r['asserted_tab'],'when':when,'measured':r['pre'] if when=='before' else r[when],'badSamples':r['badCount'],
                'note':'shot taken after the measurement; for flip-income-tick the Market Hand sale can land between the +60ms read and the shot' if r['case']=='flip-income-tick' and when=='t60' else None})
for f in sorted(glob.glob(Q+'/lin/lin-*-[0-9]*.jsonl')):
    for l in open(f):
        r=json.loads(l);add(r['shot'],os.path.basename(f),{'build_id':r['build_id'],'scene':r['scene'],'w':r['w'],'sheet':r['sheet']['openSheets'],'activeTab':r['activeTab'],'goal':r['sheet']['goal'],'axeLIN':[v['target'] for v in r['axeRunOnly']['violations']]})
for f in sorted(glob.glob(Q+'/clip/clip-09cee47-chromium-*.jsonl')):
    for l in open(f):
        r=json.loads(l)
        if 'shot' in r: add(r['shot'],os.path.basename(f),{'build_id':r['build_id'],'scene':r['scene'],'w':r['w'],'state':r['state'],'goal':r['goal'],'chips':len(r['chips']),'maxRows':len(r['maxRows'])})
ax=json.load(open(Q+'/axe/axe-results.json'))
for r in ax['runs']: add(r['shot'],'axe-results.json',{'build_id':r['build_id'],'case':r['case'],'w':r['w'],'strip':r['strip']['label'],'ariaLabel':r['strip']['ariaLabel'],'linViolations':len(r['labelInName']['allViolations'])})
for m in M: m['opened']=m['shot'].replace('shots/','') in OPENED or any(m['shot'].endswith(x.split('*')[1]+'.png') and 'lin-' not in m['shot'] and 'clip-' not in m['shot'] and 'axe-' not in m['shot'] for x in CONTACT.values())
allshots={os.path.relpath(p,Q) for p in glob.glob(Q+'/shots/*/*.png')}
orphans=sorted(allshots-seen)
json.dump({'shots':M,'orphans_overwritten_or_unreferenced':orphans,'opened_individually':sorted(OPENED),'contact_sheets':CONTACT},open(Q+'/shots/manifest.json','w'),indent=1)
print(len(M),'entries',sum(m['opened'] for m in M),'opened', len(orphans),'orphans',sum(not m['exists'] for m in M),'missing')
