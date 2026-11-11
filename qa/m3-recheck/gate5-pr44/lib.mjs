// shared fixtures + helpers for shoot.mjs / probes.mjs
import { readFileSync } from 'node:fs';
export const sum=t=>{let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16).padStart(8,'0')};
const D=new globalThis.URL('.',import.meta.url).pathname;
export const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:true};
const CUST=[{id:901,demand:40,filled:0,waitedS:1},{id:902,demand:60,filled:10,waitedS:2}];
const W4={market_hand:{energy:80,cdS:5},coop_hand:{energy:80,cdS:5},hawker:{energy:80,cdS:5},grader:{energy:80,cdS:5}};
// state patches applied on top of the build's own fresh save (so the save version always matches the build under test)
export const STATES={
 fresh:null,
 // L10 (re-tuned for #44): Hens capped at F+3 (=13, 'Needs Farm L11'), Egg value 9 (one buy from the L10 grade), Hens L10 milestone uncelebrated -> toast on load
 L10:{farmLevel:10,collectionLevel:9,hensLevel:13,eggValueLevel:9,celebratedMilestones:[],coinsCents:250000,basket:120,customers:CUST,workers:{market_hand:{energy:45,cdS:5},coop_hand:{energy:45,cdS:5}},nextCustomerInS:600},
 L30:{farmLevel:30,collectionLevel:30,hensLevel:30,eggValueLevel:30,coinsCents:1.5e14,basket:2e9,customers:[{id:903,demand:181e9,filled:0,waitedS:1},{id:904,demand:1.2e12,filled:5e11,waitedS:2}],workers:W4,graderTier:5,nextCustomerInS:600},
 // probe-only (not shot): L10 with enough money for several Farm buys
 pl1:{farmLevel:10,collectionLevel:9,hensLevel:9,eggValueLevel:7,coinsCents:5000000,basket:0,customers:[],nextCustomerInS:600},
 'migrated-acdbedc':'fixtures/acdbedc-v6rich.json'};

export const start=async p=>{await p.goto(globalThis.__URL);await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(1200);await p.locator('#wbCollect').click({timeout:800}).catch(()=>{});};
// load a state: build's own fresh save patched (inline) or a raw fixture file; returns save description
export async function loadState(p,stName){const URL=globalThis.__URL,st=STATES[stName];
 await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(u=>{localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify(u))},UI);
 if(!st){await start(p);return 'fresh';}
 await start(p);await p.waitForTimeout(1500);const base=JSON.parse(await p.evaluate(()=>localStorage.getItem('eggfarm.save')));let raw,desc;
 if(typeof st==='string'){raw=readFileSync(D+st,'utf8');desc=st;}else{Object.assign(base.state,st);const s=JSON.stringify(base.state);raw=`{"version":${base.version},"savedAt":${Date.now()},"sum":"${sum(s)}","state":${s}}`;desc=`inline:${stName}`;}
 await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(r=>{for(const k of Object.keys(localStorage))if(k.startsWith('eggfarm.save'))localStorage.removeItem(k);localStorage.setItem('eggfarm.save',r);indexedDB.deleteDatabase('eggfarm')},raw);
 await start(p);return desc;}
