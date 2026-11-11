import { balance as b } from '/tmp/efs/game/src/config/balance';
import { runBot, median } from '/tmp/efs/game/tests/bot';
const f=Array.from({length:20},(_,i)=>runBot(b,i+1,'seller15').firstUpgradeS);
console.log(f.join(','), 'median', median(f as number[]));
