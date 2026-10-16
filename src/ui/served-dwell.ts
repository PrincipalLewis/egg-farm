/**
 * S2-3a (MK-16..MK-20): a fully served customer's card stays `served_dwell_ms` showing "Thanks! +$X", then leaves.
 * Presentation only: driven by sim events, never feeds back into the sim (MK-20), never tappable / sellable (MK-18),
 * never counted toward queue_max (MK-17). Pure and clock-injected so it is unit-testable.
 */
export interface Dwell { id: number; cents: number; until: number; drawn?: boolean }
export class ServedDwell {
  private earned = new Map<number, number>(); private list: Dwell[] = [];
  constructor(public dwellMs: number) {}
  /** sim 'sell' event: accumulate what this customer paid. */
  sold(id: number, cents: number) { this.earned.set(id, (this.earned.get(id) ?? 0) + cents); }
  /** sim 'customer_served' event at time `now`. */
  served(id: number, now: number) { this.list.push({ id, cents: this.earned.get(id) ?? 0, until: now + this.dwellMs }); this.earned.delete(id); }
  /** sim customer left without being served: forget partial earnings. */
  gone(id: number) { this.earned.delete(id); }
  /**
   * Product ruling (Oct 16): place dwelling cards into `free` strip slots (after the waiting customers).
   * A card that has never been drawn and finds no free slot leaves right away: it is returned in `popped`
   * (UI shows only a "+$X" number pop) and never appears later. Drawn cards keep showing while room remains;
   * if waiting customers take the room back, the card ends early (no second pop).
   */
  layout(now: number, free: number, expired?: (d: Dwell) => void): { shown: Dwell[]; popped: Dwell[] } {
    const shown: Dwell[] = [], popped: Dwell[] = [];
    for (const d of this.active(now, expired)) {
      if (shown.length < free) { d.drawn = true; shown.push(d); }
      else if (!d.drawn) popped.push(d);
    }
    const drop = new Set([...popped, ...this.list.filter(d => d.drawn && !shown.includes(d))]);
    this.list = this.list.filter(d => !drop.has(d));
    return { shown, popped };
  }
  /** Cards still dwelling at `now` (oldest first); expired ones are dropped and returned via `expired`. */
  active(now: number, expired?: (d: Dwell) => void): Dwell[] {
    const keep: Dwell[] = []; for (const d of this.list) (now < d.until ? keep : (expired?.(d), null)) && keep.push(d);
    this.list = keep; return keep;
  }
}
