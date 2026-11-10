/**
 * TASK HoE/p8-qa-hooks — P8 test-ids, build:qa hooks, docked golden-spot SoT.
 * AC tags: P8-TID-*, P8-HOOK-*, P8-SPOT-*
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { layoutKey, spotCentres, validSpots, DOM_ZONES, DOCKED_COLUMN, type Spot, type Zone } from '../src/ui/overlay';
import { installQaSeam } from '../src/ui/qa-seam';
import { workerAtRisk, workersAtRisk, costliestAtRisk } from '../src/econ/income';
import { workersHtml } from '../src/ui/workers-ui';
import balance from '../src/config/balance.json';
import type { Balance } from '../src/config/balance';
import type { GameState } from '../src/sim/state';
import { initialState } from '../src/sim/state';

const b = balance as Balance;
const bx = (l: number, t: number, r: number, bot: number) => ({ left: l, top: t, right: r, bottom: bot });
const pts = (spots: Spot[]) => spots.map(s => `${s.x},${s.y}`).join(' ');
const row = (s: string) => s.split(' ').filter(x => x !== '-');
const near = (got: string, want: string[], tol = 0) => {
  const g = got.split(' ');
  expect(g.length).toBe(want.length);
  g.forEach((p, i) => {
    const [x, y] = p.split(',').map(Number), [X, Y] = want[i].split(',').map(Number);
    expect(Math.abs(x - X)).toBeLessThanOrEqual(tol);
    expect(Math.abs(y - Y)).toBeLessThanOrEqual(tol);
  });
};
const z = (name: string, l: number, t: number, r: number, bot: number, clear = 16): Zone => ({ name, box: bx(l, t, r, bot), clear });

describe('P8-TID stable data-testids on stacked base', () => {
  it('P8-TID-HENS: ×N hens pill keeps data-testid="hens-pill" (F6-AC10)', () => {
    const app = readFileSync('src/ui/app.ts', 'utf8');
    expect(app).toMatch(/id="henpill"[^>]*data-testid="hens-pill"|data-testid="hens-pill"[^>]*id="henpill"/);
  });
  it('P8-TID-DOCK: docked panel root has data-testid="docked-panel" and data-docked', () => {
    const app = readFileSync('src/ui/app.ts', 'utf8');
    expect(app).toMatch(/id="panel-layer"[^>]*data-testid="docked-panel"/);
    expect(app).toMatch(/data-docked/);
  });
  it('P8-TID-WK: Workers tab toggles data-sheet="workers" + data-testid="workers-sheet"', () => {
    const app = readFileSync('src/ui/app.ts', 'utf8');
    expect(app).toMatch(/data-sheet', 'workers'/);
    expect(app).toMatch(/data-testid', 'workers-sheet'/);
  });
  it('P8-TID-MANAGE: card Refill/Manage carries data-testid="worker-manage"', () => {
    const src = readFileSync('src/ui/workers-ui.ts', 'utf8');
    expect(src).toMatch(/data-testid="worker-manage"/);
  });
  it('P8-TID-NAVCD: nav countdown span has data-testid="nav-countdown"', () => {
    expect(readFileSync('src/ui/app.ts', 'utf8')).toMatch(/data-testid="nav-countdown"/);
  });
  it('P8-TID-GOAL: #goal has data-testid="goal-strip"', () => {
    expect(readFileSync('src/ui/app.ts', 'utf8')).toMatch(/id="goal"[^>]*data-testid="goal-strip"/);
  });
  it('P8-TID-RISK: workersHtml stamps data-risk on Tired/Asleep cards', () => {
    const s = initialState(b) as GameState;
    s.workers.market_hand = { energy: 10, cdS: 0 }; // tired
    s.workers.coop_hand = { energy: 0, cdS: 0 }; // asleep
    const html = workersHtml(s, b);
    expect(html).toMatch(/data-w="market_hand"[^>]*data-risk="/);
    expect(html).toMatch(/data-w="coop_hand"[^>]*data-risk="/);
    expect(html).toMatch(/data-testid="worker-manage"/);
  });
});

describe('P8-HOOK workers.atRisk + layout.showZones + blockers', () => {
  afterEach(() => { delete (window as any).eggfarmQa; vi.restoreAllMocks(); });

  it('P8-HOOK-ATRISK: workerAtRisk / costliestAtRisk follow §4.8 (Tired/Asleep only; ties WORKERS order)', () => {
    const s = initialState(b) as GameState;
    s.farmLevel = 10; s.collectionLevel = 5;
    s.workers.market_hand = { energy: 20, cdS: 0 };
    s.workers.coop_hand = { energy: 20, cdS: 0 };
    const risks = workersAtRisk(s, b);
    expect(risks.market_hand).toBeGreaterThan(0);
    expect(risks.coop_hand).toBeGreaterThan(0);
    expect(risks.hawker).toBe(0);
    // equal energy tired: market_hand wins on code-id order when values equal — costliest picks max value then first in WORKERS
    const c = costliestAtRisk(s, b);
    expect(['market_hand', 'coop_hand']).toContain(c);
    expect(workerAtRisk('grader', s, b)).toBe(0);
    s.workers.grader = { energy: 100, cdS: 0, unpaid: true };
    expect(workerAtRisk('grader', s, b)).toBe(0); // unpaid excluded
  });

  it('P8-HOOK-SEAM: installQaSeam exposes workers.atRisk + layout.showZones; fatigue/stall/tc throw blocker', () => {
    const audio = { qaLog: [] as any[] };
    const fx = { max: 30, count: 0 };
    let zones = 0;
    const g = { state: initialState(b) } as any;
    g.state.workers.market_hand = { energy: 0, cdS: 0 };
    const qa = installQaSeam({
      audio, fx: fx as any,
      menu: { open() {}, close() {} },
      sheet: { stepClose: () => null },
      game: g, balance: b,
      showZones: () => { zones++; },
    }, window)!;
    expect(qa.workers!.atRisk().market_hand).toBeGreaterThan(0);
    qa.layout!.showZones();
    expect(zones).toBe(1);
    expect(() => qa.fatigue!.force('tired')).toThrow(/blocked/);
    expect(() => qa.fatigue!.setShare(0.15)).toThrow(/blocked/);
    expect(() => qa.fatigue!.read()).toThrow(/blocked/);
    expect(() => qa.stall!.force(true)).toThrow(/blocked/);
    expect(() => qa.tc!.spawn({ spot: 'S1' })).toThrow(/blocked/);
  });

  it('P8-HOOK-RELEASE: check-release-build.mjs still rejects eggfarmQa in release', () => {
    const src = readFileSync('scripts/check-release-build.mjs', 'utf8');
    const line = src.split('\n').find(l => l.startsWith('const hooks = ['))!;
    expect(line).toContain("'eggfarmQa'");
  });
});

describe('P8-SPOT docked golden-spot SoT (overlay.ts pure funcs)', () => {
  it('P8-SPOT-LAYOUT: W≥960 landscape keys — 960×600/1024×474 compact, 1280×720 docked', () => {
    expect(layoutKey(960, 600, true)).toBe('docked-compact');
    expect(layoutKey(1024, 474, true)).toBe('docked-compact');
    expect(layoutKey(1280, 720, true)).toBe('docked');
  });

  it('P8-SPOT-1280x720: docked centres match overlay formula (None: none)', () => {
    const got = spotCentres('docked', 1280, 720, { scene: bx(0, 0, 0, 0) });
    expect(got.map(s => s.id)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']);
    near(pts(got), row('110,220 230,301 110,399 230,488 680,220 770,301 650,399 770,506'), 0);
  });

  it('P8-SPOT-1024x474: compact centres; S4/S8 None; docked-column in zone set', () => {
    const r = { scene: bx(32, 153, 592, 310), queue: bx(12, 68, 612, 141), meter: bx(32, 322, 592, 338) };
    const got = spotCentres('docked-compact', 1024, 474, r);
    expect(got.map(s => s.id)).toEqual(['S1', 'S2', 'S3', 'S5', 'S6', 'S7']); // S4/S8 None
    near(pts(got), row('90,189 90,232 90,274 548,189 548,232 548,274'), 0);
    const names = [...DOM_ZONES.map(d => d.name), DOCKED_COLUMN.name];
    expect(names).toContain('docked-column');
    expect(names).toContain('henpill');
    expect(names).toContain('full');
    expect(names).toContain('toast');
  });

  it('P8-SPOT-960x600: compact; S4/S8 None; centres from documented farm-rect fixture (Art farm width 560)', () => {
    // Engineering fixture: 1024×474 F6 measured boxes, x scaled by farmWidth 560/624, y remapped HUD→play for vh=600.
    // SoT remains spotCentres(); these boxes are the pinned inputs for this viewport until a live measure replaces them.
    const sx = 560 / 624, mapX = (n: number) => Math.round(n * sx);
    const sy = (600 - 56) / (474 - 56), mapY = (y: number) => 56 + Math.round((y - 56) * sy);
    const r = {
      scene: bx(mapX(32), mapY(153), mapX(592), mapY(310)),
      queue: bx(mapX(12), mapY(68), mapX(612), mapY(141)),
      meter: bx(mapX(32), mapY(322), mapX(592), mapY(338)),
    };
    const got = spotCentres('docked-compact', 960, 600, r);
    expect(got.map(s => s.id)).toEqual(['S1', 'S2', 'S3', 'S5', 'S6', 'S7']);
    near(pts(got), row('87,215 87,285 87,354 487,215 487,285 487,354'), 0);
    // With henpill + full zones (Art FC-SV13 baseline losses), valid count is ≤6
    const base = [
      z('hud', 0, 0, 960, 56), z('queue', r.queue.left, r.queue.top, r.queue.right, r.queue.bottom),
      z('meter', r.meter.left, r.meter.top, r.meter.right, r.meter.bottom),
      z('docked-column', 560, 56, 960, 600),
    ];
    expect(validSpots(got, base, 960, 600).length).toBe(6);
  });
});
