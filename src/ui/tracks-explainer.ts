/** M4-AC-EXP1 / M4A-33 (art-ux/m4-tracks-explainer.md v1.3): one-time, non-blocking coach card shown when the tracksV7
 *  migration commits in-session (Game.onTracksCommitted). No scrim; the card is the only element with pointer events. */
import type { Game } from '../game';
import { m4On } from '../config/formulas';
import { fmtMoney, fmtMoneyShort } from './format';
export const EXP_TITLE = 'Upgrades got an upgrade!';
export const EXP_BODY = 'Hens and Egg value are now separate. Top them up!';
export const EXP_MS = 8000;
type G = Pick<Game, 'state' | 'balance' | 'save'> & { canPersist?: boolean; migrationRefundCents?: number };
/** §11 refund line, only when migrationRefundCents > 0. */
export const refundLine = (cents: number) => cents > 0 ? `We refunded +${fmtMoney(cents)} for your old upgrades.` : '';
export const EXP_RETRY_MS = 1000;
/** Fired on the document when the card closes (app.ts plays toasts held while it was open). */
export const EXP_CLOSED = 'tracks-exp-closed';
export const explainerOpen = (doc: Document = document) => !!doc.querySelector('.tracks-exp');
/** Never at the same time as a modal dialog (Welcome back!, settings, confirm): wait until it is collected/closed. */
const modalOpen = (doc: Document) => !!doc.querySelector('#modal-layer.open');
export const shouldShowTracksExplainer = (g: G) => m4On(g.balance) && !g.state.seenTracksExplainer;
/** UX-M5 (art-ux/m4.1-ui-minors.md): close fade length; the refund pop runs the number-pop-spec 800 ms curve. */
export const EXP_OUT_MS = 150, EXP_POP_MS = 800;
const reducedMotion = (doc: Document) => doc.documentElement.classList.contains('reduced-motion') ||
  !!doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export type ExpPlace = 'default' | 'above' | 'inside';
type Box = { left: number; right: number; top: number; bottom: number };
const meets = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
/** UX-M3 + Art ruling on #65 (1): where the card goes when the Upgrades sheet is open. Pure (rects in viewport px).
 *  The card must never overlap a visible Buy hit area (`buys`). Order: above the sheet (top = sheet top - card height - 8, if
 *  that clears the top bar and every Buy); inside the sheet 8px below the tab row (if clear of every Buy); else main's
 *  placement (top 72, over the tab row) - on phones (360/375/390) the rows start right under the tabs, so this is the case.
 *  `sheet`/`tabs` null = sheet closed; a sheet that doesn't share the card's columns (docked 1280 panel) keeps the default. */
export function placeExplainer(card: { left: number; right: number; height: number }, sheet: { top: number; left: number; right: number } | null,
  tabs: { bottom: number } | null, minTop: number, defTop = 72, buys: readonly Box[] = []): { place: ExpPlace; top: number } {
  if (!sheet || !tabs || card.right <= sheet.left || card.left >= sheet.right) return { place: 'default', top: defTop };
  const clear = (top: number) => !buys.some(b => meets({ left: card.left, right: card.right, top, bottom: top + card.height }, b));
  const above = Math.round(sheet.top - card.height - 8), inside = Math.round(tabs.bottom + 8);
  if (above >= minTop && clear(above)) return { place: 'above', top: above };
  if (clear(inside)) return { place: 'inside', top: inside };
  return { place: 'default', top: defTop };
}
const visibleRect = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? r : null; };
/** Visible Buy hit areas (upgrade rows, docked or in the sheet): rendered, inside the viewport. */
export const buyRects = (doc: Document = document): Box[] => {
  const vh = doc.defaultView?.innerHeight ?? 0;
  return [...doc.querySelectorAll('.btn.buy')].map(b => visibleRect(b)).filter((r): r is DOMRect => !!r && r.bottom > 0 && r.top < vh);
};
/** Measure and apply placeExplainer to the live card (data-place names the branch for QA). */
export function placeCard(el: HTMLElement, doc: Document = document) {
  const sheet = visibleRect(doc.querySelector('#p-upgrades')); // [hidden] (closed / Market open) is display:none -> null; docked panel stays
  const tabs = sheet ? visibleRect(doc.querySelector('#p-upgrades .tabs')) : null, r = el.getBoundingClientRect();
  const hud = visibleRect(doc.querySelector('.hud')), minTop = (hud ? hud.bottom : 56) + 8;
  const { place, top } = placeExplainer({ left: r.left, right: r.right, height: el.offsetHeight || r.height }, sheet, tabs, minTop, 72, buyRects(doc));
  if (el.dataset.place !== place || el.style.top !== `${top}px`) { el.dataset.place = place; el.style.top = place === 'default' ? '' : `${top}px`; }
}
/** UX-M5 + Art ruling on #65 (3) (m4-tracks-explainer.md:21): on DISMISS, the coin pill gets the standard number pop (Sell style,
 *  number-pop-spec.md) and a coin burst; nothing while the card is up. Decorative (aria-hidden). Reduced motion: none; the
 *  balance itself is already credited (migration) and rendered, so it updates at once. */
export const EXP_BURST = 3;
function refundPop(cents: number, doc: Document) {
  if (!(cents > 0) || reducedMotion(doc)) return;
  const pill = visibleRect(doc.querySelector('.pill.coins') ?? doc.getElementById('coins'));
  const x = pill ? pill.left + pill.width / 2 : (doc.defaultView?.innerWidth ?? 0) / 2, y = pill ? pill.bottom + 30 : 64; // rises 32px onto the pill
  const coin = `${import.meta.env.BASE_URL}assets/icon-coin.svg`;
  const pop = doc.createElement('div'); pop.className = 'exp-pop num'; pop.setAttribute('aria-hidden', 'true');
  pop.style.left = `${x}px`; pop.style.top = `${y}px`; pop.innerHTML = `<img src="${coin}" alt="" width="16" height="16">+${fmtMoneyShort(cents)}`;
  const parts = Array.from({ length: EXP_BURST }, (_, i) => { const p = doc.createElement('img'); p.className = 'exp-coin'; p.alt = ''; p.setAttribute('aria-hidden', 'true');
    p.src = coin; p.width = p.height = 16; p.style.left = `${x}px`; p.style.top = `${pill ? pill.top + pill.height / 2 : y}px`; p.style.setProperty('--dx', `${(i - (EXP_BURST - 1) / 2) * 18}px`); return p; });
  doc.body.append(pop, ...parts); setTimeout(() => { pop.remove(); parts.forEach(p => p.remove()); }, EXP_POP_MS + 50);
}
/** UX-M5: the card leaves the DOM at once (focus, EXP_CLOSED, explainerOpen() unchanged); an inert, aria-hidden copy plays the
 *  150 ms opacity + translateY(4px) out. Reduced motion: no copy (instant). */
function fadeOut(el: HTMLElement, doc: Document) {
  if (reducedMotion(doc)) return;
  const ghost = el.cloneNode(true) as HTMLElement; ghost.className = 'tracks-exp-out'; ghost.removeAttribute('role'); ghost.removeAttribute('aria-modal');
  ghost.removeAttribute('aria-labelledby'); ghost.setAttribute('aria-hidden', 'true'); ghost.setAttribute('inert', ''); ghost.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  doc.body.append(ghost); setTimeout(() => ghost.remove(), EXP_OUT_MS + 30);
}
/** UX-M1: WebKit skips :focus-visible after a programmatic focus, so a KEYBOARD close (Esc, Enter, Space on Got it) marks the target .kbd-focus
 *  (same 3px ring) until it blurs or the next pointer press. */
function markKbdFocus(t: HTMLElement, doc: Document) {
  t.classList.add('kbd-focus');
  const clear = () => { t.classList.remove('kbd-focus'); t.removeEventListener('blur', clear); doc.removeEventListener('pointerdown', clear, true); };
  t.addEventListener('blur', clear); doc.addEventListener('pointerdown', clear, true);
}
/** Call ONLY from Game.onTracksCommitted (existing save upgraded this session; fresh M4 farms never fire it). Shows the card once; persists seenTracksExplainer=true as soon as it is shown. Returns the card, or null if not shown. */
export function showTracksExplainer(g: G, doc: Document = document, storageBlocked: () => boolean = () => false): HTMLElement | null {
  if (!shouldShowTracksExplainer(g)) return null;
  // HoE Major #49: localStorage refuses writes (TabLease.storageBlocked, the NO_STORAGE_TEXT signal in main.ts). The flag
  // could never persist, so the card would re-show on every load: don't show it this session; a later load with working storage does.
  if (storageBlocked()) return null;
  // Saves m1: only when the flag can actually be saved and the tab is visible; else retry (the on-load rule covers a reload).
  if (g.canPersist === false || doc.visibilityState === 'hidden' || modalOpen(doc)) { setTimeout(() => showTracksExplainer(g, doc, storageBlocked), EXP_RETRY_MS); return null; }
  g.state = { ...g.state, seenTracksExplainer: true }; g.save();
  // HoE #49: the flag write itself can fail (QuotaExceededError sets g.storageFailed): it didn't persist, so no card.
  if (storageBlocked()) { g.state = { ...g.state, seenTracksExplainer: false }; g.save(); return null; } // the 2nd save's catch rewrites the IDB mirror with seen=false (Saves Q2: reconcile) // Saves: never leave seen=true behind for the mirror/next autosave
  const el = doc.createElement('div');
  el.className = 'tracks-exp'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'false'); el.setAttribute('aria-labelledby', 'tracks-exp-t');
  el.innerHTML = `<h2 id="tracks-exp-t">${EXP_TITLE}</h2><p>${EXP_BODY}</p>${(g.migrationRefundCents ?? 0) > 0 ? `<p class="tracks-exp-refund"><img src="${import.meta.env.BASE_URL}assets/icon-coin.svg" alt="" width="16" height="16"> ${refundLine(g.migrationRefundCents!)}</p>` : ''}<button type="button" class="btn tracks-exp-ok">Got it</button>`;
  doc.body.append(el);
  // UX-M3: placed at show, then re-placed only on events that can move the sheet or rows (CCR n3: no per-frame re-measure):
  // resize, scroll (sheet body), the sheet's slide transition ending, and after any click (nav / tab switch). Coalesced to one
  // measure per frame.
  const win = doc.defaultView, raf = win?.requestAnimationFrame?.bind(win) ?? ((f: () => void) => setTimeout(f, 16));
  let queued = false; const replace = () => { if (queued || !el.isConnected) return; queued = true; raf(() => { queued = false; if (el.isConnected) placeCard(el, doc); }); };
  const afterClick = () => setTimeout(replace, 0);
  placeCard(el, doc);
  win?.addEventListener('resize', replace); doc.addEventListener('scroll', replace, true); doc.addEventListener('transitionend', replace, true); doc.addEventListener('click', afterClick);
  const refund = g.migrationRefundCents ?? 0;
  const off = () => { clearTimeout(t); doc.removeEventListener('click', onAny, true); doc.removeEventListener('keydown', onKey, true);
    win?.removeEventListener('resize', replace); doc.removeEventListener('scroll', replace, true); doc.removeEventListener('transitionend', replace, true); doc.removeEventListener('click', afterClick); };
  const close = (how: 'key' | 'ok' | 'card' | 'timeout' = 'timeout') => { if (!el.isConnected) return off(); const ae = doc.activeElement, mine = !ae || ae === doc.body || el.contains(ae); off(); el.remove(); fadeOut(el, doc); refundPop(refund, doc); // (3): the pop plays on dismiss, once (close() returns early once removed)
    // P46-M1 (CCR major): only when focus was on the card; the active Upgrades tab if rendered, else where it was
    // Art & UX B-M1 order: sheet open -> active Upgrades tab; sheet closed -> bottom-nav Upgrades; last resort #collect.
    const shown = (e: HTMLElement | null) => !!e && (e.getClientRects().length > 0 || !e.closest('[hidden]')) ? e : null; // docked overrides [hidden]
    const target = shown(doc.querySelector<HTMLElement>('[data-tab].active')) ?? shown(doc.querySelector<HTMLElement>('[data-nav=upgrades]')) ?? doc.getElementById('collect');
    if (mine && target) { target.focus({ preventScroll: true }); if (how === 'key') markKbdFocus(target, doc); } // Designer M-1: keyboard activation only (Esc / Enter / Space); a pointer Got it gets no forced ring
    doc.dispatchEvent(new Event(EXP_CLOSED)); };
  // m4a-spec v1.15 (variant C): non-modal; taps outside register normally and never close it. A tap on the card
  // closes it and does nothing else.
  const onAny = (e: Event) => { if (!el.isConnected) { off(); return; } if (el.contains(e.target as Node)) { e.preventDefault(); e.stopPropagation(); close(ok.contains(e.target as Node) ? ((e as MouseEvent).detail === 0 ? 'key' : 'ok') : 'card'); } }; // Designer M-1: detail 0 = keyboard (Space) / el.click()
  const onKey = (e: KeyboardEvent) => { if (!el.isConnected) return off(); if (e.key === 'Escape' || (e.key === 'Enter' && e.target === ok)) { e.preventDefault(); e.stopPropagation(); close('key'); } }; // Esc closes only the card, not the sheet behind it
  const ok = el.querySelector('button') as HTMLButtonElement;
  doc.addEventListener('click', onAny, true); doc.addEventListener('keydown', onKey, true);
  const t = setTimeout(() => close('timeout'), EXP_MS); // starts when the card actually appears
  (el.querySelector('button') as HTMLButtonElement).focus({ preventScroll: true });
  return el;
}
