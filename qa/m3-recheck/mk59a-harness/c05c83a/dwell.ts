import { balance as b } from '/tmp/mw-c05/src/config/balance';
import { initialState } from '/tmp/mw-c05/src/sim/state';
import { step } from '/tmp/mw-c05/src/sim/tick';
let minW=Infinity, n=0, hist:Record<string,number>={};
for (const seed of [1,2,3,7,99]) for (const L of [5,10,12,14,18]) {
  let s:any={...initialState(b,seed),farmLevel:L,collectionLevel:9,coinsCents:1e9,basket:1e6,workers:{market_hand:{energy:100,cdS:0}}};
  const dt=1/b.tickHz;
  for (let i=0;i<6000;i++){ const ev:any[]=[]; const out=step(s,dt,b,ev);
    for (const e of ev) if (e.type==='sell'&&e.by==='market_hand'){ const c=out.customers.find((x:any)=>x.id===e.id) ?? s.customers.find((x:any)=>x.id===e.id);
      const w=c? (out.customers.find((x:any)=>x.id===e.id)? c.waitedS : c.waitedS+dt):NaN; minW=Math.min(minW,w); n++; const k=w.toFixed(1); hist[k]=(hist[k]??0)+1; }
    s=out; }
}
console.log(`min_wait_s=${b.workers.market_hand.min_wait_s} MH sells=${n} min customer dwell at MH sell=${minW.toFixed(3)}s`, JSON.stringify(Object.fromEntries(Object.entries(hist).sort().slice(0,5))));
