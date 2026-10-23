/** M4-AC-EXP1 / M4A-33 (art-ux/m4-tracks-explainer.md v1.3): one-time, non-blocking coach card shown when the tracksV7
 *  migration commits in-session (Game.onTracksCommitted). No scrim; the card is the only element with pointer events. */
import type { Game } from '../game';
import { m4On } from '../config/formulas';
import { fmtMoney } from './format';
export const EXP_TITLE = 'Upgrades got an upgrade!';
export const EXP_BODY = 'Hens and Egg value are now separate. Top them up!';
export const EXP_MS = 8000;
type G = Pick<Game, 'state' | 'balance'> & { save(o?: Parameters<Game['save']>[0]): void } & { canPersist?: boolean; migrationRefundCents?: number; recoveryOutcome?: Game['recoveryOutcome'] };
/** §11 refund line, only when migrationRefundCents > 0. */
export const refundLine = (cents: number) => cents > 0 ? `We refunded +${fmtMoney(cents)} for your old upgrades.` : '';
export const EXP_RETRY_MS = 1000;
/** Fired on the document when the card closes (app.ts plays toasts held while it was open). */
export const EXP_CLOSED = 'tracks-exp-closed';
export const explainerOpen = (doc: Document = document) => !!doc.querySelector('.tracks-exp');
/** Never at the same time as a modal dialog (Welcome back!, settings, confirm): wait until it is collected/closed. */
// Art M-1 (#63): nor under any save-recovery layer (M1-M5, legacy Q/storage, tab guard, newer save; removed from the DOM on close).
const modalOpen = (doc: Document) => !!doc.querySelector('#modal-layer.open, .recovery-layer');
/** D-HOP-2026-10-22-07 (a): an M1/M2 restore boot = the loader restored from a copy (loadSafe outcome 'restored': case R,
 *  restored_from_backup; M5 is the same outcome with storage blocked, where the card never shows). Keyed on Game.recoveryOutcome,
 *  not on the DOM: tab-guard / newer-save layers and legacy Q/storage ('storage', a fresh farm) are other boots. */
const restoreBoot = (g: G) => g.recoveryOutcome === 'restored';
export const shouldShowTracksExplainer = (g: G) => m4On(g.balance) && !g.state.seenTracksExplainer;
/** Call ONLY from Game.onTracksCommitted (existing save upgraded this session; fresh M4 farms never fire it). Shows the card once; persists seenTracksExplainer=true as soon as it is shown. Returns the card, or null if not shown. */
export function showTracksExplainer(g: G, doc: Document = document, storageBlocked: () => boolean = () => false): HTMLElement | null {
  if (!shouldShowTracksExplainer(g)) return null;
  // HoE Major #49: localStorage refuses writes (TabLease.storageBlocked, the NO_STORAGE_TEXT signal in main.ts). The flag
  // could never persist, so the card would re-show on every load: don't show it this session; a later load with working storage does.
  if (storageBlocked()) return null;
  // Saves m1: only when the flag can actually be saved and the tab is visible; else retry (the on-load rule covers a reload).
  if (g.canPersist === false || doc.visibilityState === 'hidden' || modalOpen(doc)) { setTimeout(() => showTracksExplainer(g, doc, storageBlocked), EXP_RETRY_MS); return null; }
  // D-HOP-2026-10-22-07: on an M1/M2 restore boot seenTracksExplainer is persisted only when the player dismisses the card (the
  // 8 s auto-hide doesn't count; seen stays false while it is up, so never a second card). Every other boot keeps m4a §17 /
  // EXP-B1 as built: seen at show, failed write -> no card. markSeen's body is the dfdf49c code, left at its indentation so
  // this diff stays insert-only (RC merge with #65). Returns true when seen=true persisted.
  const onDismiss = restoreBoot(g);
  if (onDismiss && explainerOpen(doc)) return null;
  const markSeen = (): true | null => {
  // M41-6 (QE-LATE-e): if the localStorage write throws, the flag save skips the IndexedDB fallback, so seen=true never reaches the mirror.
  g.state = { ...g.state, seenTracksExplainer: true }; g.save({ mirrorOnFail: false });
  // HoE #49: the flag write itself can fail (QuotaExceededError sets g.storageFailed): it didn't persist, so no card.
  // g.storageFailed is sticky for the session (CCR #49 n1, intended): after any earlier failure the card waits for the next load.
  if (storageBlocked()) {
    // Never leave seen=true behind for the next autosave. This normal save's catch refreshes the IDB mirror with seen=false
    // (Saves Q2: a stale mirror copy must not out-rank localStorage in reconcile).
    g.state = { ...g.state, seenTracksExplainer: false }; g.save(); return null;
  }
  return true; };
  if (!onDismiss && !markSeen()) return null;
  const el = doc.createElement('div');
  el.className = 'tracks-exp'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'false'); el.setAttribute('aria-labelledby', 'tracks-exp-t');
  el.innerHTML = `<h2 id="tracks-exp-t">${EXP_TITLE}</h2><p>${EXP_BODY}</p>${(g.migrationRefundCents ?? 0) > 0 ? `<p class="tracks-exp-refund"><img src="${import.meta.env.BASE_URL}assets/icon-coin.svg" alt="" width="16" height="16"> ${refundLine(g.migrationRefundCents!)}</p>` : ''}<button type="button" class="btn tracks-exp-ok">Got it</button>`;
  doc.body.append(el);
  const off = () => { clearTimeout(t); doc.removeEventListener('click', onAny, true); doc.removeEventListener('keydown', onKey, true); };
  const close = () => { if (!el.isConnected) return off(); const ae = doc.activeElement, mine = !ae || ae === doc.body || el.contains(ae); off(); el.remove();
    // P46-M1 (CCR major): only when focus was on the card; the active Upgrades tab if rendered, else where it was
    // Art & UX B-M1 order: sheet open -> active Upgrades tab; sheet closed -> bottom-nav Upgrades; last resort #collect.
    const shown = (e: HTMLElement | null) => !!e && (e.getClientRects().length > 0 || !e.closest('[hidden]')) ? e : null; // docked overrides [hidden]
    if (onDismiss && !timedOut) markSeen(); // D-HOP-07: Got it / Esc / card tap on a restore boot
    const target = shown(doc.querySelector<HTMLElement>('[data-tab].active')) ?? shown(doc.querySelector<HTMLElement>('[data-nav=upgrades]')) ?? doc.getElementById('collect');
    if (mine) target?.focus({ preventScroll: true });
    doc.dispatchEvent(new Event(EXP_CLOSED)); };
  // m4a-spec v1.15 (variant C): non-modal; taps outside register normally and never close it. A tap on the card
  // closes it and does nothing else.
  const onAny = (e: Event) => { if (!el.isConnected) { off(); return; } if (el.contains(e.target as Node)) { e.preventDefault(); e.stopPropagation(); close(); } };
  const onKey = (e: KeyboardEvent) => { if (!el.isConnected) return off(); if (e.key === 'Escape' || (e.key === 'Enter' && e.target === ok)) { e.preventDefault(); e.stopPropagation(); close(); } }; // Esc closes only the card, not the sheet behind it
  const ok = el.querySelector('button') as HTMLButtonElement;
  doc.addEventListener('click', onAny, true); doc.addEventListener('keydown', onKey, true);
  let timedOut = false; const t = setTimeout(() => { timedOut = true; close(); }, EXP_MS); // starts when the card actually appears; never marks seen
  (el.querySelector('button') as HTMLButtonElement).focus({ preventScroll: true });
  return el;
}
