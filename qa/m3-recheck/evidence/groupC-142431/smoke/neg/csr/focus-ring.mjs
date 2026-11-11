// [v5-ui harness-rc-next, NEW 2026-10-30, HoQ QA-D-1030-HARNESS-RC-7 (d), REQUIRED] Pure focus-ring decision for csr-spot.mjs (unit-tested in
// tests/csr-focus-ring.test.mjs, no browser). A keyboard focus is VISIBLE only if (1) the focused element matches :focus-visible AND (2) it shows an
// outline or ring that DIFFERS from the same element's UNFOCUSED computed style: an outline (style != none, width > 0) whose style/width/colour/offset
// differ from the unfocused outline, or (RC-13) a box-shadow RING layer added on focus (spread >= 1px, alpha > 0). The element's normal drop shadow
// (same box-shadow focused and unfocused) never counts. A missing unfocused baseline is a FAIL (cannot prove a difference).
// Replaces csr-spot.mjs:47 `visibleRing`, which passed any non-none box-shadow (the drop shadow) -> the 6 Firefox explainer focus passes in the
// 76390f2 pre-run are VOID (REVIEW §21.3).
export const RING_RULE = 'QA-D-1030-HARNESS-RC-7 (d): :focus-visible AND outline/ring differing from the unfocused computed style; drop shadow never counts; RC-13: a box-shadow counts only as an ADDED ring layer (spread >= 1px, alpha > 0)';
const px = v => parseFloat(v) || 0;
// box-shadow layers (computed style: "<color> <x> <y> <blur> <spread> [inset]", comma-separated outside parentheses)
export function shadowLayers(bs) { if (!bs || bs === 'none') return []; const out = []; let d = 0, cur = '';
  for (const ch of bs) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim());
  return out.map(raw => { const col = (raw.match(/(rgba?|hsla?)\([^)]*\)|#[0-9a-f]{3,8}\b|transparent/i) ?? [''])[0]; const lens = raw.replace(col, ' ').replace(/inset/, ' ').trim().split(/\s+/).filter(Boolean).map(px);
    const a = /^transparent$/i.test(col) ? 0 : (/^(rgba|hsla)\(/i.test(col) || col.includes('/')) ? parseFloat(col.split(/[,/]/).pop()) : 1;
    return { raw, color: col, alpha: Number.isFinite(a) ? a : 1, blur: lens[2] ?? 0, spread: lens[3] ?? 0 }; }); }
export const isRing = l => l.spread >= 1 && l.alpha > 0;
export function ringDecision(f, base) {
  if (!f) return { ok: false, why: 'no focused element' };
  if (f.focusVisible !== true) return { ok: false, why: ':focus-visible does not match' };
  if (!base) return { ok: false, why: 'no unfocused baseline for this element' };
  const o = f.outlineParts ?? {}, ob = base.outlineParts ?? {};
  const outlineOn = o.style && o.style !== 'none' && px(o.width) > 0;
  const outlineDiff = outlineOn && (o.style !== ob.style || o.width !== ob.width || o.color !== ob.color || (o.offset ?? '') !== (ob.offset ?? '') || ob.style === 'none' || px(ob.width) === 0);
  const shadowOn = !!f.boxShadow && f.boxShadow !== 'none';
  // RC-13 (Architect 71b45fce n3, HoQ 12:01): a box-shadow counts only if focus ADDS a RING layer - a layer absent from the unfocused shadow with a
  // spread >= 1px and a visible colour (alpha > 0). A changed/transitioning/pressed drop shadow (spread 0) or a transparent layer never counts.
  const baseLayers = new Set(shadowLayers(base.boxShadow).map(l => l.raw));
  const shadowDiff = shadowOn && shadowLayers(f.boxShadow).some(l => !baseLayers.has(l.raw) && isRing(l));
  if (outlineDiff) return { ok: true, why: 'outline differs from unfocused' };
  if (shadowDiff) return { ok: true, why: 'box-shadow ring differs from unfocused' };
  return { ok: false, why: outlineOn || shadowOn ? 'outline/box-shadow identical to the unfocused style (e.g. the normal drop shadow)' : 'no outline, no box-shadow' };
}
