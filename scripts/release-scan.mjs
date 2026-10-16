// Static scans shared by check-release-build (dist/ dir and single-file release .html).
// Heuristic: the runtime gate is still `npm run check-globals <engine>`; this catches the common/obfuscated shapes statically.
export const ALLOWED_GLOBALS = ['eggfarmExportTelemetry'];
const ROOTS = ['window', 'globalThis', 'self'];
const ID = '[A-Za-z_$][\\w$]*';
const esc = s => s.replace(/[$]/g, '\\$');

/** Evaluate a computed key made only of string literals joined by `+`; null when it is not constant. */
export function constKey(expr) {
  const parts = expr.trim().split(/\s*\+\s*/); let out = '';
  for (const p of parts) { const m = /^(['"`])((?:(?!\1)[^\\$]|\\.)*)\1$/.exec(p); if (!m) return null; out += m[2]; }
  return out;
}

/** Window-global writes: `window.x=`, `window['a'+'b']=`, `window[`a${x}`]=`, aliases (`h=window; h[k]=`), defineProperty/assign. */
export function findGlobalWrites(js, allowed = ALLOWED_GLOBALS) {
  const aliases = new Set([...js.matchAll(new RegExp(`(?:^|[^\\w$.])(${ID})\\s*=\\s*(?:${ROOTS.join('|')})(?![\\w$.\\[])`, 'g'))].map(m => m[1]));
  const bases = [...ROOTS, ...aliases].map(esc).join('|');
  const pre = `(?<![\\w$.])(?:${bases})`;
  const hits = [];
  for (const m of js.matchAll(new RegExp(`${pre}\\.(${ID})\\s*=(?!=)`, 'g'))) hits.push({ key: m[1], src: m[0] });
  for (const m of js.matchAll(new RegExp(`${pre}\\[([^\\]]{1,200})\\]\\s*=(?!=)`, 'g'))) hits.push({ key: constKey(m[1]) ?? `[computed ${m[1].trim()}]`, src: m[0] });
  for (const m of js.matchAll(new RegExp(`Object\\.(?:defineProperty|defineProperties|assign)\\(\\s*(?:${bases})\\s*,\\s*([^,)]{0,200})`, 'g'))) {
    const k = constKey(m[1]); hits.push({ key: k ?? `[defineProperty/assign ${m[1].trim().slice(0, 60)}]`, src: m[0] });
  }
  return hits.filter(h => !allowed.includes(h.key));
}

/** External references: http(s)/protocol-relative src/href/url(), static or dynamic imports and fetch() to absolute hosts. */
export function findExternalRefs(text) {
  const URL_ = `(?:https?:)?//[^\\s"'\`)]+`;
  const pats = [
    [`\\b(?:src|href|xlink:href|action|poster)\\s*=\\s*["']?(${URL_})`, 'attr'],
    [`\\burl\\(\\s*["']?(${URL_})`, 'css url()'],
    [`\\bimport\\s*\\(\\s*["'\`](${URL_})`, 'import()'],
    [`\\b(?:import|export)\\b[^;"'\`]{0,200}?\\bfrom\\s*["'\`](${URL_})`, 'import from'],
    [`\\bimport\\s*["'\`](${URL_})`, 'import'],
    [`@import\\s+(?:url\\()?["']?(${URL_})`, '@import'],
    [`\\bfetch\\s*\\(\\s*["'\`](${URL_})`, 'fetch'],
    [`\\b(?:new\\s+(?:WebSocket|EventSource|Worker)|sendBeacon|importScripts)\\s*\\(\\s*(?:[^,()]*,\\s*)?["'\`](${URL_})`, 'network'],
  ];
  const out = [];
  for (const [p, kind] of pats) for (const m of text.matchAll(new RegExp(p, 'gi'))) out.push({ kind, url: m[1] });
  return out;
}

/** Build ids embedded in the bundle. */
export const findBuildIds = js => [...new Set(js.match(/m\d+-rc\d[a-z0-9-]*\+(?:[0-9a-f]{7,40}|unknown)(?:\+dirty)?/g) ?? [])];
