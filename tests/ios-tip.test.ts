// AC14g detection with real user-agent strings + ?ios= debug flag (compiled out of release builds).
import { describe, it, expect } from 'vitest';
import { detectIos, resolveIos, shouldShowIosTip, howToText } from '../src/ui/ios-tip';
const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  // Home Screen web app: WebKit drops "Safari/..." and navigator.standalone === true
  iphoneStandalone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  ipadDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
  criOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1',
  fxiOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/143.0 Mobile/15E148 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
};
describe('detectIos (real UAs)', () => {
  it('iPhone Safari -> safari', () => expect(detectIos({ ua: UA.iphoneSafari, platform: 'iPhone', maxTouchPoints: 5, standalone: false })).toBe('safari'));
  it('iPhone standalone -> standalone', () => expect(detectIos({ ua: UA.iphoneStandalone, platform: 'iPhone', maxTouchPoints: 5, standalone: true })).toBe('standalone'));
  it('display-mode standalone also counts', () => expect(detectIos({ ua: UA.iphoneSafari, platform: 'iPhone', displayStandalone: true })).toBe('standalone'));
  it('iPadOS desktop UA (MacIntel + touch) -> safari', () => expect(detectIos({ ua: UA.ipadDesktop, platform: 'MacIntel', maxTouchPoints: 5, standalone: false })).toBe('safari'));
  it('real Mac Safari (no touch) -> no tip', () => expect(detectIos({ ua: UA.macSafari, platform: 'MacIntel', maxTouchPoints: 0 })).toBeNull());
  it('Chrome on iOS (CriOS) -> chrome (tip with address-bar line)', () => expect(detectIos({ ua: UA.criOS, platform: 'iPhone', maxTouchPoints: 5 })).toBe('chrome'));
  it('Firefox on iOS (FxiOS) -> chrome bucket', () => expect(detectIos({ ua: UA.fxiOS, platform: 'iPhone', maxTouchPoints: 5 })).toBe('chrome'));
  it('Android Chrome -> no tip', () => expect(detectIos({ ua: UA.androidChrome, platform: 'Linux armv81', maxTouchPoints: 5 })).toBeNull());
});
describe('copy + timing', () => {
  it('how-to lines', () => {
    expect(howToText('safari')).toBe('Tap Share, then Add to Home Screen.');
    expect(howToText('chrome')).toBe('Tap Share in the address bar, then Add to Home Screen.');
  });
  it('session 2+, not during FTUE, once', () => {
    expect(shouldShowIosTip('safari', 1, false, false)).toBe(false);
    expect(shouldShowIosTip('safari', 2, false, false)).toBe(true);
    expect(shouldShowIosTip('chrome', 2, false, false)).toBe(true);
    expect(shouldShowIosTip('safari', 2, true, false)).toBe(false);
    expect(shouldShowIosTip('safari', 3, false, true)).toBe(false);
    expect(shouldShowIosTip('standalone', 2, false, false)).toBe(false);
    expect(shouldShowIosTip(null, 2, false, false)).toBe(false);
  });
});
describe('?ios= debug flag', () => {
  const android = { ua: UA.androidChrome };
  it('overrides detection when enabled', () => {
    expect(resolveIos(android, '?ios=safari', true)).toBe('safari');
    expect(resolveIos(android, '?ios=chrome', true)).toBe('chrome');
    expect(resolveIos({ ua: UA.iphoneSafari }, '?ios=standalone', true)).toBe('standalone');
    expect(resolveIos(android, '?ios=bogus', true)).toBeNull();
  });
  it('ignored when disabled (release)', () => {
    expect(resolveIos(android, '?ios=safari', false)).toBeNull();
    expect(resolveIos({ ua: UA.iphoneSafari }, '?ios=standalone', false)).toBe('safari');
  });
});
