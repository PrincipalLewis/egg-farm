import { fmtMoneyShort, fmtMoneyPreview, fmtMoney } from '/workspace/qa-mk24/src/ui/format';
for (const d of [0.5,999.99,1000,1099.99,9999,9.99e6,9.999e6,9.99e9,9.999e9,9.99e12,9.999e12,1e12,1e15,1.5e15,1e18,Infinity,NaN,-5]) console.log(d, '| preview', fmtMoneyPreview(Math.round(d*100)), '| exact', fmtMoney(Math.round(d*100)));
