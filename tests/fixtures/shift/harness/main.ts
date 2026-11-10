// Shift sheet browser harness (TEST-ONLY; never built into the game). The real sheet module + real styles.css, driven by the test
// double FakeShiftSim. Query: ?flags=rc2Refill,autoRefill,abilities  &charges=N  (0 → countdown rows)  &rm=1
import '../../../../src/ui/styles.css';
import { balance, type Balance } from '../../../../src/config/balance';
import { mountShiftSheet, setShiftSheet, openShiftSheet } from '../../../../src/ui/shift-sheet';
import { FakeShiftSim } from '../fake-sim';
const q = new URLSearchParams(location.search), flags = (q.get('flags') ?? 'rc2Refill').split(',').filter(Boolean);
const b = structuredClone(balance) as Balance & { m4: { enabled: number; flags: Record<string, number> } };
if (flags.length) { b.m4.enabled = 1; b.m4.flags = { ...b.m4.flags, ...Object.fromEntries(flags.map(f => [f, 1])) }; }
const sim = new FakeShiftSim(); sim.ord = ['market_hand', 'coop_hand', 'hawker', 'grader'];
sim.workers = { market_hand: { energy: 42, cdS: 0 }, coop_hand: { energy: 0, cdS: 0 }, hawker: { energy: 20, cdS: 0, unpaid: true }, grader: { energy: 81, cdS: 0 } };
sim.risk = { market_hand: 120000, coop_hand: 80000, hawker: 5000, grader: 0 }; sim.resume = { hawker: 250000 };
const charges = +(q.get('charges') ?? 1);
sim.chargesV = { charges, cap: 2, nextChargeMs: charges < 2 ? 72000 : null };
sim.elig = { market_hand: charges ? { ok: true } : { ok: false, reason: 'no_charges' }, coop_hand: charges ? { ok: true } : { ok: false, reason: 'no_charges' },
  hawker: { ok: false, reason: 'unpaid' }, grader: { ok: false, reason: 'above_threshold' } };
const docked = matchMedia('(min-width: 960px) and (orientation: landscape)');
const h = mountShiftSheet({ doc: document, host: document.body, b, sim, now: () => performance.now(), docked: () => docked.matches,
  rm: () => q.get('rm') === '1', asset: f => `./assets/${f}`, toast: t => { (window as any).__toasts.push(t); } });
(window as any).__toasts = []; (window as any).__sim = sim; (window as any).__h = h;
if (flags.includes('rc2Refill')) setShiftSheet(h);
const opener = document.getElementById('opener')!;
opener.addEventListener('click', () => openShiftSheet('coop_hand', opener, 'card'));
(window as any).__ready = true;
