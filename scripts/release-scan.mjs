// Static scans shared by check-release-build (dist/ dir and single-file release .html).
//
// Window globals: flags writes to the global object through its roots (window, globalThis, self, top, parent, frames),
// incl. `(0,window).x`, `globalThis.window.x`, `window . x`, computed/nested keys (`window[a[0]]=`, `window['a'+'b']=`,
// window[`eggfarm${x}`]=), every assignment operator (= ||= &&= ??= += … ++ --), Reflect.set, Object.defineProperty/
// defineProperties/assign, and aliases (`h=window`, `h=typeof window<"u"?window:globalThis`, `h=Function("return this")()`).
// ACCEPTED GAP (minifiers reuse short names, so `t` may be window here and a DOM node there): through an ALIAS only
// eggfarm* keys are flagged (`h.eggfarmX=`, `h['eggfarm'+'X']=`, h[`eggfarm${x}`]=, defineProperty(h,'eggfarmX')).
// `h.dbg=1`, `h[k]=` with a variable key, and window passed in as a function parameter are NOT caught statically.
// The runtime gate `npm run check-globals <engine>` (own-property diff of window) stays authoritative.
export const ALLOWED_GLOBALS = ['eggfarmExportTelemetry'];
const ID = '[A-Za-z_$][\\w$]*';
const ASSIGN = '(?:\\+\\+|--|(?:\\*\\*|<<|>>>?|\\|\\||&&|\\?\\?|[-+*/%&|^])?=(?![=>]))';
const esc = s => s.replace(/[$]/g, '\\$');

/** Evaluate a key made only of string literals joined by `+`; null when not constant. */
export function constKey(expr) {
  const parts = expr.trim().split(/\s*\+\s*/); let out = '';
  for (const p of parts) { const m = /^(['"`])((?:(?!\1)[^\\$]|\\.)*)\1$/.exec(p); if (!m) return null; out += m[2]; }
  return out;
}
/** Index just past the bracket/brace/paren matching s[i]; -1 if unbalanced. Skips simple string literals. */
function close(s, i) {
  const open = s[i], shut = { '[': ']', '{': '}', '(': ')' }[open]; let d = 0;
  for (let j = i; j < s.length && j < i + 4000; j++) {
    const c = s[j];
    if (c === '"' || c === "'" || c === '`') { const q = c; for (j++; j < s.length && s[j] !== q; j++) if (s[j] === '\\') j++; continue; }
    if (c === open) d++; else if (c === shut && --d === 0) return j + 1;
  }
  return -1;
}
/** Top-level keys of an object literal `{a:1,"b":2,c}`; null if it has spreads/computed keys. */
function objKeys(lit) {
  const body = lit.slice(1, -1); const keys = []; let d = 0, start = 0; const parts = [];
  for (let j = 0; j < body.length; j++) { const c = body[j];
    if (c === '"' || c === "'" || c === '`') { const q = c; for (j++; j < body.length && body[j] !== q; j++) if (body[j] === '\\') j++; continue; }
    if ('[{('.includes(c)) d++; else if (']})'.includes(c)) d--; else if (c === ',' && d === 0) { parts.push(body.slice(start, j)); start = j + 1; } }
  parts.push(body.slice(start));
  for (const p of parts.map(x => x.trim()).filter(Boolean)) {
    const m = /^(?:(['"])([^'"]*)\1|([A-Za-z_$][\w$]*))\s*(?::|\(|$)/.exec(p); if (!m) return null; keys.push(m[2] ?? m[3]);
  }
  return keys;
}

/** Normalize shapes that are equivalent to a bare root. */
export function normalize(js) {
  return js
    .replace(/(?<=[\w$\])])\s*\.(?!\.)\s*(?=[A-Za-z_$])/g, '.')
    .replace(/\bFunction\s*\(\s*(['"`])return this\1\s*\)\s*\(\s*\)/g, 'globalThis')
    .replace(/\(\s*0\s*,\s*(window|globalThis|self|top|parent|frames)\s*\)/g, '$1')
    .replace(/\b(?:window|globalThis|self|top|parent|frames)\.(?:window|globalThis|self)\b(?![\w$])/g, 'window')
    .replace(/typeof\s+(?:window|globalThis|self)\s*(?:[!=]==?|[<>]=?)\s*(['"])[a-z]+\1\s*\?\s*(window|globalThis|self)\s*:\s*(?:window|globalThis|self|this|\{\}|void 0|null|undefined)(?![\w$.\[(])/g, '$2');
}

export function findGlobalWrites(src, allowed = ALLOWED_GLOBALS) {
  const js = normalize(src);
  // m3: a local `self` (var self=this / function param) is not the global.
  const localSelf = /\b(?:var|let|const)\s+self\b|\bfunction\b[\w$\s]*\([^()]*\bself\b[^()]*\)|\([^()]*\bself\b[^()]*\)\s*=>|\bself\s*=>/.test(js);
  const roots = ['window', 'globalThis', 'top', 'parent', 'frames', ...(localSelf ? [] : ['self'])];
  const R = roots.join('|');
  const aliases = new Set([...js.matchAll(new RegExp(`(?:^|[^\\w$.])(${ID})\\s*=\\s*(?:${R})(?![\\w$.\\[(])`, 'g'))].map(m => m[1]).filter(a => !roots.includes(a)));
  const A = [...aliases].map(esc).join('|') || '(?!)';
  const hits = []; const hit = (key, src) => { if (!allowed.includes(key)) hits.push({ key, src }); };
  const isEgg = k => /^eggfarm/.test(k);
  // dotted writes
  for (const m of js.matchAll(new RegExp(`(?<![\\w$.])(?:${R})\\.(${ID})\\s*${ASSIGN}`, 'g'))) hit(m[1], m[0]);
  for (const m of js.matchAll(new RegExp(`(?<![\\w$.])(?:${A})\\.(eggfarm[\\w$]*)\\s*${ASSIGN}`, 'g'))) hit(m[1], m[0]);
  // bracket writes (balanced, so window[a[0]]= is seen)
  for (const [base, isRoot] of [[R, true], [A, false]]) for (const m of js.matchAll(new RegExp(`(?<![\\w$.])(?:${base})\\s*(?=\\[)`, 'g'))) {
    const i = m.index + m[0].length, j = close(js, i); if (j < 0) continue;
    if (!new RegExp(`^\\s*${ASSIGN}`).test(js.slice(j, j + 5))) continue;
    const expr = js.slice(i + 1, j - 1), k = constKey(expr), s = js.slice(m.index, j + 3);
    if (isRoot) hit(k ?? `[computed ${expr.trim()}]`, s);
    else if (k !== null ? isEgg(k) : /['"`]eggfarm/.test(expr)) hit(k ?? `[computed ${expr.trim()}]`, s);
  }
  // Reflect.set / Object.defineProperty / defineProperties / assign
  for (const m of js.matchAll(new RegExp(`\\b(Reflect\\.set|Reflect\\.defineProperty|Object\\.defineProperty|Object\\.defineProperties|Object\\.assign)\\s*\\(\\s*(${R}|${A})\\s*,\\s*`, 'g'))) {
    const isRoot = roots.includes(m[2]); const rest = js.slice(m.index + m[0].length); const s = m[0] + rest.slice(0, 60);
    let keys;
    if (/defineProperties|assign/.test(m[1])) { keys = rest[0] === '{' ? (() => { const j = close(rest, 0); return j < 0 ? null : objKeys(rest.slice(0, j)); })() : null; }
    else { const k = /^((?:(['"`])(?:(?!\2)[^\\]|\\.)*\2\s*\+?\s*)+)/.exec(rest); keys = k ? [constKey(k[1].replace(/\+\s*$/, ''))] : null; }
    if (!keys || keys.includes(null)) { if (isRoot) hit(`[${m[1]} non-literal]`, s); continue; }
    for (const k of keys) if (isRoot || isEgg(k)) hit(k, s);
  }
  return hits;
}

/** External references (http(s), ws(s), protocol-relative) in markup, CSS and JS. */
export function findExternalRefs(text) {
  const URL_ = `(?:(?:https?|wss?):)?//[^\\s"'\`)>,]*`;
  const Q = `["'\`]`;
  const pats = [
    [`\\b(?:src|href|xlink:href|action|formaction|poster|background|manifest)\\s*=\\s*["']?(${URL_})`, 'attr'],
    [`\\bsrcset\\s*=\\s*["']?[^"'>]*?(${URL_})`, 'srcset'],
    [`<object\\b[^>]*?\\bdata\\s*=\\s*["']?(${URL_})`, 'object data'],
    [`http-equiv\\s*=\\s*["']?refresh[^>]*?url\\s*=\\s*["']?(${URL_})`, 'meta refresh'],
    [`\\burl\\(\\s*["']?(${URL_})`, 'css url()'],
    [`@import\\s+(?:url\\()?\\s*["']?(${URL_})`, '@import'],
    [`\\bimport\\s*\\(\\s*${Q}(${URL_})`, 'import()'],
    [`\\b(?:import|export)\\b[^;"'\`]{0,200}?\\bfrom\\s*${Q}(${URL_})`, 'import from'],
    [`\\bimport\\s*${Q}(${URL_})`, 'import'],
    [`\\bfetch\\s*\\(\\s*(?:new\\s+URL\\s*\\(\\s*)?${Q}(${URL_})`, 'fetch'],
    [`\\.open\\s*\\(\\s*${Q}[A-Za-z]+${Q}\\s*,\\s*${Q}(${URL_})`, 'XHR open'],
    [`\\b(?:new\\s+(?:WebSocket|EventSource|Worker|SharedWorker)|sendBeacon|importScripts)\\s*\\(\\s*(?:[^,()]*,\\s*)?${Q}(${URL_})`, 'network'],
    [`${Q}((?:wss?):\\/\\/[^"'\`]*)`, 'ws url'],
    [`(?:\\.src|\\.href|\\blocation)\\s*=\\s*${Q}(${URL_})`, 'js src/href'],
    [`\\bopen\\s*\\(\\s*${Q}(${URL_})`, 'window.open'],
    [`[#@]\\s*sourceMappingURL\\s*=\\s*(\\S+)`, 'sourceMappingURL'],
  ];
  const out = [];
  for (const [p, kind] of pats) for (const m of text.matchAll(new RegExp(p, 'gi'))) {
    if (kind !== 'sourceMappingURL' && !/^(?:(?:https?|wss?):)?\/\//i.test(m[1])) continue; out.push({ kind, url: m[1] });
  }
  return out;
}

/** Build ids embedded in the bundle. */
export const findBuildIds = js => [...new Set(js.match(/m\d+-rc\d[a-z0-9-]*\+(?:[0-9a-f]{7,40}|unknown)(?:\+dirty)?/g) ?? [])];

/** Inline <script> bodies of a single-file html. Throws (fail closed) when the markup can't be split unambiguously. */
export function extractScripts(html) {
  const opens = (html.match(/<script\b/gi) ?? []).length, closes = (html.match(/<\/script\s*>/gi) ?? []).length;
  const bodies = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(m => m[1]);
  if (opens !== closes || bodies.length !== opens) throw new Error(`unbalanced <script> tags (${opens} open, ${closes} close) - a literal "</script" inside inline JS? escape it as <\\/script`);
  if (bodies.some(b => /<script\b/i.test(b))) throw new Error('nested "<script" inside an inline script - escape it as <\\/script / <\\script');
  return bodies;
}
