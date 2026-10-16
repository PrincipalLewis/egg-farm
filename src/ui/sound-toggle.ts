/** Settings 'Sound' toggle (audio-hooks v1.1 / juice-spec §4): speaker icon (slashed when off), visible On/Off text, never 'SFX'.
 *  44px target, focus ring (CSS .sound-toggle:focus-visible), aria-pressed; state is text + icon, never colour only. */
const SPEAKER = (on: boolean) => `<svg class="spk" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${on
  ? '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'
  : '<path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'}</svg>`;
export const soundToggleHtml = (on: boolean) =>
  `<button type="button" class="toggle sound-toggle" id="sSound" aria-pressed="${on}" aria-label="Sound"><span class="lbl">${SPEAKER(on)}Sound</span><span class="state" aria-hidden="true">${on ? 'On' : 'Off'}</span></button>`;
