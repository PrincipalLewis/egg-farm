import { IOS_FLAG_ENABLED } from './ios-tip';
/**
 * M1 UI (art-ux/layout-spec.md). Reads Game state, dispatches actions, reacts to GameEvents. No game rules here.
 */
import type { Balance } from '../config/balance';
import type { Game, GameEvent } from '../game';
import * as S from '../sim/state';
import { fmtCount, fmtMoney, fmtAway, fmtAffordableIn, offlineEggsParts, fmtTimeToAfford, fmtMoneyShort } from './format';
import { TapFx, Throttle, clampToSafe } from './fx';
import type { Audio, SfxName } from './audio';
import { resetProgress, keepPrefsOnly } from '../save/save';
import { exportLog } from './export-log';
import { oldSaveForSession, exportOldSave, exportName, OK_MSG, FAIL_MSG, showRecoveryDialog } from './save-recovery';
import { visibleOrders, stripSplit, stripSplitAt, slotPreview, sellAllLabel, Coalesce } from './orders';
const waiting = new Coalesce(2000); // F5: one coalesced queue length for the strip "+N" and Market "+N waiting"
import { OrderList } from './order-list';
import { instantSale, saleLine, compact } from './welcome-sale';
import { rateView, QueueDot, headerRateText } from './s2-economy-ui';
import { incomePerSec, secondsToAffordSteady, EtaHold, asleepOrUnpaidCount, productionStopped } from '../econ/income';
import { optionGain, bestBuy } from '../econ/best-buy';
import { graderMult } from '../sim/workers';
import { resolveIos, shouldShowIosTip, TIP_TITLE, howTo, SHARE_SVG } from './ios-tip';
import type { Recovery } from '../save/save';
import { OnboardingFlow, mountOnboarding, collectLabel, dialogOpen } from './onboarding';
import { mountRotatePrompt } from './rotate-prompt';
import { navUpgradesTab, changedLine, fxOrNoChange } from './upgrade-card';
import { selectGoal, GoalHysteresis, goalAria, goalLabelParts, paintGoalLabel, fitGoalLabelEl, type Goal } from './next-goal';
import { collectionFxLines, collectionSummary, collectionDeltas } from './collection-copy';
import { tryDispatch } from './tap-guard';
import { ServedDwell } from './served-dwell';
import { queueFull, queueTapOpens, netCentsPerSec, totalWageCentsPerSec, wageCentsPerSec, listedWageCentsPerSec, WAGE_WORKERS } from './rates';
import { workersHtml, shouldShowCoopTip, COOP_TIP_TEXT, YawnSfx, farmManageAllVisible, ringHtml, promptManage, navManageView, type NavAria } from './workers-ui';

const A = (f: string) => `${import.meta.env.BASE_URL}assets/${f}`;
const COOP_SPRITES = ['coop-l1.svg', 'coop-l5.svg', 'coop-l10.svg', 'coop-l20.svg'];
export const UI_KEY = 'eggfarm.ui';
/** S2-1 (Art & UX 2026-10-16 08:47): the coop toast stays 2.5 s (layout-spec §4.7 still says 1.5 s). */
export const COOP_TOAST_MS = 2500;
interface UiFlags { onbStep?: number; sfx: boolean; reducedMotion: boolean; seenSlots: number; onboardingDone: boolean; replayOnboarding?: boolean; workersIntroA?: boolean; workersIntroB?: boolean; sessions?: number; iosHomeShown?: boolean }
const h = (html: string) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };
const setText = (el: Element, v: string) => { if (el.textContent !== v) el.textContent = v; };
const setDisabled = (el: HTMLElement, d: boolean) => { const v = d ? 'true' : 'false'; if (el.getAttribute('aria-disabled') !== v) el.setAttribute('aria-disabled', v); };
const retrigger = (el: Element, cls: string) => { el.classList.remove(cls); void (el as HTMLElement).offsetWidth; el.classList.add(cls); };

export function mountApp(root: HTMLElement, g: Game, b: Balance, audio: Audio, version: string, opts: { newGame: boolean; recovery?: Recovery | null } = { newGame: false }) {
  let stored: any = {}; try { stored = JSON.parse(localStorage.getItem(UI_KEY) ?? '{}') ?? {}; } catch { /* bad flags: defaults */ }
  // PT1-4: a fresh-start fallback (AC14b F/Q) is a new farm: drop FTUE / Workers-tip progress flags, keep prefs.
  if (opts.recovery && !opts.recovery.restored_from_backup) stored = keepPrefsOnly(stored);
  const flags: UiFlags = { sfx: true, reducedMotion: false, seenSlots: S.queueMax(g.state.farmLevel, b), onboardingDone: false, ...stored };
  const saveFlags = () => { try { localStorage.setItem(UI_KEY, JSON.stringify(flags)); } catch { /* full */ } };
  flags.sessions = (flags.sessions ?? 0) + 1; // AC14g session_count (one per page load / Tap to start)
  saveFlags();
  const nav_ = navigator as Navigator & { standalone?: boolean };
  const iosKind = resolveIos({ ua: nav_.userAgent, platform: nav_.platform, maxTouchPoints: nav_.maxTouchPoints, standalone: nav_.standalone,
    displayStandalone: matchMedia('(display-mode: standalone)').matches }, location.search);
  const sysRM = matchMedia('(prefers-reduced-motion: reduce)');
  const rm = () => flags.reducedMotion || sysRM.matches;
  const applyRM = () => { document.documentElement.classList.toggle('reduced-motion', rm()); root.classList.toggle('rm', rm()); };
  audio.enabled = flags.sfx; applyRM();
  const sfx = (n: SfxName) => audio.play(n);
  const now = () => performance.now();
  const farmEta = new EtaHold(), collEta = new EtaHold();
  let goalImm = false;
  const tapFx = new TapFx({ ...b.feel, flightMs: b.feel.egg_flight_ms }, now);
  const qfullCue = new Throttle(b.feel.queue_full_cue_min_gap_ms, now);

  root.innerHTML = '';
  // ---------- HUD ----------
  const hud = h(`<header class="hud"><h1 class="sr">Egg Farm</h1>
    <div class="pill coins" aria-label="Coins"><img src="${A('icon-coin.svg')}" alt=""><span class="coins-col"><span class="num" id="coins"></span><span class="rate num" id="rate" role="status" aria-label="Net income zero per second">$0/s</span></span></div>
    <div class="pill basket" aria-label="Eggs in basket"><img src="${A('icon-egg.svg')}" alt=""><span class="num" id="basket"></span></div>
    <div class="spacer"><span class="build-tag num" id="buildTag" title="Build">build ${(version.match(/\+([0-9a-f]{7,})/) ?? [, version])[1]}</span></div>
    <button class="icon-btn" id="settings" aria-label="Settings"><img src="${A('icon-settings.svg')}" alt=""></button>
    <div class="sr" aria-live="polite" id="live"></div></header>`);
  // ---------- Farm ----------
  const farm = h(`<main class="farm">
    <div class="queue" id="queue" role="group" aria-label="Customer queue"></div>
    <div class="scene" id="scene" aria-hidden="true">
      <img class="coop" id="coop" alt=""><span class="nest"><img src="${A('icon-nest.svg')}" alt=""><img class="nest-eggs" id="nestEggs" src="${A('nest-eggs.svg')}" alt="" hidden></span>
      <div class="fullbadge" id="full" hidden>Full!</div><div class="yard" id="yard"></div><div class="henpill" id="henpill" hidden></div>
    </div>
    <div class="collectbar">
      <div class="meter" id="meter"><i id="meterFill"></i><span class="num" id="meterText"></span></div>
      <button class="goal" id="goal" type="button" aria-live="off"><span class="goal-pill"><img class="goal-ic" src="${A('icon-goal.svg')}" alt=""><span class="goal-label"></span><span class="goal-status num"></span><span class="goal-chev" aria-hidden="true">›</span></span></button>
      <div class="sr" aria-live="polite" id="goalLive"></div>
      <button class="btn xl" id="collect"></button>
    </div></main>`);
  // S2-5 (art-ux/reviews/session2-ui-triage.md (b)): every nav button = icon + visible label + aria-label.
  const nav = h(`<nav class="actions" aria-label="Main">
    <button data-nav="market" aria-label="Market"><span class="nav-ic"><img src="${A('icon-market.svg')}" alt=""><span class="qdot" hidden></span></span><span class="nav-lbl">Market</span><span class="badge" hidden></span></button>
    <button data-nav="upgrades" aria-label="Upgrades"><span class="nav-ic"><img src="${A('icon-upgrade.svg')}" alt=""><span class="badge" hidden></span></span><span class="nav-lbl">Upgrades</span></button>
    <button class="manage nav-manage farm-manage-all desk-manage-all" type="button" data-act="manageAll" hidden aria-label="Refill tired workers"><span class="manage-ico"><img src="${A('icon-manage-all.svg')}" width="28" height="28" alt=""><span class="ring-slot"></span></span><span class="nav-lbl num">Refill</span><span class="count-badge num" hidden></span></button>
    <button data-nav="farm" aria-label="Farm"><img src="${A('icon-coop.svg')}" alt=""><span class="nav-lbl">Farm</span></button></nav>`);
  // ---------- Panels ----------
  const panelLayer = h(`<div id="panel-layer"><div class="scrim"></div>
    <section class="sheet" id="p-market" hidden aria-label="Market"><header><h2>Market</h2><button class="icon-btn close" aria-label="Close"><img src="${A('icon-close.svg')}" alt=""></button></header>
      <div class="body order-list" id="mRows"></div><p class="sr" aria-live="polite" id="ordersLive"></p><div class="foot"><button class="btn" id="sellAll"></button></div></section>
    <section class="sheet" id="p-upgrades" hidden aria-label="Upgrades"><header><h2>Upgrades</h2><button class="icon-btn close" aria-label="Close"><img src="${A('icon-close.svg')}" alt=""></button></header>
      <div class="body"><div class="tabs" role="tablist">
        <button role="tab" aria-label="Collection" data-tab="collection" class="active"><span class="tab-pill"><span class="nest-icon"><img src="${A('icon-nest.svg')}" alt=""><img class="nest-eggs" src="${A('nest-eggs.svg')}" alt=""></span>Collection</span></button>
        <button role="tab" aria-label="Farm" data-tab="farm"><span class="tab-pill"><img src="${A('icon-coop.svg')}" alt="">Farm</span></button>
        <button role="tab" aria-label="Workers" data-tab="workers"><span class="tab-pill"><img src="${A('icon-hire.svg')}" alt="">Workers</span></button></div>
        <div id="uRow"></div></div></section></div>`);
  const modal = h(`<div id="modal-layer"></div>`);
  const fxLayer = h(`<div id="fx-layer" aria-hidden="true"></div>`);
  const toast = h(`<div class="toast" role="status"></div>`);
  root.append(hud, farm, nav, panelLayer); document.body.append(modal, fxLayer, toast);
  const $ = <T extends HTMLElement = HTMLElement>(sel: string, el: ParentNode = document) => el.querySelector(sel) as T;
  const coinsEl = $('#coins'), basketEl = $('#basket'), queueEl = $('#queue'), scene = $('#scene'), coopImg = $<HTMLImageElement>('#coop');
  const coinPill = $('.pill.coins'), coinIcon = $('.pill.coins > img'); // S2-8: #coins sits in .coins-col now
  const collectBtn = $('#collect'), meter = $('#meter'), meterFill = $('#meterFill'), meterText = $('#meterText'), yard = $('#yard');
  const mRows = $('#mRows'), sellAllBtn = $('#sellAll'), uRow = $('#uRow');
  const orderList = new OrderList(mRows, $('#ordersLive'), A('icon-customer.svg'), `<img src="${A('icon-customer.svg')}" alt=""><p>Next customer soon… <span class="num" id="nextIn"></span></p>`);
  if (IOS_FLAG_ENABLED) (window as any).eggfarmOrderList = orderList; // compiled out of release (QA-RC1UI-2); QA §7.17 node identity / write counts
  const docked = matchMedia('(min-width:960px) and (orientation:landscape)');

  // ---------- FX budget (≤30 live elements, oldest recycled) ----------
  const live: HTMLElement[] = [];
  const spawn = (el: HTMLElement, ms: number) => {
    if (live.length >= 30) live.shift()?.remove();
    fxLayer.append(el); live.push(el);
    // QA (bd0dc66, 375px top-left fragment): every particle also leaves on its own animationend, the timer is the backstop.
    const kill = () => { el.remove(); const i = live.indexOf(el); if (i >= 0) live.splice(i, 1); };
    el.addEventListener('animationend', kill, { once: true }); setTimeout(kill, ms);
    return el;
  };
  /** Particle anchor: the element's centre clamped to the safe area; a hidden (0x0) source falls back to the coop scene,
   *  so nothing ever flies from the page origin (QA bd0dc66: coin flyers from the closed Market's Sell all started at 0,0). */
  const safeInsets = () => { const cs = getComputedStyle(document.documentElement); const n = (v: string) => parseFloat(cs.getPropertyValue(v)) || 0; return { t: n('--sa-t'), r: n('--sa-r'), b: n('--sa-b'), l: n('--sa-l') }; };
  const center = (el: Element) => { let r = el.getBoundingClientRect(); if (!r.width && !r.height) r = scene.getBoundingClientRect(); return clampToSafe({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, innerWidth, innerHeight, safeInsets()); };
  const fly = (src: string, from: Element, to: Element, i: number, size: number, onArrive?: () => void) => {
    const a = center(from), z = center(to), el = h(`<img class="flyer" src="${src}" alt="" style="width:${size}px;height:${size}px">`);
    const dx = (Math.random() - .5) * 30;
    el.animate([{ transform: `translate(${a.x - size / 2 + dx}px,${a.y - size / 2}px) scale(.6)` }, { transform: `translate(${(a.x + z.x) / 2}px,${Math.min(a.y, z.y) - 60}px) scale(1)`, offset: .45 },
      { transform: `translate(${z.x - size / 2}px,${z.y - size / 2}px) scale(.8)` }], { duration: b.feel.egg_flight_ms, delay: i * 40, easing: 'ease-in', fill: 'both' })
      .finished.then(() => { onArrive?.(); el.remove(); const k = live.indexOf(el); if (k >= 0) live.splice(k, 1); }).catch(() => {});
    spawn(el, b.feel.egg_flight_ms + i * 40 + 50);
  };
  let floater: { el: HTMLElement; until: number } | null = null;
  const floatText = (text: string, at: Element, cls = '', merge = false) => {
    const t = now();
    if (merge && floater && floater.until > t && floater.el.isConnected) { floater.el.textContent = text; retrigger(floater.el, 'floater'); floater.until = t + 700; return; }
    const c = center(at), el = h(`<div class="floater ${cls}" style="left:${c.x}px;top:${c.y - 40}px;translate:-50% 0">${text}</div>`);
    spawn(el, 750); if (!cls) floater = { el, until: t + 700 };
  };
  const sparkle = (at: Element, n: number) => {
    if (rm()) return; const c = center(at);
    for (let i = 0; i < n; i++) { const ang = (i / n) * Math.PI * 2; spawn(h(`<i class="spark" style="left:${c.x}px;top:${c.y}px;--dx:${Math.cos(ang) * 36}px;--dy:${Math.sin(ang) * 36}px"></i>`), 520); }
  };
  // M2 placeholder Coop Hand tip: tap opens Upgrades > Workers.
  const showTip = () => {
    const el = h(`<button class="cooptip" role="status">${COOP_TIP_TEXT}</button>`); document.body.append(el);
    el.addEventListener('click', () => { g.telemetry.track('coop_hand_tip', { phase: 'tap' }); tab = 'workers'; dirty = true; openPanel('upgrades'); el.remove(); });
    window.setTimeout(() => el.remove(), 8000);
  };
  let toastTimer = 0;
  /** WebKit perf: patience ring in 1/120-turn steps (3 deg); a write only when the step changes, so the conic ring repaints ~4x/s, not every frame. */
  const setP = (el: HTMLElement, p: number) => { const v = (Math.round(Math.min(1, Math.max(0, p)) * 120) / 120).toFixed(4); if (el.style.getPropertyValue('--p') !== v) el.style.setProperty('--p', v); };
  /** WebKit perf: a same-value `hidden`/attribute write still invalidates style every frame; write only on change. */
  const setHidden = (el: HTMLElement, v: boolean) => { if (el.hidden !== v) el.hidden = v; };
  const showToast = (text: string, ms = 1300) => { toast.textContent = text; /* F1: below the queue strip, never over it (measured after this frame's render) */ const place = () => { const qb = queueEl.getBoundingClientRect().bottom; const below = qb > 0 && !docked.matches; toast.style.top = below ? `${Math.round(qb + 8)}px` : ''; toast.classList.toggle('below', below); }; place(); requestAnimationFrame(place); toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toast.classList.remove('show'), ms); };
  const pulse = (el: Element) => retrigger(el, 'pulse');

  // ---------- Panels ----------
  let open: 'market' | 'upgrades' | null = null; let tab: 'collection' | 'farm' | 'workers' = 'collection'; let coopTipShown = false;
  const openPanel = (p: typeof open) => {
    if (docked.matches) { if (p === 'upgrades') tab = tab; open = null; return; }
    if (p === open) return; if (p) sfx('uiOpen'); else if (open) sfx('uiClose');
    if (open === 'market' && p !== 'market') ordersExpanded = false;
    open = p; panelLayer.classList.toggle('open', !!p);
    $('#p-market').hidden = p !== 'market'; $('#p-upgrades').hidden = p !== 'upgrades';
    nav.querySelectorAll('button').forEach(bt => bt.classList.toggle('on', bt.dataset.nav === (p ?? 'farm')));
    dirty = true;
  };
  // Farm View Manage all: mobile nav button + desktop docked copy next to the Upgrades header (same rule/action/cooldown/ring)
  // B8: ONE Farm View Manage-all button, moved between the mobile nav and the docked Upgrades header (no hidden duplicate).
  const farmMA = nav.querySelector('.farm-manage-all') as HTMLButtonElement, farmMAs = [farmMA], yawnSfx = new YawnSfx();
  const navFarm = nav.querySelector('[data-nav=farm]')!, upHeader = panelLayer.querySelector('#p-upgrades header')!;
  const placeFarmMA = () => { if (docked.matches) upHeader.insertBefore(farmMA, upHeader.querySelector('.close')); else nav.insertBefore(farmMA, navFarm); };
  placeFarmMA(); docked.addEventListener?.('change', placeFarmMA);
  let farmMAShown = false, maAria: NavAria = { text: '', at: -Infinity };
  for (const fb of farmMAs) fb.addEventListener('click', e => { e.stopPropagation(); if (!act({ type: 'manageAll' })) return cantAfford(fb); sfx('upgrade'); dirty = true; });
  nav.addEventListener('click', e => { const n = (e.target as HTMLElement).closest('button')?.dataset.nav; if (n === 'upgrades' && open !== 'upgrades') { const t = navUpgradesTab(goalShown, tab, !goalHidden); if (t !== tab) { tab = t; dirty = true; } } if (n) openPanel(n === 'farm' ? null : n as any); }); // UC24
  panelLayer.addEventListener('click', e => { const t = e.target as HTMLElement; if (t.classList.contains('scrim') || t.closest('.close')) openPanel(null); });
  $('.tabs').addEventListener('click', e => { const t = (e.target as HTMLElement).closest('button')?.dataset.tab; if (t) { tab = t as any; dirty = true; } });

  // ---------- Actions ----------
  /** S2-10: every player action redraws synchronously, so the screen never waits for the next frame/timer to show it. */
  const act = (a: Parameters<typeof g.dispatch>[0]): boolean => { const ok: boolean = tryDispatch(g, a, b); if (ok) { dirty = true; render(); } return ok; };
  const cantAfford = (el: HTMLElement) => { retrigger(el, 'shake'); sfx('cantAfford'); };
  const collect = () => {
    const before = g.state.coop; g.dispatch({ type: 'collect' });
    const k = Math.floor(before) - Math.floor(g.state.coop) + (g.state.basket ? 0 : 0);
    const got = Math.min(Math.floor(before), S.eggsPerTap(g.state.collectionLevel, b));
    retrigger(collectBtn, 'squash');
    if (got <= 0) { retrigger(collectBtn, 'shake'); floatText('Empty', collectBtn); return; }
    void k; sfx('collect');
    const d = tapFx.tap(got);
    if (!rm()) { let first = true; for (let i = 0; i < d.flyers; i++) fly(A('icon-egg.svg'), $('.nest'), basketEl.parentElement!, i, 24, () => { if (first) { first = false; pulse(basketEl.parentElement!); } }); }
    else pulse(basketEl.parentElement!);
    floatText(`+${fmtCount(d.floaterTotal)}`, collectBtn, '', d.combine);
    dirty = true; render(); // S2-10
  };
  collectBtn.addEventListener('click', collect);
  scene.addEventListener('click', collect);
  // S2-9: Market opens only from a deliberate tap on a customer chip (or "+N") under the finger at pointerdown, on screen >= 250 ms.
  const chipBorn = new WeakMap<Element, number>(); let downChip: Element | null = null;
  const custChip = (t: EventTarget | null) => (t as HTMLElement | null)?.closest?.('.chip:not(.empty):not(.served)') ?? null;
  queueEl.addEventListener('pointerdown', e => { downChip = custChip(e.target); });
  queueEl.addEventListener('click', e => { const c = custChip(e.target); const ok = queueTapOpens(downChip, c, c ? now() - (chipBorn.get(c) ?? -Infinity) : 0); downChip = null; if (ok) openPanel('market'); });
  let lastSellSource: Element | null = null;
  mRows.addEventListener('click', e => {
    if ((e.target as HTMLElement).closest('.queue-more')) { ordersExpanded = !ordersExpanded; dirty = true; render(); return; }
    const bt = (e.target as HTMLElement).closest('button[data-id]') as HTMLElement | null; if (!bt) return;
    lastSellSource = bt; if (!act({ type: 'sell', customerId: +bt.dataset.id! })) return cantAfford(bt);
  });
  sellAllBtn.addEventListener('click', () => { lastSellSource = sellAllBtn; if (!act({ type: 'sellAll' })) cantAfford(sellAllBtn); });
  uRow.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    const goto = t.closest('[data-goto]') as HTMLElement | null;
    if (goto?.dataset.goto === 'collection') { tab = 'collection'; dirty = true; render(); return; }
    if (t.closest('.link')) { tab = 'farm'; dirty = true; render(); const fb = $('#uRow .btn'); if (fb) retrigger(fb, 'pulse2'); return; }
    const bt = t.closest('button.btn') as HTMLElement | null; if (!bt) return;
    // S2-4a: decide from the live state, not the button's aria-disabled (which can be a frame or more stale).
    const kind = bt.dataset.act, wid = bt.dataset.w as any;
    if (kind) { goalImm = true; goalNow = true; if (!act(kind === 'hire' ? { type: 'hire', worker: wid } : kind === 'manage' ? { type: 'manage', worker: wid } : kind === 'manageAll' ? { type: 'manageAll' } : { type: 'buyGraderTier' })) return cantAfford(bt); dirty = true; return; }
    lastBuyBtn = bt; goalImm = true; goalNow = true; if (!act({ type: bt.dataset.kind === 'farm' ? 'buyFarm' : 'buyCollection' })) return cantAfford(bt);
  });
  let lastBuyBtn: HTMLElement | null = null;

  // ---------- Modals ----------
  const closeModal = () => { modal.classList.remove('open'); modal.innerHTML = ''; modalKind = null; };
  let modalKind: 'welcome' | 'settings' | 'confirm' | null = null;
  const showWelcome = () => {
    const eggs = g.state.pendingOfflineEggs; if (eggs <= 0) return;
    modalKind = 'welcome'; const sale = saleLine(instantSale(g.state, b), compact, fmtMoney); // S2-4c
    modal.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-labelledby="wbT">
      <button class="icon-btn close" aria-label="Close"><img src="${A('icon-close.svg')}" alt=""></button>
      <img src="${A('icon-offline-earnings.svg')}" width="64" height="64" alt="">
      <h2 id="wbT">Welcome back!</h2><div>You were away ${fmtAway(g.offline.awayS, b.offline.offlineCapSeconds)}</div>
      ${(() => { const p = offlineEggsParts(eggs); return `<div class="wb-gain" id="wbGain"><div class="wb-hero num"><img src="${A('icon-egg.svg')}" alt="">${p.hero}</div><div class="wb-line2">${p.line2}</div></div>`; })()}${sale ? `<div class="wb-sold num" id="wbSold">${sale}</div>` : ''}
      <button class="btn" id="wbCollect">Collect</button></div>`;
    modal.classList.add('open'); sfx('welcomeBack');
  };
  const grantWelcome = (withFlyers: boolean) => {
    const eggs = g.state.pendingOfflineEggs; const btn = $('#wbCollect');
    if (withFlyers && btn && !rm()) for (let i = 0; i < Math.min(eggs, b.feel.max_flying_eggs); i++) fly(A('icon-egg.svg'), btn, basketEl.parentElement!, i, 24);
    g.dispatch({ type: withFlyers ? 'collectOffline' : 'dismissOffline' }); closeModal(); dirty = true; render(); /* S2-10 */ pulse(basketEl.parentElement!); sfx('collect');
  };
  const settingsIosLine = () => iosKind === 'standalone' ? `<div class="settings-ios ok">Installed on Home Screen ✔</div>`
    : iosKind ? `<div class="settings-ios">${SHARE_SVG} ${TIP_TITLE} ${howTo(iosKind, '')}</div>`.replace(' ,', ',').replace('  ', ' ') : '';
  const showSettings = () => {
    modalKind = 'settings';
    modal.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-label="Settings">
      <button class="icon-btn close" aria-label="Close"><img src="${A('icon-close.svg')}" alt=""></button><h2>Settings</h2>
      <label class="toggle">Sound effects<input type="checkbox" id="sSfx" ${flags.sfx ? 'checked' : ''}></label>
      <label class="toggle">Reduced motion<input type="checkbox" id="sRm" ${flags.reducedMotion ? 'checked' : ''}></label>
      <button class="btn secondary" id="sExport">Export log</button><div class="version" id="sExportMsg" role="status"></div>${oldSaveForSession() ? `<button class="btn secondary" type="button" id="sOldSave">Export old save</button><div class="version" id="sOldMsg" role="status" aria-live="polite"></div>` : ''}${settingsIosLine()}<p class="font-credits">Fonts: Fredoka © 2016 The Fredoka Project Authors; Nunito © 2014 The Nunito Project Authors. <a href="${import.meta.env.BASE_URL}fonts/OFL.txt" target="_blank" rel="noopener">SIL Open Font License 1.1</a>.</p>
      <button class="btn danger" id="sReset">Reset save</button><div class="version">Egg Farm ${version}</div></div>`;
    modal.classList.add('open'); sfx('uiOpen');
  };
  modal.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    if (modalKind === 'welcome') { if (t.id === 'wbCollect') grantWelcome(true); else if (t === modal || t.closest('.close')) grantWelcome(false); return; }
    if (t === modal || t.closest('.close') || t.id === 'cCancel') { closeModal(); sfx('uiClose'); return; }
    if (t.id === 'sOldSave') { const raw = oldSaveForSession(); if (raw) void exportOldSave(raw, exportName(new Date())).then(ok => { $('#sOldMsg').textContent = ok ? OK_MSG : FAIL_MSG; }); return; }
    if (t.id === 'sExport') { void exportLog(g.telemetry.exportJSON(), `eggfarm-log-${g.installId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`).then(m => { const el = $('#sExportMsg'); if (el) el.textContent = m; }); return; }
    if (t.id === 'sReset') { modalKind = 'confirm'; modal.innerHTML = `<div class="card" role="alertdialog" aria-modal="true"><h2>Reset all progress?</h2><button class="btn secondary" id="cCancel">Cancel</button><button class="btn danger" id="cReset">Reset</button></div>`; return; }
    if (t.id === 'cReset') { g.resetting = true; g.telemetry.track('save_reset'); g.telemetry.flush(true); resetProgress(localStorage); location.reload(); }
  });
  modal.addEventListener('change', e => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'sSfx') { flags.sfx = t.checked; audio.enabled = t.checked; }
    if (t.id === 'sRm') { flags.reducedMotion = t.checked; applyRM(); }
    saveFlags();
  });
  $('#settings').addEventListener('click', showSettings);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (modalKind === 'welcome') grantWelcome(false); else if (modalKind) closeModal(); else openPanel(null); } });

  // ---------- Queue strip ----------
  const chips = new Map<number, HTMLElement>();
  const dwell = new ServedDwell(b.feel.served_dwell_ms), dwellEls = new Map<number, HTMLElement>();
  const moreChip = h(`<button class="chip more" type="button"></button>`);
  let qTagShown = false;
  const ghost = (at: DOMRect | null, cls: string, bubble?: { text: string; cls: string }) => {
    const q = queueEl.getBoundingClientRect(); const r = at ?? new DOMRect(q.right - 64, q.top, 64, 72);
    const el = h(`<div class="ghost ${cls}" style="left:${r.left}px;top:${r.top - 12}px">${bubble ? `<span class="bubble ${bubble.cls}">${bubble.text}</span>` : ''}<img src="${A('icon-customer.svg')}" alt=""></div>`);
    if (rm() && bubble) el.querySelector('img')!.remove(); // reduced motion: bubble fade only
    spawn(el, 1500);
  };
  const renderQueue = () => {
    const s = g.state, slots = S.queueMax(s.farmLevel, b), patience = S.patienceS(s.farmLevel, b);
    const split = stripSplitAt(s.customers.length, waiting.read(s.customers.length)), stripSlots = Math.min(5, slots);
    queueEl.classList.toggle('five', stripSlots >= 5);
    // remove chips for customers gone
    const ids = new Set(s.customers.map(c => c.id));
    for (const [id, el] of chips) if (!ids.has(id)) { el.remove(); chips.delete(id); }
    const kids: HTMLElement[] = [];
    for (const c of s.customers.slice(0, split.shown)) {
      let el = chips.get(c.id);
      if (!el) { el = h(`<button class="chip arrive" aria-label="Customer"><img class="cust" src="${A('icon-customer.svg')}" alt=""><span class="tag"><img src="${A('icon-egg.svg')}" alt=""><span class="num"></span></span></button>`); chips.set(c.id, el); }
      setText(el.querySelector('.tag .num')!, fmtCount(c.demand - c.filled));
      setP(el, c.waitedS / patience);
      kids.push(el);
    }
    // S2-3a: dwelling "Thanks!" cards in free strip room (Product: no free slot -> +$X pop only).
    const lay = dwell.layout(now(), split.more ? 0 : Math.max(0, stripSlots - kids.length), d => {
      const el = dwellEls.get(d.id); dwellEls.delete(d.id); leaveCard(el); });
    for (const d of lay.popped) queuePop(d.cents);
    for (const d of lay.squeezed) { const el = dwellEls.get(d.id); dwellEls.delete(d.id); queuePop(d.cents, el); squeezeCard(el); }
    for (const [id, el] of [...dwellEls]) if (!lay.shown.some(d => d.id === id)) { dwellEls.delete(id); el.remove(); }
    for (const d of lay.shown) {
      let el = dwellEls.get(d.id);
      if (!el) { el = h(`<div class="chip served${rm() ? ' rm' : ''}" aria-hidden="true"><span class="cust-wrap"><img class="cust" src="${A('icon-customer.svg')}" alt=""><svg class="smile" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7.5" fill="#3D7F33"/><path d="M4.6 8.3l2.3 2.3 4.5-4.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="thx">Thanks!</span><span class="amt num">+${fmtMoneyShort(d.cents)}</span></div>`); dwellEls.set(d.id, el); }
      kids.push(el);
    }
    const empties = [...queueEl.querySelectorAll('.chip.empty')] as HTMLElement[];
    if (split.more) { setText(moreChip, `+${split.more}`); const al = `${split.more} more customers waiting, open Market`; if (moreChip.getAttribute('aria-label') !== al) moreChip.setAttribute('aria-label', al); kids.push(moreChip); }
    const needEmpty = Math.max(0, stripSlots - kids.length);
    while (empties.length < needEmpty) empties.push(h(`<div class="chip empty" aria-hidden="true"></div>`));
    empties.length = needEmpty;
    const want = [...kids, ...empties];
    if (want.some((el, i) => queueEl.children[i] !== el) || queueEl.children.length !== want.length + (qTagShown ? 1 : 0)) {
      for (const el of want) if (!chipBorn.has(el)) chipBorn.set(el, now());
      queueEl.replaceChildren(...want); qTagShown = false;
    }
    // Queue full cue (amber outline + tag), informational
    const full = queueFull(s, b);
    queueEl.classList.toggle('full', full);
    if (full && !qTagShown) { queueEl.append(h(`<span class="qtag"><span class="q-long">Queue full</span><span class="q-short">Full</span></span>`)); qTagShown = true; }
    // S2-3b (layout-spec §4.6b, queue spec v1.2 §6): a queue-size step pulses the "+N" chip once (1 -> 1.12 -> 1, 600ms);
    // reduced motion = colour flash. Replaces the old L10/L20 slot grow-in (§3.3 synced to P1q). Once per step, persisted.
    if (slots > flags.seenSlots) {
      flags.seenSlots = slots; saveFlags();
      if (moreChip.isConnected) retrigger(moreChip, rm() ? 'qflash' : 'qpulse');
    }
  };

  /** Dwell end (Art & UX): fade + slide up 8px over 200 ms; reduced motion = gone instantly. */
  const leaveCard = (el: HTMLElement | undefined) => {
    if (!el?.isConnected) return; if (rm()) { el.remove(); return; }
    const r = el.getBoundingClientRect(); const c = el.cloneNode(true) as HTMLElement; el.remove();
    c.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;margin:0`; spawn(c, 260);
    requestAnimationFrame(() => c.classList.add('leaving'));
  };
  const squeezeCard = (el: HTMLElement | undefined) => {
    if (!el?.isConnected) return; if (rm()) { el.remove(); return; }
    const r = el.getBoundingClientRect(); const c = el.cloneNode(true) as HTMLElement; el.remove();
    c.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;margin:0`; c.classList.add('squeeze'); spawn(c, 180);
    requestAnimationFrame(() => c.classList.add('gone'));
  };
  const queuePop = (cents: number, at?: HTMLElement) => {
    const from = (at?.isConnected ? at : queueEl.querySelector('.chip.more') ?? queueEl.lastElementChild ?? queueEl) as HTMLElement, c = center(from);
    const x = Math.min(Math.max(c.x, 48), innerWidth - 48), y = Math.max(c.y - 20, 40);
    spawn(h(`<div class="qpop num" style="left:${x}px;top:${y}px">+${fmtMoneyShort(cents)}</div>`), 650);
    if (!rm()) for (let i = 0; i < 3; i++) fly(A('icon-coin.svg'), from, coinPill, i, 20, i === 0 ? () => pulse(coinPill) : undefined);
  };

  // ---------- Game events ----------
  g.on((e: GameEvent) => {
    switch (e.type) {
      case 'sell': {
        dwell.sold(e.id, e.value);
        sfx('sell');
        const src = lastSellSource ?? sellAllBtn;
        if (!rm()) for (let i = 0; i < Math.min(e.k, 6); i++) fly(A('icon-coin.svg'), src, coinIcon, i, 20, i === 0 ? () => pulse(coinPill) : undefined);
        else pulse(coinPill);
        floatText(`+${fmtMoney(e.k * e.price)}`, src, 'coin'); break;
      }
      case 'customer_arrive': sfx('customerArrive'); break;
      case 'customer_served': dwell.served(e.id, now()); break;
      case 'customer_partial': { dwell.gone(e.id); const r = chips.get(e.id)?.getBoundingClientRect() ?? null; ghost(r, rm() ? '' : 'wave leave'); sfx('customerLeave'); break; }
      case 'customer_lost':
        if (e.reason === 'timeout') { const r = e.id ? chips.get(e.id)?.getBoundingClientRect() ?? null : null; ghost(r, rm() ? '' : 'wave leave', { text: 'Sold out!', cls: 'soldout' }); sfx('customerLeave'); }
        else if (qfullCue.ready()) { ghost(null, rm() ? '' : 'walkoff', { text: 'Queue full!', cls: 'qfull' }); sfx('customerLeave'); }
        break;
      case 'upgrade': {
        sfx('upgrade'); const src = lastBuyBtn ?? uRow;
        if (!rm()) { const c = center(src); spawn(h(`<img class="riser" src="${A('icon-upgrade.svg')}" alt="" style="left:${c.x - 20}px;top:${c.y - 20}px">`), 500); sparkle(src, 6); }
        if (e.upgrade === 'farm' && !rm()) retrigger(scene, 'bump');
        pendingLvPop = true; goalNow = true; break;
      }
      case 'worker_hire': case 'grader_tier': goalNow = true; break;
      case 'coop_full': if (e.phase === 'start') sfx('coopFull'); break;
    }
    dirty = true;
  });
  let pendingLvPop = false;
  // ---------- M3-AC5 next-goal strip ----------
  const goalBtn = $<HTMLButtonElement>('#goal'), goalLbl = $('.goal-label', goalBtn), goalSt = $('.goal-status', goalBtn), goalLive = $('#goalLive');
  let hlSel = '', hlUntil = 0, goalLiveT = 0;
  const goalHold = new GoalHysteresis(5000); let goalNow = true, goalTickAt = -Infinity, goalShown: Goal | null = null, goalHidden = false;
  let goalLabelSig = '';
  const renderGoal = () => {
    const t = now();
    if (!goalNow && t - goalTickAt < 1000) return; // 1 Hz UI tick; purchases bypass
    const imm = goalNow; goalNow = false; goalTickAt = t;
    const prev = goalShown, gl = goalHold.tick(g.state, b, t, imm || goalImm); goalImm = false; goalShown = gl;
    // v1.4 §4: paint structured label; measure overflow once per content change (not every tick).
    const sig = `${gl.key}|${gl.label}|${gl.pct}`;
    if (sig !== goalLabelSig) {
      goalLabelSig = sig;
      const parts = gl.key && gl.state !== 'done' && gl.state !== 'refill' ? goalLabelParts(gl.key, g.state, gl.pct) : null;
      paintGoalLabel(goalLbl, parts, gl.label);
      // fit after layout
      requestAnimationFrame(() => {
        fitGoalLabelEl(goalLbl);
        const v = `${goalLbl.textContent ?? ''} ${goalSt.textContent ?? ''}`.replace(/\s+/g, ' ').trim();
        if (v) goalBtn.setAttribute('aria-label', `${v}. ${goalAria(gl)}`);
      });
    }
    setText(goalSt, gl.status);
    goalBtn.dataset.state = gl.state; goalSt.classList.toggle('chip', gl.state === 'ready');
    // Visible name must be in the accessible name (axe label-content-name-mismatch).
    const vis = `${goalLbl.textContent ?? ''} ${gl.status}`.replace(/\s+/g, ' ').trim();
    goalBtn.setAttribute('aria-label', vis ? `${vis}. ${goalAria(gl)}` : goalAria(gl));
    if (prev && (prev.key !== gl.key || prev.state !== gl.state)) {
      if (prev.key !== gl.key && !rm()) retrigger(goalLbl, 'xfade');
      setText(goalLive, goalAria(gl)); clearTimeout(goalLiveT); goalLiveT = window.setTimeout(() => setText(goalLive, ''), 4000);
      if (gl.state === 'ready' && prev.state !== 'ready' && !rm()) { retrigger(goalSt, 'pop'); if (live.length <= 26) sparkle(goalSt, 4); }
      if (gl.state === 'done' && !rm()) sparkle(goalBtn, 4);
    }
  };
  // review #4: re-fit (full name wins whenever it fits) on width changes, dock/undock and font load, not only on content change
  let refitRaf = 0; const refitGoal = () => { if (!refitRaf) refitRaf = requestAnimationFrame(() => { refitRaf = 0; fitGoalLabelEl(goalLbl); }); };
  if (typeof ResizeObserver !== 'undefined') { let lastW = -1; new ResizeObserver(es => { const w = Math.round(es[0].contentRect.width); if (w !== lastW) { lastW = w; refitGoal(); } }).observe(goalLbl.parentElement ?? goalLbl); }
  docked.addEventListener?.('change', refitGoal);
  void document.fonts.ready.then(() => { goalNow = true; renderGoal(); refitGoal(); });
  /** Tap never buys: open the target's tab, scroll the row into view, highlight it, focus its Buy (spec §4). */
  const openGoal = () => {
    const gl = goalShown; if (!gl) return;
    g.telemetry.track('goal_tap', { target: gl.key ?? 'DONE', state: gl.state });
    tab = gl.tab; dirty = true; openPanel('upgrades'); render();
    const sel = gl.key === 'FARM' || gl.key === 'COLL' ? '.up' : gl.key === 'W1' ? '[data-w=market_hand]' : gl.key === 'W2' ? '[data-w=coop_hand]' : gl.key === 'W3' ? '[data-w=hawker]' : gl.key === 'W4' ? '[data-w=grader]' : '.wk';
    const row = uRow.querySelector<HTMLElement>(sel); if (!row) return;
    row.scrollIntoView({ block: 'center', behavior: rm() ? 'auto' : 'smooth' });
    hlSel = sel; hlUntil = now() + 1200; retrigger(row, 'goal-hl');
    row.querySelector<HTMLElement>('button.btn')?.focus({ preventScroll: true });
  };
  goalBtn.addEventListener('click', e => { e.stopPropagation(); openGoal(); });

  // ---------- Render ----------
  let coopFxPending = false, rateAt = -Infinity; const rateEl = $('#rate'), qDot = new QueueDot(), navMarket = nav.querySelector('[data-nav=market]') as HTMLElement, qDotEl = nav.querySelector('.qdot') as HTMLElement;
  let dirty = true, henCount = -1, lastTier = S.coopTier(g.state.farmLevel), lastLive = 0;
  coopImg.src = A(COOP_SPRITES[lastTier]);
  const upRowHtml = (kind: 'collection' | 'farm') => {
    const s = g.state, C = s.collectionLevel, F = s.farmLevel, isF = kind === 'farm', L = isF ? F : C, max = L >= b.maxLevel;
    const cost = isF ? S.farmCost(F, b) : S.collectionCost(C, b), can = s.coinsCents >= cost * 100;
    const arrow = (a: string, z: string) => max ? `${a}` : `${a} <span class="arrow">→</span> ${z}`;
    const price = (f: number, c: number) => fmtMoney(S.eggPriceCents(f, c, b));
    const slotLines = isF && !max ? slotPreview(S.queueMax(F, b), S.queueMax(F + 1, b), S.demandRange(F, b) as [number, number], S.demandRange(F + 1, b) as [number, number], A('icon-customer.svg'), S.coopTier(F + 1) !== S.coopTier(F)) : null;
    // C-AC26: Collection leads with price % (from balance), then eggs/tap — never +N/tap alone.
    const { pricePct: dPct, tap: tapDelta } = collectionDeltas(b);
    const collSummary = !isF && !max ? collectionSummary(b) : '';
    const cl = (lbl: string, a: string, z: string) => changedLine(lbl, a, z, max, arrow); // UC26: equal before→after lines are not rendered
    const fx = fxOrNoChange(isF ? [
      cl('Hens ', fmtCount(S.hens(F, b)), fmtCount(S.hens(F + 1, b))),
      cl('Coop capacity ', fmtCount(S.coopCapacity(F, b)), fmtCount(S.coopCapacity(F + 1, b))),
      cl('Egg price ', price(F, C), price(F + 1, C)),
      ...(!max && slotLines ? [] : [cl('Customers every ', `${S.customerIntervalS(F, b)}s`, `${S.customerIntervalS(F + 1, b)}s`),
      cl('Customer demand ', S.demandRange(F, b).join('–'), S.demandRange(F + 1, b).join('–'))]),
    ] : collectionFxLines(C, b).map(line => {
      const m = /^(Egg price |Eggs per tap )(.+) → (.+)$/.exec(line);
      if (!m) return line;
      return cl(m[1], m[2], m[3]);
    }), !!slotLines);
    const nextTier = [5, 10, 20].find(t => t > F);
    const key = isF ? 'FARM' as const : 'COLL' as const;
    const og = max ? null : optionGain(s, b, key);
    const baseInc = incomePerSec(s, b, { assumeWorking: true });
    const pct = og && baseInc > 0 && og.gain > 0 ? Math.round(100 * og.gain / baseInc) : 0;
    const bb = bestBuy(s, b);
    const isBest = !!(bb && bb.key === key && !max);
    let chips = '';
    if (!max && og) {
      const effect = baseInc > 0 && og.gain > 0 ? `<span class="vchip eff">+${pct}% income</span>`
        : `<span class="vchip eff">${isF ? `+${fmtCount(S.eggsPerSec(F + 1, b) - S.eggsPerSec(F, b))} eggs/s` : collectionSummary(b)}</span>`;
      let pb = '';
      if (og.gain > 0) pb = `<span class="vchip pb"><img src="${A('icon-offline-earnings.svg')}" alt="">Pays back in ${fmtTimeToAfford(og.payback)}</span>`;
      else if (og.bundlePayback != null) pb = `<span class="vchip pb"><img src="${A('icon-offline-earnings.svg')}" alt="">With next buys: ${fmtTimeToAfford(og.bundlePayback)}</span>`;
      else if (isF) pb = `<span class="vchip pb"><img src="${A('icon-customer.svg')}" alt="">Unlocks more customers</span>`;
      const best = isBest ? `<span class="vchip bb">★ Best buy</span>` : '';
      chips = `<div class="chips">${effect}${pb}${best}</div>`;
    }
    let hint = '';
    if (!max && !can) {
      const need = cost * 100 - s.coinsCents;
      const raw = secondsToAffordSteady(s, b, need);
      const hold = isF ? farmEta : collEta;
      const secs = hold.tick(raw, incomePerSec(s, b), s.coinsCents);
      hint = `<div class="hint eta ${secs != null && secs >= 3600 ? 'long' : ''}"><img src="${A('icon-offline-earnings.svg')}" alt="">${fmtAffordableIn(secs)}</div>`;
    } else if (!max) hint = `<div class="hint" aria-hidden="true"></div>`;
    // UC12 / v1.4: Farm row "Limited by collecting ›" → Collection (44px hit via CSS padding)
    if (isF && !max && S.eggsPerTap(C, b) <= 0.5 * S.coopCapacity(F, b))
      hint += `<div class="hint limit"><button class="link" data-goto="collection" aria-label="Limited by collecting. Go to Collection upgrades."><img src="${A('icon-nest.svg')}" alt="" width="14" height="14">Limited by collecting ›</button></div>`;
    const aria = !max && og && baseInc > 0 && og.gain > 0
      ? `${isF ? 'Farm level' : 'Collect per tap'}, level ${L}. Adds ${pct} percent income. ${og.gain > 0 ? `Pays back in about ${fmtTimeToAfford(og.payback).replace('~', '')}.` : ''} ${isBest ? 'Best buy.' : ''} Buy for ${fmtMoney(cost * 100)}.`
      : '';
    return `<div class="up${isBest ? ' best-buy' : ''}"${aria ? ` aria-label="${aria.replace(/"/g, '&quot;')}"` : ''}>
      <div class="ic">${isF ? `<img src="${A('icon-coop.svg')}" alt="">` : `<span class="nest-icon"><img src="${A('icon-nest.svg')}" alt=""><img class="nest-eggs" src="${A('nest-eggs.svg')}" alt=""></span>`}<span class="lv">L${L}</span></div>
      <div class="col"><h3>${isF ? 'Farm level' : 'Collect per tap'}</h3>
      ${isF && nextTier ? `<div class="tier"><img src="${A('icon-coop.svg')}" alt="">Coop upgrade at L${nextTier}</div>` : ''}
      ${collSummary ? `<div class="sum">${collSummary}</div>` : ''}
      <ul class="fx">${slotLines ?? ''}${fx.map(l => `<li>${l}</li>`).join('')}</ul>
      ${chips}
      <div class="meta">Level ${L} / ${b.maxLevel}</div>
      ${max ? `<button class="btn maxed" tabindex="-1">MAX</button>` :
        `<button class="btn buy ${can ? 'affordable' : ''}" data-kind="${kind}" aria-disabled="${!can}"><img src="${A('icon-coin.svg')}" alt=""><span class="num">${fmtMoney(cost * 100)}</span></button>`}
      <div>${hint}</div></div></div>`;
  };
  let lastUp = '', ordersExpanded = false;
  function render() {
    const s = g.state, F = s.farmLevel, cap = S.coopCapacity(F, b), coopWhole = Math.floor(s.coop);
    setText(coinsEl, fmtMoney(s.coinsCents)); setText(basketEl, fmtCount(s.basket));
    // coop tier + celebration (once per first reach, persisted in save)
    const tier = S.coopTier(F);
    if (tier !== lastTier) { coopImg.src = A(COOP_SPRITES[tier]); lastTier = tier; }
    if (tier > s.celebratedTier) {
      g.dispatch({ type: 'markCelebrated', tier });
      // S2-1 (layout-spec §4.7 rc1): the toast shows now, above any open sheet (z-index over #panel-layer); the bounce +
      // sparkle wait until the coop is visible (sheet closed; docked plays at once).
      if (!rm()) { if (open && !docked.matches) coopFxPending = true; else { retrigger(coopImg, 'bounce'); sparkle(coopImg, 8); } }
      showToast('Coop upgraded!', COOP_TOAST_MS); // §4.7: plain copy, only at the L5/L10/L20 tier steps
    }
    if (coopFxPending && (!open || docked.matches)) { coopFxPending = false; if (!rm()) { retrigger(coopImg, 'bounce'); sparkle(coopImg, 8); } }
    renderQueue();
    // hens
    const hn = Math.min(S.hens(F, b), 12);
    if (hn !== henCount) {
      const order = [2, 3, 1, 4, 0, 5, 8, 9, 7, 10, 6, 11];
      const slots = Array.from({ length: 12 }, (_, i) => `<span>${order.indexOf(i) < hn ? `<img class="hen ${i % 3 === 2 ? 'flip' : ''} ${henCount >= 0 && order.indexOf(i) >= henCount ? 'pop' : ''}" style="animation-delay:${(i * .15).toFixed(2)}s" src="${A('char-chicken.svg')}" alt="">` : ''}</span>`);
      yard.innerHTML = slots.join(''); henCount = hn;
    }
    const hp = $('#henpill'); setHidden(hp, S.hens(F, b) <= 12); setText(hp, `×${fmtCount(S.hens(F, b))} hens`);
    // meter, nest, full badge, collect label
    const atCap = s.coop >= cap;
    meterFill.style.width = `${Math.min(100, (s.coop / cap) * 100)}%`; meter.classList.toggle('atcap', atCap);
    setText(meterText, `${fmtCount(coopWhole)} / ${fmtCount(cap)}`);
    setHidden($('#full'), !atCap);
    // Empty-nest fix (Art & UX): eggs overlay only when the coop holds >= 1 whole egg.
    const ne = $('#nestEggs'); if (ne.hidden !== (coopWhole < 1)) ne.hidden = coopWhole < 1;
    // No "+0": below one whole egg the button reads "Collect" and is aria-disabled (still tappable -> shake + "Empty").
    setText(collectBtn, collectLabel(coopWhole, S.eggsPerTap(s.collectionLevel, b), fmtCount));
    setDisabled(collectBtn, coopWhole < 1);
    // S2-8 header net rate (<= 1 update/s); first negative tick shakes the line (not under reduced motion)
    if (now() - rateAt >= 1000) { rateAt = now();
      const cps = incomePerSec(s, b) * 100; // $/s → cents/s for rateView
      const v = rateView(cps, { stopped: productionStopped(s, b) });
      setText(rateEl, headerRateText(v)); rateEl.classList.toggle('neg', v.sign === 'neg');
      if (rateEl.dataset.sign !== v.sign) { if (v.sign === 'neg' && rateEl.dataset.sign !== 'neg' && !rm()) retrigger(rateEl, 'rshake'); rateEl.dataset.sign = v.sign; }
      if (rateEl.getAttribute('aria-label') !== v.aria) rateEl.setAttribute('aria-label', v.aria); }
    // S2-9 queue-full dot on the Market tab (the sheet never opens by itself)
    { const d = qDot.update(queueFull(s, b), open === 'market', now(), rm()); setHidden(qDotEl, !d.show); if (d.pulse) retrigger(qDotEl, 'qdpulse');
      const al = d.show ? 'Market, queue full' : 'Market'; if (navMarket.getAttribute('aria-label') !== al) navMarket.setAttribute('aria-label', al); }
    { const qf = queueFull(s, b) ? 'true' : 'false'; if (navMarket.dataset.queueFull !== qf) navMarket.dataset.queueFull = qf; } // S2-9 badge hook
    // nav badges
    const canUp = (s.collectionLevel < b.maxLevel && s.coinsCents >= S.collectionCost(s.collectionLevel, b) * 100) || (F < b.maxLevel && s.coinsCents >= S.farmCost(F, b) * 100);
    setHidden(nav.querySelector('[data-nav=market] .badge') as HTMLElement, !(s.customers.length && s.basket >= 1));
    // v1.4 §7: asleep count badge on Upgrades nav + Workers tab; replaces affordable dot while count > 0.
    { const n = asleepOrUnpaidCount(s, b);
      setHidden(nav.querySelector('[data-nav=upgrades] .badge') as HTMLElement, n > 0 || !canUp);
      const ensure = (host: Element | null) => {
        if (!host) return null;
        let ab = host.querySelector('.asleep-badge') as HTMLElement | null;
        if (!ab) { ab = document.createElement('span'); ab.className = 'asleep-badge num'; ab.hidden = true; host.append(ab); }
        return ab;
      };
      const navAb = ensure(nav.querySelector('[data-nav=upgrades] .nav-ic')); // rc2: anchored to the icon's top-right (-6/-6), not the button's
      const tabAb = ensure(document.querySelector('.tabs [data-tab=workers]'));
      for (const ab of [navAb, tabAb]) {
        if (!ab) continue;
        const was = !ab.hidden; setText(ab, String(n)); setHidden(ab, n < 1);
        if (n > 0 && !was && !rm()) retrigger(ab, 'badge-pulse');
      }
      const up = nav.querySelector('[data-nav=upgrades]') as HTMLElement;
      const al = n > 0 ? `Upgrades, ${n} worker${n > 1 ? 's' : ''} asleep or unpaid` : 'Upgrades';
      if (up.getAttribute('aria-label') !== al) up.setAttribute('aria-label', al); }
    // M2 Farm View Manage all (§4.4) + yawn sfx (§4.6)
    farmMAShown = farmManageAllVisible(s, b, farmMAShown);
    for (const fb of farmMAs) {
      setHidden(fb, !farmMAShown);
      if (farmMAShown) { const cd = s.manageCdS > 1e-9; fb.classList.toggle('is-cooldown', cd); setDisabled(fb, cd); const r = ringHtml(s, b), slot = fb.querySelector('.ring-slot')!; if (slot.innerHTML !== r) slot.innerHTML = r;
        const v = navManageView(promptManage(s, b).length, s.manageCdS, docked.matches, maAria, now());
        setText(fb.querySelector('.nav-lbl')!, v.label); const bd = fb.querySelector('.count-badge') as HTMLElement; setText(bd, v.badge); setHidden(bd, !v.badge);
        maAria = v.aria; if (fb.getAttribute('aria-label') !== v.aria.text) fb.setAttribute('aria-label', v.aria.text); }
    }
    if (yawnSfx.pick(s, b, now())) sfx('workerYawn');
    // market panel
    if (open === 'market' || docked.matches) {
      const basket = Math.floor(s.basket), patience = S.patienceS(F, b);
      const unit = S.eggPriceCents(F, s.collectionLevel, b) * graderMult(s.workers, s.graderTier, b);
      const vis = visibleOrders(innerHeight, docked.matches, s.customers.length);
      if (s.customers.length <= vis) ordersExpanded = false;
      orderList.update({ customers: s.customers, basket, unit, visible: vis, expanded: ordersExpanded, rm: rm(), waitingLen: waiting.read(s.customers.length) });
      mRows.querySelectorAll<HTMLElement>('.order[data-row]').forEach(r => { const c = s.customers.find(x => x.id === +r.dataset.row!); if (c) setP(r.querySelector('.av') as HTMLElement, c.waitedS / patience); });
      const ni = $('#nextIn'); if (ni) setText(ni, `(${Math.ceil(s.nextCustomerInS)}s)`);
      let left = basket, eggs = 0, cents = 0; const price = S.eggPriceCents(F, s.collectionLevel, b);
      for (const c of s.customers) { const k = Math.min(left, c.demand - c.filled); left -= k; eggs += k; cents += k * price; }
      setText(sellAllBtn, sellAllLabel(eggs, cents, fmtCount, fmtMoney)); setDisabled(sellAllBtn, eggs === 0);
    }
    if (open === 'upgrades' || docked.matches) {
      document.querySelectorAll<HTMLElement>('.tabs button').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
      const html = tab === 'workers' ? workersHtml(s, b) : upRowHtml(tab);
      if (html !== lastUp) { lastUp = html; uRow.innerHTML = html; { const rb = uRow.querySelector<HTMLElement>(':scope > .refill-wrap'); const hv = rb ? `${Math.ceil(rb.getBoundingClientRect().height) + 8}px` : '0px'; if (uRow.style.getPropertyValue('--refill-bar-h') !== hv) uRow.style.setProperty('--refill-bar-h', hv); } /* review #7: measured bar height, 0 with no bar */ if (hlSel && now() < hlUntil) uRow.querySelector(hlSel)?.classList.add('goal-hl', 'no-anim'); if (pendingLvPop) { const lv = uRow.querySelector('.lv'); if (lv) retrigger(lv, 'pop'); } }
    }
    pendingLvPop = false;
    renderGoal();
    if (hlSel && now() >= hlUntil) { uRow.querySelectorAll('.goal-hl').forEach(e => e.classList.remove('goal-hl', 'no-anim')); hlSel = ''; }
    { const hide = goalHidden; if (goalBtn.hidden !== hide) goalBtn.hidden = hide; }
    if (shouldShowCoopTip(s, b, coopTipShown)) { coopTipShown = true; g.telemetry.track('coop_hand_tip', { phase: 'shown', farm: F }); showTip(); }
    // aria-live throttled 1/s
    const t = now(); if (t - lastLive > 1000) { lastLive = t; setText($('#live'), `${fmtMoney(s.coinsCents)}, ${fmtCount(s.basket)} eggs`); }
    dirty = false;
  }
  void dirty;
  // ---------- FTUE step 4 + Workers intro (m3-ftue-spec §2 step 4, §3; M3-AC4) ----------
  const coach = (text: string, at: Element | null, ms: number, cls = '') => {
    document.querySelectorAll('.coach').forEach(e => e.remove());
    const el = h(`<div class="coach ${cls}" role="dialog" aria-label="Tip" aria-live="polite"><img class="coach-hand" src="${A('ui-pointer-hand-down.svg')}" width="40" height="40" alt="" aria-hidden="true"><span>${text}</span></div>`);
    document.body.append(el);
    const handImg = el.querySelector('.coach-hand') as HTMLImageElement;
    const place = () => { if (!el.isConnected) return; const r = at?.getBoundingClientRect(); if (!r || !r.width) { el.style.cssText = 'left:50%;top:40%;transform:translateX(-50%)'; return; }
      const above = r.top >= 120, cx = Math.min(Math.max(r.left + r.width / 2, 156), innerWidth - 156);
      el.style.cssText = above ? `left:${cx}px;bottom:${innerHeight - r.top + 12}px;transform:translateX(-50%)` : `left:${cx}px;top:${r.bottom + 12}px;transform:translateX(-50%)`;
      el.classList.toggle('below', !above);
      handImg.src = above ? A('ui-pointer-hand-down.svg') : A('ui-pointer-hand.svg'); };
    place(); const iv = window.setInterval(place, 250);
    const close = () => { clearInterval(iv); el.remove(); };
    el.addEventListener('click', close); window.setTimeout(close, ms); return close;
  };
  const showGoalIntro = () => { g.telemetry.onboardingStep(5, 'next_goal_intro'); coach('Your next goal is always shown here.', goalBtn, 4000, 'toastlike'); };
  let introA: HTMLElement | null = null, introBStage = 0;
  const workerRow = (id: string) => uRow.querySelector(`[data-w=${id}]`);
  const renderWorkersIntro = () => {
    const s = g.state, ftueBusy = !!onbUpdate || modalKind !== null;
    // Part A: Market Hand unlocked AND affordable, FTUE done/skipped, no modal; once per save (UI flags).
    if (!flags.workersIntroA && !introA && !ftueBusy && !s.workers.market_hand && s.farmLevel >= unlockFarmMH && s.coinsCents >= hireCostMH) {
      flags.workersIntroA = true; saveFlags(); g.telemetry.onboardingStep(6, 'workers_hire_tip', { action: 'shown' });
      introA = h(`<div class="intro-a" role="dialog" aria-label="New helper"><img src="${A('char-market-hand.svg')}" width="40" height="40" alt="">
        <div><b>New helper!</b><p>Hire a <b>Market Hand</b> to sell to customers for you.</p></div>
        <button class="btn small" id="iaOpen">See workers</button><button class="icon-btn" id="iaX" aria-label="Dismiss"><img src="${A('icon-close.svg')}" alt=""></button></div>`);
      document.body.append(introA);
      introA.addEventListener('click', e => {
        const t = (e.target as HTMLElement).closest('button'); if (!t) return;
        if (t.id === 'iaOpen') { g.telemetry.onboardingStep(6, 'workers_hire_tip', { action: 'open' }); tab = 'workers'; dirty = true; openPanel('upgrades'); render();
          const row = workerRow('market_hand'); row?.scrollIntoView({ block: 'center' }); coach(`Hire them for ${fmtMoney(hireCostMH)}. They work while you play.`, row?.querySelector('button.btn') ?? row ?? null, 8000); }
        else g.telemetry.onboardingStep(6, 'workers_hire_tip', { action: 'dismiss' });
        introA?.remove(); introA = null;
      });
    }
    // B1: the "New helper!" banner is about hiring the Market Hand: drop it as soon as one is hired (any path).
    if (introA && s.workers.market_hand) { introA.remove(); introA = null; }
    if (introA) { const hide = modalKind === 'welcome' || !!open; if (introA.hidden !== hide) introA.hidden = hide; }
  };
  const unlockFarmMH = b.workers.market_hand.unlock_farm, hireCostMH = b.workers.market_hand.hire_cost * 100;
  // Part B: first hire (any worker) -> energy bar, then Refill. Once per save.
  g.on(e => {
    if (e.type !== 'worker_hire' || flags.workersIntroB) return;
    flags.workersIntroB = true; saveFlags(); introBStage = 1; g.telemetry.onboardingStep(7, 'workers_coach', { action: 'shown' });
    document.querySelectorAll('.coach').forEach(c => c.remove());
    window.setTimeout(() => {
      tab = 'workers'; dirty = true; render(); const row = workerRow(e.worker);
      coach('Workers get tired over time.', row?.querySelector('.ebar') ?? row ?? null, 3000);
      window.setTimeout(() => {
        const r2 = workerRow(e.worker), full = (g.state.workers[e.worker]?.energy ?? 0) >= 100;
        coach(full ? 'Tap <b>Refill</b> to perk them up!<br>…when their energy drops.' : 'Tap <b>Refill</b> to perk them up!', r2?.querySelector('[data-act=manage]') ?? r2 ?? null, 6000);
        introBStage = 2; g.telemetry.onboardingStep(7, 'workers_coach', { action: 'done' });
      }, 3100);
    }, 50);
  });
  void introBStage;
  // ---------- Onboarding (new games only, once, skippable) ----------
  let onbUpdate: (() => boolean) | null = null;
  const startOnboarding = () => {
  // PT1-5: reload mid-onboarding (save exists, FTUE never finished): log where it was abandoned, once.
  if (!opts.newGame && !flags.onboardingDone && !flags.replayOnboarding && flags.onbStep !== undefined) {
    g.telemetry.track('onboarding_abandon', { atStep: flags.onbStep, reason: 'reload' }); g.telemetry.flush(true);
    flags.onboardingDone = true; delete flags.onbStep; saveFlags();
  }
  if ((opts.newGame && !flags.onboardingDone) || flags.replayOnboarding) {
    const finish = () => { flags.onboardingDone = true; flags.replayOnboarding = false; delete flags.onbStep; saveFlags(); };
    const flow = new OnboardingFlow({
      step: (n, name) => { g.telemetry.onboardingStep(n, name); flags.onbStep = n; saveFlags(); },
      skip: (n) => { g.telemetry.onboardingSkip(n); finish(); goalHidden = false; goalNow = true; },
      timeout: (n, name) => { g.telemetry.onboardingStep(n, name, { timeout: true }); },
      done: () => { g.telemetry.onboardingStep(4, 'complete'); finish(); goalHidden = false; goalNow = true; render(); showGoalIntro(); },
    });
    g.on(e => flow.onEvent(e)); onbFlow = flow;
    flow.start(); goalHidden = true; // strip introduced at step 4 (m3-ftue-spec §2)
    onbUpdate = mountOnboarding(flow, (st) => {
      if (modalKind) return null;
      if (st === 0) return collectBtn;
      if (st === 1) return open === 'market' ? mRows.querySelector('button[data-id]') ?? sellAllBtn : queueEl.querySelector('.chip:not(.empty)'); // P1: never spotlight an empty queue
      if (docked.matches) { tab = 'collection'; return uRow.querySelector('.btn.buy'); }
      return open === 'upgrades' ? uRow.querySelector('.btn.buy') : nav.querySelector('[data-nav=upgrades]');
    }, st => st === 0 ? 'Tap <b>Collect</b> to gather the eggs.'
      : st === 1 ? (open === 'market' || docked.matches ? 'Tap <b>Sell</b> to earn coins.' : 'A customer! Tap them to sell eggs.')
      : open === 'upgrades' || docked.matches ? 'Tap <b>Buy</b>.' : 'Spend coins to collect more eggs per tap.', A('ui-pointer-hand.svg'), A('ui-pointer-hand-down.svg'));
  }
  };
  let recoveryOpen = !!opts.recovery;
  const rotate = mountRotatePrompt($('#app') as HTMLElement, A('icon-rotate-phone.svg'), () => recoveryOpen, () => queueMicrotask(() => renderIosTip()));
  // ---------- AC14g iOS Home Screen tip ----------
  let iosTip: HTMLElement | null = null, iosTipLive = false; // live = shown this session and not dismissed
  const renderIosTip = () => {
    if (!iosTipLive && shouldShowIosTip(iosKind, flags.sessions ?? 1, !!onbUpdate, !!flags.iosHomeShown) && !recoveryOpen && !modalKind && !open) {
      flags.iosHomeShown = true; saveFlags(); iosTipLive = true; g.telemetry.track('ios_home_tip_shown', { browser: iosKind });
      const k = iosKind as 'safari' | 'chrome';
      iosTip = h(`<aside class="ios-tip" role="status" aria-live="polite" data-browser="${k}"><img src="${A('icon-coop.svg')}" alt="">
        <div><b>${TIP_TITLE}</b><p>${howTo(k, SHARE_SVG)}</p></div>
        <button class="icon-btn" aria-label="Dismiss tip"><img src="${A('icon-close.svg')}" alt=""></button></aside>`);
      iosTip.querySelector('button')!.addEventListener('click', () => { g.telemetry.track('ios_home_tip_dismissed'); iosTip?.remove(); iosTip = null; iosTipLive = false; });
      document.body.append(iosTip);
    }
    if (iosTip) { const hide = recoveryOpen || !!modalKind || !!open || !!onbUpdate || rotate.shown; if (iosTip.hidden !== hide) iosTip.hidden = hide; }
  };
  let gateT = 0; let onbFlow: OnboardingFlow | null = null;
  const gateCtx = () => { const st = g.state; return { coop: st.coop, eggsPerTap: S.eggsPerTap(st.collectionLevel, b), customers: st.customers.length, basket: st.basket, coinsCents: st.coinsCents, costCents: S.collectionCost(st.collectionLevel, b) * 100, nextCustomerInS: st.nextCustomerInS }; };
  // QA-only: open the real save-recovery dialog mid-game (R1 resume check); compiled out of release with eggfarmOnb.
  if (IOS_FLAG_ENABLED) (window as any).eggfarmQaFitGoal = () => fitGoalLabelEl(goalLbl); // QA-only (v1.6.1 goal-label rc0), compiled out of release
  if (IOS_FLAG_ENABLED) (window as any).eggfarmQaWelcome = () => showWelcome(); // QA-only (C-AC25 copy checks), compiled out of release
  if (IOS_FLAG_ENABLED) (window as any).eggfarmQaRecovery = () => showRecoveryDialog({ case: 'F', reason: 'parse', had_backup: false, restored_from_backup: false, copy_failed: false, raw: '{}' } as any, A, [root, modal, toast]);
  const renderAll = () => { const t = performance.now(); if (onbFlow) onbFlow.tick(gateCtx(), gateT ? Math.min(1, (t - gateT) / 1000) : 0, !!modalKind || dialogOpen()); gateT = t; if (IOS_FLAG_ENABLED) (window as any).eggfarmOnb = onbFlow; // QA-only debug handle, compiled out of release (__IOS_FLAG__)
    render(); if (onbUpdate && !onbUpdate()) { onbUpdate = null; onbFlow = null; } if (!recoveryOpen) renderWorkersIntro(); renderIosTip(); };
  if (opts.recovery) {
    // AC14b: shown before the game is interactive; onboarding / welcome-back wait until it closes.
    renderAll();
    void showRecoveryDialog(opts.recovery, A, [root, modal, toast], () => g.telemetry.track('save_recovery_export', { case: opts.recovery!.case })).then(() => {
      recoveryOpen = false; rotate.sync(); startOnboarding(); renderAll(); showWelcome(); if (!modalKind) collectBtn.focus(); else (modal.querySelector('button.btn, button') as HTMLElement | null)?.focus();
    });
  } else { startOnboarding(); renderAll(); showWelcome(); }
  /** S2-8/S2-9 values for QA / Art & UX: net rate, per-worker wage, queue-full flag.
   *  incomePerSec is already net of wages (econ/income.ts); reconstruct gross so netCentsPerSec subtracts wages once (matches main 737c2cf). */
  const rates = () => {
    const s = g.state, wages = totalWageCentsPerSec(s, b), net = incomePerSec(s, b) * 100, inc = net + wages;
    return { incomeCentsPerSec: inc, wageCentsPerSec: wages, netCentsPerSec: netCentsPerSec(inc, s, b), queueFull: queueFull(s, b),
      workers: Object.fromEntries(WAGE_WORKERS.map(id => [id, { hired: !!s.workers[id], wageCentsPerSec: wageCentsPerSec(id, s, b), listedWageCentsPerSec: listedWageCentsPerSec(id, s, b) }])) }; };
  return { render: renderAll, showWelcome, openPanel, rates, get recoveryOpen() { return recoveryOpen; } };
}
