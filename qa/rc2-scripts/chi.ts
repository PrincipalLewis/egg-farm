import { balance as b } from '/tmp/efs/game/src/config/balance';
import { initialState, demandRange } from '/tmp/efs/game/src/sim/state';
import { step } from '/tmp/efs/game/src/sim/tick';
// first-customer demand per seed (F0: 8..16, 9 buckets); seeds 1..N small + large
function first(seed:number){ let s=initialState(b,seed); while(!s.customers.length) s=step(s,0.1,b); return s.customers[0].demand; }
const [lo,hi]=demandRange(0,b), K=hi-lo+1;
function test(name:string, seeds:number[]){ const c=new Array(K).fill(0); for(const sd of seeds) c[first(sd)-lo]++;
  const e=seeds.length/K, chi=c.reduce((a,o)=>a+(o-e)**2/e,0), maxDev=Math.max(...c.map(o=>Math.abs(o-e)/e));
  // chi-square df=8 critical 0.01 = 20.09
  console.log(`${name}: n=${seeds.length} counts ${c.join(',')} chi2=${chi.toFixed(2)} (crit 20.09 @p=.01) maxBucketDev ${(maxDev*100).toFixed(1)}% min-share ${(c[0]/seeds.length*100).toFixed(1)}% -> ${chi<20.09&&maxDev<0.25?'PASS':'FAIL'}`); }
test('seeds 1..2000 (first customer)', Array.from({length:2000},(_,i)=>i+1));
test('seeds 1..20', Array.from({length:20},(_,i)=>i+1));
test('large seeds', Array.from({length:2000},(_,i)=>(1700000000+i*7919)>>>0));
// all customers over 30 min, seed 1..50, at F0 (no upgrades) - stream uniformity
const c=new Array(K).fill(0); for(let sd=1;sd<=50;sd++){let s=initialState(b,sd),seen=0; for(let i=0;i<18000;i++){s=step(s,0.1,b); for(const x of s.customers) if(x.id>seen){seen=x.id;c[x.demand-lo]++;} s={...s,customers:[]};}}
const n=c.reduce((a,x)=>a+x,0),e=n/K,chi=c.reduce((a,o)=>a+(o-e)**2/e,0); console.log(`stream F0 n=${n} chi2=${chi.toFixed(2)} -> ${chi<20.09?'PASS':'FAIL'}`);
