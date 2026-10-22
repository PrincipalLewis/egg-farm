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
/** UX-M3: where the card goes when the Upgrades sheet is open. Pure (rects in viewport px). `sheet`/`tabs` null = sheet
 *  closed or not rendered; a sheet that doesn't share the card's columns (docked 1280 panel beside it) keeps the default.
 *  Above the tab row: top = sheet top - card height - 8 if that clears the top bar (minTop); else inside the sheet below the tabs. */
export function placeExplainer(card: { left: number; right: number; height: number }, sheet: { top: number; left: number; right: number } | null,
  tabs: { bottom: number } | null, minTop: number, defTop = 72): { place: ExpPlace; top: number } {
  if (!sheet || !tabs || card.right <= sheet.left || card.left >= sheet.right) return { place: 'default', top: defTop };
  const above = sheet.top - card.height - 8;
  return above >= minTop ? { place: 'above', top: Math.round(above) } : { place: 'inside', top: Math.round(tabs.bottom + 8) };
}
const visibleRect = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? r : null; };
/** Measure and apply placeExplainer to the live card (data-place names the branch for QA). */
export function placeCard(el: HTMLElement, doc: Document = document) {
  const sheet = visibleRect(doc.querySelector('#p-upgrades')); // [hidden] (closed / Market open) is display:none -> null; docked panel stays
  const tabs = sheet ? visibleRect(doc.querySelector('#p-upgrades .tabs')) : null, r = el.getBoundingClientRect();
  const hud = visibleRect(doc.querySelector('.hud')), minTop = (hud ? hud.bottom : 56) + 8;
  const { place, top } = placeExplainer({ left: r.left, right: r.right, height: el.offsetHeight || r.height }, sheet, tabs, minTop);
  if (el.dataset.place !== place || el.style.top !== `${top}px`) { el.dataset.place = place; el.style.top = place === 'default' ? '' : `${top}px`; }
}
/** UX-M5: refund number pop + coin particle (art-ux/number-pop-spec.md, Sell style). Decorative (aria-hidden); the refund
 *  line carries the text. Reduced motion: none (instant). */
function refundPop(el: HTMLElement, cents: number, doc: Document) {
  const line = el.querySelector('.tracks-exp-refund'); if (!line || reducedMotion(doc)) return;
  const r = line.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top;
  const coin = `${import.meta.env.BASE_URL}assets/icon-coin.svg`;
  const pop = doc.createElement('div'); pop.className = 'exp-pop num'; pop.setAttribute('aria-hidden', 'true');
  pop.style.left = `${x}px`; pop.style.top = `${y}px`; pop.innerHTML = `<img src="${coin}" alt="" width="16" height="16">+${fmtMoneyShort(cents)}`;
  const part = doc.createElement('img'); part.className = 'exp-coin'; part.alt = ''; part.setAttribute('aria-hidden', 'true'); part.src = coin; part.width = part.height = 16;
  part.style.left = `${x}px`; part.style.top = `${y}px`;
  doc.body.append(pop, part); setTimeout(() => { pop.remove(); part.remove(); }, EXP_POP_MS + 50);
}
/** UX-M5: the card leaves the DOM at once (focus, EXP_CLOSED, explainerOpen() unchanged); an inert, aria-hidden copy plays the
 *  150 ms opacity + translateY(4px) out. Reduced motion: no copy (instant). */
function fadeOut(el: HTMLElement, doc: Document) {
  if (reducedMotion(doc)) return;
  const ghost = el.cloneNode(true) as HTMLElement; ghost.className = 'tracks-exp-out'; ghost.removeAttribute('role'); ghost.removeAttribute('aria-modal');
  ghost.removeAttribute('aria-labelledby'); ghost.setAttribute('aria-hidden', 'true'); ghost.setAttribute('inert', ''); ghost.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  doc.body.append(ghost); setTimeout(() => ghost.remove(), EXP_OUT_MS + 30);
}
/** UX-M1: WebKit skips :focus-visible after a programmatic focus, so the Esc / Got it hand-off marks the target .kbd-focus
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
  // UX-M3: keep it clear of the open sheet's tab row; re-placed every frame while up (the sheet opens/closes under it).
  const raf = doc.defaultView?.requestAnimationFrame?.bind(doc.defaultView);
  const follow = () => { if (!el.isConnected) return; placeCard(el, doc); raf?.(follow); };
  placeCard(el, doc); raf?.(follow);
  if ((g.migrationRefundCents ?? 0) > 0) refundPop(el, g.migrationRefundCents!, doc);
  const off = () => { clearTimeout(t); doc.removeEventListener('click', onAny, true); doc.removeEventListener('keydown', onKey, true); };
  const close = (how: 'key' | 'ok' | 'card' | 'timeout' = 'timeout') => { if (!el.isConnected) return off(); const ae = doc.activeElement, mine = !ae || ae === doc.body || el.contains(ae); off(); el.remove(); fadeOut(el, doc);
    // P46-M1 (CCR major): only when focus was on the card; the active Upgrades tab if rendered, else where it was
    // Art & UX B-M1 order: sheet open -> active Upgrades tab; sheet closed -> bottom-nav Upgrades; last resort #collect.
    const shown = (e: HTMLElement | null) => !!e && (e.getClientRects().length > 0 || !e.closest('[hidden]')) ? e : null; // docked overrides [hidden]
    const target = shown(doc.querySelector<HTMLElement>('[data-tab].active')) ?? shown(doc.querySelector<HTMLElement>('[data-nav=upgrades]')) ?? doc.getElementById('collect');
    if (mine && target) { target.focus({ preventScroll: true }); if (how === 'key' || how === 'ok') markKbdFocus(target, doc); }
    doc.dispatchEvent(new Event(EXP_CLOSED)); };
  // m4a-spec v1.15 (variant C): non-modal; taps outside register normally and never close it. A tap on the card
  // closes it and does nothing else.
  const onAny = (e: Event) => { if (!el.isConnected) { off(); return; } if (el.contains(e.target as Node)) { e.preventDefault(); e.stopPropagation(); close(ok.contains(e.target as Node) ? 'ok' : 'card'); } };
  const onKey = (e: KeyboardEvent) => { if (!el.isConnected) return off(); if (e.key === 'Escape' || (e.key === 'Enter' && e.target === ok)) { e.preventDefault(); e.stopPropagation(); close('key'); } }; // Esc closes only the card, not the sheet behind it
  const ok = el.querySelector('button') as HTMLButtonElement;
  doc.addEventListener('click', onAny, true); doc.addEventListener('keydown', onKey, true);
  const t = setTimeout(() => close('timeout'), EXP_MS); // starts when the card actually appears
  (el.querySelector('button') as HTMLButtonElement).focus({ preventScroll: true });
  return el;
}
