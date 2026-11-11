// Gate 5 FINAL-SHA additions: fixtures (state patches on the build's own fresh save, so version/schema always match the SHA).
// Schema per 4ccb9fd src/sim/state.ts + src/save/save.ts (v7: farmLevel, collectionLevel, hensLevel, eggValueLevel, celebratedMilestones, coinsCents...).
import { readFileSync } from 'node:fs';
export const sum=t=>{let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16).padStart(8,'0')};
const D=new globalThis.URL('.',import.meta.url).pathname;
export const UI={onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false,reducedMotion:true};
const W4={market_hand:{energy:80,cdS:5},coop_hand:{energy:80,cdS:5},hawker:{energy:80,cdS:5},grader:{energy:80,cdS:5}};
const CUST=[{id:901,demand:40,filled:0,waitedS:1},{id:902,demand:60,filled:10,waitedS:2}];
const big={customers:[{id:903,demand:181e9,filled:0,waitedS:1}],workers:W4,graderTier:5,basket:2e9,nextCustomerInS:600,celebratedMilestones:['hens:10','hens:20','hens:30','grade:5','grade:10','grade:20','balanced:1','balanced:2','balanced:3']};
// MAX levels are read from the build at runtime (balance maxLevel; 30 on 4ccb9fd). '$MAX' / '$MAX-n' are resolved per build.
export const STATES={
 // 1. max per track (+ combined). Others kept below max and within the F+cap rule so only the target row is MAX.
 'max-farm':      {farmLevel:'$MAX',collectionLevel:'$MAX-5',hensLevel:'$MAX-5',eggValueLevel:'$MAX-5',coinsCents:5e12,...big},
 'max-collection':{farmLevel:'$MAX-3',collectionLevel:'$MAX',hensLevel:'$MAX-5',eggValueLevel:'$MAX-5',coinsCents:5e12,...big},
 'max-hens':      {farmLevel:'$MAX-3',collectionLevel:'$MAX-5',hensLevel:'$MAX',eggValueLevel:'$MAX-5',coinsCents:5e12,...big},
 'max-eggvalue':  {farmLevel:'$MAX-3',collectionLevel:'$MAX-5',hensLevel:'$MAX-5',eggValueLevel:'$MAX',coinsCents:5e12,...big},
 'max-all':       {farmLevel:'$MAX',collectionLevel:'$MAX',hensLevel:'$MAX',eggValueLevel:'$MAX',coinsCents:1.68e14,...big},
 // 2. L31-55 rows (checklist 03:35). Absolute levels; only valid on a build whose maxLevel >= these (NOT 4ccb9fd: maxLevel 30).
 L50:{farmLevel:50,collectionLevel:49,hensLevel:50,eggValueLevel:50,coinsCents:1.68e14,...big},   // Farm MAX@50 + Collection L49 ($100.4B)
 L55:{farmLevel:50,collectionLevel:50,hensLevel:55,eggValueLevel:55,coinsCents:1.68e14,...big},   // H and V MAX@55
 // 5. HoP cap (D-HOP-08): Farm 50, Hens/Egg value 55. Needs econ 6809f8e (+ live data) in the stacked SHA. $FMAX/$CMAX/$TMAX read from the build.
 farm50:{farmLevel:'$FMAX',collectionLevel:'$CMAX-1',hensLevel:'$FMAX',eggValueLevel:'$FMAX',coinsCents:1e17,...big},            // Farm MAX, tracks at F (50) still buyable (L51-55)
 'farm50-tracks55':{farmLevel:'$FMAX',collectionLevel:'$CMAX',hensLevel:'$TMAX',eggValueLevel:'$TMAX',coinsCents:1e17,...big}, // all MAX, hint done
 c4:{farmLevel:'$FMAX',collectionLevel:'$CMAX-1',hensLevel:'$FMAX',eggValueLevel:'$FMAX',coinsCents:1e17,basket:0,customers:[],workers:{},nextCustomerInS:9999,celebratedMilestones:big.celebratedMilestones}, // L50->51 buy deltas
 // 6. H6: Hens one below L10 (cap F+3 ok), coins for the buy, nothing celebrated yet
 h6:{farmLevel:10,collectionLevel:9,hensLevel:9,eggValueLevel:9,celebratedMilestones:[],coinsCents:5e8,basket:0,customers:[],workers:{},nextCustomerInS:9999},
 // 3. HUD tier boundary (L30 base from gate5 lib)
 // no basket / customers / workers so coins don't move before the HUD read (otherwise sales add ~$100B+ in seconds at L30)
 'coins-999.96B':{farmLevel:30,collectionLevel:30,hensLevel:30,eggValueLevel:30,coinsCents:99996e9,basket:0,customers:[],workers:{},nextCustomerInS:9999,celebratedMilestones:big.celebratedMilestones},
 'coins-1.68T':  {farmLevel:30,collectionLevel:30,hensLevel:30,eggValueLevel:30,coinsCents:1.68e14,basket:0,customers:[],workers:{},nextCustomerInS:9999,celebratedMilestones:big.celebratedMilestones},
 // 4. next-goal + tracks in the 4 gate states (same patches as gate5-pr44/lib.mjs)
 fresh:null,
 L10:{farmLevel:10,collectionLevel:9,hensLevel:13,eggValueLevel:9,celebratedMilestones:[],coinsCents:250000,basket:120,customers:CUST,workers:{market_hand:{energy:45,cdS:5},coop_hand:{energy:45,cdS:5}},nextCustomerInS:600},
 L30:{farmLevel:30,collectionLevel:30,hensLevel:30,eggValueLevel:30,coinsCents:1.5e14,basket:2e9,customers:[{id:903,demand:181e9,filled:0,waitedS:1},{id:904,demand:1.2e12,filled:5e11,waitedS:2}],workers:W4,graderTier:5,nextCustomerInS:600},
 'migrated-acdbedc':'../gate5-pr44/fixtures/acdbedc-v6rich.json'};
// tokens: $MAX (= Farm max, legacy), $FMAX, $CMAX (Collection), $TMAX (min of Hens/Egg value max), optional -n
const res=(st,MX)=>Object.fromEntries(Object.entries(st).map(([k,v])=>{const m=typeof v==='string'&&v.match(/^\$(MAX|FMAX|CMAX|TMAX)(?:-(\d+))?$/);if(!m)return [k,v];const base={MAX:MX.F,FMAX:MX.F,CMAX:MX.C,TMAX:Math.min(MX.H,MX.V)}[m[1]];return [k,base-(+(m[2]||0))];}));
export const start=async p=>{await p.goto(globalThis.__URL);await p.getByText('Tap to start').click({timeout:60000});await p.waitForTimeout(1200);await p.locator('#wbCollect').click({timeout:800}).catch(()=>{});};
// returns {desc, raw, maxLevel}. MAX read from the running bundle via the fresh save's game (window-free): we probe the Farm meta "Level x / MAX".
export async function buildSave(p,stName,MX){const st=STATES[stName];const base=JSON.parse(await p.evaluate(()=>localStorage.getItem('eggfarm.save')));
 if(typeof st==='string')return {desc:st,raw:readFileSync(D+st,'utf8')};
 Object.assign(base.state,res(st,MX));const s=JSON.stringify(base.state);return {desc:`inline:${stName}`,raw:`{"version":${base.version},"savedAt":${Date.now()},"sum":"${sum(s)}","state":${s}}`};}
// per-row max from "Level n / MAX" (Farm tab: farm + tracks; Collection tab: collection). Tracks absent (m4 off) -> H/V = F.
export async function readMax(p){const rows=()=>p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#uRow .up')].map(e=>[e.dataset.track||e.querySelector('h3')?.textContent,+(e.querySelector('.meta')?.textContent.match(/\/\s*(\d+)/)||[])[1]])));
 const a=await rows();await p.locator('[data-tab=collection]').click().catch(()=>{});await p.waitForTimeout(250);const c=await rows();await p.locator('[data-tab=farm]').click().catch(()=>{});
 const F=a['Farm level']||a.farm||null;return {F,C:c['Collect per tap']||F,H:a.hens||F,V:a.eggValue||F};}
export async function loadState(p,stName){const URL=globalThis.__URL;
 await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(u=>{localStorage.clear();localStorage.setItem('eggfarm.ui',JSON.stringify(u))},UI);
 await start(p);if(STATES[stName]===null)return {desc:'fresh',raw:null,maxLevel:null};
 await p.waitForTimeout(1500);
 // maxLevel: open Upgrades once to read "Level n / MAX"
 const docked=(p.viewportSize().width>=960);if(!docked)await p.locator('[data-nav=upgrades]').click().catch(()=>{});await p.locator('[data-tab=farm]').click().catch(()=>{});await p.waitForTimeout(300);
 const MX=await readMax(p);const sv=await buildSave(p,stName,MX);
 await p.goto(URL+'favicon.ico').catch(()=>{});await p.evaluate(r=>{for(const k of Object.keys(localStorage))if(k.startsWith('eggfarm.save'))localStorage.removeItem(k);localStorage.setItem('eggfarm.save',r);indexedDB.deleteDatabase('eggfarm')},sv.raw);
 await start(p);return {...sv,maxLevel:MX.F,max:MX};}
// state actually running after load (from the persisted save after first autosave) + whether a recovery dialog appeared
export async function loadedInfo(p){await p.waitForTimeout(800);return p.evaluate(()=>{let s=null;try{s=JSON.parse(localStorage.getItem('eggfarm.save')).state}catch{}
 const rec=[...document.querySelectorAll('.modal.open,[role=dialog]')].map(e=>e.innerText.slice(0,120)).filter(t=>/save|recover|corrupt|restore/i.test(t));
 return {F:s?.farmLevel,C:s?.collectionLevel,H:s?.hensLevel,V:s?.eggValueLevel,coinsCents:s?.coinsCents,hud:document.querySelector('#coins')?.textContent?.trim(),recovery:rec}});}
