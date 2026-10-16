import { describe, it, expect, vi } from 'vitest';
import { SfxEngine, HOOKS, allFiles, fileUrl, SPARKLE, SPARKLE_GAIN, type SfxDeps } from '../src/ui/sfx-v1';
import { audioJuiceV1, AUDIO_JUICE_V1_DEFAULT } from '../src/ui/feature-flags';
import { tapSquash, numberPop, crumbs, counterLand, coopBump, cantAffordFeedback, SHAKE_V1, SaleMedian } from '../src/ui/juice';
import { soundToggleHtml } from '../src/ui/sound-toggle';

function fakeCtx() {
  const started: { buf: any; rate: number; gain: any }[] = [];
  const ctx: any = { state: 'running', currentTime: 0, destination: {},
    resume: vi.fn(async () => {}), suspend: vi.fn(async () => {}),
    decodeAudioData: vi.fn(async (ab: any) => ({ name: ab.name })),
    createGain: () => ({ gain: { value: 1, setTargetAtTime: vi.fn() }, connect: vi.fn() }),
    createBufferSource: () => { const s: any = { playbackRate: { value: 1 }, connect: (g: any) => { s.g = g; }, stop: vi.fn(), start: vi.fn(() => started.push({ buf: s.buffer, rate: s.playbackRate.value, gain: s.g.gain.value })) }; return s; } };
  return { ctx, started };
}
function make(t = { v: 0 }) {
  const { ctx, started } = fakeCtx(); const createContext = vi.fn(() => ctx); const urls: string[] = [];
  const deps: SfxDeps = { now: () => t.v, rand: () => 0.5, createContext, canOgg: () => true, fetch: async u => { urls.push(u); return { name: u.replace(/^.*assets\/|\.(ogg|mp3)$/g, '') } as any; } };
  return { e: new SfxEngine('/assets/', deps), started, createContext, urls, t };
}
const flush = () => new Promise(r => setTimeout(r, 0));

describe('audio+juice v1 flag', () => {
  it('defaults off', () => { expect(AUDIO_JUICE_V1_DEFAULT).toBe(false); expect(audioJuiceV1('', { getItem: () => null })).toBe(false); });
  it('opt-in via ?juice=1 or storage', () => { expect(audioJuiceV1('?juice=1', null)).toBe(true); expect(audioJuiceV1('', { getItem: () => '1' })).toBe(true); expect(audioJuiceV1('?juice=0', { getItem: () => '1' })).toBe(false); });
});

describe('SFX engine (audio-hooks v1.2)', () => {
  it('no audio before the first tap: no AudioContext, no start(), events dropped not queued', async () => {
    const { e, started, createContext } = make();
    for (const ev of Object.keys(HOOKS) as any[]) expect(e.play(ev)).toBe(false);
    expect(createContext).not.toHaveBeenCalled(); expect(started).toHaveLength(0);
    await e.unlock(); await flush();
    expect(started).toHaveLength(0); // nothing replayed after unlock
    expect(e.play('egg.tap')).toBe(true); expect(started).toHaveLength(1);
  });
  it('maps every event to v1 files only (no legacy assets/audio), ogg first, mp3 fallback', () => {
    expect(allFiles().every(f => f.startsWith('sfx/'))).toBe(true);
    expect(fileUrl('/a/', 'sfx/sfx-tap-01', true)).toBe('/a/sfx/sfx-tap-01.ogg');
    expect(fileUrl('/a/', 'sfx/sfx-tap-01', false)).toBe('/a/sfx/sfx-tap-01.mp3');
    expect(HOOKS['upgrade.buy'].files).toHaveLength(3); expect(HOOKS['order.complete'].files).toHaveLength(3); expect(HOOKS.milestone.files).toEqual(['sfx/sfx-milestone-01']);
    expect(HOOKS.cant_afford).toMatchObject({ gain: 0.5, cooldownMs: 400, maxVoices: 1, priority: 3 });
  });
  it('rotates variants, never the same twice in a row; tap ±1 st across variants', async () => {
    const { e, started, t } = make(); await e.unlock(); await flush();
    for (let i = 0; i < 6; i++) { t.v += 100; e.play('egg.tap'); }
    const names = started.map(s => s.buf.name); for (let i = 1; i < names.length; i++) expect(names[i]).not.toBe(names[i - 1]);
    expect(names.slice(0, 3)).toEqual(['sfx/sfx-tap-01', 'sfx/sfx-tap-02', 'sfx/sfx-tap-03']);
    expect(started[0].gain).toBe(0.55);
  });
  it('cooldown skips; per-button cant_afford cooldown', async () => {
    const { e, t } = make(); await e.unlock(); await flush();
    expect(e.play('egg.tap')).toBe(true); t.v = 30; expect(e.play('egg.tap')).toBe(false); t.v = 61; expect(e.play('egg.tap')).toBe(true);
    expect(e.play('cant_afford', { key: 'a' })).toBe(true); t.v = 200; expect(e.play('cant_afford', { key: 'a' })).toBe(false);
    expect(e.play('cant_afford', { key: 'b' })).toBe(true);
  });
  it('voice cap 4 per event, global 8; milestone once per key', async () => {
    const { e, t } = make(); await e.unlock(); await flush();
    for (let i = 0; i < 6; i++) { t.v += 200; e.play('egg.collect'); } expect(e.liveVoices()).toBe(4);
    expect(e.play('milestone', { key: 'tier1' })).toBe(true); t.v += 5000; expect(e.play('milestone', { key: 'tier1' })).toBe(false);
  });
  it('big sale: sell at gain 1.0 + sparkle at 0.6 together', async () => {
    const { e, started } = make(); await e.unlock(); await flush();
    e.play('market.sell', { big: true });
    expect(started.map(s => [s.buf.name, s.gain])).toEqual([[started[0].buf.name, 1.0], [SPARKLE, SPARKLE_GAIN]]);
  });
  it('mute = no start() calls', async () => { const { e, started } = make(); await e.unlock(); await flush(); e.setMuted(true); expect(e.play('egg.tap')).toBe(false); expect(started).toHaveLength(0); });
});

describe('juice reduced motion', () => {
  const hasMotion = (k: Keyframe[]) => k.some(f => 'transform' in f);
  it('reduced motion: opacity only, no particles, no scale', () => {
    expect(hasMotion(tapSquash(true).keyframes)).toBe(false); expect(hasMotion(numberPop(true).keyframes)).toBe(false); expect(hasMotion(counterLand(true).keyframes)).toBe(false);
    expect(coopBump(true)).toBeNull(); expect(crumbs(true, Math.random)).toEqual([]);
    expect(numberPop(true).duration).toBe(650);
  });
  it('full motion durations within spec', () => { expect(tapSquash(false).duration).toBe(200); expect(numberPop(false).duration).toBe(800); expect(crumbs(false, () => .5)).toHaveLength(3); });
  it('big sale = >10x median', () => { const m = new SaleMedian(); for (let i = 0; i < 5; i++) m.isBig(10); expect(m.isBig(50)).toBe(false); expect(m.isBig(500)).toBe(true); });
});

describe("can't-afford feedback always shows, even in sound cooldown", () => {
  const el = () => { const kids: any[] = []; const attrs: Record<string, string> = {}; const cls = new Set<string>();
    const e: any = { animate: vi.fn(), setAttribute: (k: string, v: string) => { attrs[k] = v; }, classList: { add: (c: string) => cls.add(c) },
      querySelector: () => kids[0] ?? null, append: (k: any) => kids.push(k), ownerDocument: { createElement: () => ({ className: '', textContent: '' }) } };
    return { e, attrs, kids, cls }; };
  it('shake 4px x3 / 240 ms + aria-disabled + Need text, with and without sound', () => {
    for (const sound of [true, false]) {
      const { e, attrs, kids } = el();
      const r = cantAffordFeedback(e, 'Need $5 more', () => sound, false);
      expect(r.sound).toBe(sound); expect(attrs['aria-disabled']).toBe('true'); expect(kids[0].textContent).toBe('Need $5 more');
      expect(e.animate).toHaveBeenCalledWith(SHAKE_V1.keyframes, { duration: 240 });
    }
    expect(SHAKE_V1.keyframes.filter(k => String(k.transform).includes('-4px'))).toHaveLength(3);
  });
  it('with the real engine in cooldown the visual still fires', async () => {
    const { e: eng } = make(); await eng.unlock(); await flush();
    const a = el(), b2 = el();
    expect(cantAffordFeedback(a.e, 'Need $1 more', () => eng.play('cant_afford', { key: 'x' }), false).sound).toBe(true);
    expect(cantAffordFeedback(b2.e, 'Need $1 more', () => eng.play('cant_afford', { key: 'x' }), false).sound).toBe(false);
    expect(b2.e.animate).toHaveBeenCalled(); expect(b2.attrs['aria-disabled']).toBe('true'); expect(b2.kids[0].textContent).toBe('Need $1 more');
  });
});

describe('Sound toggle', () => {
  it("labelled 'Sound', On/Off text, aria-pressed, never SFX", () => {
    for (const on of [true, false]) { const h = soundToggleHtml(on); expect(h).toContain('>Sound<'); expect(h).toContain(on ? '>On<' : '>Off<'); expect(h).toContain(`aria-pressed="${on}"`); expect(h).not.toMatch(/sfx/i); expect(h).toContain('<svg'); }
  });
});
