import sys; sys.argv=[sys.argv[0]]
exec(open('/workspace/m2val.py').read().split("if __name__")[0])
if __name__ == '__main__':
  TB=[(18,1.5),(19,2.0),(21,2.5),(22,3.0),(24,4.0)]
  def R(w3u, w3c, manage='managed', use=('w1','w2','w3','w4')):
    s=spec(w1__fee=0.0, w1__wage_per_f_min=0.25, w1__defer=0, w3__unlock=w3u, w3__cost=w3c); s['w4']=TB
    return dict(spec=s, manage=manage, use=use)
  scen=[('M1 (no workers)', dict()),
    ('R: W3 at F5 $400, managed', R(5,400)),
    ('R: W3 at F8 $800, managed', R(8,800)),
    ('R: W3 at F10 $1500, managed', R(10,1500)),
    ('R (W3 F8) unmanaged', R(8,800,'unmanaged')),
    ('R (W3 F8) W1+W2+W3 only', R(8,800,use=('w1','w2','w3'))),
  ]
  res=runall(scen, list(MODELS), seeds=100); json.dump(res, open('/workspace/m2val3.json','w')); print('done')
