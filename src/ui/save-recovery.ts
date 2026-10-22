/** M3 AC14b save-recovery dialog (art-ux/m3-save-recovery-dialog.md). Not dismissable except by its primary button. */
import { recoveryOutcome, validSavedAt, type Recovery, type RecoveryOutcome } from '../save/save';
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
/* ---- M41-7 CSR v0.2.3 copy half (D-HOE-20261019-04; contract engineering/reviews/m41-7-copy-interface.md) ---- */
/** Interface §1: the additive loader fields Saves' loadSafe (fix/saves-csr-loadsafe) adds to `Recovery`. Declared here, all
 *  optional, so UI builds on main today; once Saves' save.ts carries them this is a plain alias of `Recovery`. */
export type RecoverySource = 'bak' | 'idb' | 'v6_backup' | 'none' | 'deferred';
export type CsrRecovery = Omit<Recovery, 'case'> & {
  case: Recovery['case'] | 'D'; source?: RecoverySource; store?: 'ls' | 'idb';
  prevLevel?: number; restoredLevel?: number; restoredSavedAt?: number;
};
export type NoticeId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'storage' | 'cantsave';
export type M2Variant = 'level' | 'age' | 'fallback';
export interface RecoveryNotice { id: NoticeId; source: RecoverySource | null; variant?: M2Variant; level?: number; ageMs?: number; }
/** CSR-9 / CSR-9a / CSR-9b strings, verbatim from art-ux/copy/csr9-recovery-copy.md (keys csr.*, same pattern as TABGUARD_STRINGS).
 *  The aria labels are not in the copy file: they follow EXPORT_ARIA / CANTSAVE_ARIA. */
export const CSR_COPY = {
  'csr.m1.title': 'Your farm is back!', 'csr.m1.body': 'We fixed a hiccup and restored your latest save.', 'csr.m1.button': 'Continue',
  'csr.m2.title': 'Your farm is back!', 'csr.m2.button': 'Continue',
  'csr.m2.body.level': 'We restored an earlier save, from Farm level {level}.',
  'csr.m2.body.age': 'We restored a save from {age} ago.',
  'csr.m2.body.fallback': 'We restored an earlier save. A little recent progress may be missing.',
  'csr.m3.title': 'A fresh start', 'csr.m3.body': "We couldn't recover your save, so we started a new farm for you.", 'csr.m3.button': 'Start farming', 'csr.m3.link': 'Export old save file',
  'csr.m4.title': "Couldn't load your farm", 'csr.m4.body': "Your save is safe. Let's try that again.", 'csr.m4.button': 'Try again', 'csr.m4.link': 'Export save file',
  'csr.m5.title': 'Your farm is back!', 'csr.m5.body': 'Saving is paused on this device right now, so progress may not be kept.', 'csr.m5.button': 'Continue', 'csr.m5.link': 'Export save file',
  /** Copy-file rule line: the optional secondary link is "Export save file" (M1/M2 show it only on copy_failed, G1-G3). */
  'csr.link': 'Export save file',
  'csr.age.few': 'a few minutes', 'csr.age.minute': '1 minute', 'csr.age.minutes': '{n} minutes',
  'csr.age.hour': 'about 1 hour', 'csr.age.hours': 'about {n} hours', 'csr.age.day': '1 day', 'csr.age.days': '{n} days',
  'csr.aria.old': 'Export old save file, downloads a copy of your old save file',
  /** Art & UX P2 (WCAG 2.5.3): starts with the visible label 'Export save file' (M1/M2 copy_failed, M4). */
  'csr.aria.file': 'Export save file, downloads a copy of your old save file',
  'csr.aria.live': 'Export save file, downloads a copy of your current farm',
} as const;
const fill = (t: string, k: string, v: string | number) => t.replace(`{${k}}`, String(v));
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
/** CSR-9b {age}: rounded down, never seconds; negative or non-finite -> "a few minutes". Exported for the formatter ACs. */
export const formatAge = (ms: number, S = CSR_COPY): string => formatAgeUnits(ms, S);
/** < 5 min -> "a few minutes"; < 60 min -> minutes; < 48 h -> "about {n} hours"; else days. "1 minute" is reachable only via formatMinutes. */
function formatAgeUnits(ms: number, S: typeof CSR_COPY): string {
  if (!Number.isFinite(ms) || ms < 5 * MIN) return S['csr.age.few'];
  if (ms < HOUR) return formatMinutes(Math.floor(ms / MIN), S);
  if (ms < 48 * HOUR) { const h = Math.floor(ms / HOUR); return h === 1 ? S['csr.age.hour'] : fill(S['csr.age.hours'], 'n', h); }
  return formatDays(Math.floor(ms / DAY), S);
}
export const formatMinutes = (n: number, S = CSR_COPY) => n === 1 ? S['csr.age.minute'] : fill(S['csr.age.minutes'], 'n', n);
export const formatDays = (n: number, S = CSR_COPY) => n === 1 ? S['csr.age.day'] : fill(S['csr.age.days'], 'n', n);
const isLevel = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;
/** Interface §2: pure notice selection. CSR-9a variant order: level (prevLevel set and != restoredLevel) -> age (restoredSavedAt
 *  passes validSavedAt) -> fallback. A level is shown only if it is a validated integer >= 0. */
export function recoveryNotice(r: CsrRecovery | null, o: { storageBlocked: boolean; now: number }): RecoveryNotice | null {
  if (!r) return null;
  const source = r.source ?? null;
  if (r.cantSave) return { id: 'cantsave', source };
  if (r.case === 'D') return { id: 'M4', source };
  if (r.case === 'Q') return { id: 'storage', source };
  if (r.case === 'F') return { id: 'M3', source };
  // case R
  const m2 = (): RecoveryNotice => {
    const n: RecoveryNotice = { id: 'M2', source };
    if (isLevel(r.prevLevel) && isLevel(r.restoredLevel) && r.prevLevel !== r.restoredLevel) { n.variant = 'level'; n.level = r.restoredLevel; }
    else if (validSavedAt(r.restoredSavedAt, o.now)) { n.variant = 'age'; n.ageMs = o.now - r.restoredSavedAt; }
    else n.variant = 'fallback';
    return n;
  };
  const base = source === 'v6_backup' ? m2() : { id: 'M1' as NoticeId, source };
  return o.storageBlocked ? { ...base, id: 'M5' } : base;
}
/** Notice telemetry payload (interface §3) plus `store` (where the triggering corrupt copy was found, §4.9). `store` is owned
 *  by Saves' loader (required on save_corrupt) and is passed through as-is: it is NEVER defaulted here, since a guessed 'ls'
 *  would mislabel the CSR-AC-IDB1 IDB-only case. Unset (including 'cantsave') -> null. */
export function noticePayload(n: RecoveryNotice, r: CsrRecovery): Record<string, unknown> {
  return { notice: n.id, source: n.source, ...(n.variant ? { variant: n.variant } : {}), store: r.store ?? null };
}
/** True once Saves' loader output (interface §1, `source`) is present: only then is the CSR-9 copy swapped in. Until then
 *  recoveryCopy() keeps today's AC14b strings byte for byte (interface line 4), so existing tests and shots keep passing. */
export const csrCopyActive = (r: CsrRecovery) => r.source !== undefined;
/** CSR-9 copy for a notice. 'storage' and 'cantsave' stay on their v2.1/v2.2 copy (G2). */
export function csrCopy(n: RecoveryNotice, r: CsrRecovery, S = CSR_COPY): RecoveryCopy | null {
  const restored = { outcome: 'restored' as DialogOutcome, icon: 'icon-coop.svg', badge: '\u2713' as const, badgeClass: 'ok' as const };
  const oldLink = { exportLabel: S['csr.link'], exportAria: S['csr.aria.file'] };
  const warn = { icon: 'icon-coop.svg', badge: '!' as const, badgeClass: 'warn' as const }; // Art & UX P1: M4/M5, never red
  switch (n.id) {
    case 'M1': return { ...restored, title: S['csr.m1.title'], body: S['csr.m1.body'], button: S['csr.m1.button'], exportStyle: 'secondary', ...oldLink };
    case 'M2': {
      const body = n.variant === 'level' ? fill(S['csr.m2.body.level'], 'level', n.level!) : n.variant === 'age' ? fill(S['csr.m2.body.age'], 'age', formatAge(n.ageMs!, S)) : S['csr.m2.body.fallback'];
      return { ...restored, title: S['csr.m2.title'], body, button: S['csr.m2.button'], exportStyle: 'secondary', ...oldLink };
    }
    case 'M3': return { outcome: 'fresh', icon: 'char-chicken.svg', badge: '\u2605', badgeClass: 'new', title: S['csr.m3.title'], body: S['csr.m3.body'], button: S['csr.m3.button'], exportStyle: 'link', exportLabel: S['csr.m3.link'], exportAria: S['csr.aria.old'] };
    case 'M4': return { outcome: 'fresh', icon: 'icon-coop.svg', badge: '!', badgeClass: 'warn', title: S['csr.m4.title'], body: S['csr.m4.body'], button: S['csr.m4.button'], exportStyle: 'link', exportLabel: S['csr.m4.link'], exportAria: S['csr.aria.file'] };
    // G1: Continue stays primary; the Export secondary uses the AC14b storage-full layout (.rc-export-q, full width, 44px) and
    // exports the CURRENT restored farm through recovery.live(), never the corrupt bytes.
    case 'M5': return { ...restored, ...warn, title: S['csr.m5.title'], body: S['csr.m5.body'], button: S['csr.m5.button'], exportStyle: 'secondary', exportLabel: S['csr.m5.link'], exportAria: S['csr.aria.live'] };
    default: return recoveryCopy(r as Recovery);
  }
}
/** Which bytes the dialog's Export hands out, or null for no Export control (G1-G3, interface §2). */
export function exportBytes(n: RecoveryNotice | null, r: CsrRecovery, active: boolean): (() => string) | null {
  if (!active || !n) return (r.raw || r.live) ? () => (r.live ? r.live() : r.raw) : null; // today's behaviour, unchanged
  if (n.id === 'M5') return r.live ? () => r.live!() : null; // never the corrupt bytes
  if (n.id === 'M1' || n.id === 'M2') return r.copy_failed && r.raw ? () => r.raw : null;
  if (n.id === 'M3' || n.id === 'M4') return r.raw ? () => r.raw : null;
  return (r.raw || r.live) ? () => (r.live ? r.live() : r.raw) : null; // storage / cantsave: unchanged (G2)
}
export const exportName = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `eggfarm-old-save-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
};
/** Show the dialog for the loader outcome; resolves when the primary button is pressed (immediately, with nothing shown, for a null outcome).
 *  `inertEls` are made inert while it's open. */
export interface RecoveryDialogOpts { storageBlocked?: boolean; now?: number; track?: (type: string, data: Record<string, unknown>) => void; onNotice?: (n: RecoveryNotice | null) => void; }
export function showRecoveryDialog(r0: Recovery | null, asset: (f: string) => string, inertEls: HTMLElement[], onExport?: () => void, doExport?: (raw: string, name: string) => Promise<boolean>, o: RecoveryDialogOpts = {}): Promise<void> {
  const r = r0 as CsrRecovery | null;
  // M41-7: notice selection is pure (interface §2); the CSR-9 copy is used only once the loader supplies `source`.
  const notice = r ? recoveryNotice(r, { storageBlocked: !!o.storageBlocked, now: o.now ?? Date.now() }) : null;
  const active = !!r && csrCopyActive(r);
  const csr = active && !!notice; // CCR #58 m3: the CSR-9 copy is rendered (also gates the notice telemetry below)
  const c = r ? (csr ? csrCopy(notice!, r) : recoveryCopy(r0!)) : null;
  if (!r || !c) return Promise.resolve();
  o.onNotice?.(notice);
  const layer = document.createElement('div'); layer.className = 'recovery-layer'; layer.dataset.outcome = c.outcome; if (c.variant) layer.dataset.variant = c.variant;
  if (active && notice) layer.dataset.notice = notice.id;
  const bytes = exportBytes(notice, r, active);
  const canExport = !!bytes;
  const exp = canExport ? (c.exportStyle === 'secondary'
    ? `<button class="rc-export-q" id="rcExport" type="button" aria-label="${c.exportAria ?? EXPORT_ARIA}">${c.exportLabel ?? 'Export old save'}</button>`
    : `<button class="rc-link" id="rcExport" type="button" aria-label="${c.exportAria ?? EXPORT_ARIA}">${c.exportLabel ?? 'Export old save'}</button>`) : '';
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
    const current = r.cantSave || (active && notice?.id === 'M5'); // the current farm, not the old save
    let data: string; try { data = bytes!(); } catch { done(false); return; }
    void (doExport ?? exportOldSave)(data, current ? exportName(new Date()).replace('eggfarm-old-save-', 'eggfarm-save-') : exportName(new Date())).then(done, () => done(false));
  });
  go.focus();
  // Interface §3: notice telemetry through the existing telemetry layer (Game.telemetry.track, passed in by app.ts).
  if (csr) o.track?.('save_recovery_notice_shown', noticePayload(notice!, r));
  return new Promise(res => go.addEventListener('click', () => {
    if (csr) o.track?.('save_recovery_notice_dismissed', noticePayload(notice!, r));
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
