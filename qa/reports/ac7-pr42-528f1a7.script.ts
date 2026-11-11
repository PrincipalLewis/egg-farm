import { balance as b } from '../src/config/balance';
import { runBot } from '../tests/bot';
import { runM2 } from '../tests/bot-m2';
import { VAR_DEFAULT } from '../tests/seller-variance';
import { quantile } from '../tests/pacing-guards';
const S=(n:number)=>Array.from({length:n},(_,i)=>i+1);
const out:any={m4:b.m4!.enabled};
const nw=S(200).map(s=>runBot(b,s,'seller15',3600,15,VAR_DEFAULT).reach);
const w=S(200).map(s=>runM2(b,s,{model:'seller15',T:7200,variance:VAR_DEFAULT}).reach);
const t=(r:Map<number,number>[],L:number)=>r.map(x=>x.get(L)??Infinity);
for(const [k,r] of [['nw',nw],['w',w]] as const){ out[k+'_L10P95_200']=quantile(t(r,10),.95)/60; out[k+'_L10P95_100']=quantile(t(r,10).slice(0,100),.95)/60; out[k+'_L10min']=Math.min(...t(r,10))/60;}
out.w_L20P95_200=quantile(t(w,20),.95); out.w_L20P95_100=quantile(t(w,20).slice(0,100),.95);
const l30=t(w,30).filter(Number.isFinite); out.w_L30n=l30.length; out.w_L30med=quantile(t(w,30),.5)/60; out.w_L30P95=quantile(t(w,30),.95)/60;
out.nw_L30n=t(nw,30).filter(Number.isFinite).length; const mx=nw.map(r=>Math.max(...r.keys())).sort((a,b)=>a-b); out.nw_maxmed=mx[100];
const fd=S(200).map(s=>runBot(b,s,'seller15',120).firstUpgradeS??Infinity); out.fp_det_max=Math.max(...fd); out.fp_det_pass=fd.filter(x=>x<=30).length;
const fv=S(200).map(s=>runBot(b,s,'seller15',120,15,VAR_DEFAULT).firstUpgradeS??Infinity); out.fp_var_over=fv.filter(x=>x>30).length; out.fp_var_max=Math.max(...fv);
console.log(JSON.stringify(out,null,1));
