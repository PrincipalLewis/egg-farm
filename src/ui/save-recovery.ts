/** M3 AC14b save-recovery dialog (art-ux/m3-save-recovery-dialog.md). Not dismissable except by its primary button. */
import type { Recovery } from '../save/save';
import { exportLog } from './export-log';
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
export function showRecoveryDialog(r: Recovery, asset: (f: string) => string, inertEls: HTMLElement[], onExport?: () => void): Promise<void> {
  const c = recoveryCopy(r);
  const layer = document.createElement('div'); layer.className = 'recovery-layer';
  layer.innerHTML = `<div class="recovery-card" role="alertdialog" aria-modal="true" aria-labelledby="rcT" aria-describedby="rcB${c.note ? ' rcN' : ''}">
    <img src="${asset(c.icon)}" width="72" height="72" alt="">
    <h2 id="rcT">${c.title}</h2><p id="rcB">${c.body}</p>${c.note ? `<p class="note" id="rcN">${c.note}</p>` : ''}
    <button class="btn rc-primary" id="rcGo">${c.button}</button>
    ${r.raw ? `<button class="rc-link" id="rcExport" type="button">Export old save</button>` : ''}<div class="rc-msg" aria-live="polite" id="rcMsg"></div></div>`;
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
  layer.querySelector('#rcExport')?.addEventListener('click', () => {
    onExport?.();
    void exportLog(r.raw, exportName(new Date())).then(() => { layer.querySelector('#rcMsg')!.textContent = 'Saved a copy.'; });
  });
  go.focus();
  return new Promise(res => go.addEventListener('click', () => {
    document.removeEventListener('keydown', onKey, true); window.removeEventListener('popstate', onPop);
    for (const el of inertEls) el.inert = false;
    layer.remove(); res();
  }, { once: true }));
}
