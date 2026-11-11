import { chromium } from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';
const URL='http://127.0.0.1:4392/', OUT='/workspace/egg-farm-studio/qa/claude-qa/m3-rc1-pre-dd52bfd';
const only=process.argv[2];
const res={}; const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,timeout:60000});
const vps={mobile:{width:390,height:844},desktop:{width:1280,height:800}};
async function ctxPage(vp){const c=await b.newContext({viewport:vps[vp]});const p=await c.newPage();p.__log=[];
 p.on('console',m=>p.__log.push(`${new Date().toISOString()} [${m.type()}] ${m.text()}`));p.on('pageerror',e=>p.__log.push(`${new Date().toISOString()} [pageerror] ${e.message}`));return [c,p];}
async function boot(p){await p.goto(URL,{waitUntil:'load',timeout:60000});await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(2500);}
const dump=p=>p.evaluate(async()=>{const ls={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);ls[k]=localStorage.getItem(k);}
 const idb=await new Promise(r=>{const q=indexedDB.open('eggfarm');q.onsuccess=()=>{const db=q.result;if(!db.objectStoreNames.contains('save')){db.close();return r(null);}const t=db.transaction('save').objectStore('save').get('main');t.onsuccess=()=>{db.close();r(t.result??null)};t.onerror=()=>r('ERR')};q.onerror=()=>r('ERR')});
 return {ls,idb,text:document.body.innerText.slice(0,400)};});
const setIdb=(p,v)=>p.evaluate(v=>new Promise(r=>{const q=indexedDB.open('eggfarm');q.onsuccess=()=>{const db=q.result;const t=db.transaction('save','readwrite');v===null?t.objectStore('save').delete('main'):t.objectStore('save').put(v,'main');t.oncomplete=()=>{db.close();r()}}}),v);
const S='eggfarm.save',BAK='eggfarm.save.bak';
const saveKeys=d=>JSON.stringify({m:d.ls[S],b:d.ls[BAK],i:d.idb});
async function fin(name,p,c,data){await p.screenshot({path:`${OUT}/${name}.png`}).catch(e=>data.shotErr=e.message);writeFileSync(`${OUT}/${name}.console.log`,p.__log.join('\n')+'\n');res[name]=data;console.log(name,JSON.stringify(data).slice(0,600));await c.close();}
const st=raw=>{try{const d=JSON.parse(raw);return {v:d.version,savedAt:d.savedAt,coins:d.state?.coinsCents,basket:d.state?.basket,pend:d.state?.pendingOfflineEggs,fl:d.state?.farmLevel}}catch{return raw}};
// prepare a played save: tap coop a bit
async function played(p){for(let i=0;i<15;i++){await p.mouse.click(p.viewportSize().width/2,p.viewportSize().height*0.45);await p.waitForTimeout(80);}await p.waitForTimeout(5500);return dump(p);}
const T={
 async a_ls(vp){const [c,p]=await ctxPage(vp);await boot(p);const d0=await played(p);await p.goto(URL+'favicon.ico').catch(()=>{});const o=JSON.parse(d0.ls[S]);o.version=99;await p.evaluate(([k,v])=>localStorage.setItem(k,v),[S,JSON.stringify(o)]);
  const before=await dump(p);await boot(p);await p.waitForTimeout(6000);const after=await dump(p);
  await fin(`a1-newer-ls-${vp}`,p,c,{unchanged:saveKeys(before)===saveKeys(after),lsKeysBefore:Object.keys(before.ls),lsKeysAfter:Object.keys(after.ls),idbAfter:st(after.idb),text:after.text.slice(0,160)});},
 async a_idb(vp){const [c,p]=await ctxPage(vp);await boot(p);const d0=await played(p);const o=JSON.parse(d0.ls[S]);o.version=99;
  await p.goto('about:blank');await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(()=>localStorage.clear());await setIdb(p,JSON.stringify(o));
  const before=await dump(p);await boot(p);await p.waitForTimeout(6000);const after=await dump(p);
  await fin(`a2-newer-idb-only-${vp}`,p,c,{unchanged:saveKeys(before)===saveKeys(after),lsKeysAfter:Object.keys(after.ls),idbAfter:st(after.idb),text:after.text.slice(0,160)});},
 async a_bak(vp){const [c,p]=await ctxPage(vp);await boot(p);const d0=await played(p);const o=JSON.parse(d0.ls[S]);o.version=99;
  await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(([k,v])=>{localStorage.removeItem('eggfarm.save');localStorage.setItem(k,v)},[BAK,JSON.stringify(o)]);await setIdb(p,null);
  const before=await dump(p);await boot(p);await p.waitForTimeout(6000);const after=await dump(p);
  await fin(`a3-newer-bak-only-${vp}`,p,c,{unchanged:saveKeys(before)===saveKeys(after),lsKeysAfter:Object.keys(after.ls),idbAfter:st(after.idb),text:after.text.slice(0,160)});},
 async a_tabs(vp){const [c,p]=await ctxPage(vp);await boot(p);const d0=await played(p);
  const p2=await c.newPage();p2.__log=[];p2.on('console',m=>p2.__log.push(`[tab2 ${m.type()}] ${m.text()}`));
  const o=JSON.parse(d0.ls[S]);o.version=99;await p2.goto(URL+'favicon.ico').catch(()=>{});await p2.evaluate(([k,v])=>localStorage.setItem(k,v),[S,JSON.stringify(o)]);
  // tab2 now boots the old build against newer save while tab1 still live
  await boot(p2);await p2.waitForTimeout(3000);const mid=await dump(p2);
  await p.waitForTimeout(7000);// tab1 autosave interval 5s
  await p.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pagehide'))});await p.waitForTimeout(1500);
  const after=await dump(p2);await p2.screenshot({path:`${OUT}/a4-two-tabs-tab2-${vp}.png`});p.__log.push(...p2.__log);
  await fin(`a4-two-tabs-tab1-${vp}`,p,c,{mainAfterTab2Boot:st(mid.ls[S]),mainAfterTab1Saves:st(after.ls[S]),idb:st(after.idb),tab2text:mid.text.slice(0,120),tab1text:(await p.evaluate(()=>document.body.innerText.slice(0,120)).catch(()=>'')),lsMainFinal:st((await dump(p2)).ls[S])});},
 async b(vp){for(const [lab,mut] of [['missing',o=>{delete o.savedAt}],['string',o=>{o.savedAt='abc'}],['null',o=>{o.savedAt=null}],['zero',o=>{o.savedAt=0}],['y2019',o=>{o.savedAt=Date.UTC(2019,5,1)}],['negative',o=>{o.savedAt=-5e12}],['future',o=>{o.savedAt=Date.now()+864e5*365}]]){
  const [c,p]=await ctxPage(vp);await boot(p);await played(p);await p.waitForTimeout(6000);const d0=await dump(p);// ensure .bak exists
  await p.goto(URL+'favicon.ico').catch(()=>{});const o=JSON.parse(d0.ls[S]);mut(o);await p.evaluate(([k,v])=>localStorage.setItem(k,v),[S,JSON.stringify(o)]);
  await setIdb(p,JSON.stringify(o));
  await boot(p);const r1=await dump(p);await p.waitForTimeout(1000);await boot(p);const r2=await dump(p);
  await fin(`b-savedat-${lab}-${vp}`,p,c,{before:st(d0.ls[S]),bak:st(d0.ls[BAK]),load1:st(r1.ls[S]),load2:st(r2.ls[S]),text1:r1.text.slice(0,200),text2:r2.text.slice(0,120)});}},
 async c(vp){const [c,p]=await ctxPage(vp);await boot(p);await played(p);const d0=await dump(p);await p.goto(URL+'favicon.ico').catch(()=>{});
  const o=JSON.parse(d0.ls[S]);o.savedAt=Date.now()-30*60e3;const raw=JSON.stringify(o);await p.evaluate(([k,v])=>localStorage.setItem(k,v),[S,raw]);await setIdb(p,raw);
  await boot(p);const r1=await dump(p);await p.screenshot({path:`${OUT}/c-offline-modal-${vp}.png`});await boot(p);const r2=await dump(p);
  await fin(`c-offline-30m-${vp}`,p,c,{before:st(d0.ls[S]),load1:st(r1.ls[S]),load2:st(r2.ls[S]),text1:r1.text.slice(0,200),text2:r2.text.slice(0,200)});},
 async d(vp){const [c,p]=await ctxPage(vp);await boot(p);const d0=await played(p);
  for(let i=0;i<20;i++){await p.mouse.click(p.viewportSize().width/2,p.viewportSize().height*0.45);await p.waitForTimeout(50);}
  const live=await dump(p);await p.close({runBeforeUnload:true});const p2=await c.newPage();p2.__log=[];await boot(p2);const r=await dump(p2);
  await fin(`d-close-reload-${vp}`,p2,c,{beforeClose:st(live.ls[S]),afterReopen:st(r.ls[S]),idb:st(r.idb)});},
 async e1(vp){const [c,p]=await ctxPage(vp);await boot(p);await played(p);for(let i=0;i<20;i++){await p.mouse.click(p.viewportSize().width/2,p.viewportSize().height*0.45);await p.waitForTimeout(50);}await p.waitForTimeout(11000);const d0=await dump(p);
  await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(()=>localStorage.removeItem('eggfarm.save'));await setIdb(p,null);
  await boot(p);const r1=await dump(p);await p.waitForTimeout(7000);const r2=await dump(p);
  await fin(`e1-main-deleted-bak-ignored-${vp}`,p,c,{bakBefore:st(d0.ls[BAK]),mainAfterLoad:st(r1.ls[S]),bakAfterLoad:st(r1.ls[BAK]),bakAfter7s:st(r2.ls[BAK]),text:r1.text.slice(0,120)});},
 async e2(vp){const [c,p]=await ctxPage(vp);await boot(p);await played(p);for(let i=0;i<20;i++){await p.mouse.click(p.viewportSize().width/2,p.viewportSize().height*0.45);await p.waitForTimeout(50);}await p.waitForTimeout(11000);const d0=await dump(p);
  const sb=p.locator('[aria-label*="ettings" i], button:has(img[src*="icon-settings"])').first();await sb.click({timeout:15000});await p.locator('#sReset').click({timeout:15000});await p.locator('#cReset').click({timeout:15000});
  await p.waitForTimeout(4000);await boot(p).catch(()=>{});const r1=await dump(p);
  await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(()=>localStorage.setItem('eggfarm.save','x'));await boot(p);const r2=await dump(p);
  await fin(`e2-reset-leaves-bak-${vp}`,p,c,{beforeReset:st(d0.ls[S]),bakBeforeReset:st(d0.ls[BAK]),afterReset_main:st(r1.ls[S]),afterReset_bak:st(r1.ls[BAK]),afterCorrupt_main:st(r2.ls[S]),text:r2.text.slice(0,260)});},
 async e3(vp){const [c,p]=await ctxPage(vp);await boot(p);await played(p);const A=(await dump(p)).ls[S];
  for(let i=0;i<25;i++){await p.mouse.click(p.viewportSize().width/2,p.viewportSize().height*0.45);await p.waitForTimeout(50);}await p.waitForTimeout(6000);const B=await dump(p);
  await p.goto(URL+'favicon.ico').catch(()=>{});const o=JSON.parse(A);o.savedAt=Date.now()+1e10;await p.evaluate(([k,v])=>localStorage.setItem(k,v),[S,JSON.stringify(o)]);
  await boot(p);const r=await dump(p);
  await fin(`e3-future-ls-beats-idb-${vp}`,p,c,{staleA:st(A),idbB_before:st(B.idb),mainAfter:st(r.ls[S]),idbAfter:st(r.idb),text:r.text.slice(0,200)});},
 async f1(vp){const [c,p]=await ctxPage(vp);await boot(p);const d0=await played(p);const o=JSON.parse(d0.ls[S]);o.version=99;const raw=JSON.stringify(o);
  const p2=await c.newPage();await p2.goto(URL+'favicon.ico').catch(()=>{});await setIdb(p2,raw);await p2.close();
  await p.waitForTimeout(7000);for(let i=0;i<5;i++){await p.mouse.click(p.viewportSize().width/2,p.viewportSize().height*0.45);await p.waitForTimeout(80);}await p.waitForTimeout(6000);const r=await dump(p);
  await fin(`f1-live-newer-in-idb-${vp}`,p,c,{lsMain:st(r.ls[S]),idb:st(r.idb),text:r.text.slice(0,200)});},
 async f2(vp){const [c,p]=await ctxPage(vp);await boot(p);const d0=await played(p);const o=JSON.parse(d0.ls[S]);o.version=99;
  const p2=await c.newPage();await p2.goto(URL+'favicon.ico').catch(()=>{});await p2.evaluate(([k,v])=>localStorage.setItem(k,v),[BAK,JSON.stringify(o)]);await p2.close();
  await p.waitForTimeout(7000);const r=await dump(p);
  await fin(`f2-live-newer-bak-${vp}`,p,c,{lsMain:st(r.ls[S]),bak:st(r.ls[BAK]),idb:st(r.idb),text:r.text.slice(0,200)});},
 async f3(vp){for(const [lab,bak] of [['corrupt','{"version":6,"sav'],['badsum',null]]){const [c,p]=await ctxPage(vp);await boot(p);await played(p);await p.waitForTimeout(6000);const d0=await dump(p);
  let b=bak;if(!b){const o=JSON.parse(d0.ls[BAK]);o.sum='deadbeef';b=JSON.stringify(o);}
  await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(([k,v])=>{localStorage.removeItem('eggfarm.save');localStorage.setItem(k,v)},[BAK,b]);await setIdb(p,null);
  await boot(p);const r1=await dump(p);await p.waitForTimeout(7000);const r2=await dump(p);
  await fin(`f3-main-missing-bak-${lab}-${vp}`,p,c,{main:st(r1.ls[S]),bakAfter7s:st(r2.ls[BAK]),corruptKeys:Object.keys(r2.ls).filter(k=>k.includes('corrupt')),text:r1.text.slice(0,240)});}},
 async f4(vp){const [c,p]=await ctxPage(vp);await boot(p);await played(p);await p.waitForTimeout(6000);const d0=await dump(p);
  await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(()=>{localStorage.setItem('eggfarm.save','{"version":6,"savedAt":1');localStorage.setItem('eggfarm.save.bak','{"version":6,"sav')});await setIdb(p,null);
  await boot(p);const r1=await dump(p);await fin(`f4-main-and-bak-corrupt-${vp}`,p,c,{before:st(d0.ls[S]),main:st(r1.ls[S]),corruptKeys:Object.keys(r1.ls).filter(k=>k.includes('corrupt')),text:r1.text.slice(0,240)});},
 async f5(vp){const [c,p]=await ctxPage(vp);await boot(p);await played(p);const d0=await dump(p);await p.goto(URL+'favicon.ico').catch(()=>{});
  const o=JSON.parse(d0.ls[S]);o.savedAt=Date.now()-30*60e3;const raw=JSON.stringify(o);await p.evaluate(([k,v])=>localStorage.setItem(k,v),[S,raw]);await setIdb(p,raw);
  const seq=[];for(let i=0;i<6;i++){await p.goto(URL,{waitUntil:'load'});await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(150+i*100);const d=await dump(p);const x=st(d.ls[S]);seq.push({basket:x.basket,pend:x.pend});}
  await p.waitForTimeout(1500);const fl=await dump(p);await fin(`f5-rapid-reloads-${vp}`,p,c,{before:st(d0.ls[S]),seq,final:st(fl.ls[S]),idb:st(fl.idb)});},
 async f6(vp){const [c,p]=await ctxPage(vp);await boot(p);await played(p);const A=(await dump(p)).ls[S];
  for(let i=0;i<25;i++){await p.mouse.click(p.viewportSize().width/2,p.viewportSize().height*0.45);await p.waitForTimeout(50);}await p.waitForTimeout(6000);const B=await dump(p);
  await p.goto(URL+'favicon.ico').catch(()=>{});const fill=await p.evaluate(A=>{localStorage.setItem('eggfarm.save',A);const s='x'.repeat(100000);let i=0;try{for(;i<200;i++)localStorage.setItem('junk'+i,s);}catch(e){}let j=0;try{for(;j<2000;j++)localStorage.setItem('jk'+j,'x'.repeat(200));}catch(e){}return i+'/'+j},A);
  await boot(p);await p.waitForTimeout(6000);const r=await dump(p);
  await fin(`f6-quota-stale-ls-vs-idb-${vp}`,p,c,{fill,staleA:st(A),newerIdbBefore:st(B.idb),mainAfter:st(r.ls[S]),idbAfter:st(r.idb),text:r.text.slice(0,240)});},
};
for(const k of Object.keys(T)) if(!only||only.split(',').includes(k)) for(const vp of ['mobile','desktop']){try{await T[k](vp)}catch(e){console.log('ERR',k,vp,e.message.slice(0,300));res[`${k}-${vp}`]={err:e.message}}}
writeFileSync(`${OUT}/results-${only||'all'}.json`,JSON.stringify(res,null,1));await b.close();
