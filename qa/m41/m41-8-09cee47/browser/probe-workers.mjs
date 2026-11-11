// one-off discovery: #goal label/status for candidate W1-W4 / done / no-income states (records label, aria-label, desc). usage: BASE=... node probe-workers.mjs
const pw=(await import('/tmp/qa-m41-8-09cee47/node_modules/playwright-core/index.mjs')).default;
const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const W={energy:100,cdS:1};
const C=[['W1-market-hand',{farmLevel:11,hensLevel:16,eggValueLevel:16,collectionLevel:6,coinsCents:1e13},{hawker:W},1],
['W2-coop-a',{farmLevel:11,hensLevel:16,eggValueLevel:16,collectionLevel:6,coinsCents:1e13},{hawker:W,market_hand:W},1],
['W2-coop-b',{farmLevel:13,hensLevel:16,eggValueLevel:16,collectionLevel:8,coinsCents:1e13},{hawker:W,market_hand:W},1],
['W2-coop-c',{farmLevel:14,hensLevel:17,eggValueLevel:17,collectionLevel:9,coinsCents:0},{hawker:W,market_hand:W},1],
['W3-hawker',{farmLevel:8,hensLevel:11,eggValueLevel:11,collectionLevel:2,coinsCents:0},null,1],
['W4-grader',{farmLevel:18,hensLevel:15,eggValueLevel:15,collectionLevel:15,coinsCents:0},null,1],
['W4-grader-hire',{farmLevel:18,hensLevel:21,eggValueLevel:21,collectionLevel:21,coinsCents:0},{hawker:W,market_hand:W,coop_hand:W},1],
['noinc-broke',{farmLevel:0,hensLevel:3,eggValueLevel:2,collectionLevel:0,coinsCents:0},null,0],
['noinc-farm',{farmLevel:0,hensLevel:3,eggValueLevel:3,collectionLevel:0,coinsCents:0},null,0],
['noinc-hens-rich',{farmLevel:0,hensLevel:0,eggValueLevel:3,collectionLevel:0,coinsCents:1e13},null,0]];
for(const [n,st,wk,sale] of C){const c=await br.newContext({viewport:{width:390,height:800}});const p=await c.newPage();
 await p.addInitScript(()=>{if(!sessionStorage.getItem('q')){sessionStorage.setItem('q','1');localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:true}));}});
 await p.goto(process.env.BASE);await p.getByText('Tap to start').click();await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi);
 const r=await p.evaluate(async([st,wk,sale])=>{const g=window.eggfarm;if(sale){g.state={...g.state,basket:5,coop:0,customers:[{id:9001,demand:5,filled:0,waitedS:0}],nextCustomerInS:1e9};g.dispatch({type:'sellAll'});}
  g.state={...g.state,tracksV7:1,workers:wk??{},seenTracksExplainer:true,customers:[],nextCustomerInS:1e9,coop:0,basket:0,...st};window.eggfarmUi.render();await new Promise(r=>setTimeout(r,1500));window.eggfarmUi.render();
  const b=document.querySelector('#goal');return {bid:document.querySelector('meta[name=build-id]').content,label:b.querySelector('.goal-label').textContent,status:b.querySelector('.goal-status').textContent,aria:b.getAttribute('aria-label'),desc:document.getElementById('goalDesc')?.textContent};},[st,wk,sale]);
 console.log(n,JSON.stringify(r));await c.close();}
await br.close();
