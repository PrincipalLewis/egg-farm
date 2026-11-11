import json, glob

for f in sorted(glob.glob('/workspace/egg-farm-studio/qa/m41/m41-9-c877f69/browser/entries-*.jsonl')):
  L = [json.loads(x) for x in open(f)]
  d = [x for x in L if x.get('done')]
  bn = f.split('/')[-1]
  print('==', bn, 'done' if d else 'INCOMPLETE', 'after-fails', len(d[0]['fails']) if d else '?')
  if d:
    for m in d[0]['fails']: print('  FAIL', m)
    print('  before-defects', d[0]['beforeDefects'])
  for x in L:
    s = x.get('section')
    if s == 'UX-M1':
      print(f"  {x['lab']} M1 rows={len(x['m1'])} collectFallback={x.get('collectFallback',{}).get('el')} bodyTapKbd={x.get('bodyTap',{}).get('kbd')}")
    if s == 'UX-M2':
      print(f"  {x['lab']} M2 var={x.get('toastSafeVar')} notice={x['notice']} collect={x['collect']} goal={x['goal']} overGoal={x['overGoal']} pts={x['collectPts']} basket={x['basket']}")
    if s == 'UX-M3+R-b':
      print(f"  {x['lab']} M3 refund={x['refund']} end={x['end']} place={x['place']} buyCoveredWhileUp={x['coveredWhileUp']} gone={x['goneAfter']} buysAfterOK={all(b['centreHitsBuy'] and b['coveredPts']==0 for b in x['buysAfter'])}")
    if s == 'UX-M3-dynamic':
      print(f"  {x['lab']} M3-dynamic s0={x['s0']} s200={x['s200']} sEnd={x['sEnd']} sBack0={x['sBack0']}")
    if s == 'UX-M5':
      print(f"  {x['lab']} M5 pop={x['pop']} pops={x['pops']} coins={x.get('coins')} fade={x['fade']} fxPlain={x['fxPlain']}")
    if s == 'UX-M5-rm':
      print(f"  {x['lab']} M5-rm mode={x['mode']} fx={x['fx']} card={x['card']}")
    if s == 'regression':
      for k, v in x['states'].items():
        print(f"  {x['lab']} reg {k}: small={[t['n'] for t in v['sweep']['small']]} clip={[c['n'] for c in v['sweep']['clip']]} ovx={v['sweep']['overflowX']}")
