import json, copy
f='tests/fixtures/m5c/rules-cases.json'; d=json.load(open(f)); C=d['cases']
assert not any(c['group']=='SS-48t' for c in C)
for c in C:
  g,n=c['group'],c['name']
  if g=='SS-41' and n=='N coins focusable (flag-off not)': c['whyHas']='FC-SV16'
  if g=='SS-41' and n.startswith('P coins focusable but flag-off'): c['name']='N coins focusable even when flag-off is too (G38 CLOSED, FC-SV16)'; c['pass']=False; c['whyHas']='FC-SV16'
  if g=='SS-39a':
    for a in c['args']:
      if isinstance(a,dict) and isinstance(a.get('name'),str): a['name']=a['name'].replace('Open workers.','Show details.')
  if g=='SS-40a':
    for a in c['args']:
      if isinstance(a,dict): a.setdefault('popRole','group'); a.setdefault('labelledbyIsText',True)
    if n=='N 739 not anchored': c['whyHas']='popover'
    if 'SS-G31' in n: c['name']='P popover 360x739 exact (FC-SV12)'
  if g=='SS-38c' and n.startswith('P Manage focus'):
    c['name']='P Manage focus -> chip on 740->739 (FC-SV11)'; c['args'][0].update(activeTag='chip',focusOn='chip',toIcon=True); c.pop('whyHas',None)
base39=next(c for c in C if c['group']=='SS-39a' and c['name']=='P exact raw name')['args'][0]
def A(**k): x=dict(base39); x.update(k); return x
X='$999.9K'; W=lambda X:f"Tired \u2212{X}/s"; D=lambda st='Tired': f'{st} workers are costing {X} per second. Open workers.'
def K(g,n,fn,args,ok=None,why=None,want=None):
  c=dict(group=g,name=n,fn=fn,args=args)
  if want is not None: c['want']=want
  else: c['pass']=ok
  if why: c['whyHas']=why
  return c
SL=lambda **k: dict(dict(variant='subline',vw=360,X=X,ariaLabel=None,name=W(X),desc=D()),**k)
new=[K('SS-39a','P asleep chip name','a11yVerdict',[A(state='asleep',name=f'Asleep and tired workers are costing {X} per second. Show details.')],True),
 K('SS-39a','N asleep chip with Tired sentence','a11yVerdict',[A(state='asleep')],False,'Asleep and tired'),
 K('SS-39a','N chip still says Open workers (v1.3.22 string)','a11yVerdict',[A(name=f'Tired workers are costing {X} per second. Open workers.')],False,'Show details'),
 K('SS-39s','P sub-line 360 name = visible text','a11yVerdict',[SL()],True),
 K('SS-39s','P sub-line 400 name = long visible text','a11yVerdict',[SL(vw=400,name=f'Tired workers \u2212{X}/s')],True),
 K('SS-39s','P sub-line asleep 390','a11yVerdict',[SL(vw=390,state='asleep',desc=D('Asleep and tired'))],True),
 K('SS-39s','N sub-line 400 uses short text','a11yVerdict',[SL(vw=400)],False,'name raw'),
 K('SS-39s','N sub-line with .sr suffix in name','a11yVerdict',[SL(name=W(X)+' Open workers.')],False,'name raw'),
 K('SS-39s','N sub-line with decorative warning in name','a11yVerdict',[SL(name='\u26a0 '+W(X))],False,'\u26a0'),
 K('SS-39s','N sub-line aria-label','a11yVerdict',[SL(ariaLabel=W(X))],False,'aria-label'),
 K('SS-39s','N sub-line trailing space (norm would match)','a11yVerdict',[SL(name=W(X)+' ')],False,'diagnostic only'),
 K('SS-39s','N sub-line asleep with Tired description','a11yVerdict',[SL(state='asleep')],False,'description'),
 K('SS-38c','N Manage focus -> settings (FC-SV11)','resizeLegVerdict',[{"leg":"i-m","crossed":True,"openBefore":True,"openAfter":False,"cueBefore":"tired","cueAfter":"tired","activeTag":"settings","activeVisible":True,"newEvents":0,"focusWas":"manage","focusOn":"settings","toIcon":True}],False,'FC-SV11'),
 K('SS-38c','P focus on body stays body (unchanged)','resizeLegVerdict',[{"leg":"ii","crossed":True,"openBefore":False,"openAfter":False,"cueBefore":"tired","cueAfter":"tired","activeTag":"body","activeVisible":False,"activeBefore":"body","newEvents":0,"focusWas":"body","focusOn":"body"}],True),
 K('SS-38c','N focus on settings moved','resizeLegVerdict',[{"leg":"ii","crossed":True,"openBefore":False,"openAfter":False,"cueBefore":"tired","cueAfter":"tired","activeTag":"chip","activeVisible":True,"activeBefore":"settings","newEvents":0,"focusWas":"settings","focusOn":"chip"}],False,'otherwise unchanged')]
p40=next(c for c in C if c['group']=='SS-40a' and c['name']=='P popover 360x640')
for nm,patch,why in [('N popover role dialog',{'popRole':'dialog'},'role=dialog'),('N popover labelledby missing',{'labelledbyIsText':False},'aria-labelledby'),('N Shift+Tab from Manage leaves',{'shiftTab':'settings'},'Shift\\+Tab'),('N popover not next sibling',{'nextSiblingOfChip':False},'next DOM sibling')]:
  c=copy.deepcopy(p40); c['name']=nm; c['args'][0].update(patch); c['pass']=False; c['whyHas']=why; new.append(c)
c=copy.deepcopy(p40); c['name']='P popover 960x600 docked short (FC-SV13)'; c['args'][0].update(vp='960x600',vw=960,shiftTab='chip',nextSiblingOfChip=True); new.append(c)
p41=next(c for c in C if c['group']=='SS-41' and c['name'].startswith('P'))
c=copy.deepcopy(p41); c['name']='N basket pill has a click handler (FC-SV16)'; c['args'][0]['basketListeners']=['click']; c['pass']=False; c['whyHas']='handlers'; new.append(c)
ev=lambda *n:[{'type':x} for x in n]; SO=lambda **k: dict(type='shift_sheet_opened',entry='fatigue_chip',sheet_id='k1',**k)
for act,evs,ok in [('chipOpen',ev('fatigue_cue_tapped'),True),('chipClose',ev('fatigue_cue_tapped'),True),('chipClose',[],False),('pillTap',ev('fatigue_cue_tapped'),True),('esc',[],True),('esc',ev('fatigue_cue_tapped'),False),('outside',[],True),('outside',ev('fatigue_cue_tapped'),False),('resize',[],True),('resize',ev('fatigue_cue_tapped'),False),('resolve',[],True),('resolve',ev('fatigue_cue_resolved'),False),('chipOpen',ev('fatigue_cue_tapped','fatigue_cue_tapped'),False),
  ('manage',[SO()],True),('manage',[SO(),{'type':'fatigue_cue_tapped'}],False),('manage',[SO(stall_id='s1')],False),('manage',[dict(SO(),entry='stall_chip')],False)]:
  new.append(K('SS-48t',('P ' if ok else 'N ')+act+' ['+','.join(e['type'] for e in evs)+']'+(' stall_id' if any('stall_id' in e for e in evs) else '')+(' stall_chip' if any(e.get('entry')=='stall_chip' for e in evs) else ''),'tappedVerdict',[{'action':act,'events':evs}],ok))
s=lambda dt,sh,st=False: dict(dt=dt,share=sh,**({'stall':True} if st else {}))
tr1=[s(1,0.2)]*6; tr2=tr1+[s(0.5,0.1)]*3+[s(0.5,0.13)]+[s(1,0.2)]*6; tr3=tr1+[s(0.5,0.1)]*5+[s(1,0.2)]*6; tr4=tr1+[s(1,0.13)]*5; tr5=[s(1,0.2,True)]*6
new+=[K('SS-49','P one episode','expectedEpisodes',[tr1],want=[{'suppressed_by_stall':False}]),
 K('SS-49','P dip 1.5 s under 0.12 = same episode','episodeVerdict',[tr2,ev('fatigue_cue_shown')],True),
 K('SS-49','N dip 1.5 s re-fired shown','episodeVerdict',[tr2,ev('fatigue_cue_shown','fatigue_cue_shown')],False,'hysteresis'),
 K('SS-49','P clear held 2.5 s = new episode','episodeVerdict',[tr3,ev('fatigue_cue_shown','fatigue_cue_shown')],True),
 K('SS-49','N clear held 2.5 s but one shown','episodeVerdict',[tr3,ev('fatigue_cue_shown')],False),
 K('SS-49','P share 0.13 does not end the episode','expectedEpisodes',[tr4+tr1],want=[{'suppressed_by_stall':False}]),
 K('SS-49','P suppressed_by_stall true at eligibility','episodeVerdict',[tr5,[{'type':'fatigue_cue_shown','suppressed_by_stall':True}]],True),
 K('SS-49','N suppressed_by_stall false while stall up','episodeVerdict',[tr5,[{'type':'fatigue_cue_shown','suppressed_by_stall':False}]],False,'suppressed_by_stall'),
 K('SS-49','N resolved event emitted','episodeVerdict',[tr1,ev('fatigue_cue_shown','fatigue_cue_resolved')],False,'resolved'),
 K('SS-47','P stall mid-episode','stallVerdict',[{'popoverOpenAfter':False,'expectFocusStall':True,'active':'stall','events':[],'cueAfterClear':'shown'}],True),
 K('SS-47','N popover stays open','stallVerdict',[{'popoverOpenAfter':True,'expectFocusStall':True,'active':'stall','events':[],'cueAfterClear':'shown'}],False,'still open'),
 K('SS-47','N focus to body','stallVerdict',[{'popoverOpenAfter':False,'expectFocusStall':True,'active':'body','events':[],'cueAfterClear':'shown'}],False,'stall chip'),
 K('SS-47','N shown re-fired after stall clears','stallVerdict',[{'popoverOpenAfter':False,'expectFocusStall':True,'active':'stall','events':ev('fatigue_cue_shown'),'cueAfterClear':'shown'}],False,'re-fired'),
 K('SS-47','P focus elsewhere unchanged (popover closed)','stallVerdict',[{'popoverOpenAfter':False,'expectFocusStall':False,'activeBefore':'settings','active':'settings','events':[],'cueAfterClear':'shown'}],True),
 K('SS-47','N focus elsewhere stolen','stallVerdict',[{'popoverOpenAfter':False,'expectFocusStall':False,'activeBefore':'settings','active':'stall','events':[],'cueAfterClear':'shown'}],False,'only moves'),
 K('SS-36f','P fatigue_chip conversion','fatigueConversionVerdict',[[SO(),{'type':'refill_used','by':'manual','sheet_id':'k1'},SO(sheet_id='k2') if False else dict(SO(),sheet_id='k2'),{'type':'refill_used','by':'manual','sheet_id':'k1'}],[{'converted':True},{'converted':False}]],True),
 K('SS-36f','N refill on other sheet joined by time','fatigueConversionVerdict',[[dict(SO(),sheet_id='k2'),{'type':'refill_used','by':'manual','sheet_id':'k1'}],[{'converted':True}]],False),
 K('LAYOUT-collect','P Collect 48 exempt','layoutVerdict',[{'labels':[{'sel':'.fp-x','sw':100,'cw':100}],'buttons':[{'sel':'#collect','w':344,'h':48},{'sel':'.fpop-manage','w':82,'h':44}]}],True),
 K('LAYOUT-collect','N Manage at 48 not exempt','layoutVerdict',[{'labels':[{'sel':'.fp-x','sw':100,'cw':100}],'buttons':[{'sel':'.fpop-manage','w':82,'h':48}]}],False,'44<=h<46'),
 K('LAYOUT-collect','N Collect at 64 (retired XL)','layoutVerdict',[{'labels':[{'sel':'.fp-x','sw':100,'cw':100}],'buttons':[{'sel':'#collect','w':344,'h':64}]}],False,'!= 48')]
C+=new; d['src']='spec v1.3.24 b95d5cf8 (was v1.3.22 8244e066) / Art v1.3.1 b23ae9e7 (on v1.3 115891d4) / evidence 34e86e22 / plan v0.12 bca212f4 (v0.13 pending)'
json.dump(d,open(f,'w'),ensure_ascii=False,indent=1)
