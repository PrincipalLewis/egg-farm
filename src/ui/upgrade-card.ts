// rc1-upgrade-clarity-spec v0.4 §2(g): UC24 nav tab choice, UC26 unchanged before→after lines.
export type UpTab = 'collection' | 'farm' | 'workers';
/** UC24: nav "Upgrades" opens the hinted tab when a hint is shown, else the last-used tab. */
/** A hint counts only while the player can see it (not during the FTUE before the strip appears). The Refill hint
 *  ("★ X · Refill") is a hint too and opens its tab (workers). Review #5. */
export const navUpgradesTab = (hint: { key: unknown; state: string; tab: UpTab } | null | undefined, last: UpTab, visible = true): UpTab =>
  visible && hint && hint.key && hint.state !== 'done' ? hint.tab : last;
/** UC26: a before→after line whose values are equal is not rendered (at max level only the current value shows, so it stays). */
export const changedLine = (label: string, a: string, z: string, max: boolean, arrow: (a: string, z: string) => string): string | null =>
  !max && a === z ? null : `${label}${arrow(a, z)}`;
/** UC26: all lines equal → "No stat change". */
export const fxOrNoChange = (lines: (string | null)[], extra = false): string[] => { const l = lines.filter((x): x is string => x != null); return l.length || extra ? l : ['No stat change']; };
/** B-3 (rc2-notes-b2-b3.md §B-3 mock v2): compact Farm card helpers. */
export const FARM_FX_LABELS = { hens: 'Hens ', every: 'Every ', coop: 'Coop ', price: 'Price ', demand: 'Demand ' } as const;
/** Screen-reader text for the customer-interval line (icon + "Every a → b s" is visual only). */
export const customerEveryAria = (a: number | string, z: number | string, max = false) =>
  max ? `Customers arrive every ${a} s` : `Customers arrive every ${a} s, next ${z} s`;
/** Payback chip: visual short form "~3 min 43 s" (clock icon); SR keeps "Pays back in about 3 min 43 s". */
export const paybackChip = (t: string) => { const bare = t.replace(/^~\s*/, ''); return { short: `~${bare}`, aria: `Pays back in about ${bare}` }; };
/** Title row level tag, e.g. "L6/30". */
export const levelTag = (L: number, max: number) => `L${L}/${max}`;
/** Title-row level tag: visual "L6/30" hidden from SR, SR reads "Level 6 of 30" (no aria-label on a generic span; review ec0f1b3 #4). */
export const levelTagHtml = (L: number, max: number) => `<span class="lv"><span class="lvv" aria-hidden="true">${levelTag(L, max)}</span><span class="sr">Level ${L} of ${max}</span></span>`;
/** The "Every a → b s" fx <li> with the customer icon; aria on the listitem (review ec0f1b3 #6: no in-band signalling). Null when unchanged. */
export const farmEveryLi = (a: number, z: number, max: boolean, icon: string): string | null =>
  !max && a === z ? null : `<li class="every" aria-label="${customerEveryAria(a, z, max)}"><img class="fxi" src="${icon}" alt="">${FARM_FX_LABELS.every}${max ? `${a}s` : `${a} <span class="arrow">→</span> ${z}s`}</li>`;
