import { balance as b } from '/tmp/qa-live-246de09/src/config/balance';
import { customerIntervalS, queueMax, demandRange } from '/tmp/qa-live-246de09/src/config/formulas';
for(let F=15;F<30;F++)console.log(F,customerIntervalS(F,b),'->',customerIntervalS(F+1,b),'q',queueMax(F,b),'->',queueMax(F+1,b),'d',demandRange(F,b).join('-'),'->',demandRange(F+1,b).join('-'));
