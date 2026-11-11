import {it,expect} from 'vitest'; import {readFileSync} from 'node:fs'; import {PyRandom} from '/tmp/r19/tests/py-random';
it('mt',()=>{const ref=JSON.parse(readFileSync('/tmp/pyref.json','utf8'));let bad=0,maxrel=0,n=0;
for(const [s,arr] of Object.entries(ref) as any){const r=new PyRandom(Number(s));const got=[...Array(700)].map(()=>r.random()).concat([...Array(50)].map(()=>r.uniform(0.75,1.25)),[...Array(200)].map(()=>r.normalvariate(0,0.35)),[...Array(200)].map(()=>r.lognormvariate(0,0.15)));
got.forEach((g,i)=>{n++;const e=arr[i];if(i<750&&g!==e)bad++;if(g!==e)maxrel=Math.max(maxrel,Math.abs(g-e)/Math.abs(e));});}
console.log('exact-mismatch(random/uniform)',bad,'of',n,'maxrel all',maxrel);expect(bad).toBe(0);});
