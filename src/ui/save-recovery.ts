/** M3 AC14b save-recovery dialog (art-ux/m3-save-recovery-dialog.md). Not dismissable except by its primary button. */
import type { Recovery } from '../save/save';
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
export interface RecoveryCopy { icon: string; title: string; body: string; note: string; button: string; }
export function recoveryCopy(r: Pick<Recovery, 'case' | 'copy_failed'>): RecoveryCopy {
  if (r.case === 'R') return { icon: 'icon-coop.svg', title: 'Welcome back!', button: 'Keep farming',
    body: 'Something went wrong with your latest save, so we loaded your most recent backup. You might be a few moments behind.',
    note: r.copy_failed ? "Your device is low on space. Export the old save now if you'd like to keep it." : '' };
  if (r.case === 'Q') return { icon: 'char-chicken.svg', title: 'A fresh start', button: 'Start farming',
    body: "We couldn't open your saved farm, so a new one is ready for you. Your device is low on space, so we couldn't keep a copy.",
    note: "Export it now if you'd like to keep it." };
  return { icon: 'char-chicken.svg', title: 'A fresh start', button: 'Start farming',
    body: "We couldn't open your saved farm, so a new one is ready for you. We've kept a copy of the old save, just in case.", note: '' };
}
export const exportName = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `eggfarm-old-save-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
};
/** Show the dialog; resolves when the primary button is pressed. `inertEls` are made inert while it's open. */
export function showRecoveryDialog(r: Recovery, asset: (f: string) => string, inertEls: HTMLElement[], onExport?: () => void, doExport?: (raw: string, name: string) => Promise<boolean>): Promise<void> {
  const c = recoveryCopy(r);
  const layer = document.createElement('div'); layer.className = 'recovery-layer';
  layer.innerHTML = `<div class="recovery-card" role="alertdialog" aria-modal="true" aria-labelledby="rcT" aria-describedby="rcB${c.note ? ' rcN' : ''}">
    <img src="${asset(c.icon)}" width="72" height="72" alt="">
    <h2 id="rcT">${c.title}</h2><p id="rcB">${c.body}</p>${c.note ? `<p class="note" id="rcN">${c.note}</p>` : ''}
    <button class="btn rc-primary" id="rcGo">${c.button}</button>
    ${r.raw ? `<button class="${r.copy_failed ? 'btn rc-export-q' : 'rc-link'}" id="rcExport" type="button">Export old save</button>` : ''}<div class="rc-msg" aria-live="polite" id="rcMsg"></div></div>`;
  document.body.append(layer);
  for (const el of inertEls) el.inert = true;
  const go = layer.querySelector<HTMLButtonElement>('#rcGo')!;
  const focusables = () => [...layer.querySelectorAll<HTMLElement>('button')];
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); return; } // Esc does nothing
    if (e.key === 'Tab') { const f = focusables(), i = f.indexOf(document.activeElement as HTMLElement); e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus(); }
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
  layer.addEventListener('mousedown', e => { if (!(e.target as HTMLElement).closest('button')) e.preventDefault(); }); // scrim/card taps never pull focus out of the dialog
  if (r.copy_failed && r.raw) sessionOldSave = r.raw;
  const msg = layer.querySelector('#rcMsg')!;
  layer.querySelector('#rcExport')?.addEventListener('click', () => {
    onExport?.(); msg.textContent = '';
    void (doExport ?? exportOldSave)(r.raw!, exportName(new Date())).then(ok => { msg.textContent = ok ? OK_MSG : FAIL_MSG; }, () => { msg.textContent = FAIL_MSG; });
  });
  go.focus();
  return new Promise(res => go.addEventListener('click', () => {
    document.removeEventListener('keydown', onKey, true); window.removeEventListener('popstate', onPop); document.removeEventListener('focusin', onFocusIn, true); layer.removeEventListener('focusout', keep);
    for (const el of inertEls) el.inert = false;
    layer.remove(); res();
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
