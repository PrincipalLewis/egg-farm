import json, glob, collections

tot_taps = collections.Counter()
tot_states = collections.Counter()
for f in sorted(glob.glob('/workspace/egg-farm-studio/qa/m41/rc1-5d9efa6-ui/browser/tap-*.jsonl')):
  L = [json.loads(x) for x in open(f)]
  done = [x for x in L if x.get('done')]
  errs = [x for x in L if x.get('error')]
  states = [x for x in L if x.get('recordType') == 'state']
  taps = [x for x in L if x.get('recordType') == 'tap' or ('outcome' in x and 'recordType' not in x)]
  nones = [x for x in L if x.get('recordType') == 'none-contract']
  bn = f.split('/')[-1]
  print(f"== {bn} {'COMPLETE' if done else 'INCOMPLETE'} errors={len(errs)} pageerrors={done[-1]['pageerrors'] if done else '?'}")
  for e in errs: print('  ERR', e)
  a_states = [x for x in states if x['lab'] == 'after']
  ov_states = [x for x in a_states if x.get('anyOverlap')]
  places_state = collections.Counter(x['place'] for x in a_states)
  print(f"  AFTER states={len(a_states)} anyOverlap={len(ov_states)} places={dict(places_state)}")
  for lab in ['before', 'after']:
    for inp in ['mouse', 'touch']:
      sub = [x for x in taps if x['lab'] == lab and x['input'] == inp]
      if not sub: continue
      outcomes = collections.Counter(x['outcome'] for x in sub)
      ov = sum(1 for x in sub if x.get('overlapsBuy'))
      efp_buy = sum(1 for x in sub if x.get('efpIsBuy'))
      efp_card = sum(1 for x in sub if x.get('efpInCard'))
      prev = sum(len(x.get('preventOrStop', [])) for x in sub)
      print(f"  {lab:6s} {inp:5s}: taps={len(sub):3d} outcomes={dict(outcomes)} overlapsBuy={ov} efpIsBuy={efp_buy}/{len(sub)} efpInCard={efp_card} preventOrStop={prev}")
      for k, v in outcomes.items():
        tot_taps[(lab, inp, k)] += v
  for nc in nones:
    d = nc['dismissAfterRePlace']
    d_ok = all(v['cardGone'] and v['popPlayed'] and v['coinsPlayed'] == 3 for v in d.values())
    print(f"  none-contract ({nc['input']}): at0={nc['at0']['place']} at200={nc['at200']['place']}(vis={nc['at200']['vis']}) "
          f"buyWhileNone={nc['buyWhileNone']} rePlaceEnd={nc['rePlaceEnd']['place']}(ov={nc['rePlaceEnd']['anyOverlap']}) "
          f"rePlace0={nc['rePlace0']['place']}(ov={nc['rePlace0']['anyOverlap']}) "
          f"rePlaceColl={nc['rePlaceCollection']['place']} rePlaceClosed={nc['rePlaceSheetClosed']['place']} dismissAllOk={d_ok}")

print("\n=== GRAND TOTAL TAPS BY (lab, input, outcome) ===")
for k, v in sorted(tot_taps.items()):
  print(" ", k, v)
