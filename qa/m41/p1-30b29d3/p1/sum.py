import json,glob,collections,sys
rows=collections.OrderedDict()
for f in sorted(glob.glob('p1/p1-*-*.jsonl')):
    for l in open(f):
        d=json.loads(l)
        if d.get('rt')!='check': continue
        k=(d['engine'],d['w'],d.get('sec'))
        r=rows.setdefault(k,[0,0,[]])
        if d['pass']: r[0]+=1
        else: r[1]+=1; r[2].append(d['name'][:110])
for k,(p,fl,n) in rows.items():
    print(k,p,fl, '' if not fl else ' | '.join(sorted(set(x.split(':')[0]+':'+x.split(':')[1][:60] if ':' in x else x for x in n)))[:400])
