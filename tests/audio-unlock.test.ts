import { describe, it, expect, vi } from 'vitest';
import { withTimeout, AUDIO_UNLOCK_MS, Audio } from '../src/ui/audio';

describe('PT1-3 audio unlock timeout', () => {
  it('AUDIO_UNLOCK_MS is 500', () => { expect(AUDIO_UNLOCK_MS).toBe(500); });
  it('withTimeout resolves undefined when the promise never settles', async () => {
    const hung = new Promise<string>(() => {}); // never resolves
    const t0 = Date.now();
    const v = await withTimeout(hung, 50);
    expect(v).toBeUndefined();
    expect(Date.now() - t0).toBeGreaterThanOrEqual(45);
    expect(Date.now() - t0).toBeLessThan(200);
  });
  it('withTimeout returns the value when the promise wins', async () => {
    expect(await withTimeout(Promise.resolve('ok'), 500)).toBe('ok');
  });
  it('unlock returns within ~AUDIO_UNLOCK_MS when resume never resolves', async () => {
    const resume = vi.fn(() => new Promise<void>(() => {})); // hung resume
    const AC = vi.fn(function (this: any) {
      this.state = 'suspended';
      this.resume = resume;
      this.decodeAudioData = vi.fn();
      this.createBufferSource = vi.fn();
      this.destination = {};
    });
    vi.stubGlobal('window', { AudioContext: AC, webkitAudioContext: undefined });
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))); // hung fetch too
    const audio = new Audio('/assets/audio/');
    const t0 = Date.now();
    await audio.unlock();
    const elapsed = Date.now() - t0;
    expect(resume).toHaveBeenCalled();
    expect(elapsed).toBeGreaterThanOrEqual(AUDIO_UNLOCK_MS - 30);
    expect(elapsed).toBeLessThan(AUDIO_UNLOCK_MS + 200);
    vi.unstubAllGlobals();
  });
});
