import { balance as b } from '/tmp/qa-live-246de09/src/config/balance';
import { eggPriceCents, customerIntervalS, hensCap, eggValueCap } from '/tmp/qa-live-246de09/src/config/formulas';
import { priceMatchedV } from '/tmp/qa-live-246de09/src/sim/migrate-v7';
const mx=b.maxLevel, cof=b.m4!.eggValue.capOverFarm;
let total=0,over=0,worst={gap:0,F:0,C:0,V:0};const rows:string[]=[];
for(let F=0;F<=mx;F++)for(let C=0;C<=mx;C++){const V=Math.min(priceMatchedV(F,F,eggPriceCents(F,C,b),b)??mx,mx);total++;
 if(V>=eggValueCap(F,b)&&V<mx){const shown=F+1,real=V-cof+1;if(real>shown){over++;const gap=real-shown;if(gap>worst.gap)worst={gap,F,C,V};}}
 if((F===5&&C===15)||(F===0&&C===30)||(F===27&&C===0))rows.push(`F${F} C${C} -> V${V} cap ${eggValueCap(F,b)} shown L${F+1} real L${V-cof+1}`);}
console.log(rows.join('\n'));console.log(`capOverFarm=${cof} max=${mx}; saves F,C in 0..${mx}: ${total}; V>F+3 (text wrong): ${over}; worst`,worst);
const byC:any={};for(const C of [0,5,10,15,20,25,30]){byC[C]=[];for(let F=0;F<=mx;F+=5){const V=Math.min(priceMatchedV(F,F,eggPriceCents(F,C,b),b)??mx,mx);byC[C].push(`F${F}:V${V}`)}}console.log(byC);
for(let F=25;F<=30;F++)console.log(`F${F} interval ${customerIntervalS(F,b)}s -> ${customerIntervalS(F+1,b)}s; hensCap ${hensCap(F,b)} -> ${hensCap(F+1,b)}`);
