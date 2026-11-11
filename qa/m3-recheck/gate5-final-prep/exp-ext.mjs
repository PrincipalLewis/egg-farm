// EXP1 04:34 additions (checklist 04:34 addendum EXP-a..d + HoQ writable/visible gate). Used by shoot-ext.mjs groups expgate, expui, expoff.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const CAN='/workspace/egg-farm-studio/qa/m3-recheck/gate4-fixtures/EXP1-committed-unseen-4ccb9fd.json',SUMS='/workspace/egg-farm-studio/qa/m3-recheck/gate4-fixtures/SHA256SUMS';
const fnv=t=>{let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16).padStart(8,'0')};
export const TITLE='Upgrades got an upgrade!',BODY='Hens and Egg value are now separate. Top them up!';
// canonical capture (sha-verified). refund variant: state.migrationRefundCents=12345 on main + idb (re-summed); whether the build honours it is recorded.
export function canonical(refund){if(!existsSync(CAN))return {err:'canonical fixture absent'};const buf=readFileSync(CAN),h=createHash('sha256').update(buf).digest('hex');
 if(!existsSync(SUMS)||!readFileSync(SUMS,'utf8').includes(h))return {err:`sha256 ${h} not in SHA256SUMS`};const c=JSON.parse(buf);const ls={...c.ls};let idb=c.idb?.main??null;
 if(refund){const sv=JSON.parse(ls['eggfarm.save']);sv.state.migrationRefundCents=12345;const st=JSON.stringify(sv.state);sv.sum=fnv(st);const raw=JSON.stringify({...sv,state:undefined}).replace(/}$/,`,"state":${st}}`).replace('"state":undefined,','');ls['eggfarm.save']=raw;idb=raw;}
 return {ls,idb,sha256:h,variant:refund?'refund (derived: migrationRefundCents=12345)':'no-refund (canonical)'};}
// init script: appearance counter (sessionStorage), optional hidden-tab and read-only (localStorage writes throw) toggles via sessionStorage __hidden / __ro
export const INIT=()=>{const ss=window.sessionStorage;
 const vis=()=>ss.getItem('__hidden')==='1'?'hidden':'visible';try{Object.defineProperty(Document.prototype,'visibilityState',{configurable:true,get:vis});Object.defineProperty(Document.prototype,'hidden',{configurable:true,get:()=>vis()==='hidden'});}catch{}
 window.__qaShow=()=>{ss.setItem('__hidden','0');document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));};
 const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===window.localStorage&&ss.getItem('__ro')==='1'&&String(k).startsWith('eggfarm')){const e=new DOMException('QA read-only','QuotaExceededError');throw e;}return set.call(this,k,v);};
 const tick=()=>{for(const e of document.querySelectorAll('body *'))if(!e.hasAttribute('data-exp-counted')&&e.childElementCount===0&&(e.textContent||'').trim()==='Upgrades got an upgrade!'){e.setAttribute('data-exp-counted','1');ss.setItem('__expCount',String(+(ss.getItem('__expCount')||0)+1));ss.setItem('__expAt',String(performance.now()));}};
 new MutationObserver(tick).observe(document,{subtree:true,childList:true});};
export async function seed(P,URL,fx,UI,toggles={}){await P.goto(URL+'favicon.ico').catch(()=>{});
 await P.evaluate(async([ls,idb,ui,tg])=>{sessionStorage.clear();for(const k of Object.keys(localStorage))if(k.startsWith('eggfarm'))localStorage.removeItem(k);
  const set=Object.getPrototypeOf(localStorage).setItem;for(const [k,v] of Object.entries(ls))localStorage.setItem(k,v);localStorage.setItem('eggfarm.ui',ui);
  await new Promise(r=>{const d=indexedDB.deleteDatabase('eggfarm');d.onsuccess=d.onerror=d.onblocked=()=>r();});
  if(idb)await new Promise((res,rej)=>{const o=indexedDB.open('eggfarm',1);o.onupgradeneeded=()=>o.result.createObjectStore('save');o.onsuccess=()=>{const t=o.result.transaction('save','readwrite');t.objectStore('save').put(idb,'main');t.oncomplete=()=>{o.result.close();res()};t.onerror=()=>rej(t.error)};o.onerror=()=>rej(o.error);});for(const [k,v] of Object.entries(tg))sessionStorage.setItem(k,v);},[fx.ls||{},fx.idb||null,JSON.stringify(UI),toggles]);}
export const flagState=P=>P.evaluate(()=>{const o={};for(const k of Object.keys(localStorage))if(k.startsWith('eggfarm')){const m=(localStorage.getItem(k)||'').match(/"seenTracksExplainer"\s*:\s*(true|false)/);if(m)o[k]=m[1]==='true';}return o;});
export const count=P=>P.evaluate(()=>+(sessionStorage.getItem('__expCount')||0));
export const snap=P=>P.evaluate(()=>{let s=null;try{s=JSON.parse(localStorage.getItem('eggfarm.save')).state}catch{}return {basket:s?.basket,basketHud:document.querySelector('#basket')?.textContent,hud:document.querySelector('#coins')?.textContent,F:s?.farmLevel,C:s?.collectionLevel,H:s?.hensLevel,V:s?.eggValueLevel,coinsCents:s?.coinsCents,lv:[...document.querySelectorAll('#uRow .lv')].map(e=>e.textContent)}});
// card metrics: copy, clipping (G-strict), Got it box, focus, motion
export const card=P=>P.evaluate(([T,B])=>{const t=[...document.querySelectorAll('body *')].find(e=>e.childElementCount===0&&e.textContent.trim()===T);if(!t)return null;
 const root=t.closest('[role=dialog]')||t.parentElement;const txt=[...root.querySelectorAll('*')].filter(e=>e.childElementCount===0&&e.textContent.trim());
 const clip=txt.filter(e=>e.scrollWidth>e.clientWidth+0.5||e.scrollHeight>e.clientHeight+0.5&&getComputedStyle(e).overflowY!=='visible').map(e=>({t:e.textContent.trim().slice(0,40),sw:e.scrollWidth,cw:e.clientWidth}));
 const rr=root.getBoundingClientRect();const gb=[...root.querySelectorAll('button')].find(b=>/Got it/.test(b.textContent));const g=gb?.getBoundingClientRect();const cs=getComputedStyle(root);
 return {role:root.getAttribute('role'),ariaModal:root.getAttribute('aria-modal'),text:root.innerText,copyTitle:root.innerText.includes(T),copyBody:root.innerText.includes(B),refundLine:/We refunded \+\$[\d.,KMBT]+ for your old upgrades\./.test(root.innerText),
  offscreen:rr.left<0||rr.right>innerWidth+0.5,clip,gotIt:g?{w:g.width,h:g.height}:null,focusOnGotIt:document.activeElement===gb,transition:cs.transition,animation:cs.animationName+' '+cs.animationDuration,transform:cs.transform,
  anims:document.getAnimations().filter(a=>root.contains(a.effect?.target)).map(a=>({name:a.animationName||a.transitionProperty||a.constructor.name,dur:a.effect?.getTiming().duration,props:(a.effect?.getKeyframes?.()||[]).flatMap(k=>Object.keys(k)).filter(k=>!['offset','easing','composite','computedOffset'].includes(k))}))};},[TITLE,BODY]);
// offline variant: savedAt moved back (top-level, outside the checksum) on main, .bak and IDB so Welcome back shows first
export function offline(fx,secs=3600){const o={...fx,ls:{...fx.ls}};const mv=r=>{const d=JSON.parse(r);d.savedAt=Date.now()-secs*1000;return JSON.stringify(d)};
 o.ls['eggfarm.save']=mv(o.ls['eggfarm.save']);if(o.ls['eggfarm.save.bak'])o.ls['eggfarm.save.bak']=mv(o.ls['eggfarm.save.bak']);if(o.idb)o.idb=mv(o.idb);o.variant+=` + offline ${secs}s`;return o;}
