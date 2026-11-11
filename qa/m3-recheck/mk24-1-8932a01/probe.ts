import { orderView } from '/workspace/qa-mk24-8932a01/src/ui/orders';
const fails: string[] = [];
const exactRef = (c: number) => '$' + (BigInt(Math.round(c)) / 100n).toLocaleString('en-US') + '.' + String(BigInt(Math.round(c)) % 100n).padStart(2, '0');
const floorRef = (c: number) => { const d = c / 100; if (d < 1000) return null; const [v,u] = d>=1e12?[d/1e12,'T']:d>=1e9?[d/1e9,'B']:d>=1e6?[d/1e6,'M']:[d/1e3,'K']; return '$'+(Math.floor(v*10+1e-9)/10).toFixed(1).replace(/\.0$/,'')+u; };
const cents = [1,9,99,100,1656,9999,99999,99_999,100_000,100_001,109_999,110_000,999_999,1_000_000,9_999_999,99_999_999,100_000_000,100_000_001,199_999_999,999_999_999_9,1e11,1e11-1,1e13,1e15-1,1e15,123_456_789_012_34,9.99e16,1e17];
for (const c of cents) {
  const v = orderView({ id:1, demand:1, filled:0, waitedS:0 } as any, 1, c);
  const aria = v.buttonAria.split('+')[1], btn = v.button.split('+')[1];
  const ok = aria === exactRef(c); const fr = floorRef(c); const bok = fr ? btn === fr : btn === exactRef(c);
  console.log(c, '| button', JSON.stringify(v.button), '| aria', JSON.stringify(v.buttonAria), ok&&bok?'OK':'FAIL ref='+exactRef(c)+' floor='+fr);
  if (!ok || !bok) fails.push(String(c));
}
const o = orderView({ id:4, demand:17, filled:4, waitedS:0 } as any, 0, 552);
console.log('card', JSON.stringify(o.line), JSON.stringify(o.lineAria), o.line === '4/17\u00a0eggs · $93.84', o.lineAria === '4 of 17 eggs delivered, order worth $93.84');
console.log(fails.length ? 'FAILS '+fails : 'ALL OK');
