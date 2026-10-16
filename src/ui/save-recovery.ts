/** M3 AC14b save-recovery dialog (art-ux/m3-save-recovery-dialog.md). Not dismissable except by its primary button. */
import { recoveryOutcome, type Recovery, type RecoveryOutcome } from '../save/save';
/** v1.1 §Q lifetime: the old save's raw bytes for this session only (memory, never written back to storage). */
let sessionOldSave: string | null = null;
export const oldSaveForSession = () => sessionOldSave;
export const FAIL_MSG = "Couldn't save a copy. Try again.", OK_MSG = 'Saved a copy.';
/** Export the old save; resolves false on failure or a cancelled share sheet (v1.1 item 2). */
export async function exportOldSave(raw: string, name: string, nav: any = navigator, doc: Document = document): Promise<boolean> {
  const blob = new Blob([raw], { type: 'application/json' });
  const ios = /iP(hone|ad|od)/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  try {
    if (ios && typeof File !== 'undefined' && nav.canShare?.({ files: [new File([blob], name, { type: 'application/json' })] })) {
      try { await nav.share({ files: [new File([blob], name, { type: 'application/json' })], title: 'Egg Farm old save' }); return true; }
      catch (e) { if ((e as Error)?.name === 'AbortError') return false; }
    } else {
      const url = URL.createObjectURL(blob), a = doc.createElement('a');
      a.href = url; a.download = name; a.rel = 'noopener'; doc.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10_000);
      if (!ios) return true;
    }
  } catch { /* fall through */ }
  try { await nav.clipboard.writeText(raw); return true; } catch { return false; }
}
/** AC14b v2.1 (art-ux/save-recovery-dialog.md §1): copy keyed by the loader's single recovery outcome (Product 15:15). */
export type DialogOutcome = Exclude<RecoveryOutcome, null>;
export interface RecoveryCopy { variant?: 'cantsave'; exportLabel?: string; exportAria?: string; outcome: DialogOutcome; icon: string; badge: '\u2713' | '\u2605' | '!'; badgeClass: 'ok' | 'new' | 'warn'; title: string; body: string; button: string; exportStyle: 'link' | 'secondary'; }
/** Fired when the AC14b dialog closes; main.ts holds the save-warning toast until then (v2.2 fix 2). */
export const RECOVERY_CLOSED = 'eggfarm-recovery-closed';
export const EXPORT_ARIA = 'Export old save, downloads a copy of your old save file';
export const CANTSAVE_ARIA = 'Export save, downloads a copy of your current farm';
export function recoveryCopy(r: Pick<Recovery, 'case' | 'copy_failed' | 'restored_from_backup'> & { cantSave?: true }): RecoveryCopy | null {
  const o = recoveryOutcome(r as Recovery);
  // v2.2 (art-ux/save-recovery-dialog.md): storage refused but the farm loaded. The real Storage case keeps its v2.1 copy.
  if (o === 'storage' && r.cantSave) return { variant: 'cantsave', outcome: o, icon: 'icon-coop.svg', badge: '!', badgeClass: 'warn', title: 'Saving is paused', button: 'Keep farming',
    body: "Your farm is fine, but your browser won't let us save right now. Export a copy to keep your progress.", exportStyle: 'secondary', exportLabel: 'Export save', exportAria: CANTSAVE_ARIA };
  if (o === 'restored') return { outcome: o, icon: 'icon-coop.svg', badge: '\u2713', badgeClass: 'ok', title: 'Welcome back!', button: 'Keep farming',
    body: r.copy_failed ? 'We loaded your backup. Export the old save now to keep it.' : 'We loaded your backup. You may be a few moments behind.',
    exportStyle: r.copy_failed ? 'secondary' : 'link' };
  if (o === 'storage') return { outcome: o, icon: 'char-chicken.svg', badge: '!', badgeClass: 'warn', title: 'A fresh start', button: 'Start farming',
    body: "We couldn't open your farm. Export it now to keep a copy.", exportStyle: 'secondary' };
  if (o === 'fresh') return { outcome: o, icon: 'char-chicken.svg', badge: '\u2605', badgeClass: 'new', title: 'A fresh start', button: 'Start farming',
    body: "We couldn't open your farm. Your old save is kept safe.", exportStyle: 'link' };
  return null;
}
export const exportName = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `eggfarm-old-save-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
};
/** Show the dialog for the loader outcome; resolves when the primary button is pressed (immediately, with nothing shown, for a null outcome).
 *  `inertEls` are made inert while it's open. */
export function showRecoveryDialog(r: Recovery | null, asset: (f: string) => string, inertEls: HTMLElement[], onExport?: () => void, doExport?: (raw: string, name: string) => Promise<boolean>): Promise<void> {
  const c = r ? recoveryCopy(r) : null;
  if (!r || !c) return Promise.resolve();
  const layer = document.createElement('div'); layer.className = 'recovery-layer'; layer.dataset.outcome = c.outcome; if (c.variant) layer.dataset.variant = c.variant;
  const canExport = !!(r.raw || r.live);
  const exp = canExport ? (c.exportStyle === 'secondary'
    ? `<button class="rc-export-q" id="rcExport" type="button" aria-label="${c.exportAria ?? EXPORT_ARIA}">${c.exportLabel ?? 'Export old save'}</button>`
    : `<button class="rc-link" id="rcExport" type="button" aria-label="${EXPORT_ARIA}">Export old save</button>`) : '';
  layer.innerHTML = `<div class="recovery-card" role="alertdialog" aria-modal="true" aria-labelledby="rcT" aria-describedby="rcB${canExport ? ' rcMsg' : ''}">
    <span class="rc-icon" aria-hidden="true"><img src="${asset(c.icon)}" width="72" height="72" alt=""><span class="rc-badge ${c.badgeClass}">${c.badge}</span></span>
    <h2 id="rcT">${c.title}</h2><p id="rcB">${c.body}</p>
    <button class="btn rc-primary" id="rcGo" type="button">${c.button}</button>
    ${exp}${canExport ? '<div class="rc-msg" aria-live="polite" id="rcMsg"></div>' : ''}</div>`;
  document.body.append(layer);
  for (const el of inertEls) el.inert = true;
  const go = layer.querySelector<HTMLButtonElement>('#rcGo')!;
  const focusables = () => [...layer.querySelectorAll<HTMLElement>('button')];
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); return; } // Esc does nothing
    if (e.key === 'Tab') { layer.classList.add('kbd'); const f = focusables(), i = f.indexOf(document.activeElement as HTMLElement); e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus(); }
  };
  // Back gesture / browser back: push a state and re-push on popstate so Back can't close it.
  const onPop = () => history.pushState({ eggfarmRecovery: 1 }, '');
  try { history.pushState({ eggfarmRecovery: 1 }, ''); } catch { /* sandboxed */ }
  window.addEventListener('popstate', onPop);
  document.addEventListener('keydown', onKey, true);
  layer.addEventListener('click', e => e.stopPropagation()); // scrim taps do nothing
  const keep = () => setTimeout(() => { if (layer.isConnected && !layer.contains(document.activeElement)) go.focus(); }, 0); // focus never leaves the dialog
  layer.addEventListener('focusout', keep); const onFocusIn = (e: FocusEvent) => { if (!layer.contains(e.target as Node)) go.focus(); };
  document.addEventListener('focusin', onFocusIn, true);
  // Firefox doesn't mark the trap's programmatic refocus as :focus-visible (lone-button Restored case), so keyboard use is
  // tracked here too; any pointer use drops back to the :focus-visible-only ring.
  layer.addEventListener('pointerdown', () => layer.classList.remove('kbd'), true);
  layer.addEventListener('mousedown', e => { if (!(e.target as HTMLElement).closest('button')) e.preventDefault(); }); // scrim/card taps never pull focus out of the dialog
  if (r.copy_failed && r.raw) sessionOldSave = r.raw;
  const msg = layer.querySelector<HTMLElement>('#rcMsg');
  const expBtn = layer.querySelector<HTMLButtonElement>('#rcExport');
  expBtn?.addEventListener('click', () => {
    if (expBtn.getAttribute('aria-busy') === 'true') return;
    onExport?.(); if (msg) msg.textContent = ''; expBtn.setAttribute('aria-busy', 'true'); // §4: busy state, same label; the dialog stays open
    const done = (ok: boolean) => { expBtn.removeAttribute('aria-busy'); if (msg) msg.textContent = ok ? OK_MSG : FAIL_MSG; };
    void (doExport ?? exportOldSave)(r.live ? r.live() : r.raw!, r.cantSave ? exportName(new Date()).replace('eggfarm-old-save-', 'eggfarm-save-') : exportName(new Date())).then(done, () => done(false));
  });
  go.focus();
  return new Promise(res => go.addEventListener('click', () => {
    document.removeEventListener('keydown', onKey, true); window.removeEventListener('popstate', onPop); document.removeEventListener('focusin', onFocusIn, true); layer.removeEventListener('focusout', keep);
    for (const el of inertEls) el.inert = false;
    layer.remove(); document.dispatchEvent(new Event(RECOVERY_CLOSED)); res();
  }, { once: true }));
}

/** Single-tab guard notice (art-ux/single-tab-guard/spec.md v1.0): text keys tabguard.*. */
export const TABGUARD_STRINGS = {
  'tabguard.title': 'Game open in another tab',
  'tabguard.body': 'Your farm is running in another tab. Play here to continue from your latest save.',
  'tabguard.play': 'Play here',
  'tabguard.loading': 'Loading\u2026',
} as const;
/** Single-action variant of the AC14b alertdialog: no close affordance; Esc, Back and scrim taps do nothing; focus stays on
 *  "Play here". Pressing it disables the button, shows "Loading…" and calls onPlay (reload; the claim happens on load). */
export function showTabGuardDialog(asset: (f: string) => string, inertEls: HTMLElement[], onPlay: () => void, S = TABGUARD_STRINGS): HTMLElement {
  const existing = document.querySelector<HTMLElement>('.recovery-layer.tab-guard'); if (existing) return existing;
  const layer = document.createElement('div'); layer.className = 'recovery-layer tab-guard';
  layer.innerHTML = `<div class="recovery-card" role="alertdialog" aria-modal="true" aria-labelledby="tgT" aria-describedby="tgB">
    <img src="${asset('icon-coop.svg')}" width="72" height="72" alt="">
    <h2 id="tgT">${S['tabguard.title']}</h2><p id="tgB">${S['tabguard.body']}</p>
    <button class="btn rc-primary" id="tgPlay" type="button">${S['tabguard.play']}</button></div>`;
  document.body.append(layer); document.body.classList.add('tab-guard-frozen');
  for (const el of inertEls) { el.inert = true; el.setAttribute('aria-hidden', 'true'); }
  const go = layer.querySelector<HTMLButtonElement>('#tgPlay')!;
  document.addEventListener('keydown', e => { if (!layer.isConnected) return; if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); go.focus(); } }, true);
  try { history.pushState({ eggfarmTabGuard: 1 }, ''); } catch { /* sandboxed */ }
  window.addEventListener('popstate', () => { try { history.pushState({ eggfarmTabGuard: 1 }, ''); } catch { /* ignore */ } });
  for (const t of ['click', 'pointerdown', 'mousedown', 'touchstart'] as const) layer.addEventListener(t, e => { if (!(e.target as HTMLElement).closest('button')) { e.preventDefault(); e.stopPropagation(); } }, { passive: false });
  document.addEventListener('focusin', e => { if (layer.isConnected && !layer.contains(e.target as Node)) go.focus(); }, true);
  go.addEventListener('click', () => { if (go.disabled) return; go.disabled = true; go.textContent = S['tabguard.loading']; go.setAttribute('aria-busy', 'true'); onPlay(); });
  go.focus();
  return layer;
}
/** M4-safety: the stored save is from a newer build. Non-destructive: nothing is loaded, written or cleared; no game starts.
 *  Only action: "Try again" reloads (e.g. after opening the newer build). */
export const NEWER_SAVE_STRINGS = {
  // M4A-31(b) copy, exact.
  title: 'This save is from a newer version of Egg Farm. Open the newer build to keep playing.',
  body: '',
  retry: 'Try again',
};
export function showNewerSaveDialog(asset: (f: string) => string, version: number, onRetry: () => void, S = NEWER_SAVE_STRINGS): HTMLElement {
  const layer = document.createElement('div'); layer.className = 'recovery-layer newer-save'; layer.dataset.version = String(version);
  layer.innerHTML = `<div class="recovery-card" role="alertdialog" aria-modal="true" aria-labelledby="nsT">
    <img src="${asset('icon-coop.svg')}" width="72" height="72" alt="">
    <h2 id="nsT">${S.title}</h2>${S.body ? `<p id="nsB">${S.body}</p>` : ''}
    <button class="btn rc-primary" id="nsRetry" type="button">${S.retry}</button></div>`;
  document.body.append(layer);
  const b = layer.querySelector<HTMLButtonElement>('#nsRetry')!; b.addEventListener('click', onRetry); b.focus();
  return layer;
}
