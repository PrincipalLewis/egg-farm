/**
 * M5.1 Flock UI mount (PR-A). Wired from mountApp; flag-off is a no-op.
 * Attendance: phone sheet uses registerSheet('flock'); docked overlay does NOT
 * (Q-UI-10 / BR-AC49 — focus keeps running while docked Flock is open).
 */
import type { Balance } from '../config/balance';
import type { Game } from '../game';
import { registerSheet } from './overlay';
import {
  breedsFlagOn, flockUnlocked, breedsOf, openSlotCount, freeHatchAvailable,
  hatchEstimate, BREED_IDS, bc, incomeRate, isBreedId,
} from './breeds-adapter';
import {
  hatchUi, farmSoonVisible, FARM_SOON_TEXT, albumCellHtml, slotCardHtml, silhouetteImg, breedImg,
  activeTotalsText, revealCopy,
} from './breeds-ui';
import {
  registerBreedsExt, clearBreedsExtForTests, breedsExtCountForTests, breedsExtList,
  type BreedsExt, type BreedsExtCtx,
} from './breeds-ext-registry';

export type FlockUiFlags = {
  flockOpened?: boolean;       // sheet opened once → never highlight again
  flockHighlightArmed?: boolean; // glow/dot pending
  flockHighlightSession?: number; // session index when F10 seen with coach undismissed
};

const A = (f: string) => `${import.meta.env.BASE_URL}assets/${f}`;

export interface FlockMount {
  /** Sync entry visibility / highlight / icon-only with Refill. Call every render. */
  syncEntry(s: Game['state'], flags: FlockUiFlags, sessions: number): void;
  open(): void;
  close(): void;
  readonly isOpen: boolean;
  /** Render sheet body from state. */
  render(): void;
  /** After welcome-back closes: show pendingReveal card if set. */
  onWelcomeClosed(): void;
  /** Esc handler: returns true if it closed the flock sheet. */
  onEsc(): boolean;
  dispose(): void;
}

/** Selector that re-finds `el` after a body rewrite (data-testid + slot/breed), or null when focus is outside `root`. */
function focusKey(el: Element | null, root: HTMLElement): string | null {
  if (!el || !root.contains(el) || !(el instanceof HTMLElement)) return null;
  const t = el.dataset.testid; if (!t) return el.classList.contains('album-cell') && el.dataset.breed ? `.album-cell[data-breed="${el.dataset.breed}"]` : (el.dataset.slot !== undefined && el.classList.contains('slot') ? `.slot[data-slot="${el.dataset.slot}"]` : null);
  const slot = el.dataset.slot !== undefined ? `[data-slot="${el.dataset.slot}"]` : '';
  return `[data-testid="${t}"]${slot}`;
}

export function mountFlock(opts: {
  g: Game;
  b: Balance;
  upHeader: HTMLElement;
  panelLayer: HTMLElement;
  docked: { matches: boolean; addEventListener?: (t: string, fn: () => void) => void };
  /** Close upgrades/market panels when opening flock on phone. */
  closeOtherPanels: () => void;
  /** Open upgrades after ‹ back. */
  openUpgrades: () => void;
  sfx: (k: string) => void;
  rm: () => boolean;
  saveFlags: () => void;
  getFlags: () => FlockUiFlags;
  dirty: () => void;
}): FlockMount | null {
  if (!breedsFlagOn(opts.b)) return null;
  const { g, b, upHeader, panelLayer, docked } = opts;
  const sheet = document.createElement('section');
  sheet.id = 'breeds-sheet';
  sheet.dataset.testid = 'breeds-sheet';
  sheet.className = 'sheet breeds-sheet';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', 'Flock');
  // BR-UI-35: role=dialog drops <section> semantics, so a bare <header> would be a 2nd banner landmark
  // (axe landmark-no-duplicate-banner) → role="none". The Close is not `.close`: the docked `.sheet .close{display:none}`
  // rule hid it (0×0, BR-UI-07) and the panel-layer `.close` click handler is the Upgrades/Market one.
  sheet.innerHTML = `
    <header role="none">
      <button type="button" class="icon-btn breeds-back" data-testid="breeds-back" aria-label="Back to Upgrades"><span aria-hidden="true">‹</span></button>
      <h2>Flock</h2>
      <button type="button" class="icon-btn breeds-close" data-testid="breeds-close" aria-label="Close"><img src="${A('icon-close.svg')}" alt=""></button>
    </header>
    <div class="body breeds-body" id="breeds-body" data-testid="breeds-body"></div>`;
  panelLayer.append(sheet);

  const entry = document.createElement('button');
  entry.type = 'button';
  entry.id = 'breeds-entry';
  entry.dataset.testid = 'breeds-entry';
  entry.className = 'btn secondary breeds-entry';
  entry.setAttribute('aria-haspopup', 'dialog');
  entry.innerHTML = `<img src="${A('char-chicken.svg')}" alt="" width="22" height="22"><span class="breeds-lbl">Flock</span>`;
  // Detached until F ≥ unlock (syncEntry places it).

  const flockSheet = registerSheet('flock');
  let open = false;
  let pickBreed: string | null = null; // album tap → place into next empty / selected slot
  let revealEl: HTMLElement | null = null;
  let revealReturn: HTMLElement | null = null;
  /** Last seen incubator breed id (online reveal when it clears). */
  let lastIncuBreed: string | null = null;
  /** Last body markup written (per-frame render diff). */
  let lastBodyHtml = '';

  const setOpen = (v: boolean) => {
    if (open === v) return;
    open = v;
    sheet.hidden = !v;
    panelLayer.classList.toggle('breeds-open', v);
    if (v) {
      opts.sfx('uiOpen');
      // Phone: hold focus via registerSheet. Docked: do not (Q-UI-10).
      if (!docked.matches) flockSheet.opened();
      const f = opts.getFlags();
      if (!f.flockOpened) { f.flockOpened = true; f.flockHighlightArmed = false; opts.saveFlags(); }
      entry.classList.remove('breeds-glow', 'breeds-dot');
    } else {
      opts.sfx('uiClose');
      if (flockSheet.isOpen) flockSheet.closeComplete();
    }
    opts.dirty();
  };

  const openFlock = () => {
    if (!flockUnlocked(g.state, b)) return;
    opts.closeOtherPanels();
    setOpen(true);
    renderBody();
    // OQ-5: pendingReveal while sheet was closed → show on next open (welcome path also calls showReveal).
    const rid = g.pendingReveal;
    if (rid && !revealEl) showReveal(rid);
  };
  /** BR-UI-06/07 (Art §2 "Focus returns to the Flock entry on close"). Phone Close/Esc/scrim also hide Upgrades (the entry's
   *  container), so the entry can't take focus; its invoker, the Upgrades nav button, gets it instead (spec ruling asked). */
  /** Docked, #p-upgrades keeps its `hidden` attribute but is shown (`.sheet[hidden]{display:flex!important}`). */
  const canFocus = (el: HTMLElement) => el.isConnected && !el.hidden && (docked.matches || !el.closest('[hidden]'));
  const returnFocus = () => {
    if (canFocus(entry)) entry.focus();
    if (document.activeElement !== entry) (document.querySelector('nav [data-nav="upgrades"]') as HTMLElement | null)?.focus();
  };
  const closeFlock = () => {
    const was = open;
    setOpen(false);
    pickBreed = null;
    if (was) returnFocus();
  };

  entry.addEventListener('click', e => { e.stopPropagation(); openFlock(); });
  sheet.querySelector('.breeds-back')!.addEventListener('click', e => {
    e.stopPropagation(); setOpen(false); pickBreed = null; opts.openUpgrades(); returnFocus();
  });
  sheet.querySelector('.breeds-close')!.addEventListener('click', e => {
    e.stopPropagation(); closeFlock();
  });
  // Phone: the shared scrim closes Flock like Upgrades (Art §2). app.ts' scrim handler no-ops (no Upgrades/Market open).
  const scrim = panelLayer.querySelector('.scrim');
  const onScrim = (e: Event) => { if (open && !docked.matches) { e.stopPropagation(); closeFlock(); } };
  scrim?.addEventListener('click', onScrim);

  const placeEntry = () => {
    if (entry.parentNode) return;
    const closeBtn = upHeader.querySelector('.close');
    if (closeBtn) upHeader.insertBefore(entry, closeBtn);
    else upHeader.append(entry);
  };
  const syncEntry = (s: Game['state'], flags: FlockUiFlags, sessions: number) => {
    const show = flockUnlocked(s, b);
    if (!show) {
      entry.remove(); // BR-AC3 / UI-BR-1: no entry node at F<10 (not merely hidden)
      setOpen(false);
      return;
    }
    placeEntry();
    entry.hidden = false;

    // Icon-only when docked Refill pill is visible in the same header (UI-BR-15)
    const refillInHeader = docked.matches && !!upHeader.querySelector('.nav-manage:not([hidden])');
    entry.classList.toggle('icon-only', refillInHeader);
    const lbl = entry.querySelector('.breeds-lbl') as HTMLElement | null;
    if (lbl) lbl.hidden = refillInHeader;
    if (refillInHeader) entry.setAttribute('aria-label', 'Flock');
    else entry.removeAttribute('aria-label');

    // Highlight BR-AC3b / UI-BR-2
    const coachSeen = s.abilitiesCoachSeen === true;
    if (flags.flockOpened) {
      entry.classList.remove('breeds-glow', 'breeds-dot');
      return;
    }
    if (!coachSeen) {
      // Arm fallback for next session if F10 already reached
      if (flags.flockHighlightSession === undefined) {
        flags.flockHighlightSession = sessions;
        opts.saveFlags();
      } else if (sessions > (flags.flockHighlightSession ?? 0)) {
        flags.flockHighlightArmed = true;
        opts.saveFlags();
      }
      if (!flags.flockHighlightArmed) {
        entry.classList.remove('breeds-glow', 'breeds-dot');
        return;
      }
    } else {
      flags.flockHighlightArmed = true;
    }
    if (flags.flockHighlightArmed && !flags.flockOpened) {
      entry.classList.add('breeds-dot');
      // one-shot glow class for CSS animation
      if (!entry.classList.contains('breeds-glow-done')) {
        entry.classList.add('breeds-glow');
        window.setTimeout(() => { entry.classList.remove('breeds-glow'); entry.classList.add('breeds-glow-done'); }, 1200);
      }
    }
  };

  const renderBody = () => {
    const s = g.state;
    const br = breedsOf(s, b);
    const body = sheet.querySelector('#breeds-body') as HTMLElement;
    if (!br) { body.innerHTML = ''; lastBodyHtml = ''; return; }
    const openN = openSlotCount(s, b);
    const hu = hatchUi(s, b, br);
    const est = hatchEstimate(s, b, g.breedsEstimateOverride ?? {});
    const showNote = farmSoonVisible(est);
    // BR-UI-14 / UI-BR-22: #hatch-fs under #hatch-sub, in the Hatch describedby while shown (§7b `hatch-sub hatch-fs …`); not live.
    const note = showNote ? `<p class="breeds-farmsoon" id="hatch-fs" data-testid="breeds-farmsoon" data-farm-soon="1">${FARM_SOON_TEXT}</p>` : '';
    const hatchDisabled = hu.disabled ? 'true' : 'false';
    const hatchCls = hu.kind === 'affordable' || hu.kind === 'free' ? 'affordable' : '';
    // Label-in-name: accessible name = visible label (no aria-label). Time/hint via describedby.
    const hatchAriaDesc = ` aria-describedby="hatch-sub${showNote ? ' hatch-fs' : ''}"`;
    const disc = br.incubator
      ? `${silhouetteImg('incu-sil')}<div class="incu-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0, Math.min(100, Math.round(100 * (1 - br.incubator.remainingMs / (bc(b, 'hatch_time_s') * 1000)))))}"><i style="width:${Math.max(0, Math.min(100, 100 * (1 - br.incubator.remainingMs / (bc(b, 'hatch_time_s') * 1000))))}%"></i></div>`
      : `${silhouetteImg('incu-sil')}`;
    const slots = [0, 1, 2].map(i => slotCardHtml(br, b, i, openN)).join('');
    const album = BREED_IDS.map(id => albumCellHtml(br, id)).join('');
    const html = `
      <div class="incu-card">
        <div class="incu-disc">${disc}</div>
        <div class="incu-copy"><div class="incu-title">Incubator</div>
          <div class="incu-status">${br.incubator ? 'Hatching · a surprise breed' : 'Empty · 1 egg at a time'}</div></div>
        ${hu.kind === 'complete'
          // BR-UI-13 (b): yolk label pill like `.maxed`, not focusable, not a button.
          ? `<span class="maxed hatch-btn hatch-complete" data-testid="breeds-hatch"${hatchAriaDesc}>${hu.label}</span>`
          : `<button type="button" class="btn hatch-btn ${hatchCls}" data-act="hatch" data-testid="breeds-hatch" aria-disabled="${hatchDisabled}"${hatchAriaDesc}>${hu.label}</button>`}
        <p class="hatch-sub" id="hatch-sub">${hu.sub}</p>
        ${note}
      </div>
      <div class="breeds-slots" data-testid="breeds-slots" role="group" aria-label="Flock slots">${slots}</div>
      <p class="breeds-totals" data-testid="breeds-totals">${activeTotalsText(s, b, br)}</p>
      <div class="breeds-album" data-testid="breeds-album" role="group" aria-label="Breed album">${album}</div>`;
    // render() runs every frame: rewrite only when the markup changed (pickBreed is a class toggle, kept below), and put
    // keyboard focus back on the same control after a rewrite (BR-UI-06 focus order; countdowns change once a second).
    const pickedKey = pickBreed;
    if (html === lastBodyHtml && body.childElementCount) return;
    lastBodyHtml = html;
    const fk = focusKey(document.activeElement, body);
    body.innerHTML = html;
    if (pickedKey) body.querySelectorAll('.album-cell').forEach(c => c.classList.toggle('picked', (c as HTMLElement).dataset.breed === pickedKey));
    if (fk) (body.querySelector(fk) as HTMLElement | null)?.focus();

    // Wire hatch
    const hb = body.querySelector('.hatch-btn') as HTMLButtonElement | null;
    hb?.addEventListener('click', e => {
      e.stopPropagation();
      if (hu.disabled) return;
      const before = g.state.coinsCents;
      g.dispatch({ type: 'hatch' });
      if (g.state.coinsCents === before && !freeHatchAvailable(br) && hu.kind !== 'free') {
        hb.classList.add('shake'); window.setTimeout(() => hb.classList.remove('shake'), 300);
      }
      opts.dirty();
      renderBody();
    });
    // OQ-6: album select → tap open/empty/settling/filled slot to place; Remove clears.
    body.querySelectorAll('.slot-remove').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const slot = Number((el as HTMLElement).dataset.slot);
        if (!Number.isInteger(slot) || slot < 0 || slot >= openN) return;
        g.dispatch({ type: 'placeBreed', slot, id: null });
        pickBreed = null;
        opts.dirty();
        renderBody();
      });
    });
    body.querySelectorAll('.slot').forEach(el => {
      el.addEventListener('click', e => {
        if ((e.target as HTMLElement).closest('.slot-remove')) return;
        e.stopPropagation();
        const slot = Number((el as HTMLElement).dataset.slot);
        if (!Number.isInteger(slot) || slot < 0 || slot >= openN) return;
        if (!pickBreed) return;
        g.dispatch({ type: 'placeBreed', slot, id: pickBreed });
        pickBreed = null;
        opts.dirty();
        renderBody();
      });
    });
    body.querySelectorAll('.album-cell.owned').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        pickBreed = (el as HTMLElement).dataset.breed ?? null;
        body.querySelectorAll('.album-cell').forEach(c => c.classList.toggle('picked', c === el));
      });
    });
  };

  const closeReveal = () => {
    const card = revealEl;
    if (!card) return false;
    card.remove(); revealEl = null; g.pendingReveal = null;
    // Focus back where it was (Hatch / entry), else into the open sheet, else the entry.
    const back = revealReturn && canFocus(revealReturn) ? revealReturn : null;
    revealReturn = null;
    if (back) back.focus();
    else if (open) (sheet.querySelector('[data-testid="breeds-hatch"]') as HTMLElement | null)?.focus();
    else returnFocus();
    opts.dirty();
    return true;
  };
  const showReveal = (breedId: string) => {
    if (revealEl) return; // one card (BR-R11)
    const br = breedsOf(g.state, b);
    const c = br && isBreedId(breedId) ? revealCopy(br, breedId, b) : null;
    const wrap = document.createElement('div');
    wrap.className = 'breeds-reveal' + (opts.rm() ? ' rm' : '');
    wrap.dataset.testid = 'breeds-reveal';
    const name = c?.name ?? breedId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const stars = c ? [0, 1].map(i => `<span class="star${i < c.stars ? ' on' : ''}">★</span>`).join('') : '';
    // Art §4: scrim + 320-wide card (role=dialog, aria-modal), kicker → stage → name → rarity·family → stars → trait → placement → Nice!.
    wrap.innerHTML = `<div class="reveal-card" role="dialog" aria-modal="true" aria-labelledby="reveal-kicker reveal-name">
      ${c ? `<p class="reveal-kicker" id="reveal-kicker">${c.kicker}</p>` : ''}
      <div class="reveal-stage">${breedImg(breedId, 'reveal-spr')}</div>
      <p class="reveal-name" id="reveal-name">${name}</p>
      ${c ? `<p class="reveal-meta">${c.meta}</p><p class="reveal-stars" aria-hidden="true">${stars}</p><span class="sr">${c.stars} of 2 stars</span><p class="reveal-trait">${c.trait}</p>` : ''}
      ${c?.placement ? `<p class="reveal-place">${c.placement}</p>` : ''}
      <button type="button" class="btn reveal-ok" data-testid="breeds-reveal-ok">Nice!</button>
    </div>`;
    const active = document.activeElement as HTMLElement | null;
    revealReturn = active && active !== document.body ? active : null;
    document.body.append(wrap);
    revealEl = wrap;
    const ok = wrap.querySelector('.reveal-ok') as HTMLButtonElement;
    // Focus Nice! (UI-BR-8). Motion is CSS-only ≤400ms / RM crossfade ≤200ms; card stays until dismiss.
    ok.focus();
    ok.addEventListener('click', e => { e.stopPropagation(); closeReveal(); });
    // Scrim tap closes (Art §4); taps on the card itself do not.
    wrap.addEventListener('click', e => { if (e.target === wrap) { e.stopPropagation(); closeReveal(); } });
    // Modal focus containment: Nice! is the only control, so Tab / Shift+Tab stay on it.
    wrap.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); ok.focus(); } });
  };

  /** Online hatch complete (no pendingReveal): detect incubator clear → show card if sheet open or queue via pendingReveal. */
  const watchOnlineReveal = () => {
    const br = breedsOf(g.state, b);
    const cur = br?.incubator && br.incubator.remainingMs > 0 ? (br.incubator.breed as string) : null;
    if (lastIncuBreed && !cur) {
      const id = lastIncuBreed;
      lastIncuBreed = null;
      if (open) showReveal(id);
      else if (!g.pendingReveal) g.pendingReveal = id as any; // OQ-5 queue until next sheet open / welcome
    } else if (cur) {
      lastIncuBreed = cur;
    }
  };

  return {
    syncEntry: (s, flags, sessions) => { syncEntry(s, flags, sessions); watchOnlineReveal(); },
    open: openFlock,
    close: closeFlock,
    get isOpen() { return open; },
    render: () => { watchOnlineReveal(); if (open) renderBody(); },
    onWelcomeClosed: () => { const id = g.pendingReveal; if (id) showReveal(id); },
    // BR-UI-21: Esc closes the reveal card first (it sits above the sheet); the next Esc closes the sheet.
    onEsc: () => { if (closeReveal()) return true; if (!open) return false; closeFlock(); return true; },
    dispose: () => { scrim?.removeEventListener('click', onScrim); sheet.remove(); entry.remove(); if (revealEl) revealEl.remove(); if (flockSheet.isOpen) flockSheet.closeComplete(); },
  };
}


/** Re-export registry API so existing `from './breeds-mount'` imports keep working.
 *  Ext modules MUST import from `./breeds-ext-registry` only (leaf — no TDZ cycle). */
export {
  registerBreedsExt, clearBreedsExtForTests, breedsExtCountForTests, breedsExtList,
  type BreedsExt, type BreedsExtCtx,
} from './breeds-ext-registry';

export type BreedsHandle = FlockMount & { registerExt: typeof registerBreedsExt };

export type MountBreedsOpts = Parameters<typeof mountFlock>[0] & {
  /** Rolling ¢/s from app's `IncomeRate` (BB-5). Required when flag on. */
  rollingIncomeRate: () => number;
};

/**
 * PR-A single app.ts entry: flag-off → null (no ext glob). Flag-on → mountFlock, then
 * eager-load `./breeds-ext-*.ts` (zero matches in PR-A is fine). Ext modules register via
 * the leaf `breeds-ext-registry` (not this file) so the eager glob cannot TDZ.
 */
export function mountBreeds(app: MountBreedsOpts): BreedsHandle | null {
  const flock = mountFlock(app);
  if (!flock) return null;
  // Naming rule: src/ui/breeds-ext-*.ts. Eager so modules can registerBreedsExt at import time.
  // Modules import ONLY breeds-ext-registry (leaf).
  import.meta.glob(['./breeds-ext-*.ts', '!./breeds-ext-registry.ts'], { eager: true });
  const fire = (s: Game['state'], flockOpen: boolean) => {
    const ctx: BreedsExtCtx = {
      g: app.g, b: app.b, s, flockOpen, docked: app.docked.matches,
      openFlock: () => flock.open(),
      incomeRate: () => incomeRate(app.g.state, app.b),
      rollingIncomeRate: () => app.rollingIncomeRate(),
      reducedMotion: app.rm(),
    };
    for (const e of breedsExtList()) e.onSync?.(ctx);
  };
  const handle: BreedsHandle = {
    syncEntry(s, flags, sessions) {
      flock.syncEntry(s, flags, sessions);
      fire(s, flock.isOpen);
    },
    open: () => flock.open(),
    close: () => flock.close(),
    get isOpen() { return flock.isOpen; },
    render() {
      flock.render();
      fire(app.g.state, flock.isOpen);
    },
    onWelcomeClosed: () => flock.onWelcomeClosed(),
    onEsc: () => flock.onEsc(),
    dispose() {
      for (const e of breedsExtList()) e.onDispose?.();
      flock.dispose();
    },
    registerExt: registerBreedsExt,
  };
  return handle;
}
