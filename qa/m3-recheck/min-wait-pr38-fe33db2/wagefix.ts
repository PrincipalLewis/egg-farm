// Fixed-state wage cadence: same seeds/levels, Market Hand only, no player actions; prints per-seed wage tick list hash.
const R = process.env.REPO!;
const { balance: b } = await import(`${R}/src/config/balance.ts`); const { initialState } = await import(`${R}/src/sim/state.ts`); const { step } = await import(`${R}/src/sim/tick.ts`);
import { createHash } from 'node:crypto';
for (const scen of ['busy','empty','tiny']) for (const seed of [1,2,3,7,99]) for (const L of [5,12,20]) {
  let s:any={...initialState(b,seed),farmLevel:L,collectionLevel:9,coinsCents:1e9,basket: scen==='busy'?1e6: scen==='tiny'?5:0,workers:{market_hand:{energy:100,cdS:0}}};
  if (scen==='empty') s={...s, customers:[]};
  const w:string[]=[]; let cents=0;
  for (let i=1;i<=6000;i++){ const ev:any[]=[]; s=step(s,1/b.tickHz,b,ev); if(scen==='empty') s={...s,customers:[]}; for(const e of ev) if(e.type==='wage'&&e.worker==='market_hand'){w.push(i+':'+e.cents);cents+=e.cents;} }
  console.log(scen,seed,L,w.length,cents,createHash('sha1').update(w.join(',')).digest('hex').slice(0,10));
}
