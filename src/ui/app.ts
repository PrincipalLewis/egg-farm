import { IOS_FLAG_ENABLED } from './ios-tip';
/**
 * M1 UI (art-ux/layout-spec.md). Reads Game state, dispatches actions, reacts to GameEvents. No game rules here.
 */
import type { Balance } from '../config/balance';
import type { Game, GameEvent } from '../game';
import * as S from '../sim/state';
import { fmtMoneyShort } from './format';
import { fmtCount, fmtMoney, fmtMoneyExact, fmtAway, fmtTimeToAfford, fmtAffordableIn, IncomeRate } from './format';
import { TapFx, Throttle } from './fx';
import type { Audio, SfxName } from './audio';
import { resetProgress, keepPrefsOnly } from '../save/save';
import { exportLog } from './export-log';
import { oldSaveForSession, exportOldSave, exportName, OK_MSG, FAIL_MSG, showRecoveryDialog } from './save-recovery';
import { visibleOrders, stripSplit, stripSplitAt, slotPreview, slotAdded, sellAllLabel, Coalesce } from './orders';
const waiting = new Coalesce(2000); // F5: one coalesced queue length for the strip "+N" and Market "+N waiting"
import { OrderList } from './order-list';
import { saleValueCents, sellAllPreview } from '../sim/payout';
import { graderMult } from '../sim/workers';
import { m4On, trackMaxLevel, trackEggsPerSec, trackPriceCents, trackCoopCapacity, hensCap, hensMilestone, gradeMult } from '../config/formulas';
import { salePriceCents, coopCap, trackLevel, trackBuyCost, trackLock, pendingMilestones, balancedStrip, type Track } from '../sim/tracks';
import { DualPicker, ROW_OF_KEY, type SharedPick } from './pick-hysteresis';
import { milestoneHint, type RowKey, balancedStripText, balancedSegments, milestoneToast, trackLockText, hensMilestoneEffect, gradeEffect, fxArrow } from './tracks-ui';
import { resolveIos, shouldShowIosTip, TIP_TITLE, howTo, SHARE_SVG } from './ios-tip';
import type { Recovery } from '../save/save';
import { OnboardingFlow, mountOnboarding, collectLabel, dialogOpen } from './onboarding';
import { mountRotatePrompt } from './rotate-prompt';
import { selectGoal, GoalHold, goalAria, type Goal } from './next-goal';
import { tryDispatch } from './tap-guard';
import { ServedDwell } from './served-dwell';
import { queueFull, queueTapOpens, netCentsPerSec, totalWageCentsPerSec, wageCentsPerSec, listedWageCentsPerSec, WAGE_WORKERS } from './rates';
import { workersHtml, shouldShowCoopTip, COOP_TIP_TEXT, YawnSfx, farmManageAllVisible, ringHtml } from './workers-ui';

const A = (f: string) => `${import.meta.env.BASE_URL}assets/${f}`;
const COOP_SPRITES = ['coop-l1.svg', 'coop-l5.svg', 'coop-l10.svg', 'coop-l20.svg'];
export const UI_KEY = 'eggfarm.ui';
interface UiFlags { onbStep?: number; sfx: boolean; reducedMotion: boolean; seenSlots: number; onboardingDone: boolean; replayOnboarding?: boolean; workersIntroA?: boolean; workersIntroB?: boolean; sessions?: number; iosHomeShown?: boolean }
const h = (html: string) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };
const setText = (el: Element, v: string) => { if (el.textContent !== v) el.textContent = v; };
const setDisabled = (el: HTMLElement, d: boolean) => { const v = d ? 'true' : 'false'; if (el.getAttribute('aria-disabled') !== v) el.setAttribute('aria-disabled', v); };
const retrigger = (el: Element, cls: string) => { el.classList.remove(cls); void (el as HTMLElement).offsetWidth; el.classList.add(cls); };

export function mountApp(root: HTMLElement, g: Game, b: Balance, audio: Audio, version: string, opts: { newGame: boolean; recovery?: Recovery | null } = { newGame: false }) {
  let stored: any = {}; try { stored = JSON.parse(localStorage.getItem(UI_KEY) ?? '{}') ?? {}; } catch { /* bad flags: defaults */ }
  // PT1-4: a fresh-start fallback (AC14b F/Q) is a new farm: drop FTUE / Workers-tip progress flags, keep prefs.
  if (opts.recovery && !opts.recovery.restored_from_backup && opts.newGame) stored = keepPrefsOnly(stored);
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
  const income = new IncomeRate(60_000);
  const tapFx = new TapFx({ ...b.feel, flightMs: b.feel.egg_flight_ms }, now);
  const qfullCue = new Throttle(b.feel.queue_full_cue_min_gap_ms, now);

  root.innerHTML = '';
  // ---------- HUD ----------
  const hud = h(`<header class="hud"><h1 class="sr">Egg Farm</h1>
    <div class="pill coins" aria-label="Coins"><img src="${A('icon-coin.svg')}" alt=""><span class="num" id="coins"></span></div>
    <div class="pill basket" aria-label="Eggs in basket"><img src="${A('icon-egg.svg')}" alt=""><span class="num" id="basket"></span></div>
    <div class="spacer"></div>
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
  const nav = h(`<nav class="actions">
    <button data-nav="market"><img src="${A('icon-market.svg')}" alt="">Market<span class="badge" hidden></span></button>
    <button data-nav="upgrades"><img src="${A('icon-upgrade.svg')}" alt="">Upgrades<span class="badge" hidden></span></button>
    <button class="btn manage farm-manage-all desk-manage-all" data-act="manageAll" hidden aria-label="Manage all"><span class="manage-ico"><img src="${A('icon-manage-all.svg')}" width="28" height="28" alt=""><span class="ring-slot"></span></span></button>
    <button data-nav="farm"><img src="${A('icon-coop.svg')}" alt="">Farm</button></nav>`);
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
  const collectBtn = $('#collect'), meter = $('#meter'), meterFill = $('#meterFill'), meterText = $('#meterText'), yard = $('#yard');
  const mRows = $('#mRows'), sellAllBtn = $('#sellAll'), uRow = $('#uRow');
  const orderList = new OrderList(mRows, $('#ordersLive'), A('icon-customer.svg'), `<img src="${A('icon-customer.svg')}" alt=""><p>Next customer soon… <span class="num" id="nextIn"></span></p>`);
  if (IOS_FLAG_ENABLED) (window as any).eggfarmOrderList = orderList; // QA §7.17 node identity / write counts; compiled out of release
  const docked = matchMedia('(min-width:960px) and (orientation:landscape)');

  // ---------- FX budget (≤30 live elements, oldest recycled) ----------
  const live: HTMLElement[] = [];
  const spawn = (el: HTMLElement, ms: number) => {
    if (live.length >= 30) live.shift()?.remove();
    fxLayer.append(el); live.push(el);
    expire(el, ms);
    return el;
  };
  // BUG-5: one removal timer per element; re-arming it (merged '+N' floater) cancels the old one so it can finish its rise.
  const timers = new WeakMap<HTMLElement, number>();
  function expire(el: HTMLElement, ms: number) {
    clearTimeout(timers.get(el));
    timers.set(el, window.setTimeout(() => { el.remove(); const i = live.indexOf(el); if (i >= 0) live.splice(i, 1); }, ms));
  }
  const center = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const fly = (src: string, from: Element, to: Element, i: number, size: number, onArrive?: () => void) => {
    const a = center(from), z = center(to), el = h(`<img class="flyer" src="${src}" alt="" style="width:${size}px;height:${size}px">`);
    const dx = (Math.random() - .5) * 30;
    el.animate([{ transform: `translate(${a.x - size / 2 + dx}px,${a.y - size / 2}px) scale(.6)` }, { transform: `translate(${(a.x + z.x) / 2}px,${Math.min(a.y, z.y) - 60}px) scale(1)`, offset: .45 },
      { transform: `translate(${z.x - size / 2}px,${z.y - size / 2}px) scale(.8)` }], { duration: b.feel.egg_flight_ms, delay: i * 40, easing: 'ease-in', fill: 'both' })
      .finished.then(() => onArrive?.()).catch(() => {});
    spawn(el, b.feel.egg_flight_ms + i * 40 + 50);
  };
  let floater: { el: HTMLElement; until: number } | null = null;
  const floatText = (text: string, at: Element, cls = '', merge = false) => {
    const t = now();
    if (merge && floater && floater.until > t && floater.el.isConnected) { floater.el.textContent = text; retrigger(floater.el, 'floater'); expire(floater.el, 750); floater.until = t + 700; return; }
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
  const showToast = (text: string, atHud = false) => { toast.textContent = text; /* F1: below the queue strip, never over it (measured after this frame's render). M4-A tier/milestone toasts (Art&UX 02:54 #1): top-centre under the HUD (HUD bottom + 8px), same host/z-index above sheets. */ const place = () => { if (atHud) { toast.style.top = `${Math.round(Math.max(0, hud.getBoundingClientRect().bottom) + 8)}px`; toast.classList.remove('below'); return; } const qb = queueEl.getBoundingClientRect().bottom; const below = qb > 0 && !docked.matches; toast.style.top = below ? `${Math.round(qb + 8)}px` : ''; toast.classList.toggle('below', below); }; place(); requestAnimationFrame(place); toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { toast.classList.remove('show'); const nx = toastQ.shift(); if (nx !== undefined) window.setTimeout(() => showToast(nx, true), 250); }, 1300); };
  /** M4-A: several milestones can land in one buy (e.g. Hens L20 + Balanced 4/5); each gets its own toast, in order, never overwritten. */
  const toastQ: string[] = [];
  const queueToasts = (texts: string[]) => { if (!texts.length) return; if (toast.classList.contains('show')) toastQ.push(...texts); else { showToast(texts[0], true); toastQ.push(...texts.slice(1)); } };
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
  let farmMAShown = false;
  for (const fb of farmMAs) fb.addEventListener('click', e => { e.stopPropagation(); if (!act({ type: 'manageAll' })) return cantAfford(fb); sfx('upgrade'); dirty = true; });
  nav.addEventListener('click', e => { const n = (e.target as HTMLElement).closest('button')?.dataset.nav; if (n) openPanel(n === 'farm' ? null : n as any); });
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
  // S2-9: the Market sheet opens only from a deliberate tap on a customer chip (or "+N") that was under the finger at
  // pointerdown and already on screen >= 250 ms; nothing else opens it (no auto-open when the queue fills).
  const chipBorn = new WeakMap<Element, number>(); let downChip: Element | null = null;
  const custChip = (t: EventTarget | null) => (t as HTMLElement | null)?.closest?.('.chip:not(.empty):not(.served)') ?? null;
  queueEl.addEventListener('pointerdown', e => { downChip = custChip(e.target); });
  queueEl.addEventListener('click', e => { const c = custChip(e.target); const ok = queueTapOpens(downChip, c, c ? now() - (chipBorn.get(c) ?? -Infinity) : 0); downChip = null; if (!ok) return; openPanel('market');
    // QA TUT-1: docked, the Market panel is always visible (openPanel keeps open=null), so a card tap highlights its order row.
    if (docked.matches && c) { const id = [...chips].find(([, el]) => el === c)?.[0]; const row = (id !== undefined ? mRows.querySelector<HTMLElement>(`.order[data-row="${id}"]`) : null) ?? mRows.querySelector<HTMLElement>('.order:not([hidden])');
      if (row) { row.scrollIntoView({ block: 'nearest', behavior: rm() ? 'auto' : 'smooth' }); delete row.dataset.hl; void row.offsetWidth; row.dataset.hl = '1'; clearTimeout(Number(row.dataset.hlT)); row.dataset.hlT = String(setTimeout(() => { delete row.dataset.hl; }, 1200)); } } });
  let lastSellSource: Element | null = null;
  mRows.addEventListener('click', e => {
    if ((e.target as HTMLElement).closest('.queue-more')) { ordersExpanded = !ordersExpanded; dirty = true; render(); return; }
    const bt = (e.target as HTMLElement).closest('button[data-id]') as HTMLElement | null; if (!bt) return;
    lastSellSource = bt; if (!act({ type: 'sell', customerId: +bt.dataset.id! })) return cantAfford(bt);
  });
  sellAllBtn.addEventListener('click', () => { lastSellSource = sellAllBtn; if (!act({ type: 'sellAll' })) cantAfford(sellAllBtn); });
  uRow.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    if (t.closest('.link')) { tab = 'farm'; dirty = true; render(); const fb = $('#uRow .btn'); if (fb) retrigger(fb, 'pulse2'); return; }
    const bt = t.closest('button.btn') as HTMLElement | null; if (!bt) return;
    // S2-4a: decide from the live state, not the button's aria-disabled (which can be a frame or more stale).
    const kind = bt.dataset.act, wid = bt.dataset.w as any;
    if (kind) { if (!act(kind === 'hire' ? { type: 'hire', worker: wid } : kind === 'manage' ? { type: 'manage', worker: wid } : kind === 'manageAll' ? { type: 'manageAll' } : { type: 'buyGraderTier' })) return cantAfford(bt); dirty = true; return; }
    lastBuyBtn = bt; const bk = bt.dataset.kind;
    if (!act(bk === 'hens' || bk === 'eggValue' ? { type: 'buyTrack', track: bk } : { type: bk === 'farm' ? 'buyFarm' : 'buyCollection' })) return cantAfford(bt);
    // F5: one tap = one dispatch; act() has already redrawn the sheet with the new level/price (S2-10).
  });
  let lastBuyBtn: HTMLElement | null = null;

  // ---------- Modals ----------
  const closeModal = () => { modal.classList.remove('open'); modal.innerHTML = ''; modalKind = null; };
  let modalKind: 'welcome' | 'settings' | 'confirm' | null = null;
  const showWelcome = () => {
    const eggs = g.state.pendingOfflineEggs; if (eggs <= 0) return;
    modalKind = 'welcome';
    modal.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-labelledby="wbT">
      <button class="icon-btn close" aria-label="Close"><img src="${A('icon-close.svg')}" alt=""></button>
      <img src="${A('icon-offline-earnings.svg')}" width="64" height="64" alt="">
      <h2 id="wbT">Welcome back!</h2><div>You were away ${fmtAway(g.offline.awayS, b.offline.offlineCapSeconds)}</div>
      <div class="big num"><img src="${A('icon-egg.svg')}" alt="">+${fmtCount(eggs)} eggs</div>
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
    if (t.id === 'cReset') { g.resetting = true; g.telemetry.track('save_reset'); g.telemetry.flush(true); resetProgress(localStorage); void g.clearMirror().then(() => location.reload()); }
  });
  modal.addEventListener('change', e => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'sSfx') { flags.sfx = t.checked; audio.enabled = t.checked; }
    if (t.id === 'sRm') { flags.reducedMotion = t.checked; applyRM(); }
    saveFlags();
  });
  $('#settings').addEventListener('click', showSettings);
  // PL-1: Escape only closes the modal/panel, never activates; a held Enter or Space can't auto-repeat buys (one press = one level).
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); if (modalKind === 'welcome') grantWelcome(false); else if (modalKind) closeModal(); else openPanel(null); }
    else if ((e.key === 'Enter' || e.key === ' ') && e.repeat && (e.target as Element | null)?.closest?.('button')) e.preventDefault();
  });

  // ---------- Queue strip ----------
  const chips = new Map<number, HTMLElement>();
  const dwell = new ServedDwell(b.feel.served_dwell_ms), dwellEls = new Map<number, HTMLElement>();
  const moreChip = h(`<button class="chip more" type="button"></button>`);
  let qTagShown = false;
  /** Art&UX 02:54 #2/#3: leaving / turned-away customers draw inside the strip (clipped to it, under the .qtag), chip-wide, never past x=0. */
  const ghostHost = h(`<div class="ghosts" aria-hidden="true"></div>`);
  const ghost = (at: DOMRect | null, cls: string, bubble?: { text: string; cls: string }) => {
    const q = queueEl.getBoundingClientRect(); const w = Math.round(at?.width || 56); const r = at ?? new DOMRect(q.right - w, q.top, w, 72);
    const left = Math.max(0, Math.min(Math.round(r.left - q.left), Math.round(q.width - w))), top = Math.max(0, Math.round(r.top - q.top - 12));
    const el = h(`<div class="ghost ${cls}" style="left:${left}px;top:${top}px;width:${w}px">${bubble ? `<span class="bubble ${bubble.cls}">${bubble.text}</span>` : ''}<img src="${A('icon-customer.svg')}" alt=""></div>`);
    if (rm() && bubble) el.querySelector('img')!.remove(); // reduced motion: bubble fade only
    if (live.length >= 30) live.shift()?.remove();
    ghostHost.append(el); live.push(el); setTimeout(() => { el.remove(); const i = live.indexOf(el); if (i >= 0) live.splice(i, 1); }, 1500);
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
    // S2-3a: dwelling "Thanks!" cards, in free strip room after the live customers (not tappable, aria-hidden).
    // Product ruling: no free strip slot -> the served customer leaves at once with only a "+$X" pop (no card, no extra slot).
    const lay = dwell.layout(now(), split.more ? 0 : Math.max(0, stripSlots - kids.length), /* "+N waiting" shown = strip full */ d => {
      const el = dwellEls.get(d.id); dwellEls.delete(d.id); leaveCard(el); });
    for (const d of lay.popped) queuePop(d.cents);
    // S2-3a-1 (final spec): a live customer needs the slot -> card opacity fades 120 ms (no slide) and the pop fires from its slot; reduced motion cuts it.
    for (const d of lay.squeezed) { const el = dwellEls.get(d.id); dwellEls.delete(d.id); queuePop(d.cents, el); squeezeCard(el); }
    for (const [id, el] of [...dwellEls]) if (!lay.shown.some(d => d.id === id)) { dwellEls.delete(id); el.remove(); }
    for (const d of lay.shown) {
      let el = dwellEls.get(d.id);
      if (!el) { el = h(`<div class="chip served${rm() ? ' rm' : ''}" aria-hidden="true"><span class="cust-wrap"><img class="cust" src="${A('icon-customer.svg')}" alt=""><svg class="smile" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7.5" fill="#3D7F33"/><path d="M4.6 8.3l2.3 2.3 4.5-4.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="thx">Thanks!</span><span class="amt num">+${fmtMoneyExact(d.cents)}</span></div>`); dwellEls.set(d.id, el); }
      kids.push(el);
    }
    const empties = [...queueEl.querySelectorAll('.chip.empty')] as HTMLElement[];
    if (split.more) { setText(moreChip, `+${split.more}`); const al = `${split.more} more customers waiting, open Market`; if (moreChip.getAttribute('aria-label') !== al) moreChip.setAttribute('aria-label', al); kids.push(moreChip); }
    const needEmpty = Math.max(0, stripSlots - kids.length);
    while (empties.length < needEmpty) empties.push(h(`<div class="chip empty" aria-hidden="true"></div>`));
    empties.length = needEmpty;
    const want = [...kids, ...empties, ghostHost];
    if (want.some((el, i) => queueEl.children[i] !== el) || queueEl.children.length !== want.length + (qTagShown ? 1 : 0)) {
      for (const el of want) if (!chipBorn.has(el)) chipBorn.set(el, now());
      queueEl.replaceChildren(...want); qTagShown = false;
    }
    // Queue full cue (amber outline + tag), informational
    const full = s.customers.length >= slots;
    queueEl.classList.toggle('full', full);
    if (full && !qTagShown) { queueEl.append(h(`<span class="qtag"><span class="q-long">Queue full</span><span class="q-short">Full</span></span>`)); qTagShown = true; }
    // Slot unlock moment (first reach of a new slot count; once, persisted)
    if (slots > flags.seenSlots) {
      flags.seenSlots = slots; saveFlags();
      const newSlot = empties[empties.length - 1] ?? kids[kids.length - 1];
      if (newSlot && !rm()) { retrigger(newSlot, 'unlock'); sparkle(newSlot, 4); }
      slotToastPending = slotAdded(s.farmLevel, b);
    }
  };
  let slotToastPending = false;
  /** Dwell end (Art & UX): fade + slide up 8px over 200 ms at the card's spot; reduced motion = gone instantly. */
  const leaveCard = (el: HTMLElement | undefined) => {
    if (!el?.isConnected) return; if (rm()) { el.remove(); return; }
    const r = el.getBoundingClientRect(); const c = el.cloneNode(true) as HTMLElement; el.remove();
    c.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;margin:0`; spawn(c, 260);
    requestAnimationFrame(() => c.classList.add('leaving'));
  };
  /** Full-queue "+$X" pop (Art & UX): from the strip's last chip, coins fly to the money pill (same path as sales); clamped to the safe area. */
  const squeezeCard = (el: HTMLElement | undefined) => {
    if (!el?.isConnected) return; if (rm()) { el.remove(); return; }
    const r = el.getBoundingClientRect(); const c = el.cloneNode(true) as HTMLElement; el.remove();
    c.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;margin:0`; c.classList.add('squeeze'); spawn(c, 180);
    requestAnimationFrame(() => c.classList.add('gone'));
  };
  const queuePop = (cents: number, at?: HTMLElement) => {
    const from = (at?.isConnected ? at : queueEl.querySelector('.chip.more') ?? queueEl.lastElementChild ?? queueEl) as HTMLElement, c = center(from);
    const x = Math.min(Math.max(c.x, 48), innerWidth - 48), y = Math.max(c.y - 20, 40);
    spawn(h(`<div class="qpop num" style="left:${x}px;top:${y}px">+${fmtMoneyExact(cents)}</div>`), 650);
    if (!rm()) for (let i = 0; i < 3; i++) fly(A('icon-coin.svg'), from, coinsEl.parentElement!, i, 20, i === 0 ? () => pulse(coinsEl.parentElement!) : undefined);
  };

  // ---------- Game events ----------
  g.on((e: GameEvent) => {
    switch (e.type) {
      case 'sell': {
        dwell.sold(e.id, e.value);
        income.add(now(), e.value); sfx('sell');
        const src = lastSellSource ?? sellAllBtn;
        if (!rm()) for (let i = 0; i < Math.min(e.k, 6); i++) fly(A('icon-coin.svg'), src, coinsEl.parentElement!, i, 20, i === 0 ? () => pulse(coinsEl.parentElement!) : undefined);
        else pulse(coinsEl.parentElement!);
        floatText(`+${fmtMoneyExact(e.value)}`, src, 'coin'); break;
      }
      case 'customer_arrive': sfx('customerArrive'); break;
      case 'customer_served': dwell.served(e.id, now()); break;
      case 'customer_partial': { dwell.gone(e.id); const r = chips.get(e.id)?.getBoundingClientRect() ?? null; ghost(r, rm() ? '' : 'wave leave'); sfx('customerLeave'); break; }
      case 'customer_lost':
        if (e.reason === 'timeout') { const r = e.id ? chips.get(e.id)?.getBoundingClientRect() ?? null : null; ghost(r, rm() ? '' : 'wave leave', { text: 'Sold out!', cls: 'soldout' }); sfx('customerLeave'); }
        else if (qfullCue.ready()) { ghost(null, rm() ? '' : 'walkoff') /* Art&UX 01:17 #3: no tag of its own; only the strip's .qtag says Queue full */; sfx('customerLeave'); }
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
  // M4A-18 v1.4 / M4A-41: one shared picker for the highlight and the hint (replaces the holdTicks = 2 hold).
  const picker = new DualPicker(); let rowPick: SharedPick | null = null, hintPick: SharedPick | null = null; let rowHl: RowKey | null = null;
  const goalHold = new GoalHold(2); let goalNow = true, goalTickAt = -Infinity, goalShown: Goal | null = null, goalHidden = false;
  const renderGoal = () => {
    const t = now();
    const M4 = m4On(b), prevKey = hintPick?.key;
    if (M4) { const r = picker.tick(g.state, b, t); rowPick = r.highlight; hintPick = r.hint; rowHl = rowPick ? ROW_OF_KEY[rowPick.key] ?? null : null; } // every state change + 5 s re-check
    if (!goalNow && t - goalTickAt < 1000 && !(M4 && hintPick?.key !== prevKey)) return; // 1 Hz text tick; purchases / pick changes bypass
    const imm = goalNow || M4; goalNow = false; goalTickAt = t;
    const prev = goalShown, gl = goalHold.tick(selectGoal(g.state, b, income.centsPerSec(t), M4 ? hintPick?.key : undefined), imm); goalShown = gl;
    setText(goalLbl, gl.label); setText(goalSt, gl.status);
    goalBtn.dataset.state = gl.state; goalSt.classList.toggle('chip', gl.state === 'ready');
    goalBtn.setAttribute('aria-label', goalAria(gl));
    if (prev && (prev.key !== gl.key || prev.state !== gl.state)) {
      if (prev.key !== gl.key && !rm()) retrigger(goalLbl, 'xfade');
      // B3: announce the CURRENT goal (same text as the chip's aria-label) on target or state change, then clear the
      // live region so a screen reader browsing later never reads a stale target/timer.
      setText(goalLive, goalAria(gl)); clearTimeout(goalLiveT); goalLiveT = window.setTimeout(() => setText(goalLive, ''), 4000);
      if (gl.state === 'ready' && prev.state !== 'ready' && !rm()) { retrigger(goalSt, 'pop'); if (live.length <= 26) sparkle(goalSt, 4); }
      if (gl.state === 'done' && !rm()) sparkle(goalBtn, 4);
    }
  };
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
  let dirty = true, henCount = -1, lastTier = S.coopTier(g.state.farmLevel), lastLive = 0;
  coopImg.src = A(COOP_SPRITES[lastTier]);
  const upRowHtml = (kind: 'collection' | 'farm') => {
    const s = g.state, C = s.collectionLevel, F = s.farmLevel, isF = kind === 'farm', L = isF ? F : C, max = L >= b.maxLevel;
    const cost = isF ? S.farmCost(F, b) : S.collectionCost(C, b), can = s.coinsCents >= cost * 100;
    const arrow = (a: string, z: string) => max ? `${a}` : fxArrow(a, z);
    const price = (f: number, c: number) => fmtMoney(S.eggPriceCents(f, c, b));
    const slotLines = isF && !max ? slotPreview(S.queueMax(F, b), S.queueMax(F + 1, b), S.demandRange(F, b) as [number, number], S.demandRange(F + 1, b) as [number, number], A('icon-customer.svg')) : null;
    const M4 = m4On(b);
    const fx = isF ? [
      ...(M4 ? [`Hens & Egg value up to ${max ? `L${hensCap(F, b)}` : fxArrow(`L${hensCap(F, b)}`, `L${hensCap(F + 1, b)}`)}`]
        : [`Hens ${arrow(fmtCount(S.hens(F, b)), fmtCount(S.hens(F + 1, b)))}`]),
      `Coop capacity ${arrow(fmtCount(M4 ? trackCoopCapacity(F, s.hensLevel, b) : S.coopCapacity(F, b)), fmtCount(M4 ? trackCoopCapacity(F + 1, s.hensLevel, b) : S.coopCapacity(F + 1, b)))}`,
      ...(M4 ? [] : [`Egg price ${arrow(price(F, C), price(F + 1, C))}`]),
      ...(!max && slotLines ? [] : [`Customers every ${arrow(`${S.customerIntervalS(F, b)}s`, `${S.customerIntervalS(F + 1, b)}s`)}`,
      `Customer demand ${arrow(S.demandRange(F, b).join('–'), S.demandRange(F + 1, b).join('–'))}`]),
    ] : [
      `Eggs per tap ${arrow(fmtCount(S.eggsPerTap(C, b)), fmtCount(S.eggsPerTap(C + 1, b)))}`,
      ...(M4 ? [] : [`Egg price ${arrow(price(F, C), price(F, C + 1))}`]),
    ];
    const nextTier = [5, 10, 20].find(t => t > F);
    let hint = '';
    if (!max && !can) {
      if (isF) {
        const secs = income.secondsToAfford(now(), cost * 100 - s.coinsCents);
        hint = secs === null ? `<div class="hint"><img src="${A('icon-coin.svg')}" alt="">Sell eggs to earn coins</div>`
          : `<div class="hint ${secs >= 3600 ? 'long' : ''}"><img src="${A('icon-offline-earnings.svg')}" alt="">Ready in ${fmtTimeToAfford(secs).replace(/^~/, '~')}</div>`;
      } else hint = `<div class="hint">Need ${fmtMoney(cost * 100 - s.coinsCents)} more</div>`;
    } else if (!max) hint = `<div class="hint" aria-hidden="true"></div>`;
    // 4.6c Limited by coop (Collection row): next tap > 50% of current coop cap. Advisory only.
    if (!isF && !max && S.eggsPerTap(C + 1, b) > 0.5 * coopCap(s, b))
      hint += `<div class="hint limit"><img src="${A('icon-coop.svg')}" alt="">Limited by coop · <button class="link">Upgrade Farm →</button></div>`;
    return `<div class="up"${max ? ` role="group" aria-label="${isF ? 'Farm level' : 'Collect per tap'}, level ${L}, max."` : ''}>
      <div class="ic">${isF ? `<img src="${A('icon-coop.svg')}" alt="">` : `<span class="nest-icon"><img src="${A('icon-nest.svg')}" alt=""><img class="nest-eggs" src="${A('nest-eggs.svg')}" alt=""></span>`}<span class="lv">L${L}</span></div>
      <div class="col"><h3>${isF ? 'Farm level' : 'Collect per tap'}</h3>
      ${isF && nextTier ? `<div class="tier"><img src="${A('icon-coop.svg')}" alt="">Coop upgrade at L${nextTier}</div>` : ''}
      <ul class="fx">${slotLines ?? ''}${fx.map(l => `<li>${l}</li>`).join('')}</ul>
      <div class="meta">Level ${L} / ${b.maxLevel}</div>
      ${max ? `<span class="maxed" aria-hidden="true">MAX</span>` :
        `<button class="btn buy ${can ? 'affordable' : ''}" data-kind="${kind}" aria-disabled="${!can}"><img src="${A('icon-coin.svg')}" alt=""><span class="num">${fmtMoney(cost * 100)}</span></button>`}
      <div>${hint}</div></div></div>`;
  };
  /** M4-A Option A: Hens / Egg value rows (art-ux/m4-tracks-copy.md), reusing the .up row component. */
  const trackRowHtml = (t: Track) => {
    const s = g.state, F = s.farmLevel, H = s.hensLevel, V = s.eggValueLevel, L = trackLevel(s, t), lock = trackLock(s, t, b);
    const cost = trackBuyCost(s, t, b), can = !lock && s.coinsCents >= cost * 100, name = t === 'hens' ? 'Hens' : 'Egg value';
    const arrow = (a: string, z: string) => lock ? a : fxArrow(a, z); // L30-18: no near-zero (rounded-away) increase
    const fx = t === 'hens'
      ? [`Eggs/s ${arrow(fmtCount(trackEggsPerSec(H, b)), fmtCount(trackEggsPerSec(H + 1, b)))}`]
      : [`Egg price ${arrow(fmtMoneyShort(trackPriceCents(F, H, V, b)), fmtMoneyShort(trackPriceCents(F, H, V + 1, b)))}`];
    const right = lock === 'max' ? `<span class="maxed" aria-hidden="true">MAX</span>`
      : lock === 'cap' ? `<div class="lock" aria-label="${name}, level ${L}, locked. Needs Farm level ${F + 1}.">${trackLockText(F)}</div>`
      : `<button class="btn buy ${can ? 'affordable' : ''}" data-kind="${t}" aria-disabled="${!can}"><img src="${A('icon-coin.svg')}" alt=""><span class="num">${fmtMoney(cost * 100)}</span></button>`;
    const best = rowHl === t ? (rowPick?.affordable ? ' best' : ' best pending') : '';
    const mh = milestoneHint(t, L, F, b), eta = best === ' best pending' ? `<div class="hint eta">${fmtAffordableIn(income.secondsToAfford(now(), (rowPick?.costCents ?? 0) - s.coinsCents))}</div>` : '';
    return `<div class="up track${best}" data-track="${t}"${lock === 'max' ? ` role="group" aria-label="${name}, level ${L}, max."` : ''}>
      <div class="ic"><img src="${A(t === 'hens' ? 'char-chicken.svg' : 'icon-egg.svg')}" alt=""><span class="lv">L${L}</span></div>
      <div class="col"><h3>${name}</h3><ul class="fx">${fx.map(l => `<li>${l}</li>`).join('')}</ul>${mh ? `<div class="ms-hint">${mh}</div>` : ''}${eta}
      <div class="meta">Level ${L} / ${trackMaxLevel(t, b)}</div>${right}</div></div>`;
  };
  const farmTabHtml = () => {
    const s = g.state, st = balancedStrip(s, b);
    const segs = balancedSegments(s, b).map(g => `<i class="${g.weakest ? 'weakest' : ''}" data-track="${g.track}"><b style="width:${Math.round(g.fill * 100)}%"></b></i>`).join('');
    return `<div class="tracks"><div class="balanced" role="img" aria-label="${balancedStripText(s, b, true)}"><div class="segs">${segs}</div><span>${balancedStripText(s, b)}</span></div>
      ${trackRowHtml('hens')}${trackRowHtml('eggValue')}${upRowHtml('farm').replace('<div class="up"', `<div class="up${rowHl === 'farm' ? (rowPick?.affordable ? ' best' : ' best pending') : ''}" data-track="farm"`)}</div>`;
  };
  let lastUp = '', ordersExpanded = false;
  function render() {
    const s = g.state, F = s.farmLevel, cap = coopCap(s, b), coopWhole = Math.floor(s.coop);
    setText(coinsEl, fmtMoney(s.coinsCents)); setText(basketEl, fmtCount(s.basket));
    // coop tier + celebration (once per first reach, persisted in save)
    const tier = S.coopTier(F);
    if (tier !== lastTier) { coopImg.src = A(COOP_SPRITES[tier]); lastTier = tier; }
    if (tier > s.celebratedTier) {
      g.dispatch({ type: 'markCelebrated', tier });
      if (!rm()) { retrigger(coopImg, 'bounce'); sparkle(coopImg, 8); }
      showToast(slotToastPending ? 'Coop upgraded! +1 customer slot' : 'Coop upgraded!'); slotToastPending = false;
    }
    // M4-A milestone toasts: once per save (celebratedMilestones), never for ones seeded by the v7 migration.
    { const pend = pendingMilestones(s, b); if (pend.length) { g.dispatch({ type: 'markMilestones', ids: pend }); queueToasts(pend.map(id => milestoneToast(id, b))); } }
    renderQueue();
    if (slotToastPending) { showToast('Coop upgraded! +1 customer slot'); slotToastPending = false; }
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
    // nav badges
    const canUp = (s.collectionLevel < b.maxLevel && s.coinsCents >= S.collectionCost(s.collectionLevel, b) * 100) || (F < b.maxLevel && s.coinsCents >= S.farmCost(F, b) * 100);
    setHidden(nav.querySelector('[data-nav=market] .badge') as HTMLElement, !(s.customers.length && s.basket >= 1));
    { const mk = nav.querySelector('[data-nav=market]') as HTMLElement, qf = queueFull(s, b) ? 'true' : 'false'; if (mk.dataset.queueFull !== qf) mk.dataset.queueFull = qf; } // S2-9 badge hook (Art & UX styles it)
    setHidden(nav.querySelector('[data-nav=upgrades] .badge') as HTMLElement, !canUp);
    // M2 Farm View Manage all (§4.4) + yawn sfx (§4.6)
    farmMAShown = farmManageAllVisible(s, b, farmMAShown);
    for (const fb of farmMAs) {
      setHidden(fb, !farmMAShown);
      if (farmMAShown) { const cd = s.manageCdS > 1e-9; fb.classList.toggle('is-cooldown', cd); setDisabled(fb, cd); const r = ringHtml(s, b), slot = fb.querySelector('.ring-slot')!; if (slot.innerHTML !== r) slot.innerHTML = r; }
    }
    if (yawnSfx.pick(s, b, now())) sfx('workerYawn');
    // market panel
    if (open === 'market' || docked.matches) {
      const basket = Math.floor(s.basket), patience = S.patienceS(F, b);
      const unit = (k: number) => saleValueCents(s, k, b);
      const vis = visibleOrders(innerHeight, docked.matches, s.customers.length);
      if (s.customers.length <= vis) ordersExpanded = false;
      orderList.update({ customers: s.customers, basket, unit, visible: vis, expanded: ordersExpanded, rm: rm(), waitingLen: waiting.read(s.customers.length) });
      mRows.querySelectorAll<HTMLElement>('.order[data-row]').forEach(r => { const c = s.customers.find(x => x.id === +r.dataset.row!); if (c) setP(r.querySelector('.av') as HTMLElement, c.waitedS / patience); });
      const ni = $('#nextIn'); if (ni) setText(ni, `(${Math.ceil(s.nextCustomerInS)}s)`);
      const { eggs, cents } = sellAllPreview(s, b); // same per-order Grader math + rounding as the sellAll action
      setText(sellAllBtn, sellAllLabel(eggs, cents, fmtCount, fmtMoney)); setDisabled(sellAllBtn, eggs === 0);
    }
    if (open === 'upgrades' || docked.matches) {
      document.querySelectorAll<HTMLElement>('.tabs button').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
      const html = tab === 'workers' ? workersHtml(s, b) : tab === 'farm' && m4On(b) ? farmTabHtml() : upRowHtml(tab);
      if (html !== lastUp) { lastUp = html; uRow.innerHTML = html; if (hlSel && now() < hlUntil) uRow.querySelector(hlSel)?.classList.add('goal-hl', 'no-anim'); if (pendingLvPop) { const lv = uRow.querySelector('.lv'); if (lv) retrigger(lv, 'pop'); } }
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
  // Part B: first hire (any worker) -> energy bar, then Manage. Once per save.
  g.on(e => {
    if (e.type !== 'worker_hire' || flags.workersIntroB) return;
    flags.workersIntroB = true; saveFlags(); introBStage = 1; g.telemetry.onboardingStep(7, 'workers_coach', { action: 'shown' });
    document.querySelectorAll('.coach').forEach(c => c.remove());
    window.setTimeout(() => {
      tab = 'workers'; dirty = true; render(); const row = workerRow(e.worker);
      coach('Workers get tired over time.', row?.querySelector('.ebar') ?? row ?? null, 3000);
      window.setTimeout(() => {
        const r2 = workerRow(e.worker), full = (g.state.workers[e.worker]?.energy ?? 0) >= 100;
        coach(full ? 'Tap <b>Manage</b> to perk them up!<br>…when their energy drops.' : 'Tap <b>Manage</b> to perk them up!', r2?.querySelector('[data-act=manage]') ?? r2 ?? null, 6000);
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
      if (st === 1) return open === 'market' || docked.matches ? mRows.querySelector('button[data-id]') ?? sellAllBtn : queueEl.querySelector('.chip:not(.empty)') ?? queueEl;
      if (docked.matches) { tab = 'collection'; return uRow.querySelector('.btn.buy'); }
      return open === 'upgrades' ? uRow.querySelector('.btn.buy') : nav.querySelector('[data-nav=upgrades]');
    }, st => st === 0 ? 'Tap <b>Collect</b> to gather the eggs.'
      : st === 1 ? (open === 'market' || docked.matches ? 'Tap <b>Sell</b> to earn coins.' : 'A customer! Tap them to sell eggs.')
      : open === 'upgrades' || docked.matches ? 'Tap <b>Buy</b>.' : 'Spend coins to collect more eggs per tap.', A('ui-pointer-hand.svg'), A('ui-pointer-hand-down.svg'));
  }
  };
  let recoveryOpen = !!(g.recoveryOutcome && opts.recovery);
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
  if (IOS_FLAG_ENABLED) (window as any).eggfarmQaRecovery = () => showRecoveryDialog({ case: 'F', reason: 'parse', had_backup: false, restored_from_backup: false, copy_failed: false, raw: '{}' } as any, A, [root, modal, toast]);
  const renderAll = () => { const t = performance.now(); if (onbFlow) onbFlow.tick(gateCtx(), gateT ? Math.min(1, (t - gateT) / 1000) : 0, !!modalKind || dialogOpen()); gateT = t; if (IOS_FLAG_ENABLED) (window as any).eggfarmOnb = onbFlow; // QA-only debug handle, compiled out of release (__IOS_FLAG__)
    render(); if (onbUpdate && !onbUpdate()) { onbUpdate = null; onbFlow = null; } if (!recoveryOpen) renderWorkersIntro(); renderIosTip(); };
  if (g.recoveryOutcome && opts.recovery) {
    // AC14b: shown before the game is interactive; onboarding / welcome-back wait until it closes.
    renderAll();
    void showRecoveryDialog(opts.recovery, A, [root, modal, toast], () => g.telemetry.track('save_recovery_export', { case: opts.recovery!.case })).then(() => {
      recoveryOpen = false; rotate.sync(); startOnboarding(); renderAll(); showWelcome(); if (!modalKind) collectBtn.focus(); else (modal.querySelector('button.btn, button') as HTMLElement | null)?.focus();
    });
  } else { startOnboarding(); renderAll(); showWelcome(); }
  /** S2-8/S2-9 values for the UI (Art & UX visuals on m3/rc1-ui): net rate, per-worker wage, queue-full flag. */
  const rates = () => { const s = g.state, inc = income.centsPerSec(now());
    return { incomeCentsPerSec: inc, wageCentsPerSec: totalWageCentsPerSec(s, b), netCentsPerSec: netCentsPerSec(inc, s, b), queueFull: queueFull(s, b),
      workers: Object.fromEntries(WAGE_WORKERS.map(id => [id, { hired: !!s.workers[id], wageCentsPerSec: wageCentsPerSec(id, s, b), listedWageCentsPerSec: listedWageCentsPerSec(id, s, b) }])) }; };
  return { render: renderAll, showWelcome, openPanel, rates, get recoveryOpen() { return recoveryOpen; } };
}
