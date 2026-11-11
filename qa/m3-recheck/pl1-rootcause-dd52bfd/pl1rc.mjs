// PL-1 root cause on dd52bfd. node pl1rc.mjs <engine> [headed]
import pw from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs';
import { appendFileSync } from 'node:fs';
import { loadState } from '../gate5-pr41/lib.mjs';
const ENG=process.argv[2],HEADED=process.argv[3]==='headed',URL=process.env.URL||'http://127.0.0.1:4417/',LABEL='m3-rc1-pre+'+(process.env.SHA7||'dd52bfd');globalThis.__URL=URL;
const OUT=new globalThis.URL('.',import.meta.url).pathname,LOG=`${OUT}/results-${process.env.SHA7||'dd52bfd'}-${ENG}${HEADED?'-headed':''}.jsonl`;
const opt={headless:!HEADED};if(ENG==='chromium'){opt.executablePath='/usr/bin/google-chrome';if(HEADED)opt.args=['--auto-open-devtools-for-tabs'];}
const br=await pw[ENG].launch(opt);
const st=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('eggfarm.save')).state);
async function setup(w,h){const c=await br.newContext({viewport:{width:w,height:h}});const p=await c.newPage();await loadState(p,'pl1');
 if(await p.evaluate(()=>document.querySelector('meta[name=build-id]')?.content)!==LABEL)throw new Error('build-id');
 // instrument: count dispatched buys via trusted click events on the farm buy button + key events seen by the page
 await p.evaluate(()=>{window.__ev=[];const L=e=>__ev.push(`${e.type}:${e.key||''}${e.repeat?'(r)':''}${e.isTrusted?'':'(untrusted)'}`);
  ['keydown','keyup'].forEach(t=>document.addEventListener(t,L,true));document.addEventListener('click',e=>{if(e.target.closest?.('[data-kind=farm]'))__ev.push('click:farmBuy'+(e.detail===0?'(kbd)':''))},true);
  ['blur','focus'].forEach(t=>window.addEventListener(t,()=>__ev.push('win:'+t)));document.addEventListener('visibilitychange',()=>__ev.push('vis:'+document.visibilityState));});
 if(!(await p.locator('[data-tab=farm]').isVisible()))await p.locator('[data-nav=upgrades]').click();await p.locator('[data-tab=farm]').click();
 await p.waitForFunction(()=>document.querySelector('[data-tab=farm]').classList.contains('active')&&!!document.querySelector('#uRow [data-kind=farm]'));
 await p.locator('#uRow [data-kind=farm]').focus();await p.waitForTimeout(1300);return {c,p};}
const focusBuy=p=>p.locator('#uRow [data-kind=farm]').focus().catch(()=>{});
const hold=async(p,key,ms)=>{await p.keyboard.down(key);const t=Date.now();while(Date.now()-t<ms){await p.waitForTimeout(33);await p.keyboard.down(key);}await p.keyboard.up(key);};
const CASES={
 a_escape_tap:async({p})=>{await p.keyboard.press('Escape')},
 b_enter_tap:async({p})=>{await p.keyboard.press('Enter')},
 c1_enter_hold_downup:async({p})=>{await p.keyboard.down('Enter');await p.waitForTimeout(1500);await p.keyboard.up('Enter')},
 c2_enter_hold_autorepeat:async({p})=>{await hold(p,'Enter',1500)},
 c3_enter_synthetic_repeat:async({p})=>{await p.evaluate(async()=>{const b=document.querySelector('#uRow [data-kind=farm]');for(let i=0;i<30;i++){b.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',repeat:i>0,bubbles:true}));await new Promise(r=>setTimeout(r,33));}b.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true}))})},
 d1_space_tap:async({p})=>{await p.keyboard.press(' ')},
 d2_space_hold_autorepeat:async({p})=>{await hold(p,' ',1500)},
 e1_escape_upgrades_open:async({p})=>{await focusBuy(p);await p.keyboard.press('Escape')},
 e2_escape_market_open:async({p,w})=>{if(w<1000){await p.locator('[data-nav=market]').click().catch(()=>{});}await focusBuy(p);await p.keyboard.press('Escape')},
 f1_contextmenu_then_escape:async({p})=>{await p.locator('#uRow [data-kind=farm]').click({button:'right'}).catch(()=>{});await focusBuy(p);await p.keyboard.press('Escape')},
 f2_alert_then_escape:async({p})=>{p.once('dialog',d=>setTimeout(()=>d.dismiss(),300));await p.evaluate(()=>{const a=document.activeElement;alert('x');a.focus()});await p.keyboard.press('Escape')},
 h1_focus_after_click_buy_then_enter:async({p})=>{const ae=()=>p.evaluate(()=>{const a=document.activeElement;return a===document.body?'body':(a.dataset?.kind?'buy:'+a.dataset.kind:a.tagName+'.'+a.className)});
  await p.evaluate(()=>{document.activeElement?.blur()});const b0=await ae();await p.locator('#uRow [data-kind=farm]').click();await p.waitForTimeout(300);const b1=await ae();await p.keyboard.press('Enter');await p.waitForTimeout(300);const b2=await ae();
  await p.evaluate(x=>__ev.push('focus:'+x),[b0,b1,b2].join('>'));},
 h2_focus_after_click_buy_then_escape:async({p})=>{await p.locator('#uRow [data-kind=farm]').click();await p.waitForTimeout(300);const a=await p.evaluate(()=>document.activeElement?.dataset?.kind||document.activeElement?.tagName);await p.keyboard.press('Escape');await p.evaluate(x=>__ev.push('focus-after-buy:'+x),a);},
 c4_enter_hold_2s:async({p})=>{await hold(p,'Enter',2000)},
 d3_space_hold_2s:async({p})=>{await hold(p,' ',2000)},
 g1_blur_focus_events:async({p})=>{await p.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'))})},
 g2_other_page_front_back:async({p,c})=>{const q=await c.newPage();await q.bringToFront();await p.waitForTimeout(500);await p.bringToFront();await p.waitForTimeout(300);await q.close()},
 g3_escape_down_outside_up_inside:async({p,c})=>{const q=await c.newPage();await q.bringToFront();await q.keyboard.down('Escape');await p.bringToFront();await p.keyboard.up('Escape');await q.close()},
 g4_enter_keyup_on_return:async({p,c})=>{const q=await c.newPage();await q.bringToFront();await p.bringToFront();await focusBuy(p);await p.keyboard.up('Enter');await q.close()},
 g5_space_keyup_on_return:async({p,c})=>{const q=await c.newPage();await q.bringToFront();await p.bringToFront();await focusBuy(p);await p.keyboard.up(' ');await q.close()},
 g6_escape_tap_after_return:async({p,c})=>{const q=await c.newPage();await q.bringToFront();await p.bringToFront();await focusBuy(p);await p.keyboard.press('Escape');await q.close()},
};
const only=process.env.CASES?.split(',');
for(const [name,fn] of Object.entries(CASES)){if(only&&!only.includes(name))continue;
 const SZ=process.env.SIZE?[process.env.SIZE.split('x').map(Number)]:null;
 for(const [w,h] of (SZ||(name.startsWith('e2')?[[390,844],[1280,800]]:[[390,844]])))for(let t=1;t<=3;t++){
  try{const ctx=await setup(w,h);ctx.w=w;const {p}=ctx;const s0=await st(p);await p.evaluate(()=>__ev.length=0);
   await fn(ctx);await p.waitForTimeout(1500);const s1=await st(p);const ev=await p.evaluate(()=>__ev);
   const r={sha7:process.env.SHA7||"dd52bfd",engine:ENG,headed:HEADED,case:name,size:`${w}x${h}`,try:t,levels:s1.farmLevel-s0.farmLevel,coinDelta:(s1.coinsCents-s0.coinsCents)/100,clicks:ev.filter(e=>e.startsWith('click')).length,events:ev.slice(0,40)};
   if(process.env.SHOTDIR&&t===1){const D=process.env.SHOTDIR;await p.waitForFunction(()=>document.querySelector('[data-tab=farm]').classList.contains('active')&&getComputedStyle(document.querySelector('#uRow')).display!=='none'&&!!document.querySelector('#uRow [data-kind=farm]'),null,{timeout:3000});
    const bid=await p.evaluate(()=>document.querySelector('meta[name=build-id]').content);const file=`${ENG}/pl1-${name}-${w}x${h}.png`;(await import('node:fs')).mkdirSync(`${D}/${ENG}`,{recursive:true});await p.screenshot({path:`${D}/${file}`});
    appendFileSync(`${D}/entries.jsonl`,JSON.stringify({file,engine:ENG,size:`${w}x${h}`,docked:w>=960,save:'inline:pl1 (gate5-pr41/lib.mjs)',seed:null,state:`${name}: Farm Buy focused; levels bought ${r.levels}, coin delta ${r.coinDelta}`,asserted_tab:'farm',build_id:bid})+'\n');}
   appendFileSync(LOG,JSON.stringify(r)+'\n');console.log(name,w,t,'levels',r.levels,'coins',r.coinDelta.toFixed(2),'clicks',r.clicks);await ctx.c.close();}
  catch(e){appendFileSync(LOG,JSON.stringify({engine:ENG,case:name,try:t,error:e.message.split('\n')[0]})+'\n');console.log(name,t,'ERROR',e.message.split('\n')[0]);}}}
await br.close();
