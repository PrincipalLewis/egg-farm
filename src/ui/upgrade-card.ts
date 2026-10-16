// rc1-upgrade-clarity-spec v0.4 §2(g): UC24 nav tab choice, UC26 unchanged before→after lines.
export type UpTab = 'collection' | 'farm' | 'workers';
/** UC24: nav "Upgrades" opens the hinted tab when a hint is shown, else the last-used tab. */
export const navUpgradesTab = (hint: { key: unknown; state: string; tab: UpTab } | null | undefined, last: UpTab): UpTab =>
  hint && hint.key && hint.state !== 'done' && hint.state !== 'refill' ? hint.tab : last;
/** UC26: a before→after line whose values are equal is not rendered (at max level only the current value shows, so it stays). */
export const changedLine = (label: string, a: string, z: string, max: boolean, arrow: (a: string, z: string) => string): string | null =>
  !max && a === z ? null : `${label}${arrow(a, z)}`;
/** UC26: all lines equal → "No stat change". */
export const fxOrNoChange = (lines: (string | null)[], extra = false): string[] => { const l = lines.filter((x): x is string => x != null); return l.length || extra ? l : ['No stat change']; };
