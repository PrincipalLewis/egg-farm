import { balance as b } from '/tmp/efs/game/src/config/balance';
import { initialState } from '/tmp/efs/game/src/sim/state';
import { step } from '/tmp/efs/game/src/sim/tick';
import { apply } from '/tmp/efs/game/src/sim/actions';
let n15=0;
for (let seed=1; seed<=20; seed++){
  let s=initialState(b,seed); let arr:number[]=[]; let firstTap=-1, demand=0, basket15=0, coins15=0;
  for(let i=1;i<=300;i++){ const t=Math.round(i)/10; const before=s.customers.length; s=step(s,0.1,b);
    if(s.customers.length>before&&arr.length<2){arr.push(t); if(arr.length==1) demand=s.customers[s.customers.length-1].demand;}
    if(Math.abs(t-Math.round(t))<1e-9){ const r=apply(s,{type:'collect'},b); if(firstTap<0) firstTap=r.basket-s.basket; s=r;}
    if(t===15){ basket15=s.basket; s=apply(s,{type:'sellAll'},b); coins15=s.coinsCents/100;}
  }
  if(coins15>=10) n15++;
  console.log(`seed ${seed}: start coins 0, first tap +${firstTap}, arrivals ${arr.join(',')}s, demand1 ${demand}, basket@15 ${basket15}, coins@15 $${coins15}`);
}
console.log('seeds affording C1 at 15s:', n15, '/20');
