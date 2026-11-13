import sys; sys.argv=[sys.argv[0]]
exec(open('/workspace/m2val.py').read().split("if __name__")[0])
if __name__ == '__main__':
  TB=[(18,1.5),(19,2.0),(21,2.5),(22,3.0),(24,4.0)]
  def R(manage='managed', w1u=1, w2u=3, keep=0.0, use=('w1','w2','w3','w4')):
    s=spec(w1__fee=0.0, w1__wage_per_f_min=0.25, w1__defer=0, w1__unlock=w1u, w3__unlock=8, w3__cost=800, w2__unlock=w2u); s['w4']=TB; s['w4_asleep_keep']=keep
    return dict(spec=s, manage=manage, use=use)
  scen=[('M1 (no workers)', dict()),
    ('R2: W1 F1, W2 F10, managed', R(w2u=10)),
    ('R2: W1 F3, W2 F10, managed', R(w1u=3, w2u=10)),
    ('R2 (W1 F3, W2 F10) unmanaged, Grader asleep keeps 0%', R('unmanaged', 3, 10, 0.0)),
    ('R2 unmanaged, Grader asleep keeps 25%', R('unmanaged', 3, 10, 0.25)),
    ('R2 unmanaged, Grader asleep keeps 50%', R('unmanaged', 3, 10, 0.5)),
    ('R2 managed, asleep keep 50% (no effect when managed)', R('managed', 3, 10, 0.5)),
  ]
  res=runall(scen, list(MODELS), seeds=100); json.dump(res, open('/workspace/m2val4.json','w')); print('done')
