import json,glob,sys
for f in sorted(glob.glob('entries-*.jsonl')):
  L=[json.loads(x) for x in open(f)]
  d=[x for x in L if x.get('done')]
  print('==',f,'done' if d else 'INCOMPLETE','after-fails',len(d[0]['fails']) if d else '?')
  if d:
    for m in d[0]['fails']: print('  FAIL',m)
    print('  before-defects',d[0]['beforeDefects'])
  for x in L:
    s=x.get('section')
    if s=='UX-M3+R-b': print(f"  {x['lab']} M3 refund={x['refund']} end={x['end']} place={x['place']} tabsCov={[t['cov'] for t in x['tabs']]} buyCoveredWhileUp={x['coveredWhileUp']} gone={x['goneAfter']} buysAfterOK={all(b['centreHitsBuy'] and b['coveredPts']==0 for b in x['buysAfter'])} small={[t['n'] for t in x['sweep']['small']]} clip={[c['n'] for c in x['sweep']['clip']]}")
    if s=='UX-M2': print(f"  {x['lab']} M2 notice={x['notice']} collect={x['collect']} pts={x['collectPts']} basket={x['basket']} overGoal={x['overGoal']} overMeter={x['overMeter']}")
    if s=='R-a':
      v=x['violations']; print(f"  {x['lab']} R-a {x['state']}: {len(x['orders'])} cards, violations={[(a['id'],a['cls'],a['fs'],a['sw'],a['cw']) for a in v]} eggsOK={[o['eggsPresent'] and not o['eggsClipped'] for o in x['orders']]} minFont={min(p['fs'] for o in x['orders'] for p in o['parts'])}")
    if s=='regression':
      for k,v in x['states'].items(): print(f"  {x['lab']} reg {k}: small={[t['n']+' h'+str(t['h'])+' w'+str(t['w']) for t in v['sweep']['small']]} clip={[c['n'] for c in v['sweep']['clip']]} ovx={v['sweep']['overflowX']}")
    if s=='UX-M5': print(f"  {x['lab']} M5 pop={x['pop']} fade={x['fade']}")
    if s=='UX-M1': print(f"  {x['lab']} M1 {[ (m['sh'],m['how'],m['ring'] and (m['ring']['el'],m['ring']['width'],m['ring']['color'])) for m in x['m1']]}")
