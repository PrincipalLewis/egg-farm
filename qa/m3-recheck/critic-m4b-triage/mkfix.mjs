// Crafted M4 (post-migration) fixtures for critic-m4b-triage. Convention: qa/m3-recheck/m4b-1-repro/mkfix.mjs (FNV-1a sum over
// JSON.stringify(state), version 6). Marked M4 farm = tracksV7:1 + v6BackupId (like Game.ts:75 new M4 farms), seenTracksExplainer:true.
// savedAt is stamped at load time by the probe (Date.now()) so no offline grant / Welcome back interferes.
import {writeFileSync} from 'node:fs';
const base={coinsCents:0,coop:0,basket:0,collectionLevel:0,farmLevel:0,customers:[],nextCustomerInS:3,nextCustomerId:100,rng:3700654487,
 pendingOfflineEggs:0,celebratedTier:3,workers:{},graderTier:0,manageCdS:0,coopFullS:0,wageFracCents:{},hensLevel:0,eggValueLevel:0,
 celebratedMilestones:['hens:10','hens:20','hens:30','grade:5','grade:10','grade:20','balanced:1','balanced:2','balanced:3','balanced:4','balanced:5'],
 tracksV7:1,v6BackupId:'qa0critic0m4b0tr',seenTracksExplainer:true};
const W=(e)=>({energy:e,cdS:0});
const fx={
 // C1: Hens/Egg value at cap (F+3=17), workers hired, Collection affordable ($687), Farm ($3,340) a few hundred $ short.
 'C1-F14-coll-ready':{farmLevel:14,collectionLevel:9,hensLevel:17,eggValueLevel:17,coinsCents:290000,workers:{market_hand:W(100),coop_hand:W(100),hawker:W(100)}},
 // P1/P2/C2/C6-bubble: mid game, nothing affordable at start, income from 3 workers; rows become affordable over the run.
 'MID-F14-saving':{farmLevel:14,collectionLevel:9,hensLevel:15,eggValueLevel:15,coinsCents:50000,workers:{market_hand:W(100),coop_hand:W(100),hawker:W(100)}},
 // C2 at L25: Egg value L27->28 costs $74,187; coins $60,187 = $14,000 short (critic's number); Hens capped; Collection affordable.
 'C2-F25-14k-short':{farmLevel:25,collectionLevel:15,hensLevel:28,eggValueLevel:27,coinsCents:6018700,graderTier:5,workers:{market_hand:W(100),coop_hand:W(100),hawker:W(100),grader:W(100)}},
 // P3/P2 tap: Hens cheap and affordable (L5 $73), Farm unaffordable so its 'Ready in' hint ticks (Farm tab re-renders).
 'TAP-F14-hens-cheap':{farmLevel:14,collectionLevel:9,hensLevel:5,eggValueLevel:15,coinsCents:250000,workers:{market_hand:W(100),coop_hand:W(100),hawker:W(100)}},
 // C6 sell: basket 400, five open orders, no Market Hand (so only the player sells).
 'SELL-F14-basket400':{farmLevel:14,collectionLevel:9,hensLevel:15,eggValueLevel:15,coinsCents:50000,basket:400,nextCustomerInS:60,
   customers:[1,2,3,4,5].map(i=>({id:i,demand:40+i,filled:0,waitedS:0})),nextCustomerId:6},
 // Claude Gamer case: 390px, F7, 868 eggs held, one order (sell it), then no customers for a while.
 'GAMER-F7-868':{farmLevel:7,collectionLevel:6,hensLevel:9,eggValueLevel:9,coinsCents:8084,basket:900,nextCustomerInS:60,
   customers:[{id:1,demand:32,filled:0,waitedS:0}],nextCustomerId:2,workers:{}},
 // C6 Manage all: 3 workers just above the prompt threshold (50%): they cross it within ~9-27 s (1%/9 s).
 'MA-F14-energy51':{farmLevel:14,collectionLevel:9,hensLevel:15,eggValueLevel:15,coinsCents:50000,workers:{market_hand:W(50.4),coop_hand:W(51.2),hawker:W(52.6)}},
 // P4: Farm L19 -> L20 costs $18,201 -> "$18.2K"; coins $18.3K as in Player shot 04.
 'P4-F19-18k':{farmLevel:19,collectionLevel:9,hensLevel:22,eggValueLevel:13,coinsCents:1830000,graderTier:2,workers:{market_hand:W(100),coop_hand:W(100),hawker:W(100),grader:W(100)}},
};
const sum=t=>{let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(16).padStart(8,'0')};
for(const [k,v] of Object.entries(fx)){const s={...base,...v};const j=JSON.stringify(s);writeFileSync(`fixtures/${k}.json`,`{"version":6,"savedAt":0,"saveSeq":1,"sum":"${sum(j)}","state":${j}}`);}
// C2 burst (HoQA 10:36): F25 Egg value $14,000 short, a stockpile of 2,500 eggs (as after a Welcome back) and a full queue of
// 10 realistic orders (demandRange(25)); the player's Sell all is the burst.
{const s={...base,farmLevel:25,collectionLevel:15,hensLevel:28,eggValueLevel:27,coinsCents:6018700,graderTier:5,basket:2500,nextCustomerInS:60,nextCustomerId:11,
 customers:[1,2,3,4,5,6,7,8,9,10].map(i=>({id:i,demand:44+2*i,filled:0,waitedS:0})),workers:{market_hand:W(100),coop_hand:W(100),hawker:W(100),grader:W(100)}};
 const j=JSON.stringify(s);writeFileSync('fixtures/C2-F25-burst.json',`{"version":6,"savedAt":0,"saveSeq":1,"sum":"${sum(j)}","state":${j}}`);}
