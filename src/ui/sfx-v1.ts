/** SFX engine v1 (audio-hooks.md v1.1). Web Audio; nothing plays before unlock (events dropped, not queued). */
export type SfxEvent = 'egg.tap' | 'egg.collect' | 'market.sell' | 'upgrade.buy' | 'milestone' | 'order.complete' | 'cant_afford';
export interface HookSpec { files: string[]; gain: number; cents: number; variantSemis?: number; cooldownMs: number; maxVoices: number; priority: number; rate?: number }
const v = (n: string, k: number) => Array.from({ length: k }, (_, i) => `sfx/sfx-${n}-0${i + 1}`);
/** Paths are relative to `assets/`; every v1 hook uses sfx/* (ogg first, mp3 fallback). No legacy assets/audio/* (v1.2). */
export const HOOKS: Record<SfxEvent, HookSpec> = {
  'egg.tap': { files: v('tap', 3), gain: 0.55, cents: 25, variantSemis: 1, cooldownMs: 60, maxVoices: 4, priority: 3 },
  'egg.collect': { files: v('collect', 3), gain: 0.8, cents: 15, cooldownMs: 120, maxVoices: 4, priority: 2 },
  'market.sell': { files: v('sell', 3), gain: 0.8, cents: 15, cooldownMs: 100, maxVoices: 4, priority: 2 },
  'upgrade.buy': { files: v('upgrade', 3), gain: 0.8, cents: 15, cooldownMs: 150, maxVoices: 2, priority: 1 },
  'milestone': { files: v('milestone', 1), gain: 0.9, cents: 0, cooldownMs: 2000, maxVoices: 1, priority: 0 },
  'order.complete': { files: v('order-complete', 3), gain: 0.7, cents: 15, cooldownMs: 200, maxVoices: 2, priority: 2 },
  'cant_afford': { files: v('cant-afford', 3), gain: 0.5, cents: 15, cooldownMs: 400, maxVoices: 1, priority: 3 },
};
export const BIG_SALE_GAIN = 1.0, SPARKLE = 'sfx/sfx-sell-sparkle-01', SPARKLE_GAIN = 0.6, GLOBAL_VOICES = 8, STEAL_FADE_S = 0.005;
export const allFiles = () => [...new Set([...Object.values(HOOKS).flatMap(h => h.files), SPARKLE])];
export const fileUrl = (base: string, f: string, ogg: boolean) => `${base}${f}.${ogg ? 'ogg' : 'mp3'}`;

/** Round-robin, never the same file twice in a row. */
export class Rotor { private i = -1; constructor(private n: number) {} next() { this.i = (this.i + 1) % this.n; return this.i; } }
export const centsToRate = (c: number) => Math.pow(2, c / 1200);

interface Voice { ev: SfxEvent; priority: number; t: number; src: AudioBufferSourceNode; gain: GainNode }
export interface SfxDeps { now: () => number; rand: () => number; createContext: () => AudioContext | null; fetch: (u: string) => Promise<ArrayBuffer>; canOgg: () => boolean }

export class SfxEngine {
  ctx: AudioContext | null = null; unlocked = false; muted = false; private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>(); private last = new Map<string, number>(); private rotors = new Map<SfxEvent, Rotor>();
  private voices: Voice[] = []; private celebrated = new Set<string>(); starts = 0;
  constructor(private base: string, private d: SfxDeps) {}
  /** Call from the first user gesture only. */
  async unlock() {
    if (this.unlocked) return; this.ctx ??= this.d.createContext(); if (!this.ctx) return;
    this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(this.ctx.destination);
    this.unlocked = true;
    const ogg = this.d.canOgg();
    void Promise.all(allFiles().map(async f => { try { this.buffers.set(f, await this.ctx!.decodeAudioData(await this.d.fetch(fileUrl(this.base, f, ogg)))); } catch { /* non-fatal */ } }));
    try { if (this.ctx.state === 'suspended') await Promise.race([this.ctx.resume(), new Promise(r => setTimeout(r, 500))]); } catch { /* ignore */ }
  }
  setMuted(m: boolean) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 1; if (m) for (const x of [...this.voices]) this.stop(x, 0); }
  visibility(hidden: boolean) { try { void (hidden ? this.ctx?.suspend() : this.ctx?.resume()); } catch { /* ignore */ } }
  /** Returns true if a source was started. `key`: once-per-milestone id, or per-button cooldown key for cant_afford. */
  play(ev: SfxEvent, opts: { big?: boolean; key?: string } = {}): boolean {
    if (!this.unlocked || !this.ctx || !this.master || this.muted) return false;
    const h = HOOKS[ev], t = this.d.now();
    if (ev === 'milestone' && opts.key) { if (this.celebrated.has(opts.key)) return false; }
    const ck = ev === 'cant_afford' && opts.key ? `${ev}:${opts.key}` : ev;
    if (t - (this.last.get(ck) ?? -1e9) < h.cooldownMs) return false;
    let r = this.rotors.get(ev); if (!r) this.rotors.set(ev, r = new Rotor(h.files.length));
    const idx = r.next(), buf = this.buffers.get(h.files[idx]); if (!buf) return false;
    this.last.set(ck, t); if (ev === 'milestone' && opts.key) this.celebrated.add(opts.key);
    const semis = h.variantSemis ? (idx - 1) * h.variantSemis : 0;
    const rate = Math.pow(2, semis / 12) * centsToRate((this.d.rand() * 2 - 1) * h.cents);
    const ok = this.start(ev, h.priority, buf, opts.big && ev === 'market.sell' ? BIG_SALE_GAIN : h.gain, rate, h.maxVoices);
    if (ok && opts.big && ev === 'market.sell') { const sp = this.buffers.get(SPARKLE); if (sp) this.start(ev, h.priority, sp, SPARKLE_GAIN, 1, h.maxVoices + 1); }
    return ok;
  }
  private start(ev: SfxEvent, priority: number, buf: AudioBuffer, g: number, rate: number, cap: number) {
    const mine = this.voices.filter(x => x.ev === ev);
    if (mine.length >= cap) this.stop(mine[0], STEAL_FADE_S);
    if (this.voices.length >= GLOBAL_VOICES) {
      // steal lowest priority (highest number), oldest first; milestone (0) is never stolen
      const cand = [...this.voices].filter(x => x.priority > 0 && x.priority >= priority).sort((a, b) => b.priority - a.priority || a.t - b.t)[0];
      if (!cand) return false; this.stop(cand, STEAL_FADE_S);
    }
    const ctx = this.ctx!, src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = buf; src.playbackRate.value = rate; gain.gain.value = g; src.connect(gain); gain.connect(this.master!);
    const vo: Voice = { ev, priority, t: this.d.now(), src, gain }; this.voices.push(vo);
    src.onended = () => { const i = this.voices.indexOf(vo); if (i >= 0) this.voices.splice(i, 1); };
    src.start(0); this.starts++; return true;
  }
  private stop(vo: Voice, fade: number) {
    const i = this.voices.indexOf(vo); if (i >= 0) this.voices.splice(i, 1);
    try { const t = this.ctx!.currentTime; vo.gain.gain.setTargetAtTime(0, t, fade / 3); vo.src.stop(t + fade); } catch { /* ignore */ }
  }
  liveVoices() { return this.voices.length; }
}
export const browserDeps = (): SfxDeps => ({
  now: () => performance.now(), rand: Math.random,
  createContext: () => { const AC = window.AudioContext || (window as any).webkitAudioContext; return AC ? new AC() : null; },
  fetch: async u => (await fetch(u)).arrayBuffer(),
  canOgg: () => { try { return document.createElement('audio').canPlayType('audio/ogg; codecs=vorbis') !== ''; } catch { return false; } },
});
