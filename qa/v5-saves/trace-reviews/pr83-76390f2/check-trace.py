import re,sys,json
body=open('pr-body.md').read()
rows=[]
for ln in body.splitlines():
    m=re.match(r'\| (.+?) \| (.+?) \| (tests/\S+) :: (.+) \|$',ln)
    if m: rows.append(m.groups())
log=open('01-vitest-p2.log').read()
passed=set()
for ln in log.splitlines():
    m=re.match(r'\s*✓ (tests/\S+) > (.+?)(?: \d+ms)?$',ln)
    if m: passed.add((m.group(1),m.group(2).strip()))
def norm(s): return s.replace('\\\\','\\').replace('<','<').strip()
out=[];bad=0
for ac,item,f,name in rows:
    n=norm(name); key=(f,n)
    hit=key in passed
    ids=re.findall(r'(UI-[A-Z0-9]+-\d+|AC-R\d+|TP1-U\d|CCR-70-n\d|ART-70-n\d|WCAG-2\.4\.11)',ac)
    it=n.split(' > ')[-1]
    # AC id(s) in the it() title: expand "UI-M9-1/2/6" style
    first=ac.split(',')[0].strip()
    acs=[a.strip() for a in ac.split(',')]
    titled=all(a.split('/')[0] in it or a.split('/')[0] in n for a in acs)
    if not hit: bad+=1
    out.append((ac,f,hit,titled,n))
    print(('FOUND ' if hit else 'MISSING ')+('ID-IN-TITLE ' if titled else 'ID-NOT-IN-TITLE ')+ac+' :: '+f+' :: '+n)
print(f'rows={len(rows)} found={sum(o[2] for o in out)} missing={bad} titled={sum(o[3] for o in out)}')
