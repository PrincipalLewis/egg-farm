import { balance as b } from '/tmp/efs/game/src/config/balance';
import { initialState } from '/tmp/efs/game/src/sim/state';
import { step, advance } from '/tmp/efs/game/src/sim/tick';
import { apply } from '/tmp/efs/game/src/sim/actions';
import { offlineEggs } from '/tmp/efs/game/src/sim/offline';
const R:string[]=[]; const ok=(id:string,c:boolean,info='')=>R.push(`${c?'PASS':'FAIL'} ${id} ${info}`);
const run=(s:any,sec:number,ev?:any[])=>advance(s,sec*1000,0,b,ev).state;
// AC1
let s=run(initialState(b,5),10); ok('AC1 rate',Math.abs(s.coop-10)<0.11,`coop@10s=${s.coop.toFixed(3)}`);
s=run(s,60); ok('AC1 cap F0',s.coop===50,`coop=${s.coop}`);
s=run({...initialState(b,5),farmLevel:1},200); ok('AC1 cap F1',s.coop===100);
// AC2
let t={...initialState(b,1),coop:3}; let a=apply(t,{type:'collect'},b); ok('AC2 coop3',a.basket===3&&a.coop===0);
a=apply({...t,coop:0},{type:'collect'},b); ok('AC2 coop0',a.basket===0&&a.coop===0);
a=apply({...t,coop:0.999},{type:'collect'},b); ok('AC2 fractional',a.basket===0&&Math.abs(a.coop-0.999)<1e-9);
// Q1 full queue + Q2 timeout
let ev:any[]=[]; s=run(initialState(b,7),40.05,ev);
const arr=ev.filter(e=>e.type==='customer_arrive').length, fq=ev.filter(e=>e.reason==='full_queue').length, to=ev.filter(e=>e.reason==='timeout').length;
ok('Q1 full_queue at 40s',arr===3&&s.customers.length<=3&&(fq+to)>=1,`arrivals ${arr} full_queue ${fq} timeout ${to}`);
ev=[]; s=run(initialState(b,7),39.95,ev); ok('Q2 A still present at 39.9s',s.customers.some((c:any)=>c.id===1));
ev=[]; s=run(s,0.1,ev); ok('Q2 A leaves at 40s, lost timeout',!s.customers.some((c:any)=>c.id===1)&&ev.some(e=>e.type==='customer_lost'&&e.reason==='timeout'&&e.id===1));
// Q3 partial + Q7
s=run(initialState(b,7),10.05); s={...s,customers:[{...s.customers[0],demand:10}],basket:3};
s=run(s,15); a=apply(s,{type:'sellAll'},b); ok('Q3 partial sale $3, stays wanting 7',a.coinsCents===300&&a.customers[0]?.demand-a.customers[0]?.filled===7);
ev=[]; let z=run(a,14.9,ev); ok('Q3 still there at 39.9s',z.customers.some((c:any)=>c.id===1)); ev=[]; z=run(z,0.1,ev);
ok('Q3/Q7 leaves at 40s as customer_partial',ev.some(e=>e.type==='customer_partial'&&e.id===1)&&!ev.some(e=>e.type==='customer_lost'&&e.id===1));
let full={...initialState(b,7),basket:100,customers:[{id:9,demand:5,filled:0,waitedS:0}]}; a=apply(full,{type:'sellAll'},b); ok('Q3 full serve leaves now',a.customers.length===0&&a.coinsCents===500);
// Q4 grid
ev=[]; s=run(initialState(b,7),95.05,ev); const times:number[]=[]; {let x=initialState(b,7); for(let i=1;i<=951;i++){const e2:any[]=[]; x=step(x,0.1,b,e2); if(e2.some(e=>e.type==='customer_arrive'||e.reason==='full_queue')) times.push(Math.round(i)/10);}}
ok('Q4 arrivals on 10 s grid incl. full queue',times.join()==='10,20,30,40,50,60,70,80,90',times.join());
// Q5
for(const [F,q] of [[9,3],[10,4],[19,4],[20,5],[30,5]]){ev=[]; s=run({...initialState(b,3),farmLevel:F},120,ev); ok(`Q5 F${F} queue max ${q}`,Math.max(s.customers.length)<=q&&ev.some(e=>e.reason==='full_queue'),`len ${s.customers.length}`);}
// AC3 demand bounds
let okd=true; for(const F of [0,10,20,30]){ev=[]; run({...initialState(b,11),farmLevel:F},2000,ev); const [lo,hi]=[...(await import('/tmp/efs/game/src/sim/state')).demandRange(F,b)]; for(const e of ev) if(e.type==='customer_arrive'&&(e.N<lo||e.N>hi)) okd=false;} ok('AC3 demand within bounds F0/10/20/30',okd);
// AC4/Q8
a=apply({...initialState(b,1),farmLevel:1,collectionLevel:1,basket:7,customers:[{id:1,demand:7,filled:0,waitedS:0}]},{type:'sellAll'},b); ok('Q8 7 eggs F1/C1 = $8.26',a.coinsCents===826);
// AC5
const c0={...initialState(b,1),coinsCents:999}; ok('AC5 cannot afford $10',apply(c0,{type:'buyCollection'},b).collectionLevel===0);
a=apply({...c0,coinsCents:1000},{type:'buyCollection'},b); ok('AC5 exact afford -> 0 coins, C1',a.coinsCents===0&&a.collectionLevel===1);
a=apply({...c0,coinsCents:10000},{type:'buyFarm'},b); ok('AC5 farm 100 -> F1',a.farmLevel===1&&a.coinsCents===0);
a=apply({...c0,coinsCents:1e12,farmLevel:30,collectionLevel:30},{type:'buyFarm'},b); ok('AC6 max L30',a.farmLevel===30);
// AC11 offline formula O1-O6
const O:[string,number,number,number][]=[['O1 59s',59,0,0],['O2 60s',60,0,15],['O3 1h F0',3600,0,900],['O3 1h F10',3600,10,9900],['O4 2h F0',7200,0,1800],['O4 2h F10',7200,10,19800],['O5 8h',28800,0,1800],['O5 7d',604800,0,1800],['O6 61s',61,0,15],['O6 62s',62,0,15],['O8 negative',-500,0,0]];
for(const [n,sec,F,e] of O){const g=offlineEggs(sec,F,b); ok(`AC11 ${n}`,g===e,`got ${g} exp ${e}`);}
console.log(R.join('\n')); console.log('TOTAL',R.length,'FAIL',R.filter(x=>x.startsWith('FAIL')).length);
