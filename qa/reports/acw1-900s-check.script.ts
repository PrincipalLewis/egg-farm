const W=process.env.WT!;
const { balance } = await import(W+'/src/config/balance');
const { runM2 } = await import(W+'/tests/bot-m2');
const casual={...balance,sim_test:{poisson_arrivals:true,demand_scale:0.75}};
const med=(a:number[])=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const out:any={tickHz:balance.tickHz,maxLevel:balance.maxLevel};
for (const [nm,seeds] of [['0-99',[...Array(100).keys()]],['1-200',Array.from({length:200},(_,i)=>i+1)],['201-299',Array.from({length:99},(_,i)=>i+201)]] as const){
  const R=seeds.map(s=>runM2(casual,s,{model:'seller15',sellEvery:20}));
  const R12=seeds.map(s=>runM2(casual,s,{model:'seller15',sellEvery:20,T:1200}));
  const t10=R.map(r=>r.reach.get(10)??Infinity), t12=R12.map(r=>r.reach.get(10)??Infinity), t18=R.map(r=>r.reach.get(18)??Infinity);
  const at900=seeds.filter((_,i)=>t10[i]===900);
  out[nm]={n:seeds.length,le900:t10.filter(t=>t<=900).length,lt900:t10.filter(t=>t<900).length,eq900:at900.length,at900seeds:at900,
    le960:t10.filter(t=>t<=960).length,T1200_same:t10.every((t,i)=>t12[i]===t||(t>1200&&!isFinite(t12[i]))),T1200_eq900:t12.filter(t=>t===900).length,
    nonGridTimes:t10.filter(t=>isFinite(t)&&t%20!==0).length,medF10:med(t10)/60,medF18:med(t18)/60,t10hist:Object.entries(t10.reduce((a:any,t)=>(t>=840&&t<=980&&(a[t]=(a[t]||0)+1),a),{}))};
}
console.log(JSON.stringify(out));
