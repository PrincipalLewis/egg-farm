/** SFX (layout-spec §6): 11 mp3s, Web Audio, unlocked on the "Tap to start" gesture. */
export const SFX = {
  tapStart: 'sfx-tap-start', collect: 'sfx-collect-pop', sell: 'sfx-sell-coin', upgrade: 'sfx-upgrade',
  cantAfford: 'sfx-cant-afford', customerArrive: 'sfx-customer-arrive', customerLeave: 'sfx-customer-leave',
  coopFull: 'sfx-coop-full', uiOpen: 'sfx-ui-open', uiClose: 'sfx-ui-close', welcomeBack: 'sfx-welcome-back',
} as const;
export type SfxName = keyof typeof SFX;
export class Audio {
  private ctx: AudioContext | null = null; private buffers = new Map<string, AudioBuffer>(); private lastPlay = new Map<string, number>();
  enabled = true;
  constructor(private base: string) {}
  /** Must be called from a user gesture. */
  async unlock() {
    const AC = window.AudioContext || (window as any).webkitAudioContext; if (!AC) return;
    this.ctx ??= new AC(); if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});
    await Promise.all(Object.values(SFX).map(async f => {
      try { const r = await fetch(`${this.base}${f}.mp3`); this.buffers.set(f, await this.ctx!.decodeAudioData(await r.arrayBuffer())); } catch { /* missing sfx is non-fatal */ }
    }));
  }
  play(name: SfxName, minGapMs = 60) {
    if (!this.enabled || !this.ctx) return; const f = SFX[name], buf = this.buffers.get(f); if (!buf) return;
    const t = performance.now(); if (t - (this.lastPlay.get(f) ?? -1e9) < minGapMs) return; this.lastPlay.set(f, t);
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.connect(this.ctx.destination); src.start();
  }
}
