// QA-owned scrolled & unscrolled Buy/Collect tap + rect non-intersection + data-place="none" contract probe for PR #65 @ c877f69.
// usage: node p65-tap.mjs <chromium|firefox|webkit> <width> <after-full-sha>
// Serves AFTER (/tmp/qa-m41-9-<sha7>/dist-qa) and BEFORE (/tmp/qa-m41-9-base-dd223f5/dist-qa) on own OS-assigned ports (never :4173).
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync,statSync} from 'node:fs';
import http from 'node:http';
import {join,extname} from 'node:path';

const [ENG,WS,SHA]=process.argv.slice(2);
const W=+WS, S7=SHA.slice(0,7), H={360:640,375:667,390:844,412:915,430:932,1280:800}[W]??800;
const AFTER_WT=process.env.QA_WT??`/tmp/qa-m41-9-${S7}`, BEFORE_WT='/tmp/qa-m41-9-base-dd223f5';
const pw=(await import(`${AFTER_WT}/node_modules/playwright-core/index.mjs`)).default;
const E=`/workspace/egg-farm-studio/qa/m41/m41-9-${S7}/`;
mkdirSync(`${E}shots/${ENG}`,{recursive:true}); mkdirSync(`${E}browser`,{recursive:true});
const OUT=`${E}browser/tap-${ENG}-${W}.jsonl`; writeFileSync(OUT,'');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2'};
const serve=dir=>new Promise(r=>{const s=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=join(dir,p);if(!existsSync(f)||statSync(f).isDirectory()){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':MIME[extname(f)]??'application/octet-stream'});res.end(readFileSync(f));}).listen(0,'127.0.0.1',()=>r({url:`http://127.0.0.1:${s.address().port}/`,s}));});
const SRV={after:await serve(`${AFTER_WT}/dist-qa`),before:await serve(`${BEFORE_WT}/dist-qa`)};
const BID={after:`m3-rc1-pre+${S7}`,before:'m3-rc1-pre+dd223f5'};
const br=ENG==='chromium'?await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}):await pw[ENG].launch();
const rec=o=>appendFileSync(OUT,JSON.stringify({sha:SHA,engine:ENG,size:`${W}x${H}`,w:W,h:H,...o})+'\n');
const errs=[];
const BASE={farmLevel:3,hensLevel:2,eggValueLevel:2,collectionLevel:1,coinsCents:5e7};
const SCROLLS=[0,100,200,300,'end'];

// Wait 2 rAFs + small timer so scroll/resize/click coalesced rAF in tracks-explainer.ts has definitely settled
const settle = p => p.evaluate(() => new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 25)));

// Independent measurement of visible card vs clipped .btn.buy rects and hittable #collect
const MEASURE_IN_PAGE = () => {
  const card = document.querySelector('.tracks-exp');
  const cs = card && getComputedStyle(card);
  const cr = card?.getBoundingClientRect();
  const place = card?.dataset.place ?? null;
  const vis = cs?.visibility ?? null;
  const painted = !!card && place !== 'none' && vis !== 'hidden' && cs?.display !== 'none' && cr.width > 0 && cr.height > 0;
  const cardRect = cr ? { l: Math.round(cr.left*10)/10, r: Math.round(cr.right*10)/10, t: Math.round(cr.top*10)/10, b: Math.round(cr.bottom*10)/10, w: Math.round(cr.width*10)/10, h: Math.round(cr.height*10)/10 } : null;
  const body = document.querySelector('#p-upgrades .body');
  const sheetOpen = !!document.querySelector('#p-upgrades') && document.querySelector('#p-upgrades').getClientRects().length > 0;
  const br = body && sheetOpen ? body.getBoundingClientRect() : null;
  const clip = r => br
    ? ({ l: Math.max(r.left, br.left, 0), r: Math.min(r.right, br.right, innerWidth), t: Math.max(r.top, br.top, 0), b: Math.min(r.bottom, br.bottom, innerHeight) })
    : ({ l: Math.max(r.left, 0), r: Math.min(r.right, innerWidth), t: Math.max(r.top, 0), b: Math.min(r.bottom, innerHeight) });
  const meets = (a, b) => !!a && !!b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  const buys = sheetOpen ? [...document.querySelectorAll('#p-upgrades #uRow button.btn[data-kind]')].map((e, i) => {
    const c = clip(e.getBoundingClientRect());
    return { i, kind: e.dataset.kind, ...c };
  }).filter(r => r.r > r.l && r.b > r.t) : [];
  const colEl = document.getElementById('collect'), colR = colEl?.getBoundingClientRect();
  const topAtCol = colR && colR.width > 0 && colR.height > 0
    ? document.elementsFromPoint(colR.left + colR.width / 2, colR.top + colR.height / 2).find(e => !e.closest('.tracks-exp,.tracks-exp-out'))
    : null;
  const collectHittable = !!topAtCol && (topAtCol === colEl || colEl.contains(topAtCol));
  const collectRect = collectHittable ? { kind: 'collect', l: colR.left, r: colR.right, t: colR.top, b: colR.bottom } : null;
  const buyOverlaps = painted ? buys.filter(b => meets(cardRect, b)).map(b => b.kind) : [];
  const collectOverlap = painted && collectRect ? meets(cardRect, collectRect) : false;
  return {
    sheetOpen,
    activeTab: [...document.querySelectorAll('[data-tab]')].filter(e => e.classList.contains('active')).map(e => e.dataset.tab),
    scrollTop: body ? Math.round(body.scrollTop) : 0,
    maxScroll: body ? Math.round(body.scrollHeight - body.clientHeight) : 0,
    place,
    visibility: vis,
    painted,
    cardRect,
    buys,
    collectHittable,
    collectRect,
    buyOverlaps,
    collectOverlap,
    anyOverlap: buyOverlaps.length > 0 || collectOverlap
  };
};

for(const lab of ['before','after']) for(const input of ['mouse','touch']) {
  // Run BEFORE at 360 (and 375/390 at scroll=0 & 200) for baseline comparison; run AFTER on the full matrix
  if (lab === 'before' && W !== 360) continue;
  let c;
  try {
    c = await br.newContext({viewport:{width:W,height:H},hasTouch:input==='touch',isMobile:false});
    const p = await c.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => {
      if(!sessionStorage.getItem('qa65t')) {
        sessionStorage.setItem('qa65t','1');
        localStorage.clear();
        localStorage.setItem('eggfarm.ui',JSON.stringify({onboardingDone:true,seenSlots:10,workersIntroA:true,workersIntroB:true,sfx:false}));
      }
      window.__ev=[];
      const T=/^(pointer|touch|mouse|click)/;
      for(const m of ['preventDefault','stopPropagation','stopImmediatePropagation']) {
        const o=Event.prototype[m];
        Event.prototype[m]=function(){
          if(T.test(this.type)) window.__ev.push({call:m,type:this.type,target:(this.target?.className||this.target?.tagName||'')+'',cur:this.currentTarget===document?'document':this.currentTarget===window?'window':(this.currentTarget?.className||this.currentTarget?.tagName||'')+'',phase:this.eventPhase});
          return o.apply(this,arguments);
        };
      }
      window.__pops=[];
      new MutationObserver(ms=>{
        for(const m of ms) for(const n of m.addedNodes)
          if(n.nodeType===1 && /exp-pop|exp-coin|tracks-exp-out/.test(n.className||''))
            window.__pops.push({cls:n.className,cardUp:!!document.querySelector('.tracks-exp'),t:performance.now()});
      }).observe(document,{childList:true,subtree:true});
      for(const t of ['pointerdown','pointerup','touchstart','touchend','mousedown','mouseup','click'])
        window.addEventListener(t,e=>window.__ev.push({seen:t,target:(e.target?.className||e.target?.tagName||'')+'',inCard:!!e.target?.closest?.('.tracks-exp'),buy:e.target?.closest?.('button.btn')?.dataset?.kind??(e.target?.closest?.('#collect')?'collect':null)}),true);
    });
    await p.goto(SRV[lab].url);
    const bid = await p.evaluate(() => document.querySelector('meta[name=build-id]')?.content);
    if (bid !== BID[lab] || bid.includes('+dirty')) throw new Error(`build-id mismatch: ${bid} != ${BID[lab]}`);
    await p.getByText('Tap to start').click({timeout:60000}).catch(()=>{});
    await p.waitForFunction(()=>window.eggfarm&&window.eggfarmUi,null,{timeout:20000});
    await p.evaluate(()=>{document.getElementById('modal-layer')?.classList.remove('open');document.querySelectorAll('.tracks-exp').forEach(e=>e.remove());});

    const reset = (extra={}) => p.evaluate(([b,ex])=>{
      document.querySelectorAll('.tracks-exp,.tracks-exp-out,.exp-pop,.exp-coin').forEach(e=>e.remove());
      const g=window.eggfarm;
      g.state={...g.state,...b,...ex,customers:[],nextCustomerInS:1e9,seenTracksExplainer:true};
      window.eggfarmUi.render();
    }, [BASE, extra]);

    const scrollTo = s => p.evaluate(s => {
      const b = document.querySelector('#p-upgrades .body');
      if (b) b.scrollTop = s === 'end' ? b.scrollHeight : s;
    }, s);

    const armCard = async (refund, scroll = 0) => {
      await reset();
      await scrollTo(0);
      await settle(p);
      await p.evaluate(r => {
        const g = window.eggfarm;
        g.migrationRefundCents = r;
        g.state = { ...g.state, seenTracksExplainer: false };
        g.onTracksCommitted();
      }, refund);
      await p.waitForSelector('.tracks-exp', { state: 'attached', timeout: 3000 });
      await settle(p);
      if (scroll !== 0) {
        await scrollTo(scroll);
        await settle(p);
      }
    };

    // --- 1. Sheet CLOSED: #collect tap with plain & refund card ---
    await p.evaluate(() => {
      const s = document.getElementById('p-upgrades');
      if (s && s.getClientRects().length > 0 && window.innerWidth < 1024) document.querySelector('[data-nav=upgrades]')?.click();
    });
    await settle(p);
    for (const refund of [0, 123450]) {
      await reset({ coop: 20, basket: 0 });
      await p.evaluate(r => {
        const g = window.eggfarm;
        g.migrationRefundCents = r;
        g.state = { ...g.state, seenTracksExplainer: false };
        g.onTracksCommitted();
      }, refund);
      await p.waitForSelector('.tracks-exp', { state: 'attached', timeout: 3000 });
      await settle(p);
      const m = await p.evaluate(MEASURE_IN_PAGE);
      const pre = await p.evaluate(() => {
        const b = document.getElementById('collect'), r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        const e = document.elementFromPoint(x, y), card = document.querySelector('.tracks-exp');
        window.__ev.length = 0; window.__pops.length = 0;
        return { x, y, efp: (e?.className || e?.tagName || '') + '', efpInCard: !!card?.contains(e), efpIsCollect: e === b || b.contains(e), basket: window.eggfarm.state.basket };
      });
      rec({ recordType: 'state', lab, build_id: BID[lab], input, tab: 'closed', refund, scroll: 0, ...m });
      const shotPre = (lab === 'after' && input === 'mouse') ? `shots/${ENG}/tap-${lab}-${input}-closed-${refund?'refund':'plain'}-collect-pre-w${W}.png` : null;
      if (shotPre) await p.screenshot({ path: E + shotPre });
      if (input === 'mouse') await p.mouse.click(pre.x, pre.y); else await p.touchscreen.tap(pre.x, pre.y);
      await settle(p);
      const post = await p.evaluate(() => ({
        basket: window.eggfarm.state.basket,
        cardShown: !!document.querySelector('.tracks-exp'),
        seenFlag: window.eggfarm.state.seenTracksExplainer,
        ev: window.__ev.slice(),
        pops: window.__pops.slice()
      }));
      const bought = post.basket > pre.basket;
      const outcome = bought && !post.cardShown ? 'BUY+DISMISS' : bought ? 'BUY(card stays)' : !post.cardShown ? 'DISMISS-ONLY (tap swallowed)' : 'NOTHING';
      rec({
        recordType: 'tap', lab, build_id: BID[lab], input, tab: 'closed', activeTab: m.activeTab, activeTabOk: !m.sheetOpen || W >= 1024,
        refund, scroll: 0, scrollTop: 0, kind: 'collect', tap: { x: pre.x, y: pre.y },
        cardPlace: m.place, cardVisibility: m.visibility, cardPainted: m.painted, cardRect: m.cardRect, buyRect: m.collectRect,
        overlapsBuy: m.collectOverlap, anyOverlap: m.anyOverlap,
        elementFromPoint: pre.efp, efpInCard: pre.efpInCard, efpIsBuy: pre.efpIsCollect,
        bought, cardDismissed: !post.cardShown, seenFlagAfter: post.seenFlag, outcome,
        preventOrStop: post.ev.filter(e => e.call), popsAfterTap: post.pops, shots: shotPre ? [shotPre] : []
      });
    }

    // --- 2. Sheet OPEN: Farm and Collection tabs across scroll offsets 0, 100, 200, 300, 'end' ---
    await p.locator('[data-nav=upgrades]').click();
    await p.waitForTimeout(300);
    const scrollsToRun = lab === 'before' ? [0, 200] : SCROLLS;
    for (const tab of ['farm', 'collection']) {
      await p.locator(`[data-tab=${tab}]`).click();
      await settle(p);
      for (const refund of [0, 123450]) {
        for (const scroll of scrollsToRun) {
          await armCard(refund, scroll);
          const m = await p.evaluate(MEASURE_IN_PAGE);
          const stateShot = (lab === 'after' && (input === 'mouse' || scroll === 200 || (ENG === 'webkit' && scroll === 0)))
            ? `shots/${ENG}/sweep-${lab}-${input}-${tab}-${refund?'refund':'plain'}-s${scroll}-w${W}.png` : null;
          if (stateShot) await p.screenshot({ path: E + stateShot });
          rec({ recordType: 'state', lab, build_id: BID[lab], input, tab, refund, scroll, ...m, shot: stateShot });

          // Discover visible clipped Buy buttons with NO card up
          await reset();
          await scrollTo(scroll);
          await settle(p);
          const list = await p.evaluate(() => {
            const body = document.querySelector('#p-upgrades .body').getBoundingClientRect();
            return [...document.querySelectorAll('#p-upgrades #uRow button.btn[data-kind]')].map((b, i) => {
              const r = b.getBoundingClientRect();
              const t = Math.max(r.top, body.top, 0), bt = Math.min(r.bottom, body.bottom, innerHeight);
              const x = r.left + r.width / 2, y = (t + bt) / 2;
              const hit = document.elementFromPoint(x, y);
              return { i, kind: b.dataset.kind, x, y, top: t, bottom: bt, ok: bt > t && r.width > 0 && !!hit && (hit === b || b.contains(hit)) };
            }).filter(b => b.ok);
          });

          for (const bt of list) {
            await armCard(refund, scroll);
            const pre = await p.evaluate(([i]) => {
              const body = document.querySelector('#p-upgrades .body'), br = body.getBoundingClientRect();
              const b = document.querySelectorAll('#p-upgrades #uRow button.btn[data-kind]')[i];
              const r0 = b.getBoundingClientRect();
              const r = { left: Math.max(r0.left, br.left, 0), right: Math.min(r0.right, br.right, innerWidth), top: Math.max(r0.top, br.top, 0), bottom: Math.min(r0.bottom, br.bottom, innerHeight) };
              const x = r.left + (r.right - r.left) / 2, y = (r.top + r.bottom) / 2;
              const e = document.elementFromPoint(x, y);
              const card = document.querySelector('.tracks-exp'), cs = card && getComputedStyle(card), cr = card.getBoundingClientRect();
              const place = card.dataset.place ?? null, vis = cs.visibility;
              const painted = place !== 'none' && vis !== 'hidden' && cs.display !== 'none';
              const overlap = painted && r.top < cr.bottom && cr.top < r.bottom && r.left < cr.right && cr.left < r.right;
              const g = window.eggfarm.state;
              const popsWhileUp = window.__pops.filter(p => /exp-pop|exp-coin/.test(p.cls)).length;
              window.__ev.length = 0; window.__pops.length = 0;
              const tabs = [...document.querySelectorAll('[data-tab]')].filter(t => t.classList.contains('active')).map(t => t.dataset.tab);
              return {
                x, y, kind: b.dataset.kind, scrollTop: Math.round(body.scrollTop), activeTab: tabs,
                efp: (e?.className || e?.tagName || '') + '', efpInCard: !!card.contains(e), efpIsBuy: e === b || b.contains(e),
                card: { top: cr.top, bottom: cr.bottom, place, visibility: vis, painted },
                overlap,
                buyRect: { l: r.left, r: r.right, t: r.top, b: r.bottom },
                cardRect: { l: cr.left, r: cr.right, t: cr.top, b: cr.bottom },
                popsWhileUp,
                overlays: [...document.elementsFromPoint(x, y)].slice(0, 6).map(n => (n.className || n.tagName) + ''),
                state: { F: g.farmLevel, H: g.hensLevel, V: g.eggValueLevel, C: g.collectionLevel, coins: g.coinsCents }
              };
            }, [bt.i]);

            const takeTapShots = (scroll === 0 || scroll === 200) && (input === 'mouse' || ENG === 'webkit' || scroll === 200);
            const shotA = takeTapShots ? `shots/${ENG}/tap-${lab}-${input}-${tab}-${refund?'refund':'plain'}-s${scroll}-${pre.kind}-pre-w${W}.png` : null;
            if (shotA) await p.screenshot({ path: E + shotA });

            if (input === 'mouse') await p.mouse.click(pre.x, pre.y); else await p.touchscreen.tap(pre.x, pre.y);
            await settle(p);

            const post = await p.evaluate(() => {
              const g = window.eggfarm.state, c = document.querySelector('.tracks-exp');
              return {
                state: { F: g.farmLevel, H: g.hensLevel, V: g.eggValueLevel, C: g.collectionLevel, coins: g.coinsCents },
                cardShown: !!c,
                cardPlaceAfter: c?.dataset.place ?? null,
                seenFlag: g.seenTracksExplainer,
                ev: window.__ev.slice(),
                pops: window.__pops.slice()
              };
            });
            const shotB = takeTapShots ? `shots/${ENG}/tap-${lab}-${input}-${tab}-${refund?'refund':'plain'}-s${scroll}-${pre.kind}-post-w${W}.png` : null;
            if (shotB) await p.screenshot({ path: E + shotB });

            const lv = { farm: 'F', hens: 'H', eggValue: 'V', collection: 'C' }[pre.kind];
            const bought = post.state[lv] === pre.state[lv] + 1 && post.state.coins < pre.state.coins;
            const blocked = post.ev.filter(e => e.call);
            const outcome = bought && !post.cardShown ? 'BUY+DISMISS' : bought ? 'BUY(card stays)' : !post.cardShown ? 'DISMISS-ONLY (tap swallowed)' : 'NOTHING';
            rec({
              recordType: 'tap', lab, build_id: BID[lab], input, tab, activeTab: pre.activeTab,
              activeTabOk: pre.activeTab.length === 1 && pre.activeTab[0] === tab,
              refund, scroll, scrollTop: pre.scrollTop, kind: pre.kind, tap: { x: pre.x, y: pre.y },
              cardPlace: pre.card.place, cardVisibility: pre.card.visibility, cardPainted: pre.card.painted,
              cardPlaceAfter: post.cardPlaceAfter,
              cardRect: pre.cardRect, buyRect: pre.buyRect, overlapsBuy: pre.overlap,
              popsWhileUp: pre.popsWhileUp, popsAfterTap: post.pops,
              elementFromPoint: pre.efp, efpInCard: pre.efpInCard, efpIsBuy: pre.efpIsBuy, stack: pre.overlays,
              before: pre.state, after: post.state, bought, cardDismissed: !post.cardShown, seenFlagAfter: post.seenFlag,
              outcome, preventOrStop: blocked, shots: [shotA, shotB].filter(Boolean)
            });
          }
        }
      }
    }

    // --- 3. Dedicated data-place="none" lifecycle contract check on AFTER ---
    if (lab === 'after' && W <= 390) {
      await p.locator('[data-tab=farm]').click();
      await settle(p);
      await armCard(123450, 0);
      const at0 = await p.evaluate(MEASURE_IN_PAGE);
      await scrollTo(200);
      await settle(p);
      const at200 = await p.evaluate(MEASURE_IN_PAGE);
      const shotNoneA = `shots/${ENG}/none-contract-${input}-s200-hidden-w${W}.png`;
      await p.screenshot({ path: E + shotNoneA });

      // Tap Hens Buy at scroll=200 while card is in its s=200 state (place=none at 360/375, band at 390)
      const buyTarget = await p.evaluate(() => {
        const body = document.querySelector('#p-upgrades .body').getBoundingClientRect();
        const b = document.querySelector('#p-upgrades #uRow button.btn[data-kind=hens]');
        const r = b.getBoundingClientRect();
        const t = Math.max(r.top, body.top, 0), bt = Math.min(r.bottom, body.bottom, innerHeight);
        return { x: r.left + r.width / 2, y: (t + bt) / 2, H0: window.eggfarm.state.hensLevel, coins0: window.eggfarm.state.coinsCents };
      });
      window_pops_reset: await p.evaluate(() => { window.__pops.length = 0; window.__ev.length = 0; });
      if (input === 'mouse') await p.mouse.click(buyTarget.x, buyTarget.y); else await p.touchscreen.tap(buyTarget.x, buyTarget.y);
      await settle(p);
      const afterBuyAt200 = await p.evaluate(() => {
        const c = document.querySelector('.tracks-exp'), cs = c && getComputedStyle(c), g = window.eggfarm.state;
        return {
          H1: g.hensLevel, coins1: g.coinsCents,
          cardStillInDom: !!c, place: c?.dataset.place ?? null, visibility: cs?.visibility ?? null,
          seenFlag: g.seenTracksExplainer,
          fadeOutCount: document.querySelectorAll('.tracks-exp-out').length,
          popsCount: window.__pops.length
        };
      });
      const shotNoneB = `shots/${ENG}/none-contract-${input}-s200-after-buy-w${W}.png`;
      await p.screenshot({ path: E + shotNoneB });

      // Scroll to 'end' -> re-places visibly
      await scrollTo('end');
      await settle(p);
      const atEnd = await p.evaluate(MEASURE_IN_PAGE);
      const shotNoneEnd = `shots/${ENG}/none-contract-${input}-sEnd-replaced-w${W}.png`;
      await p.screenshot({ path: E + shotNoneEnd });

      // Scroll back to 200 -> place='none' again at 360/375, then scroll back to 0 -> re-places visibly at 'default'
      await scrollTo(200);
      await settle(p);
      const at200Again = await p.evaluate(MEASURE_IN_PAGE);
      await scrollTo(0);
      await settle(p);
      const at0Again = await p.evaluate(MEASURE_IN_PAGE);
      const shotNone0 = `shots/${ENG}/none-contract-${input}-s0-replaced-w${W}.png`;
      await p.screenshot({ path: E + shotNone0 });

      // Switch to Collection from 200 -> re-places visibly (use DOM .click() on the scrolled-off tab so Playwright does not scroll to 0 and coordinate-click the re-shown card over .tabs)
      await armCard(123450, 200);
      await p.evaluate(() => document.querySelector('[data-tab=collection]').click());
      await settle(p);
      const onCollection = await p.evaluate(MEASURE_IN_PAGE);

      // Switch back to Farm, re-arm (so 8s EXP_MS timer does not expire mid-test), scroll 200, then close sheet -> re-places visibly
      await p.locator('[data-tab=farm]').click();
      await settle(p);
      await armCard(123450, 200);
      await p.locator('#p-upgrades .close').click();
      await p.waitForTimeout(350);
      const onSheetClosed = await p.evaluate(MEASURE_IN_PAGE);

      // Re-open sheet, verify Got it, card tap, and Escape each dismiss properly after re-placement from none
      await p.locator('[data-nav=upgrades]').click();
      await p.waitForTimeout(350);
      const dismissResults = {};
      for (const how of ['gotit', 'cardtap', 'escape']) {
        await armCard(123450, 200);
        const m200 = await p.evaluate(MEASURE_IN_PAGE);
        await scrollTo(0);
        await settle(p);
        const m0 = await p.evaluate(MEASURE_IN_PAGE);
        await p.evaluate(() => { window.__pops.length = 0; });
        if (how === 'gotit') {
          const okBtn = await p.evaluate(() => { const r = document.querySelector('.tracks-exp-ok').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
          if (input === 'mouse') await p.mouse.click(okBtn.x, okBtn.y); else await p.touchscreen.tap(okBtn.x, okBtn.y);
        } else if (how === 'cardtap') {
          if (input === 'mouse') { const h2 = await p.evaluate(() => { const r = document.querySelector('.tracks-exp h2').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); await p.mouse.click(h2.x, h2.y); } else { await p.locator('.tracks-exp h2').click(); }
        } else {
          await p.keyboard.press('Escape');
        }
        await settle(p);
        dismissResults[how] = await p.evaluate(([p200, p0]) => ({
          placeAt200: p200, placeAt0: p0,
          cardGone: !document.querySelector('.tracks-exp'),
          popPlayed: window.__pops.some(x => /exp-pop/.test(x.cls)),
          coinsPlayed: window.__pops.filter(x => /exp-coin/.test(x.cls)).length
        }), [m200.place, m0.place]);
      }

      rec({
        recordType: 'none-contract', lab, build_id: BID[lab], input,
        at0: { place: at0.place, vis: at0.visibility, painted: at0.painted, anyOverlap: at0.anyOverlap },
        at200: { place: at200.place, vis: at200.visibility, painted: at200.painted, anyOverlap: at200.anyOverlap },
        buyWhileNone: {
          bought: afterBuyAt200.H1 === buyTarget.H0 + 1 && afterBuyAt200.coins1 < buyTarget.coins0,
          cardStillInDom: afterBuyAt200.cardStillInDom,
          place: afterBuyAt200.place,
          visibility: afterBuyAt200.visibility,
          seenFlag: afterBuyAt200.seenFlag,
          fadeOutCount: afterBuyAt200.fadeOutCount,
          popsCount: afterBuyAt200.popsCount
        },
        rePlaceEnd: { place: atEnd.place, vis: atEnd.visibility, painted: atEnd.painted, anyOverlap: atEnd.anyOverlap },
        at200Again: { place: at200Again.place, vis: at200Again.visibility, painted: at200Again.painted },
        rePlace0: { place: at0Again.place, vis: at0Again.visibility, painted: at0Again.painted, anyOverlap: at0Again.anyOverlap },
        rePlaceCollection: { place: onCollection.place, vis: onCollection.visibility, painted: onCollection.painted, anyOverlap: onCollection.anyOverlap },
        rePlaceSheetClosed: { place: onSheetClosed.place, vis: onSheetClosed.visibility, painted: onSheetClosed.painted, anyOverlap: onSheetClosed.anyOverlap },
        dismissAfterRePlace: dismissResults,
        shots: [shotNoneA, shotNoneB, shotNoneEnd, shotNone0]
      });
    }

    await c.close();
  } catch(e) {
    console.log('ERR', lab, input, e.message.slice(0,250));
    rec({lab, input, error: e.message.slice(0,300)});
    await c?.close().catch(()=>{});
  }
}
rec({done:true, pageerrors:errs});
await Promise.race([br.close(), new Promise(r=>setTimeout(r,15000))]);
SRV.after.s.close(); SRV.before.s.close();
console.log(`done p65-tap ${ENG} ${W} errs=${errs.length}`);
process.exit(0);
