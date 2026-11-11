
(() => {
const NEG = new URLSearchParams(location.search).get('neg') ?? '';
const FATIGUE_SUBLINE_MIN_H = 740;                                  // single constant (spec §4.8 L152)
const MQ = `(max-height: ${FATIGUE_SUBLINE_MIN_H - 1 + (NEG === 'chip740' ? 1 : 0)}px)`;
const bucket = h => (NEG === 'bucket' ? h <= 740 : h < FATIGUE_SUBLINE_MIN_H) ? '<740' : h <= 899 ? '740-899' : '>=900';
const $ = s => document.querySelector(s); const EV = []; const tel = (type, o = {}) => EV.push({ type, ts: performance.now(), ...o });
const css = document.createElement('style');
const variantCss = b => `${b} .hud .fchip{display:none} ${b}:not([data-cue=none]) .hud .fchip{display:flex} ${b} .fslot{display:none}`;
css.textContent = (NEG === 'debounce' ? variantCss('body.short') : `@media ${MQ}{${variantCss('body')}}`)
  + (NEG === 'rmscale' ? `.fpop:not([hidden]){animation:fcpop 1s}` : `@media (prefers-reduced-motion: no-preference){.fpop:not([hidden]){animation:fcpop 1s}} @media (prefers-reduced-motion: reduce){.fpop:not([hidden]){animation:fcfade 1s}}`)
  + (NEG === 'labelclip' ? `.fpop-t{max-width:40px}` : '') + (NEG === 'geom' ? `.hud .fchip{left:220.4px}` : '');
document.head.append(css);
if (NEG === 'debounce') { let t; const f = () => { clearTimeout(t); t = setTimeout(() => document.body.classList.toggle('short', innerHeight <= 739), 300); }; addEventListener('resize', f); document.body.classList.toggle('short', innerHeight <= 739); }
if (NEG === 'sub740') { const mv = { queue: 102, toast: 183, full: 197.5, henpill: 399 }; for (const [k, t] of Object.entries(mv)) $('#' + k).style.top = t + 'px'; $('#scene').style.top = '183px'; $('#scene').style.height = '241px'; css.textContent += `.fslot{display:flex!important}`; }
const hens = [[50,286],[60,150],[110,150],[160,150],[210,150],[170,250],[260,150],[300,150],[190,250],[175,256],[185,256],[180,262]];
for (const [x, y] of hens) { const s = document.createElement('span'); s.style.left = (x - 12) + 'px'; s.style.top = (y - 12) + 'px'; $('#yard').append(s); }
const SPOTS = [[50,239],[50,286],[50,332],[50,378],[310,239],[310,286],[310,332],[310,378]];
const g = window.eggfarm = { state: { coinsCents: 100000, basket: 20, farmLevel: 3, goldenEgg: null, qaFarmCostCents: 300 }, telemetry: { events: () => EV.slice() }, debugAdvance() {} };
const X = '$999.9K'; const SENT = tail => `${cue === 'asleep' ? 'Asleep and tired' : 'Tired'} workers are costing ${X} per second. ${tail}`;
let cue = 'none', shown = false, stall = false, sheetN = 0; const ep = { share: 0, hs: 0, hc: 0, inEp: false };
// values are read NOW (spec c29c9285 note 3 (a)); loss_per_s = share x 499950 cents (0.2 -> 99990). NEG tapstale = tapped copies the shown payload (stale values)
const lossNow = () => ({ loss_per_s: Math.round(ep.share * 499950), loss_share: Math.round(ep.share * 1000) / 1000, n_tired: 1, n_asleep: cue === 'asleep' ? 1 : 0, n_paused: 0 }); let lastShown = null;
const lossTel = () => NEG === 'tapmin' ? { surface: 'hud_chip', loss_per_s: lossNow().loss_per_s } : NEG === 'tapstale' && lastShown ? { surface: 'hud_chip', ...lastShown } : { surface: 'hud_chip', ...lossNow(), ...(NEG === 'tapsup' ? { suppressed_by_stall: false } : {}) };
const chip = $('#fchip'), pop = $('#fc-pop'), pill = $('#fpill');
function render() { const s = g.state; $('#coins').textContent = '$' + (s.coinsCents / 100).toFixed(2); $('#basket').textContent = s.basket;
  $('#rate').textContent = NEG === 'ratex' ? `\u2212${X}/s` : '$12.4K/s';
  $('#sellAll').textContent = s.basket > 0 ? `Sell all (${s.basket}\u00a0eggs\u00a0· $${(s.basket * 10 / 100).toFixed(2)})` : 'No eggs to sell';
  $('#fc-name').textContent = NEG === 'oldname' ? SENT('Open workers.') : SENT('Show details.'); $('#fc-desc').textContent = `Tired \u2212${X}/s`; $('#fpill-desc').textContent = SENT('Open workers.');
  pill.querySelector('.fp-t').textContent = (innerWidth >= 400 && NEG !== 'sub400' ? `Tired workers \u2212${X}/s` : `Tired \u2212${X}/s`) + (NEG === 'subsr' ? ' ' : ''); if (NEG === 'subsr' && !pill.querySelector('.sr')) pill.insertAdjacentHTML('beforeend', '<span class="sr">Open workers.</span>'); if (NEG === 'dialog') pop.setAttribute('role', 'dialog'); pop.querySelector('.fp-x').textContent = `Tired \u2212${X}/s`;
  if (NEG === 'arialabel') chip.setAttribute('aria-label', 'Tired workers'); if (NEG === 'coinsbtn') { $('.pill.coins').setAttribute('tabindex', '0'); $('.pill.coins').setAttribute('role', 'button'); }
  const tc = $('#tc'); if (s.goldenEgg) { const [x, y] = SPOTS[s.goldenEgg.spot]; tc.style.left = (x - 28) + 'px'; tc.style.top = (y - 28) + 'px'; tc.style.display = 'block'; } else tc.style.display = 'none'; }
window.eggfarmUi = { render };
const isOpen = () => !pop.hidden;
function openPop() { pop.hidden = false; const cr = chip.getBoundingClientRect(), hud = $('.hud').getBoundingClientRect(); const w = pop.offsetWidth;   // layout width (the 1.05 scale-in would inflate getBoundingClientRect)
  pop.style.left = Math.max(8, Math.min(cr.right - w, innerWidth - 8 - w)) + 'px'; pop.style.top = (NEG === 'cover' ? 190 : hud.bottom + 6) + 'px'; chip.setAttribute('aria-expanded', 'true'); chip.focus();
  if (NEG === 'shift') $('#queue').style.top = '76px'; if (NEG === 'timeout') setTimeout(closePop, 3000); }
function closePop() { pop.hidden = true; chip.setAttribute('aria-expanded', 'false'); if (NEG === 'shift') $('#queue').style.top = '66px'; }
chip.addEventListener('click', () => { const was = isOpen(); if (!(was && NEG === 'tapclose')) tel('fatigue_cue_tapped', lossTel()); was ? closePop() : openPop(); });
document.addEventListener('pointerdown', e => { if (!isOpen() || pop.contains(e.target) || chip.contains(e.target)) return; closePop();
  if (NEG === 'swallow') addEventListener('click', ev => { ev.stopImmediatePropagation(); ev.preventDefault(); }, { capture: true, once: true });
  if (NEG === 'double') { const b = e.target.closest('button'); if (b) setTimeout(() => b.click(), 0); } }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { closePop(); chip.focus(); if (NEG === 'esclog') tel('fatigue_cue_tapped', lossTel()); }
  if (NEG === 'trap' && e.key === 'Tab' && isOpen() && document.activeElement === pop.querySelector('.fpop-manage')) { e.preventDefault(); pop.querySelector('.fpop-manage').focus(); } });
let lastFocus = null; document.addEventListener('focusin', e => { lastFocus = e.target; });
const mq = matchMedia(MQ); mq.addEventListener('change', () => { const ae = document.activeElement && document.activeElement !== document.body ? document.activeElement : lastFocus; const wasChip = ae === chip, wasPill = ae === pill, inPop = !!ae && pop.contains(ae);
  if (NEG !== 'resizeopen') closePop(); requestAnimationFrame(() => { if (wasChip && !mq.matches) pill.focus(); else if (wasPill && mq.matches) chip.focus(); else if (inPop && !mq.matches) pill.focus(); }); render(); });
addEventListener('resize', () => render());
function openSheet(id) { for (const s of document.querySelectorAll('.sheet:not(.docked)')) s.hidden = s.id !== id; }
for (const b of document.querySelectorAll('.sheet .close')) b.addEventListener('click', () => { b.closest('.sheet').hidden = true; });
$('[data-nav=upgrades]').addEventListener('click', () => openSheet('p-upgrades')); $('[data-nav=market]').addEventListener('click', () => openSheet('p-market'));
$('[data-nav=workers]').addEventListener('click', () => openSheet('p-workers')); $('#settings').addEventListener('click', () => openSheet('p-settings'));
pill.addEventListener('click', () => { tel('fatigue_cue_tapped', lossTel()); if (NEG === 'tapnav') { openPop(); return; } const l = $('#p-workers .list'); l.innerHTML = [['Market Hand', 1200], ['Coop Hand', 800], ['Hawker', 300]].map(([n, r]) => `<button class="wk" type="button" data-risk="${r}">${n}</button>`).join(''); openSheet('p-workers'); });
const AT_RISK = { market_hand: 100, coop_hand: 500, hawker: 500, grader: 0 };   // tie coop_hand = hawker: code id order -> coop_hand; rc2 row order (hawker first) -> hawker
pop.querySelector('.fpop-manage').addEventListener('click', () => { closePop(); openSheet('p-shift'); const rows = [...document.querySelectorAll('#p-shift h3')]; const max = Math.max(...Object.values(AT_RISK));
  const tgt = NEG === 'rowtie' ? rows.find(h => AT_RISK[h.dataset.worker] === max) : rows.find(h => h.dataset.worker === ['market_hand', 'coop_hand', 'hawker', 'grader'].find(k => AT_RISK[k] === max)); tgt.scrollIntoView({ block: 'nearest' }); tgt.focus(); tel('shift_sheet_opened', { entry: 'fatigue_chip', sheet_id: 'k' + (++sheetN) }); });
$('#shiftRefill').addEventListener('click', () => tel('refill_used', { worker: 'coop_hand', by: 'manual', entry_point: 'fatigue_chip', sheet_id: 'k' + sheetN }));
function setCue(st) { cue = st; document.body.dataset.cue = st; chip.querySelector('svg').dataset.icon = st === 'asleep' ? 'ico_fatigue_zzz.svg' : 'ico_fatigue_sweat.svg'; if (st === 'none') closePop(); render(); }
function epStart() { ep.inEp = true; ep.hc = 0; shown = true; lastShown = lossNow(); tel('fatigue_cue_shown', { surface: 'hud_chip', ...lastShown, suppressed_by_stall: stall }); }
g.debugAdvance = ms => { const dt = ms / 1000; if (!ep.inEp) { ep.hs = ep.share >= 0.15 ? ep.hs + dt : 0; if (ep.hs >= 5 - 1e-9) { epStart(); setCue('tired'); } } else { ep.hc = ep.share < 0.12 ? ep.hc + dt : 0; if (ep.share < 0.12 && (NEG === 'nohyst' || ep.hc >= 2 - 1e-9)) { ep.inEp = false; ep.hs = 0; shown = false; setCue('none'); } } };
function stallSet(on) { const ae = document.activeElement; const wasCue = !!ae && (ae === chip || ae === pill || pop.contains(ae)); stall = on; document.body.dataset.stall = on ? '1' : '0';
  if (on) { if (NEG !== 'stallkeep') closePop(); if (wasCue) $('#stallchip').focus(); } else if (NEG === 'refire' && shown) tel('fatigue_cue_shown', { surface: 'hud_chip', suppressed_by_stall: false }); render(); return true; }
const dockMq = matchMedia('(min-width: 960px) and (orientation: landscape)'); const dock = () => { for (const id of ['p-upgrades', 'p-market']) { const e = $('#' + id); e.classList.toggle('docked', dockMq.matches); if (dockMq.matches) e.hidden = false; } }; dockMq.addEventListener('change', dock); dock();
$('#tc').addEventListener('click', () => { const s = g.state; if (!s.goldenEgg) return; s.coinsCents += s.goldenEgg.rewardCents; tel('collectible_collected', { skin: 'golden_egg' }); s.goldenEgg = null; render(); });
$('#buyFarm').addEventListener('click', () => { const s = g.state; s.coinsCents -= s.qaFarmCostCents; s.farmLevel++; tel('upgrade_bought', { track: 'farm' }); s.qaFarmCostCents = 100 * (s.farmLevel); render(); });
$('#sellAll').addEventListener('click', () => { const s = g.state; if (s.basket <= 0) return; s.coinsCents += s.basket * 10; tel('sell_all', { source: 'sell_all', eggs: s.basket }); s.basket = 0; render(); });
window.eggfarmQa = { fatigue: { force(st) { const prev = cue; if (st === 'none') { ep.share = 0; ep.inEp = false; ep.hs = 0; shown = false; setCue('none'); } else { ep.share = 0.2; cue = st; if (!shown) epStart(); setCue(st); } return prev; },
    setShare(x) { ep.share = x; return true; }, read() { return lossNow(); } },
  sheetRefill: null, stall: { force(on) { return stallSet(!!on); } }, workers: { atRisk() { return { ...AT_RISK }; } },
  tc: { spawn({ spot }) { g.state.goldenEgg = { spot, rewardCents: 2500 }; render(); return true; } }, layout: { showZones() { return true; } } };
tel('session_start', { viewport_w: innerWidth, viewport_h: bucket(innerHeight) });
render();
})();
