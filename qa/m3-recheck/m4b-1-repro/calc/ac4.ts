import { balance as b } from '/tmp/qa-live-246de09/src/config/balance';
import { eggPriceCents, hensCap, eggValueCap } from '/tmp/qa-live-246de09/src/config/formulas';
import { priceMatchedV } from '/tmp/qa-live-246de09/src/sim/migrate-v7';
const mx=b.maxLevel;
// D-HOP-28: N = smallest F' > F with cap(F') > L; none -> farmMax (= maxLevel here)
const N=(F:number,L:number,cap:(f:number,p:any)=>number)=>{for(let f=F+1;f<=mx;f++)if(cap(f,b)>L)return f;return mx;};
const out:any[]=[];
for(let F=0;F<=mx;F++){const m=new Map<number,number[]>();
 for(let C=0;C<=mx;C++){const V=Math.min(priceMatchedV(F,F,eggPriceCents(F,C,b),b)??mx,mx);if(V>=eggValueCap(F+1,b)&&V<mx){if(!m.has(V))m.set(V,[]);m.get(V)!.push(C);}}
 for(const [V,Cs] of [...m].sort((a,b)=>a[0]-b[0]))out.push({F,track:'eggValue',L:V,C:`${Cs[0]}–${Cs[Cs.length-1]}`,shownNow:F+1,expectedN:N(F,V,eggValueCap)});}
// Hens: migration sets H=F (<= cap(F)), buying is capped at F+3 -> never above cap(F+1)
let hens=0;for(let F=0;F<=mx;F++){if(F>=hensCap(F+1,b))hens++;}
console.log('| F | track | track level | Collection range giving it | shown now (F+1) | expected N (D-HOP-28) |\n|---|---|---|---|---|---|');
for(const r of out)console.log(`| ${r.F} | Egg value | ${r.L} | C ${r.C} | L${r.shownNow} | L${r.expectedN} |`);
console.log(`\nrows=${out.length}; hens rows above cap(F+1) via migration: ${hens}`);
console.log('fixtures:',[[5,15],[0,30],[27,0]].map(([F,C])=>{const V=Math.min(priceMatchedV(F,F,eggPriceCents(F,C,b),b)??mx,mx);return `F${F} C${C} H${F} V${V} | Egg value cap(F)=${eggValueCap(F,b)} lock=${V>=eggValueCap(F,b)&&V<mx?'cap':V>=mx?'max':'none'} shown L${F+1} expected N=${N(F,V,eggValueCap)} | Hens lock=${F>=hensCap(F,b)?'cap':'none'}`}).join('\n'));
