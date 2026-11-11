const root=process.argv[2]; const S=await import(root+'/src/save/save.ts'); const I=await import(root+'/src/save/idb-mirror.ts');
const {balance}=await import(root+'/src/config/balance.ts'); const {initialState}=await import(root+'/src/sim/state.ts');
const off={...balance,m4:{...balance.m4,enabled:0}}; const NOW=1790000000000;
const base={...initialState(off)}; for(const k of ['hensLevel','eggValueLevel','celebratedMilestones','tracksV7']) delete base[k];
const mk=(c,t,q)=>{const sj=JSON.stringify({...base,coinsCents:c});return `{"version":6,"savedAt":${t},${q?`"saveSeq":${q},`:''}"sum":"${S.checksum(sj)}","state":${sj}}`;};
const mem=(o={})=>{const m=new Map(Object.entries(o));return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const seq5=mk(1000,NOW-600000,5); const r={};
// i: seq-5 copy in LS AND IDB (M4-format session), then flag-off save 999999, reload with stale IDB
let kv=mem({[S.SAVE_KEY]:seq5}); let w=S.save(kv,{...S.load(kv,off).state,coinsCents:999999},NOW-1000,off,true);
r.i_written_seq=S.saveSeqOf(w); r.i_pick=I.reconcile(kv,seq5,off,NOW); r.i_reloadCoins=S.load(kv,off).state.coinsCents;
// ii: seq-5 only in IDB, LS empty-then flag-off save (no seq)
kv=mem(); S.save(kv,{...base,coinsCents:999999},NOW-1000,off); r.ii_pick=I.reconcile(kv,seq5,off,NOW); r.ii_reloadCoins=S.load(kv,off).state.coinsCents;
// iii: both carry seq, stale IDB has the higher seq (LS restored from a seq-1 .bak then saved -> seq 2)
kv=mem({[S.SAVE_KEY]:mk(500,NOW-900000,1)}); S.save(kv,{...base,coinsCents:999999},NOW-1000,off); r.iii_lsSeq=S.saveSeqOf(kv.getItem(S.SAVE_KEY)); r.iii_pick=I.reconcile(kv,seq5,off,NOW); r.iii_reloadCoins=S.load(kv,off).state.coinsCents;
console.log(JSON.stringify(r));
