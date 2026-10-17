/** Display formatters (layout-spec §1, feature-spec F7). Pure; unit-tested. */
const TIERS: [number, string][] = [[1e3, 'K'], [1e6, 'M'], [1e9, 'B'], [1e12, 'T']];
/** Full digits under 1,000,000 (spec v0.3.1 C-AC39); from 1M: round first, then pick the suffix (BUG-3, never "1000M"); 2 decimals under 10, else 1. */
export const fmtCount = (n: number) => {
  n = Math.floor(n);
  if (n < 1e6) return n.toLocaleString('en-US'); // spec v0.3.1 C-AC39: full digits under 1,000,000
  let i = TIERS.length - 1; while (i > 0 && n < TIERS[i][0]) i--;
  for (;; i++) {
    const [d, u] = TIERS[i], v = n / d, dp = i === 0 || v >= 10 ? 1 : 2, r = v.toFixed(dp);
    if (+r >= 1000 && i < TIERS.length - 1) continue;
    return r.replace(/\.?0+$/, '') + u;
  }
};
/** HUD coins (offline-popup-v2 §2 Number format, Art & UX Q2): cents under $1,000 ("$812.40"), whole dollars (floored)
 *  from $1,000 to $999,999 ("$10,412"), short form from $1M ("$1.23M"). Rendered with tabular numerals. */
export const fmtMoney = (cents: number) => {
  const d = cents / 100;
  if (d < 1000) return '$' + d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (d < 1e6) return '$' + Math.floor(d).toLocaleString('en-US');
  return '$' + fmtCount(d);
};
/** Deficits ("Need $X more"): same format, rounded UP from $1,000 so earning the shown amount always affords it. */
export const fmtMoneyCeil = (cents: number) => cents / 100 >= 1000 ? fmtMoney(Math.ceil(cents / 100) * 100) : fmtMoney(cents); // ceil first, then format ($999,999.01 -> $1M)
/** Welcome-back popup money: never abbreviated. Cents under $1,000, whole dollars (floored) from $1,000 ("$3,703,701"). */
export const fmtMoneyFull = (cents: number) => {
  if (!Number.isFinite(cents)) return '—';
  const d = cents / 100;
  if (d < 1000) return '$' + d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + Math.floor(d).toLocaleString('en-US');
};
/** Same amount spelled for screen readers: "86,400 dollars" / "812 dollars 40 cents". */
export const moneyWords = (cents: number) => {
  if (!Number.isFinite(cents)) return 'unknown';
  cents = Math.round(cents); const d = cents / 100;
  if (d >= 1000) return `${Math.floor(d).toLocaleString('en-US')} dollars`;
  const w = Math.floor(d), c = Math.round(cents) % 100;
  const cw = `${c} ${c === 1 ? 'cent' : 'cents'}`;
  return w === 0 && c ? cw : `${w.toLocaleString('en-US')} ${w === 1 ? 'dollar' : 'dollars'}${c ? ` ${cw}` : ''}`;
};
/** Full-digit egg count with separators (popup: no K/M/B). */
export const fmtEggsFull = (n: number) => Math.floor(n).toLocaleString('en-US');
const DUR: [number, string, string][] = [[86400, 'd', 'day'], [3600, 'h', 'hour'], [60, 'm', 'minute'], [1, 's', 'second']];
/** Real elapsed time, two most significant units, a zero second unit dropped: "11m 11s", "3h 12m", "2d 4h", "2h".
 *  words=true spells it for screen readers: "3 hours 12 minutes". */
export const fmtDuration = (s: number, words = false) => {
  s = Math.max(0, Math.floor(s));
  let i = DUR.findIndex(([u]) => s >= u); if (i < 0) i = DUR.length - 1;
  const one = (v: number, a: string, w: string) => words ? `${v} ${w}${v === 1 ? '' : 's'}` : `${v}${a}`;
  const [u1, a1, w1] = DUR[i], parts = [one(Math.floor(s / u1), a1, w1)];
  if (i < DUR.length - 1) { const [u2, a2, w2] = DUR[i + 1], v2 = Math.floor((s % u1) / u2); if (v2) parts.push(one(v2, a2, w2)); }
  return parts.join(' ');
};
/** @deprecated rc1 copy ("2h+" at cap); popup v2 uses fmtDuration. Kept for older tests. */
export const fmtAway = (s: number, capS: number) => {
  if (s >= capS) return `${Math.floor(capS / 3600)}h+`;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : m ? `${m}m` : `${Math.floor(s)}s`;
};
/** F7: <10 min "~1 min 5 s"/"~45 s"; 10-60 min nearest whole min; >=60 min "~1 h 5 min"; no income "—". */
export const fmtTimeToAfford = (seconds: number | null) => {
  if (seconds === null || !isFinite(seconds)) return '—';
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return `~${s} s`;
  if (s < 600) { const m = Math.floor(s / 60), r = s % 60; return r ? `~${m} min ${r} s` : `~${m} min`; }
  if (s < 3600) return `~${Math.round(s / 60)} min`;
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return m ? `~${h} h ${m} min` : `~${h} h`;
};
/** Rolling income over the last windowMs of play (coins/s), for the time-to-afford hint. */
export class IncomeRate {
  private ev: { t: number; cents: number }[] = [];
  constructor(private windowMs = 60_000) {}
  add(t: number, cents: number) { this.ev.push({ t, cents }); }
  centsPerSec(now: number) {
    this.ev = this.ev.filter(e => now - e.t <= this.windowMs);
    const total = this.ev.reduce((a, e) => a + e.cents, 0); return total / (this.windowMs / 1000);
  }
  secondsToAfford(now: number, needCents: number) { const r = this.centsPerSec(now); return needCents <= 0 ? 0 : r > 0 ? needCents / r : null; }
}
/** Art & UX compact money for pops/cards: "$12.50" under $1,000, then "$1.2K" / "$3.4M".
 *  Default floors to 1 decimal (never above the true amount). Pass round:'nearest' only if a call site needs it. */
export const fmtMoneyShort = (cents: number, opts?: { round?: 'floor' | 'nearest' }) => {
  const d = cents / 100; if (d < 1000) return fmtMoney(cents);
  const [v, u] = d >= 1e12 ? [d / 1e12, 'T'] : d >= 1e9 ? [d / 1e9, 'B'] : d >= 1e6 ? [d / 1e6, 'M'] : [d / 1e3, 'K'];
  const q = (opts?.round ?? 'floor') === 'nearest' ? Math.round(v * 10) / 10 : Math.floor(v * 10) / 10;
  return '$' + q.toFixed(1).replace(/\.0$/, '') + u;
};
/** Sell-button preview only (HoP 15:14): exact under $1K; at $1K+ short form floored so the button never shows more than the credit. */
export const fmtMoneyPreview = (cents: number) => fmtMoneyShort(cents, { round: 'floor' });
/** Always exact (aria / popup / Thanks): full dollars, thousands separators, 2 decimals. '—' for NaN/Infinity. */
export const fmtMoneyExact = (cents: number) => {
  if (!Number.isFinite(cents)) return '—';
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
