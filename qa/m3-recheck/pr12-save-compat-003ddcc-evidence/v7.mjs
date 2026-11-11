const root=process.argv[2]; const S=await import(root+'/src/save/save.ts'); const I=await import(root+'/src/save/idb-mirror.ts');
const {balance}=await import(root+'/src/config/balance.ts'); const {initialState}=await import(root+'/src/sim/state.ts');
const fs=await import('node:fs');
const on={...balance,m4:{...balance.m4,enabled:1}}, off={...balance,m4:{...balance.m4,enabled:0}}; const NOW=1790000000000;
const mem=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const out={};
// (a) M4-on migrate of real a01faea v6 save, then saved by M4-on
const a=fs.readFileSync(process.argv[3],'utf8').trim(); const kv=mem(); kv.setItem(S.SAVE_KEY,a);
const f=S.load(kv,on); const st={...f.state,v6BackupId:'qa-mig-1'}; const wOn=S.save(kv,st,NOW,on,true);
fs.writeFileSync(process.argv[4]+'/v7-marked-pr12-m4on.json',wOn);
// (b) flag-off load+save
const f2=S.load(kv,off); const wOff=S.save(kv,f2.state,NOW+1000,off,true);
const tp=r=>{const s=JSON.parse(r).state;return {tracksV7:s.tracksV7,v6BackupId:s.v6BackupId,hensLevel:s.hensLevel,eggValueLevel:s.eggValueLevel,celebratedMilestones:s.celebratedMilestones};};
out.onTracks=tp(wOn); out.offTracks=tp(wOff); out.trackFieldsEqual=JSON.stringify(tp(wOn))===JSON.stringify(tp(wOff));
out.stateBytesEqual=wOn.slice(wOn.indexOf('"state":'))===wOff.slice(wOff.indexOf('"state":'));
out.offHdr=wOff.slice(0,wOff.indexOf(',"sum"')); out.onHdr=wOn.slice(0,wOn.indexOf(',"sum"'));
// second flag-off round
const f3=S.load(kv,off); const wOff2=S.save(kv,f3.state,NOW+2000,off,true); out.secondRoundStateEqual=wOff2.slice(wOff2.indexOf('"state":'))===wOff.slice(wOff.indexOf('"state":'));
// (c) M4-on ranking by saveSeq: higher seq older savedAt beats lower seq newer savedAt
const s0={...initialState(on)}; const mk=(c,t,q)=>S.serialize({...s0,coinsCents:c},t,q,on);
out.on_seq7old_vs_seq3new=I.pickNewest(mk(1,NOW-600000,7),mk(2,NOW-1000,3),on,NOW);
out.on_rankCompare_seq=Math.sign(S.rankCompare(mk(1,NOW-600000,7),mk(2,NOW-1000,3),NOW));
out.on_equalSeq_savedAt=I.pickNewest(mk(1,NOW-60000,4),mk(2,NOW-1000,4),on,NOW);
const kv2=mem(); S.save(kv2,s0,NOW,on); const w2=S.save(kv2,s0,NOW+1,on); out.on_seqIncrements=S.saveSeqOf(w2);
console.log(JSON.stringify(out,null,1));
