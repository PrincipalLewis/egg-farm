// one-off: why does clip.mjs see 0 panel rows at 1280?
const pw=(await import('/tmp/qa-m41-8-09cee47/node_modules/playwright-core/index.mjs')).default;
const br=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const c=await br.newContext({viewport:{width:1280,height:800}});const p=await c.newPage();
await p.addInitScript(()=>{if(!sessionStorage.getItem('q')){sessionStorage.setItem('q','1');localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:true}));}});
await p.goto(process.env.BASE);await p.getByText('Tap to start').click();await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi);
await p.evaluate(()=>{const g=window.eggfarm;g.state={...g.state,farmLevel:0,hensLevel:0,eggValueLevel:3,collectionLevel:0,coinsCents:1e13,tracksV7:1,seenTracksExplainer:true};window.eggfarmUi.render();});await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate(()=>{const ch=document.querySelector('.best-chip');const b=document.querySelector('.up button.buy');const anc=e=>{const o=[];for(let n=e;n;n=n.parentElement)o.push(n.tagName+(n.id?'#'+n.id:'')+(n.hidden?'[hidden]':'')+(n.inert?'[inert]':''));return o;};
 return {ups:document.querySelectorAll('.up').length,chips:document.querySelectorAll('.best-chip').length,chipAnc:ch&&anc(ch),buyRect:b&&b.getBoundingClientRect(),buyVis:b&&getComputedStyle(b).visibility,buyAnc:b&&anc(b),btnsTotal:document.querySelectorAll('button').length};})));
await br.close();
