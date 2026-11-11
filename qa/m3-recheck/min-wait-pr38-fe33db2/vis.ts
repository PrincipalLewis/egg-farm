import { balance as b } from '/tmp/mw-fe33/src/config/balance';
import { initialState } from '/tmp/mw-fe33/src/sim/state';
import { advance } from '/tmp/mw-fe33/src/sim/tick';
import { ServedDwell } from '/tmp/mw-fe33/src/ui/served-dwell';
const busy = (seed:number, L=12) => ({ ...initialState(b, seed), farmLevel: L, collectionLevel: 9, coinsCents: 1e7, basket: 1500,
  workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 }, hawker: { energy: 100, cdS: 0 } } } as any);
function vis(dwellMs:number, secs:number, seed:number, L=12) {
  let s:any = busy(seed,L); const d = new ServedDwell(dwellMs); let t=0, v=0, f=0;
  while (t < secs*1000) { const ev:any[]=[]; s = advance(s,100,0,b,ev).state; t+=100;
    for (const e of ev) { if (e.type==='sell') d.sold(e.id,e.value); if (e.type==='customer_served') d.served(e.id,t); }
    f++; if (s.customers.length>0 || (dwellMs>0 && d.active(t).length>0)) v++; }
  return v/f;
}
const q=(a:number[],p:number)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p*(s.length-1)))]};
const st=(a:number[])=>`min ${q(a,0).toFixed(3)} p5 ${q(a,.05).toFixed(3)} med ${q(a,.5).toFixed(3)} p95 ${q(a,.95).toFixed(3)} max ${q(a,1).toFixed(3)}`;
const out:any={};
console.log('test points: before(0,120,s7)',vis(0,120,7).toFixed(3),'after(1500,120,s7)',vis(1500,120,7).toFixed(3),
  'seeds1,2,3,99@60s', [1,2,3,99].map(x=>vis(1500,60,x).toFixed(3)).join(' '));
const S=[...Array(20)].map((_,i)=>i+1);
for (const L of [12,10,14]) for (const dw of [0,1500]) for (const secs of [60,120]) {
  if (L!==12 && secs===120) continue;
  console.log(`L${L} dwell ${dw} ${secs}s n=20: ${st(S.map(x=>vis(dw,secs,x,L)))}`);
}
