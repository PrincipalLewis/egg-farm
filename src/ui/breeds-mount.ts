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
  hatchEstimate, BREED_IDS, bc,
} from './breeds-adapter';
import {
  hatchUi, farmSoonVisible, FARM_SOON_TEXT, albumCellHtml, slotCardHtml, silhouetteImg, breedImg,
} from './breeds-ui';

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
  sheet.innerHTML = `
    <header>
      <button type="button" class="icon-btn breeds-back" data-testid="breeds-back" aria-label="Back to Upgrades"><span aria-hidden="true">‹</span></button>
      <h2>Flock</h2>
      <button type="button" class="icon-btn close breeds-close" data-testid="breeds-close" aria-label="Close"><img src="${A('icon-close.svg')}" alt=""></button>
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
  /** Last seen incubator breed id (online reveal when it clears). */
  let lastIncuBreed: string | null = null;

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
  const closeFlock = () => setOpen(false);

  entry.addEventListener('click', e => { e.stopPropagation(); openFlock(); });
  sheet.querySelector('.breeds-back')!.addEventListener('click', e => {
    e.stopPropagation(); closeFlock(); opts.openUpgrades();
  });
  sheet.querySelector('.breeds-close')!.addEventListener('click', e => {
    e.stopPropagation(); closeFlock();
  });

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
    if (!br) { body.innerHTML = ''; return; }
    const openN = openSlotCount(s, b);
    const hu = hatchUi(s, b, br);
    const est = hatchEstimate(s, b, g.breedsEstimateOverride ?? {});
    const note = farmSoonVisible(est) ? `<p class="breeds-farmsoon" data-farm-soon="1">${FARM_SOON_TEXT}</p>` : '';
    const hatchDisabled = hu.disabled ? 'true' : 'false';
    const hatchCls = hu.kind === 'affordable' || hu.kind === 'free' ? 'affordable' : '';
    const hatchAriaDesc = hu.kind === 'unaffordable'
      ? ` aria-describedby="hatch-sub"`
      : hu.kind === 'affordable' || hu.kind === 'free'
        ? ` aria-describedby="hatch-sub"`
        : '';
    const disc = br.incubator
      ? `${silhouetteImg('incu-sil')}<div class="incu-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0, Math.min(100, Math.round(100 * (1 - br.incubator.remainingMs / (bc(b, 'hatch_time_s') * 1000)))))}"><i style="width:${Math.max(0, Math.min(100, 100 * (1 - br.incubator.remainingMs / (bc(b, 'hatch_time_s') * 1000))))}%"></i></div>`
      : `${silhouetteImg('incu-sil')}`;
    const slots = [0, 1, 2].map(i => slotCardHtml(br, b, i, openN)).join('');
    const album = BREED_IDS.map(id => albumCellHtml(br, id)).join('');
    body.innerHTML = `
      <div class="incu-card">
        <div class="incu-disc">${disc}</div>
        <div class="incu-copy"><div class="incu-title">Incubator</div>
          <div class="incu-status">${br.incubator ? 'Hatching · a surprise breed' : 'Empty · 1 egg at a time'}</div></div>
        <button type="button" class="btn hatch-btn ${hatchCls}" data-act="hatch" data-testid="breeds-hatch" aria-disabled="${hatchDisabled}"${hatchAriaDesc}>${hu.label}</button>
        <p class="hatch-sub" id="hatch-sub">${hu.sub}</p>
        ${note}
      </div>
      <div class="breeds-slots" data-testid="breeds-slots" role="group" aria-label="Flock slots">${slots}</div>
      <div class="breeds-album" data-testid="breeds-album" role="group" aria-label="Breed album">${album}</div>`;

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

  const showReveal = (breedId: string) => {
    if (revealEl) return; // one card (BR-R11)
    const card = document.createElement('div');
    card.className = 'breeds-reveal' + (opts.rm() ? ' rm' : '');
    card.dataset.testid = 'breeds-reveal';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'New breed');
    const name = breedId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    card.innerHTML = `${breedImg(breedId, 'reveal-spr')}<p class="reveal-name">${name}</p><button type="button" class="btn reveal-ok" data-testid="breeds-reveal-ok">Nice!</button>`;
    document.body.append(card);
    revealEl = card;
    // Focus Nice! (UI-BR-8). Motion is CSS-only ≤400ms / RM crossfade ≤200ms; card stays until dismiss.
    (card.querySelector('.reveal-ok') as HTMLButtonElement).focus();
    const done = () => { card.remove(); if (revealEl === card) revealEl = null; g.pendingReveal = null; };
    card.querySelector('.reveal-ok')!.addEventListener('click', done);
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
    onEsc: () => { if (!open) return false; closeFlock(); return true; },
    dispose: () => { sheet.remove(); entry.remove(); if (revealEl) revealEl.remove(); if (flockSheet.isOpen) flockSheet.closeComplete(); },
  };
}


/** PR-B extension hooks. PR-A calls each registered extender after sheet/HUD sync; PR-B registers from its own modules (no app.ts edit). */
export type BreedsExt = {
  /** After PR-A sync/render; mount Present chip, BB strip, yard. */
  onSync?(ctx: { g: Game; b: Balance; s: Game['state']; flockOpen: boolean; docked: boolean }): void;
  onDispose?(): void;
};
const _ext: BreedsExt[] = [];
export function registerBreedsExt(ext: BreedsExt): void { _ext.push(ext); }

export type BreedsHandle = FlockMount & { registerExt: typeof registerBreedsExt };

/**
 * PR-A single app.ts entry: flag-off → null. PR-B mounts only via registerBreedsExt / handle.registerExt —
 * no further app.ts edits required for Present chip / BB strip / yard.
 */
export function mountBreeds(app: Parameters<typeof mountFlock>[0]): BreedsHandle | null {
  const flock = mountFlock(app);
  if (!flock) return null;
  const fire = (s: Game['state'], flockOpen: boolean) => {
    for (const e of _ext) e.onSync?.({ g: app.g, b: app.b, s, flockOpen, docked: app.docked.matches });
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
      for (const e of _ext) e.onDispose?.();
      flock.dispose();
    },
    registerExt: registerBreedsExt,
  };
  return handle;
}
