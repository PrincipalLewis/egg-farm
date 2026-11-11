import { readFileSync } from 'fs';
import { balance as b } from '/tmp/efs/game/src/config/balance';
import { tableRow, eggPriceCents } from '/tmp/efs/game/src/config/formulas';
const [h,...rows]=readFileSync('/workspace/egg-farm-studio/product/economy.csv','utf8').trim().split('\n'); const cols=h.split(',');
let bad=0, cells=0; for(const r of rows){const v=r.split(','); const t:any=tableRow(+v[0],b);
 cols.forEach((c,i)=>{cells++; if(Math.abs(+v[i]-t[c])>1e-9){bad++; console.log('MISMATCH',v[0],c,v[i],t[c]);}});}
let pb=0; for(let F=0;F<=30;F++)for(let C=0;C<=30;C++){const exp=Math.round(Number(((1+0.05*F)*(1+0.12*C)*100).toPrecision(12))); if(eggPriceCents(F,C,b)!==exp){pb++;}}
console.log(`cells ${cells} mismatches ${bad}; price grid 961 mismatches ${pb}; Q8: F0C1 ${eggPriceCents(0,1,b)} F10C10 ${eggPriceCents(10,10,b)} F1C1 ${eggPriceCents(1,1,b)} (7 eggs=${7*eggPriceCents(1,1,b)}c)`);
