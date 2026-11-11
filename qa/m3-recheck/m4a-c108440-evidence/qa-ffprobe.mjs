import pw from 'playwright-core'; import { spawn } from 'node:child_process';
const port=5729; const eng=process.argv[2]||'firefox'; const srv=spawn('npx',['vite','preview','--outDir','dist-qa','--port',''+port,'--strictPort','--host','127.0.0.1'],{stdio:'ignore',detached:true});
await new Promise(r=>setTimeout(r,3000));
const b=await pw[eng].launch(); const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[];
p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>m.type()==='error'&&errs.push('CE '+m.text()));
await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click({timeout:15000}).catch(e=>errs.push('click '+e.message.slice(0,80)));
await p.waitForTimeout(5000); console.log('eggfarm', await p.evaluate(()=>typeof window.eggfarm), 'idb', await p.evaluate(()=>typeof indexedDB)); console.log(errs.join('\n').slice(0,2000));
await p.screenshot({path:'/workspace/egg-farm-studio/qa/m3-recheck/m4a-c108440-evidence/ffprobe-'+eng+'.png'});
await b.close(); process.kill(-srv.pid);
