import { fmtCount, fmtMoney, fmtMoneyShort } from '/workspace/qa-8468101/qb/src/ui/format.ts';
const ns=[999,1000,9999,10000,99949,99950,999499,999949,999950,999960,999999,1e6,1e6+1,9994999,9995000,9999999,1e7,99_995_000,999_499_999,999_950_000,999_999_999,1e9,9_995_000_000,1e10,999_950_000_000,999_999_999_999,1e12,9.995e12,1e13,999.95e12,1e15,1e18,1e21,Number.MAX_SAFE_INTEGER,1.7e308,Infinity,NaN,-1,-1500000,0.5];
for (const n of ns) console.log(String(n).padEnd(24), fmtCount(n).padEnd(14), fmtMoney(n*100).padEnd(18), fmtMoneyShort(n*100));
// scan: any output whose numeric part >= 1000 with suffix, or monotonic violation
const mult={K:1e3,M:1e6,B:1e9,T:1e12} as any; let bad=0, prev=-1;
const chk=(n:number)=>{const s=fmtCount(n);const m=s.match(/^([0-9.]+)([KMBT])$/); if(m){const v=+m[1]; if(v>=1000&&m[2]!=='T'){console.log('>=1000',n,s);bad++} const val=v*mult[m[2]]; if(Math.abs(val-n)/n>0.01){console.log('err>1%',n,s);bad++} if(val<prev-1e-9){console.log('nonmono',n,s);bad++} prev=val}};
for(const d of [1e4,1e5,1e6,1e7,1e8,1e9,1e10,1e11,1e12,1e13,1e14]) for(let k=1;k<=10;k++) for (const off of [-1,-d*0.0006,-d*0.0005,-d*0.00049,0,1]) chk(Math.floor(k*d+off));
// tenth-boundaries near 10x (2dp->1dp switch)
for (const u of [1e6,1e9,1e12]) for (const n of [9.994999*u,9.995*u,9.9951*u,9.99999*u]) console.log('10x', n, fmtCount(n));
console.log('bad',bad);
