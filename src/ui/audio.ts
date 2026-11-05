/** SFX (layout-spec §6): 11 mp3s, Web Audio, unlocked on the "Tap to start" gesture.
 *  v5 ability.call (audio-hooks v1.5): sfx-ability-call-01..04, gain 0.6, ±15 cents. */
export const SFX = {
  tapStart: 'sfx-tap-start', collect: 'sfx-collect-pop', sell: 'sfx-sell-coin', upgrade: 'sfx-upgrade',
  cantAfford: 'sfx-cant-afford', customerArrive: 'sfx-customer-arrive', customerLeave: 'sfx-customer-leave',
  coopFull: 'sfx-coop-full', uiOpen: 'sfx-ui-open', uiClose: 'sfx-ui-close', welcomeBack: 'sfx-welcome-back',
  workerYawn: 'sfx-worker-yawn',
  /** Rush / Sweep / Shout / Inspect — one file per call (Activate-all uses first fired). */
  abilityCall1: 'sfx-ability-call-01', abilityCall2: 'sfx-ability-call-02',
  abilityCall3: 'sfx-ability-call-03', abilityCall4: 'sfx-ability-call-04',
} as const;
export type SfxName = keyof typeof SFX;

/** Worker call order for ability.call file pick (01=Rush … 04=Inspect). */
export const ABILITY_CALL_SFX: readonly SfxName[] = ['abilityCall1', 'abilityCall2', 'abilityCall3', 'abilityCall4'];

export interface PlayOpts {
  gain?: number;
  /** Cents; converted to playbackRate via 2^(cents/1200). */
  detuneCents?: number;
}

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
  play(name: SfxName, minGapMs = 60, opts?: PlayOpts) {
    if (!this.enabled || !this.ctx) return; const f = SFX[name], buf = this.buffers.get(f); if (!buf) return;
    const t = performance.now(); if (t - (this.lastPlay.get(f) ?? -1e9) < minGapMs) return; this.lastPlay.set(f, t);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    if (opts?.detuneCents) src.playbackRate.value = Math.pow(2, opts.detuneCents / 1200);
    const gain = this.ctx.createGain();
    gain.gain.value = opts?.gain ?? 1;
    src.connect(gain); gain.connect(this.ctx.destination); src.start();
  }
  /**
   * ability.call (audio-hooks v1.5): gain 0.6, ±15 cents, 1 voice, mute respected.
   * `callIndex` 0..3 → Rush..Inspect; Activate-all passes the first fired card's index once.
   * No ducking bus yet (rank system not in slim Audio) — gain/detune/mute only.
   */
  playAbilityCall(callIndex: number) {
    const i = ((callIndex % 4) + 4) % 4;
    const detune = (Math.random() * 30 - 15); // ±15 cents
    this.play(ABILITY_CALL_SFX[i], 0, { gain: 0.6, detuneCents: detune });
  }
}
