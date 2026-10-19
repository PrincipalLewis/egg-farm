/** M4-AC-EXP1 / M4A-33 (art-ux/m4-tracks-explainer.md v1.3): one-time, non-blocking coach card shown when the tracksV7
 *  migration commits in-session (Game.onTracksCommitted). No scrim; the card is the only element with pointer events. */
import type { Game } from '../game';
import { m4On } from '../config/formulas';
import { fmtMoney } from './format';
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
/** Call ONLY from Game.onTracksCommitted (existing save upgraded this session; fresh M4 farms never fire it). Shows the card once; persists seenTracksExplainer=true as soon as it is shown. Returns the card, or null if not shown. */
export function showTracksExplainer(g: G, doc: Document = document): HTMLElement | null {
  if (!shouldShowTracksExplainer(g)) return null;
  // Saves m1: only when the flag can actually be saved and the tab is visible; else retry (the on-load rule covers a reload).
  if (g.canPersist === false || doc.visibilityState === 'hidden' || modalOpen(doc)) { setTimeout(() => showTracksExplainer(g, doc), EXP_RETRY_MS); return null; }
  g.state = { ...g.state, seenTracksExplainer: true }; g.save();
  const el = doc.createElement('div');
  el.className = 'tracks-exp'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'false'); el.setAttribute('aria-labelledby', 'tracks-exp-t');
  el.innerHTML = `<h2 id="tracks-exp-t">${EXP_TITLE}</h2><p>${EXP_BODY}</p>${(g.migrationRefundCents ?? 0) > 0 ? `<p class="tracks-exp-refund"><img src="${import.meta.env.BASE_URL}assets/icon-coin.svg" alt="" width="16" height="16"> ${refundLine(g.migrationRefundCents!)}</p>` : ''}<button type="button" class="btn tracks-exp-ok">Got it</button>`;
  const prev = doc.activeElement as HTMLElement | null; // P46-M1: focus fallback
  doc.body.append(el);
  const close = () => { if (!el.isConnected) return; clearTimeout(t); doc.removeEventListener('pointerdown', onAny, true); doc.removeEventListener('keydown', onKey, true); el.remove();
    // P46-M1: focus back to the active Upgrades tab, else where it was
    const tab = doc.querySelector<HTMLElement>('[data-tab].active'); (tab ?? (prev && prev.isConnected ? prev : null))?.focus({ preventScroll: true });
    doc.dispatchEvent(new Event(EXP_CLOSED)); };
  // Any tap dismisses and passes through (never preventDefault/stopPropagation), so a Buy/Collect tap still registers.
  const onAny = (e: Event) => { if (!el.contains(e.target as Node)) close(); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || (e.key === 'Enter' && e.target === ok)) { e.preventDefault(); close(); } };
  const ok = el.querySelector('button') as HTMLButtonElement;
  doc.addEventListener('pointerdown', onAny, true); doc.addEventListener('keydown', onKey, true);
  el.querySelector('button')!.addEventListener('click', close);
  const t = setTimeout(close, EXP_MS); // starts when the card actually appears
  (el.querySelector('button') as HTMLButtonElement).focus({ preventScroll: true });
  return el;
}
