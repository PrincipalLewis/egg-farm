/** Display formatters (layout-spec §1, feature-spec F7). Pure; unit-tested. */
const TIERS: [number, string][] = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
/** FMT-1/FMT-2: integer rounding (9,995,000 -> 10M, not float 9.99M), a tier that rounds to 1000 rolls up (999,950 -> 1M), T tier, '—' for NaN/Infinity. */
export const fmtCount = (n: number): string => {
  if (!Number.isFinite(n)) return '—';
  n = Math.floor(n);
  if (n < 1e4) return n.toLocaleString('en-US');
  for (let i = 0; i < TIERS.length; i++) {
    const [base, u] = TIERS[i]; if (n < base) continue;
    const dp = u === 'K' || n >= base * 10 ? 1 : 2, v = Math.round(n / (base / 10 ** dp)) / 10 ** dp;
    if (v >= 1000 && i > 0) /* TIERS[i-1] is the next larger tier */ return (Math.round(n / (TIERS[i - 1][0] / 100)) / 100).toFixed(2).replace(/\.?0+$/, '') + TIERS[i - 1][1];
    return (v >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(dp).replace(/\.?0+$/, '')) + u;
  }
  return n.toLocaleString('en-US'); // unreachable for n >= 1e4 (K matches); keeps the return type total
};
/** Coins: always 2 decimals under 1K ($12.40), "$1,234.50" under 10K, then $12.3K / $1.2M. */
export const fmtMoney = (cents: number) => {
  if (!Number.isFinite(cents)) return '—';
  const d = Math.round(cents) / 100; // whole cents first, so $9,999.996 -> $10K, not "$10,000.00"
  if (d < 10_000) return '$' + d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + fmtCount(d);
};
/** Welcome-back "You were away 1h 12m"; at/over cap -> "2h+". */
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
/** Art & UX compact money for pops/cards: "$12.50" under $1,000, then "$1.2K" / "$3.4M" / "$1.2T" (1 decimal, half-up on whole
 * cents like fmtCount/fmtMoney; a tier that rounds to 1000 rolls up: $999,950 -> "$1M"; thousands separator above 1,000T). */
export const fmtMoneyShort = (cents: number, opts?: { round?: 'nearest' | 'floor' }) => {
  const rnd = opts?.round === 'floor' ? Math.floor : Math.round; // floor: never above the true amount (Sell preview, HoP 15:14)
  if (!Number.isFinite(cents)) return '—';
  const c = Math.round(cents); if (c < 100_000) return fmtMoney(c);
  for (let i = 0; i < TIERS.length; i++) {
    const [base, u] = TIERS[i]; if (c < base * 100) continue;
    const v = rnd(c / (base * 10)) / 10; // base*10 cents = 0.1 unit, an exact integer
    if (v >= 1000 && i > 0) return '$' + rnd(c / (TIERS[i - 1][0] * 10)) / 10 + TIERS[i - 1][1];
    return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 1 }) + u;
  }
  return fmtMoney(c);
};
/** Sell-button preview only (HoP 15:14): exact under $1K; at $1K+ short form floored so the button never shows more than the credit. */
export const fmtMoneyPreview = (cents: number) => fmtMoneyShort(cents, { round: 'floor' });
/** Always exact (aria / popup / Thanks): full dollars, thousands separators, 2 decimals. '—' for NaN/Infinity. */
export const fmtMoneyExact = (cents: number) => {
  if (!Number.isFinite(cents)) return '—';
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
