import { orderView } from '/workspace/qa-mk24/src/ui/orders';
const c={id:1,demand:10,filled:0,waitedS:0} as any;
for (const d of [0.5,999.99,1000,9999,9.99e6,9.999e6,1e12,1e15,1e18,Infinity,NaN]){const v=orderView(c,1,()=>Math.round(d*100)) as any; console.log(d,'|',v.button,'|',v.buttonAria,'| card',v.value);}
const w=orderView(c,0,50) as any; console.log('wait |',w.button,'|',w.buttonAria);
