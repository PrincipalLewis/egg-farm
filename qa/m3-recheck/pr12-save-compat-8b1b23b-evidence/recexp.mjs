const root=process.argv[2]; const S=await import(root+'/src/save/save.ts'); const {balance}=await import(root+'/src/config/balance.ts'); const {initialState}=await import(root+'/src/sim/state.ts');
const off={...balance,m4:{...balance.m4,enabled:0}}, on={...balance,m4:{...balance.m4,enabled:1}}; const k4=s=>['saveSeq','hensLevel','eggValueLevel','celebratedMilestones','tracksV7'].filter(k=>s.includes('"'+k+'"'));
const st={...initialState(off),coinsCents:4242}; const r={};
r.shippedBalanceM4Enabled=balance.m4.enabled;
const e=S.recoveryExport(st,balance,1790000000000); r.exportShipped_keys=k4(e); r.exportShipped_validatesFlagOff=S.validate(e,off).ok; r.exportShipped_coins=JSON.parse(e).state.coinsCents;
r.exportEqualsSerializeWithBalance=e===S.serialize(st,1790000000000,undefined,balance);
r.exportOn_keys=k4(S.recoveryExport({...initialState(on)},on,1)); const mk={...initialState(on),tracksV7:1,v6BackupId:'x',hensLevel:3}; r.exportMarkedOff_keys=k4(S.recoveryExport(mk,off,1));
console.log(JSON.stringify(r));
