/**
 * TEST-ONLY harness for scripts/breeds-ui-prB-browser.mjs (author evidence, not QA evidence). Boots the REAL app (Game +
 * mountApp, which calls PR-A's mountBreeds) with an in-page balance overlay, registers PR-B through the registry, and drives a
 * reference Present gate (stand-in for the Saves sim gate). Query: ?flag=0|1&reg=0|1&F=&H=&coins=&breeds=<json>&fb=0|1&rm=0|1
 */
import '../../../../src/ui/styles.css';
import { balance, type Balance } from '../../../../src/config/balance';
import { Game } from '../../../../src/game';
import { mountApp } from '../../../../src/ui/app';
import { initialState } from '../../../../src/sim/state';
import { serialize, SAVE_KEY } from '../../../../src/save/save';
import { registerBreedsPrB, prbMounts } from '../../../../src/ui/breeds-hud';
import { PRB_STUB_TUNABLES } from '../../../../src/ui/breeds-adapter';
import overlay from '../../breeds-prB-flag-on.json';

const q = new URLSearchParams(location.search), num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);
const b = structuredClone(balance) as Balance;
const merge = (t: any, o: any) => { for (const [k, v] of Object.entries(o)) { if (k.startsWith('_')) continue; if (v && typeof v === 'object' && !Array.isArray(v)) merge(t[k] ??= {}, v); else t[k] = v; } };
if (q.get('flag') === '1') merge(b, overlay);

const W = PRB_STUB_TUNABLES.present_calm_w_s * 1000, K: number = PRB_STUB_TUNABLES.present_calm_k;
const taps: number[] = []; let forced: boolean | null = null;
const gate = { open: (_s: unknown, _b: unknown, now: number) => forced ?? (K === 0 || taps.filter(t => t > now - W && t <= now).length < K) };
if (q.get('reg') !== '0') registerBreedsPrB({ gate, fallback: q.get('fb') === '1' ? () => true : undefined });

const kv = (() => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; })();
const st: any = { ...initialState(b), tracksV7: 1, seenTracksExplainer: true, farmLevel: num('F', 0), hensLevel: num('H', 0), coinsCents: num('coins', 0) };
if (q.has('breeds')) st.breeds = JSON.parse(q.get('breeds')!);
kv.setItem(SAVE_KEY, serialize(st, Date.now()));
kv.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false, reducedMotion: q.get('rm') === '1' }));
let n = 0;
const g = new Game(b, kv as any, () => Date.now(), undefined, 'harness', null, null, { idbBoot: 'absent', newId: () => (++n).toString(16).padStart(16, '0') } as any);
const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {}, mute() {} } as any, 'harness', { newGame: false } as any);
const loop = () => { ui.render(); requestAnimationFrame(loop); }; ui.render(); requestAnimationFrame(loop);
(window as any).__prB = {
  tap: () => taps.push(performance.now()), force: (v: boolean | null) => { forced = v; },
  gateOpen: () => gate.open(null, null, performance.now()),
  pops: () => prbMounts().hud?.pops ?? 0, state: () => prbMounts().hud?.state ?? null,
  render: () => ui.render(), ready: true,
};
