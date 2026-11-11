const pw=require('/workspace/egg-farm-studio/game/node_modules/playwright-core');
const fs=require('fs');const eng=process.argv[2];const D=__dirname+'/'+eng;fs.mkdirSync(D,{recursive:true});
const F='file:///workspace/egg-farm-studio/qa/m3-recheck/release-confirm-m3-rc1-dialog/assets/egg-farm-m3-rc1-dialog-a01faea.html';
const log=[],blocked=[],R={steps:[]};const L=s=>{log.push(s);console.log(s)};
let p,c,b;const save=()=>{fs.writeFileSync(`${D}/console.log`,log.join('\n'));fs.writeFileSync(`${D}/blocked.txt`,blocked.join('\n'));fs.writeFileSync(`${D}/result.json`,JSON.stringify(R,null,1))};
const coins=()=>p.evaluate(()=>document.getElementById('coins')?.textContent);
const st=()=>p.evaluate(()=>({coins:document.getElementById('coins')?.textContent,basket:document.getElementById('basket')?.innerText.replace(/\s+/g,' '),nest:document.getElementById('nestEggs')?.innerText,collect:document.getElementById('collect')?.innerText.replace(/\s+/g,' '),onb:document.querySelector('.onb-txt')?.innerText}));
let sn=0;const snap=async n=>{const nm=String(++sn).padStart(2,'0')+'-'+n;await p.screenshot({path:`${D}/${nm}.png`});const t=await p.evaluate(()=>document.body.innerText);fs.writeFileSync(`${D}/${nm}.txt`,t);const s=await st();L(`--- ${nm}: ${JSON.stringify(s)}`);L('    btns: '+JSON.stringify(await btns()));return s};
const btns=()=>p.evaluate(()=>[...document.querySelectorAll('button,[role=button],[data-nav]')].filter(b=>b.offsetParent||b.getClientRects().length).map(b=>(b.id?'#'+b.id:'')+(b.dataset.nav?'[nav='+b.dataset.nav+']':'')+':'+(b.innerText||b.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim().slice(0,60)+(b.disabled?'[dis]':'')));
const clickText=async re=>{const l=p.locator('button:visible,[role=button]:visible');const n=await l.count();for(let i=0;i<n;i++){const t=(await l.nth(i).innerText()).replace(/\s+/g,' ').trim();if(re.test(t)){await l.nth(i).click();return t}}return null};
(async()=>{try{b=await pw[eng].launch(eng==='chromium'?{executablePath:'/usr/bin/google-chrome'}:{});
c=await b.newContext({viewport:{width:1280,height:900}});
await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file://')||/^(data|blob):/.test(u))r.continue();else{blocked.push(u);r.abort()}});
p=await c.newPage();
p.on('console',m=>L(`[console.${m.type()}] ${m.text()}`));p.on('pageerror',e=>L(`[pageerror] ${e.message}`));
await p.goto(F);await p.waitForTimeout(2500);await snap('load');
await clickText(/Tap to start/);await p.waitForTimeout(1500);await snap('started');
R.globals=await p.evaluate(()=>Object.getOwnPropertyNames(window).filter(k=>/^eggfarm/i.test(k)));L('globals '+JSON.stringify(R.globals));
// collect
const s0=await st();R.steps.push({act:'pre-collect',...s0});
for(let i=0;i<6;i++){const s1=await st();await p.locator('#collect').click();await p.waitForTimeout(700);const s2=await st();R.steps.push({act:'collect',before:s1,after:s2});}
await snap('collected');
// sell
const cardOf=h=>h.evaluate(e=>{let c=e;for(let i=0;i<4&&c.parentElement;i++){c=c.parentElement;if(c.innerText.length>20)break}return c.className+' :: '+c.innerText.replace(/\s+/g,' ')});
const findBtn=async re=>{const l=p.locator('button:visible');const n=await l.count();for(let i=0;i<n;i++){const h=l.nth(i);const id=await h.getAttribute('id');const t=(await h.innerText()).replace(/\s+/g,' ').trim();if(!id&&re.test(t)&&await h.isEnabled())return [h,t]}return [null,null]};
R.sells=[];
for(let k=0;k<4;k++){let h,t;for(let w=0;w<20;w++){[h,t]=await findBtn(/^Sell( \d+)?$/);if(h)break;await p.waitForTimeout(500)}
 if(!h){L('no sell btn');break}
 const card=await cardOf(h);const before=await st();await h.click();await p.waitForTimeout(1200);const after=await st();
 R.sells.push({btn:t,card,before,after});L('SELL '+JSON.stringify(R.sells.at(-1)));await snap('after-sell-'+k);
 const [ub,ut]=await findBtn(/^\$[\d.,]+$/);const cn=parseFloat((after.coins||'0').replace(/[$,]/g,''));if(ub&&cn>=parseFloat(ut.slice(1)))break;
 for(let i=0;i<4;i++){await p.locator('#collect').click();await p.waitForTimeout(600)}}
// upgrade
let [uh,ut]=await findBtn(/^\$[\d.,]+$/);await snap('pre-buy');
if(uh){const card=await cardOf(uh);const before=await st();const lvl=await p.locator('#goal').innerText().catch(()=>'');await uh.click();await p.waitForTimeout(1500);const after=await st();
 R.buy={btn:ut,card,before,after,goalBefore:lvl,goalAfter:await p.locator('#goal').innerText().catch(()=>''),cardAfter:await cardOf(uh).catch(()=>null)};L('BUY '+JSON.stringify(R.buy))}
await snap('after-buy');
// build id: settings
await p.locator('#settings').click().catch(e=>L('settings fail '+e.message));await p.waitForTimeout(1000);await snap('settings');
R.buildText=await p.evaluate(()=>(document.body.innerText.match(/.{0,40}a01faea.{0,10}/)||[null])[0]);L('buildText '+R.buildText);
await p.keyboard.press('Escape').catch(()=>{});await p.waitForTimeout(800);
R.preReload=await st();R.preUp=await p.locator('#goal').innerText().catch(()=>'');
await p.waitForTimeout(2500);
await p.reload();await p.waitForTimeout(3000);await snap('reloaded');await clickText(/Tap to start|Collect$|Continue|OK/);await p.waitForTimeout(1200);
R.postReload=await snap('reloaded-started');
R.postUp=await p.locator('#goal').innerText().catch(()=>'');
R.globalsEnd=await p.evaluate(()=>Object.getOwnPropertyNames(window).filter(k=>/^eggfarm/i.test(k)));
}catch(e){L('SCRIPT ERROR '+e.stack)}save();await b?.close();})();
