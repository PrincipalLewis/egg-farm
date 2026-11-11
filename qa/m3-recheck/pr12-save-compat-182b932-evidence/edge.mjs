const root=process.argv[2]; const S=await import(root+'/src/save/save.ts'); const I=await import(root+'/src/save/idb-mirror.ts');
const {balance}=await import(root+'/src/config/balance.ts'); const {initialState}=await import(root+'/src/sim/state.ts');
const b=balance.m4?{...balance,m4:{...balance.m4,enabled:0}}:balance; const NOW=1790000000000;
const st=(c)=>{const s={...initialState(b),coinsCents:c};if(balance.m4){delete s.hensLevel;delete s.eggValueLevel;delete s.celebratedMilestones;delete s.tracksV7;}return s;};
const mk=(state,savedAt,seq)=>{const sj=JSON.stringify(state);return `{"version":6,"savedAt":${savedAt},${seq?`"saveSeq":${seq},`:''}"sum":"${S.checksum(sj)}","state":${sj}}`;};
const r={};
r.newerSavedAt_idbWins=I.pickNewest(mk(st(1),NOW-60000),mk(st(2),NOW-1000),b,NOW);
r.newerSavedAt_lsWins=I.pickNewest(mk(st(1),NOW-1000),mk(st(2),NOW-60000),b,NOW);
r.equalSavedAt_diffBytes=I.pickNewest(mk(st(1),NOW-1000),mk(st(2),NOW-1000),b,NOW);
r.nanLiteral_idb=I.pickNewest(mk(st(1),NOW-1000),mk(st(2),'NaN'),b,NOW);
r.nanLiteral_ls=I.pickNewest(mk(st(1),'NaN'),mk(st(2),NOW-1000),b,NOW);
r.nullSavedAt_idb=I.pickNewest(mk(st(1),NOW-1000),mk(st(2),'null'),b,NOW);
r.stringNaN_idb=I.pickNewest(mk(st(1),NOW-1000),mk(st(2),'"NaN"'),b,NOW);
r.future_idb=I.pickNewest(mk(st(1),NOW-1000),mk(st(2),NOW+864e5),b,NOW);
r.validate_nanLiteral=S.validate(mk(st(1),'NaN'),b,NOW).ok?'ok':S.validate(mk(st(1),'NaN'),b,NOW).reason;
r.validate_nullSavedAt=S.validate(mk(st(1),'null'),b,NOW).ok;
// stale saveSeq copy (e.g. written by an M4-on session) vs newer main copy without saveSeq
r.staleSeqLs_vs_newerIdbNoSeq=I.pickNewest(mk(st(1),NOW-600000,5),mk(st(2),NOW-1000),b,NOW);
// flag-off writes after a seq'd save: does saveSeq persist?
const m=new Map([[S.SAVE_KEY,mk(st(1),NOW-600000,5)]]);const kv={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
const w=S.save(kv,S.load(kv,b).state,NOW,b,true); r.flagOffSaveAfterSeq_hasSeq=w.includes('saveSeq'); r.bakHasSeq=(kv.getItem(S.SAVE_KEY+'.bak')||'').includes('saveSeq');
// serialize without balance arg (main.ts:96 storage-blocked live export)
const full={...initialState(b)}; const nob=S.serialize(full,NOW); r.serializeNoBalance_m4keys=['saveSeq','hensLevel','eggValueLevel','celebratedMilestones'].filter(k=>nob.includes('"'+k+'"'));
r.serializeWithOff_m4keys=['saveSeq','hensLevel','eggValueLevel','celebratedMilestones'].filter(k=>S.serialize(full,NOW,3,b).includes('"'+k+'"'));
console.log(JSON.stringify(r,null,1));
