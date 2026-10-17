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
export const MAX_KEY = 4000;
function close(s, i) {
  const open = s[i], shut = { '[': ']', '{': '}', '(': ')' }[open]; let d = 0;
  for (let j = i; j < s.length && j < i + MAX_KEY; j++) {
    const c = s[j];
    if (c === '"' || c === "'" || c === '`') { const q = c; for (j++; j < s.length && s[j] !== q; j++) if (s[j] === '\\') j++; continue; }
    // L-3 (QA): a comment inside the key (`window[k // ]\n]=1`, `window[k /* ] */]=1`) must not end the bracket early.
    if (c === '/' && s[j + 1] === '/') { const e = s.indexOf('\n', j); if (e < 0) return -1; j = e; continue; }
    if (c === '/' && s[j + 1] === '*') { const e = s.indexOf('*/', j + 2); if (e < 0) return -1; j = e + 1; continue; }
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
    const i = m.index + m[0].length, j = close(js, i);
    // N1/N2 (CCR): unbalanced or over-long key (regex literal with ], huge expression) - fail closed, flag as unparsed.
    if (j < 0) { if (isRoot || /['"`]eggfarm/.test(js.slice(i, i + 200))) hits.push({ key: '[unparsed key]', src: js.slice(m.index, m.index + 60) }); continue; }
    if (!new RegExp(`^\\s*${ASSIGN}`).test(js.slice(j, j + 5))) {
      // N1 (CCR): a regex literal in the key (window[/]/.source]=, window[k.replace(/[\]]/g,'')]=) ends the bracket early;
      // if a `]=` follows in the same statement, fail closed.
      if (js.slice(i, j).includes('/') && new RegExp(`^[^;\\n]{0,${MAX_KEY}}?\\]\\s*${ASSIGN}`).test(js.slice(j, j + MAX_KEY)) && (isRoot || /['"`]eggfarm/.test(js.slice(i, i + 200))))
        hits.push({ key: '[unparsed key]', src: js.slice(m.index, m.index + 60) });
      continue;
    }
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

/** Single-file only: any asset/font URL that was not inlined (QA F1). Markup + CSS: every url(), src, href, srcset, poster,
 *  <object data> must be data:/blob:/#/about:/javascript:/mailto: (external http(s) is findExternalRefs' job). JS: string
 *  literals naming a concrete asset file (./assets/x.svg, ../fonts/x.woff2) left behind. `url(.data:` is caught as relative. */
export function findUnresolvedRefs(html, scripts = []) {
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '<script></script>');
  const ok = u => /^(?:data:|blob:|#|about:|javascript:|mailto:|(?:https?:|wss?:)?\/\/)/i.test(u) || u === '';
  const out = [];
  for (const m of markup.matchAll(/\burl\(\s*(["']?)([^"')]*)\1\s*\)/gi)) if (!ok(m[2].trim())) out.push({ kind: 'url()', url: m[2] });
  for (const m of markup.matchAll(/@import\s+(["'])([^"']+)\1/gi)) if (!ok(m[2])) out.push({ kind: '@import', url: m[2] });
  for (const m of markup.matchAll(/<[a-z][^>]*>/gi)) for (const a of m[0].matchAll(/\s(src|href|poster|data|srcset)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    if (a[1].toLowerCase() === 'data' && !/^<object\b/i.test(m[0])) continue;
    const v = (a[2] ?? a[3] ?? a[4]).trim();
    const urls = a[1].toLowerCase() === 'srcset' ? v.split(/,\s+/).map(x => x.trim().split(/\s+/)[0]) : [v];
    for (const u of urls) if (!ok(u)) out.push({ kind: a[1], url: u });
  }
  const ASSET = /(["'`])((?:\.{1,2}\/|\/)*(?:assets|fonts)\/[A-Za-z0-9._\-/]+\.(?:svg|woff2?|ttf|otf|png|webp|jpe?g|gif|mp3|ogg|wav))\1(?!\s*:)/g; // `"assets/x.svg":` = a key of the inlined-asset map, not a ref
  for (const s of scripts) for (const m of s.matchAll(ASSET)) out.push({ kind: 'js asset path', url: m[2] });
  return out;
}

/** Single-file only: <meta name="build-id" content> and data-build-id values (F-META). HTML comments are ignored (L-2);
 *  `attrs` = every data-build-id, `appAttrs` = those on the element with id="app" (the only place it may be). */
export function findBuildIdMarkup(html) {
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '<script></script>').replace(/<!--[\s\S]*?(?:-->|$)/g, '');
  const metas = [...markup.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]).filter(t => /\bname\s*=\s*["']?build-id["'\s>/]/i.test(t))
    .map(t => (/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(t) ?? []).slice(1).find(x => x !== undefined) ?? null);
  const ATTR = /\sdata-build-id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  const attrs = [], appAttrs = [];
  for (const [tag] of markup.matchAll(/<[a-z][^>]*>/gi)) {
    const isApp = /\sid\s*=\s*(?:"app"|'app'|app(?=[\s>/]))/i.test(tag);
    for (const m of tag.matchAll(ATTR)) { const v = m[1] ?? m[2] ?? m[3]; attrs.push(v); if (isApp) appAttrs.push(v); }
  }
  return { metas, attrs, appAttrs };
}
