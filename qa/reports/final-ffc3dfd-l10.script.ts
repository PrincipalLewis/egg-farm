const W=process.env.WT!;
const { balance: b } = await import(W+'/src/config/balance');
const { runBot } = await import(W+'/tests/bot');
const { runM2 } = await import(W+'/tests/bot-m2');
const { VAR_DEFAULT } = await import(W+'/tests/seller-variance');
const { quantile } = await import(W+'/tests/pacing-guards');
const R=(a:number,n:number)=>Array.from({length:n},(_,i)=>i+a);
const out:any={m4:b.m4!.enabled,maxLevel:b.maxLevel};
const t=(r:Map<number,number>[],L:number)=>r.map(x=>x.get(L)??Infinity);
for(const [nm,S] of [['1-200',R(1,200)],['201-300',R(201,100)]] as const){
  const nw=S.map(s=>runBot(b,s,'seller15',3600,15,VAR_DEFAULT).reach);
  const w=S.map(s=>runM2(b,s,{model:'seller15',T:7200,variance:VAR_DEFAULT}).reach);
  const o:any={};
  for(const [k,r] of [['nw',nw],['w',w]] as const){o[k+'_L10P95']=quantile(t(r,10),.95)/60;o[k+'_L10min']=Math.min(...t(r,10))/60;o[k+'_L10']=t(r,10);}
  o.w_L20P95=quantile(t(w,20),.95); o.nw_L20P95=quantile(t(nw,20),.95);
  o.w_L30n=t(w,30).filter(Number.isFinite).length; o.w_L30med=quantile(t(w,30),.5)/60;
  const fd=S.map(s=>runBot(b,s,'seller15',120).firstUpgradeS??Infinity); o.fp_det_max=Math.max(...fd); o.fp_det_pass=fd.filter(x=>x<=30).length;
  const fv=S.map(s=>runBot(b,s,'seller15',120,15,VAR_DEFAULT).firstUpgradeS??Infinity); o.fp_var_over=fv.filter(x=>x>30).length; o.fp_var_max=Math.max(...fv);
  out[nm]=o;
}
console.log(JSON.stringify(out));
