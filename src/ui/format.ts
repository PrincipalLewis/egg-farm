/** Display formatters (layout-spec §1, feature-spec F7). Pure; unit-tested. */
/** M41-9 / QA4-3 (art-ux/number-format-big.md): ONE data table drives the visible suffix and its spoken name (aria, B-1 rule).
 *  Ascending; at SCI_FROM (1e36) and above every formatter switches to scientific with 3 significant figures. */
export const SUFFIXES: readonly { base: number; sym: string; name: string }[] = [
  { base: 1e3, sym: 'K', name: 'thousand' }, { base: 1e6, sym: 'M', name: 'million' }, { base: 1e9, sym: 'B', name: 'billion' },
  { base: 1e12, sym: 'T', name: 'trillion' }, { base: 1e15, sym: 'Qa', name: 'quadrillion' }, { base: 1e18, sym: 'Qi', name: 'quintillion' },
  { base: 1e21, sym: 'Sx', name: 'sextillion' }, { base: 1e24, sym: 'Sp', name: 'septillion' }, { base: 1e27, sym: 'Oc', name: 'octillion' },
  { base: 1e30, sym: 'No', name: 'nonillion' }, { base: 1e33, sym: 'Dc', name: 'decillion' },
];
export const SCI_FROM = 1e36;
/** Largest tier first: TIERS[i - 1] is the next larger tier of TIERS[i]. */
const TIERS: [number, string][] = SUFFIXES.map(t => [t.base, t.sym] as [number, string]).reverse();
type Rnd = (x: number) => number;
/** Qa and up only (K–T untouched, byte-identical): above 2^53 a quotient like 9.995e21 / 1e19 lands on 999.4999...; snap it to
 *  15 significant digits so the rounding/roll-up edges (9.995Sx -> 10Sx, 999.95No -> 1Dc) behave like their decimal value. */
const dec = (q: number, base: number) => base >= 1e15 ? Number(q.toPrecision(15)) : q;
const rndOf = (opts?: { round?: 'nearest' | 'floor' }): Rnd => opts?.round === 'floor' ? Math.floor : Math.round;
/** Scientific, 3 significant figures, no "+" in the exponent: 1.23e36. Floor mode never shows more than n. CCR m1 on #64: the
 *  mantissa x100 is snapped to 15 significant digits first (as dec() does for the tiers), so x.xx5 rounds half-up
 *  (9.995e36 -> 1.00e37, 1.005e36 -> 1.01e36) and an exact 1.23e36 floors to itself. The snap replaces the old +1e-9 nudge. */
export const fmtSci = (n: number, rnd: Rnd = Math.round): string => {
  const [m, e] = n.toExponential(12).split('e'); let mant = rnd(Number((parseFloat(m) * 100).toPrecision(15))) / 100, exp = Number(e);
  if (mant >= 10) { mant /= 10; exp += 1; }
  return `${mant.toFixed(2)}e${exp}`;
};
/** FMT-1/FMT-2: integer rounding (9,995,000 -> 10M, not float 9.99M), a tier that rounds to 1000 rolls up (999,950 -> 1M;
 *  999.95T -> 1Qa; 999.95Dc -> 1.00e36), tiers K..Dc, scientific from 1e36, '—' for NaN/Infinity. Never a thousands
 *  separator in a suffixed value. round:'floor' (Sell previews, QA4-2) never shows more than n. */
export const fmtCount = (n: number, opts?: { round?: 'nearest' | 'floor' }): string => {
  if (!Number.isFinite(n)) return '—';
  const rnd = rndOf(opts);
  n = Math.floor(n);
  if (n < 1e4) return n.toLocaleString('en-US');
  if (n >= SCI_FROM) return fmtSci(n, rnd);
  for (let i = 0; i < TIERS.length; i++) {
    const [base, u] = TIERS[i]; if (n < base) continue;
    const dp = u === 'K' || n >= base * 10 ? 1 : 2, v = rnd(dec(n / (base / 10 ** dp), base)) / 10 ** dp;
    if (v >= 1000) /* TIERS[i-1] is the next larger tier; none above Dc -> scientific */
      return i > 0 ? (rnd(dec(n / (TIERS[i - 1][0] / 100), base)) / 100).toFixed(2).replace(/\.?0+$/, '') + TIERS[i - 1][1] : fmtSci(n, rnd);
    return v.toFixed(dp).replace(/\.?0+$/, '') + u;
  }
  return n.toLocaleString('en-US'); // unreachable for n >= 1e4 (K matches); keeps the return type total
};
/** QA4-2: Sell previews floor the egg count like the money, so a label never shows more eggs than are sold. */
export const fmtCountFloor = (n: number) => fmtCount(n, { round: 'floor' });
/** Coins: always 2 decimals under 1K ($12.40), "$1,234.50" under 10K, then $12.3K / $1.2M. */
export const fmtMoney = (cents: number, opts?: { round?: 'nearest' | 'floor' }) => {
  if (!Number.isFinite(cents)) return '—';
  const d = Math.round(cents) / 100; // whole cents first, so $9,999.996 -> $10K, not "$10,000.00"
  if (d < 10_000) return '$' + d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + fmtCount(d, opts); // $1.25Qa ... $999.9Dc, then $1.23e36
};
/** QA4-2: Sell all money, floored like the Sell-button preview (never more than the credit). */
export const fmtMoneyFloor = (cents: number) => fmtMoney(cents, { round: 'floor' });
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
 * cents like fmtCount/fmtMoney; a tier that rounds to 1000 rolls up: $999,950 -> "$1M"). M41-9: same 1-decimal rule for Qa..Dc
 * ($1.2Qa, $999.9Dc), $999.95Dc rolls up to scientific ($1.00e36); never a thousands separator in a suffixed value. */
export const fmtMoneyShort = (cents: number, opts?: { round?: 'nearest' | 'floor' }) => {
  const rnd = opts?.round === 'floor' ? Math.floor : Math.round; // floor: never above the true amount (Sell preview, HoP 15:14)
  if (!Number.isFinite(cents)) return '—';
  const c = Math.round(cents); if (c < 100_000) return fmtMoney(c);
  if (c / 100 >= SCI_FROM) return '$' + fmtSci(c / 100, rnd);
  for (let i = 0; i < TIERS.length; i++) {
    const [base, u] = TIERS[i]; if (c < base * 100) continue;
    const v = rnd(dec(c / (base * 10), base)) / 10; // base*10 cents = 0.1 unit, an exact integer
    if (v >= 1000) return '$' + (i > 0 ? rnd(dec(c / (TIERS[i - 1][0] * 10), base)) / 10 + TIERS[i - 1][1] : fmtSci(c / 100, rnd));
    return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 1 }) + u;
  }
  return fmtMoney(c);
};
/** Sell-button preview only (HoP 15:14): exact under $1K; at $1K+ short form floored so the button never shows more than the credit. */
export const fmtMoneyPreview = (cents: number) => fmtMoneyShort(cents, { round: 'floor' });
/** M41-9 aria / live-region text only (number-format-big §5, Art ruling on #56): spell out Qa and above from the SUFFIXES
 *  table ("1.2Qa" -> "1.2 quadrillion"); scientific reads "1.23 times 10 to the 36". K–T stay as on main ("$1M", "13K"). */
const SPELL_FROM = 1e15;
export const spellShort = (short: string): string => {
  const sci = /^(\$?)(\d+(?:\.\d+)?)e(\d+)$/.exec(short); if (sci) return `${sci[1]}${sci[2]} times 10 to the ${sci[3]}`;
  const m = /^(\$?[\d.,]+)([A-Za-z]+)$/.exec(short); const t = m && SUFFIXES.find(x => x.sym === m[2] && x.base >= SPELL_FROM);
  return t ? `${m![1]} ${t.name}` : short;
};
/** Spoken egg count: fmtCount with the suffix spelled out (under 1e4 it is the plain number). */
export const fmtCountAria = (n: number) => spellShort(fmtCount(n));
/** VISIBLE exact money (coin pops, +$ floaters): full dollars, thousands separators, 2 decimals; '—' for NaN/Infinity.
 *  M41-9: from $1 quadrillion (1e15 dollars) the compact suffix form, never a digit string or a spelled word ("$1.2Qa",
 *  "$1.23e36"); below that byte-identical to main. */
export const fmtMoneyExact = (cents: number) => {
  if (!Number.isFinite(cents)) return '—';
  if (cents / 100 >= SPELL_FROM) return fmtMoneyShort(cents);
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
/** ARIA exact money (order row / Sell aria): equals fmtMoneyExact below $1e15 (byte-identical to main); from $1e15 the
 *  spelled short form ("$1.25 quadrillion", "$1.23 times 10 to the 36"), never a full digit string. */
export const fmtMoneyAria = (cents: number) =>
  Number.isFinite(cents) && cents / 100 >= SPELL_FROM ? spellShort(fmtMoney(cents)) : fmtMoneyExact(cents);
/** #live region text (once a second): "$12.3K, 13K eggs" exactly as on main for K–T; Qa+ spelled out. */
export const liveText = (coinsCents: number, basket: number) => `${spellShort(fmtMoney(coinsCents))}, ${fmtCountAria(basket)} eggs`;
/** Upgrade-card ETA (Product copy, Oct 16; same as rc1/ux-clarity format.ts): "Affordable in a moment" under 10 s; "Affordable in ~m:ss"; "~h:mm:ss" from 1 h; no income "Affordable in —". */
export const fmtAffordableIn = (seconds: number | null) => {
  if (seconds === null || !isFinite(seconds)) return 'Affordable in —';
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 10) return 'Affordable in a moment';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60, p = (n: number) => String(n).padStart(2, '0');
  return `Affordable in ~${h ? `${h}:${p(m)}` : m}:${p(r)}`;
};
