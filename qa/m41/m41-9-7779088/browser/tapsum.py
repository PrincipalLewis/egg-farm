# python3 tapsum.py  -> per engine/width/lab/input outcome counts + criteria checks
import json,glob,collections
tot=collections.Counter()
for f in sorted(glob.glob('tap-*.jsonl')):
  L=[json.loads(x) for x in open(f)]; done=[x for x in L if x.get('done')]; errs=[x for x in L if x.get('error')]
  taps=[x for x in L if 'outcome' in x]
  print('==',f,'complete' if done else 'INCOMPLETE','errors',len(errs),'pageerrors',done[-1]['pageerrors'] if done else '?')
  for e in errs: print('  ERR',e)
  c=collections.Counter((x['lab'],x['input'],x['outcome']) for x in taps)
  for k,v in sorted(c.items()): print('  ',k,v); tot[(f.split('-')[1],)+k]+=v
  a=[x for x in taps if x['lab']=='after']
  print('   after: activeTabOk all',all(x['activeTabOk'] for x in a),'| overlapsBuy',sum(x['overlapsBuy'] for x in a),'| efpInCard',sum(x['efpInCard'] for x in a),'| efpIsBuy',sum(x['efpIsBuy'] for x in a),'/',len(a),
        '| places',dict(collections.Counter(x['cardPlace'] for x in a)),'| cardOverGoal',sum(bool(x['cardOverGoal']) for x in a),'| preventOrStop',sum(len(x['preventOrStop']) for x in a))
  print('   after kinds', dict(collections.Counter((x['tab'],'refund' if x['refund'] else 'plain',x['kind']) for x in a)))
  pw=[x['popsWhileUp'] for x in a if x['refund']]; pa=[[p for p in x['popsAfterTap'] if 'exp-pop' in p['cls']] for x in a]
  print('   pops: refund taps popsWhileUp',sum(pw),'| exp-pop after tap (refund)',sum(len(p) for x,p in zip(a,pa) if x['refund']),'cardUp at pop',sum(q['cardUp'] for x,p in zip(a,pa) for q in p),'| exp-pop after tap (plain)',sum(len(p) for x,p in zip(a,pa) if not x['refund']),'| dismissed refund taps',sum(x['cardDismissed'] for x in a if x['refund']))
print('TOTAL'); [print(' ',k,v) for k,v in sorted(tot.items())]
