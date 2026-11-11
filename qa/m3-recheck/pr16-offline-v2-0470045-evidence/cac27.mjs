const r=process.argv[2]; const {offlineEggs}=await import(r+'/src/sim/offline.ts'); const {balance:b}=await import(r+'/src/config/balance.ts');
for (const s of [671,683]) console.log(`L15 ${s}s -> ${offlineEggs(s,15,b)} eggs`);
