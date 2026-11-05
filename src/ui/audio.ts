/** SFX (layout-spec §6): 11 mp3s, Web Audio, unlocked on the "Tap to start" gesture. */
export const SFX = {
  tapStart: 'sfx-tap-start', collect: 'sfx-collect-pop', sell: 'sfx-sell-coin', upgrade: 'sfx-upgrade',
  cantAfford: 'sfx-cant-afford', customerArrive: 'sfx-customer-arrive', customerLeave: 'sfx-customer-leave',
  coopFull: 'sfx-coop-full', uiOpen: 'sfx-ui-open', uiClose: 'sfx-ui-close', welcomeBack: 'sfx-welcome-back',
  workerYawn: 'sfx-worker-yawn',
} as const;
export type SfxName = keyof typeof SFX;

/** PT1-3: never block boot on a hung AudioContext.resume / buffer load. */
export const AUDIO_UNLOCK_MS = 500;
export const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T | undefined> =>
  Promise.race([p.then(v => v as T | undefined), new Promise<undefined>(r => setTimeout(r, ms))]);

export class Audio {
  private ctx: AudioContext | null = null; private buffers = new Map<string, AudioBuffer>(); private lastPlay = new Map<string, number>();
  enabled = true;
  constructor(private base: string) {}
  /** Must be called from a user gesture. Returns within ~AUDIO_UNLOCK_MS even if resume hangs (PT1-3). */
  async unlock() {
    const AC = window.AudioContext || (window as any).webkitAudioContext; if (!AC) return;
    this.ctx ??= new AC();
    if (this.ctx.state === 'suspended') await withTimeout(this.ctx.resume().catch(() => {}), AUDIO_UNLOCK_MS);
    // Buffer loads continue in the background; missing buffers make play() a no-op.
    void Promise.all(Object.values(SFX).map(async f => {
      try { const r = await fetch(`${this.base}${f}.mp3`); this.buffers.set(f, await this.ctx!.decodeAudioData(await r.arrayBuffer())); } catch { /* missing sfx is non-fatal */ }
    }));
  }
  /** Single-tab guard: silence everything until reload. */
  mute() { this.enabled = false; try { void this.ctx?.suspend(); } catch { /* ignore */ } }
  /** build:qa only (window.eggfarmQa.audio.log, ui/qa-seam.ts): one {hook, file, tMs, semi} per source actually started; null in release. */
  qaLog: { hook: string; file: string; tMs: number; semi: number }[] | null = null;
  play(name: SfxName, minGapMs = 60) { return this.playFile(SFX[name], minGapMs, 0, name); }
  /** v5 F6 (overlay audio hooks): play an asset by file name; true iff a source was actually started (the QA audio.log contract).
   *  `semi` = pitch shift in semitones (playbackRate 2^(semi/12)); 0 (default) leaves the source untouched, as before F6. */
  playFile(f: string, minGapMs = 60, semi = 0, hook: string = f): boolean {
    if (!this.enabled || !this.ctx) return false; const buf = this.buffers.get(f); if (!buf) return false;
    const t = performance.now(); if (t - (this.lastPlay.get(f) ?? -1e9) < minGapMs) return false; this.lastPlay.set(f, t);
    const src = this.ctx.createBufferSource(); src.buffer = buf; if (semi) src.playbackRate.value = 2 ** (semi / 12);
    src.connect(this.ctx.destination); src.start(); this.qaLog?.push({ hook, file: f, tMs: t, semi }); return true;
  }
  /** v5 F6: load an extra asset registered by a feature's audio hook (no-op before unlock; unlock loads every SFX file). */
  load(f: string) { if (!this.ctx || this.buffers.has(f)) return;
    void (async () => { try { const r = await fetch(`${this.base}${f}.mp3`); this.buffers.set(f, await this.ctx!.decodeAudioData(await r.arrayBuffer())); } catch { /* missing sfx is non-fatal */ } })(); }
}
