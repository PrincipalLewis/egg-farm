import sys; sys.argv=[sys.argv[0]]
exec(open('/workspace/m2val.py').read().split("if __name__")[0])
if __name__ == '__main__':
  W13=('w1','w3')
  scen=[('M1 (no workers)', dict())]
  for g in (10, 20, 25):
    scen.append((f'W1+W3 idle-gate {g}s, fee 10%', dict(spec=spec(w1__idle_gate=g, w1__defer=0), use=W13)))
  for wage in (0.25, 0.5):
    scen.append((f'W1+W3 no fee, wage ${wage}×F/min', dict(spec=spec(w1__fee=0.0, w1__wage_per_f_min=wage, w1__defer=0), use=W13)))
  scen.append(('W1+W3 idle-gate 20s + fee 10%, Hawker F10 $1500', dict(spec=spec(w1__idle_gate=20, w1__defer=0, w3__unlock=10, w3__cost=1500), use=W13)))
  T1=[(18,1.25),(20,1.6),(21,2.0),(23,2.8),(24,4.0)]
  T2=[(18,1.5),(19,2.0),(21,2.5),(22,3.0),(24,4.0)]
  T3=[(18,1.5),(19,2.0),(20,2.5),(21,3.0),(22,4.0),(24,6.0)]
  for nm,T in (('v0.1',T1),('B: x2 @F19',T2),('C: x3 @F21, x6 @F24',T3)):
    for share in (0.5, 0.25):
      s=copy.deepcopy(S); s['w4']=T; s['w4_cost_share']=share
      scen.append((f'W4 tiers {nm}, cost {share}×Farm', dict(spec=s, use=('w4',))))
  res=runall(scen, list(MODELS), seeds=100); json.dump(res, open('/workspace/m2val2.json','w')); print('done')
