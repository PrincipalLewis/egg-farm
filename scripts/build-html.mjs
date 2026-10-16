// build:html — the single-file release html (whole game in one file, opens from disk / Files / AirDrop).
// Ported from /workspace/m4v2-tools (single.config.mjs + inline-public.mjs), no vite-plugin-singlefile dependency:
// a normal production `vite build` (same vite.config.ts, so the same __BUILD__ id and compiled-out debug flags) into
// dist-html/, then the entry JS/CSS and every public/ + bundled asset are inlined. Output: dist-html/egg-farm.html.
// Usage: node scripts/build-html.mjs [outDir]; then node scripts/check-release-build.mjs dist-html/egg-farm.html
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'; import { join } from 'node:path';
export const MIME = { svg: 'image/svg+xml', woff2: 'font/woff2', woff: 'font/woff', png: 'image/png', webp: 'image/webp', mp3: 'audio/mpeg' };
/** Rewrite asset refs to data: URIs. Any number of ./ and ../ segments (CSS url(../fonts/x.woff2), ../../fonts/…) or a leading /
 *  is consumed whole, so the result is `data:…`, never `.data:…` (QA F1). Returns [html, rewrites]. */
export function inlineAssetRefs(h, map) {
  let n = 0;
  h = h.replace(/(?<=[("'`=\s,])(?:(?:\.{1,2}\/)+|\/)?((?:assets|fonts)\/[A-Za-z0-9._\-/]+\.(?:svg|woff2|woff|png|webp|mp3))/g, (m, r) => map[r] ? (n++, map[r]) : m);
  h = h.replace(/`\.\/assets\/\$\{(\w+)\}([^`$]*)`/g, (m, v, rest) => { n++; return `(__EFA["assets/"+${v}+${JSON.stringify(rest)}]??"./assets/"+${v}+${JSON.stringify(rest)})`; });
  h = h.replace(/fetch\(`\$\{this\.base\}\$\{(\w+)\}\.mp3`\)/g, (m, v) => { n++; return `fetch(__EFA[(this.base+${v}+".mp3").replace(/^\\.\\//,"")]??(this.base+${v}+".mp3"))`; });
  return [h, n];
}
async function main() {
const { build } = await import('vite');
const out = process.argv[2] || 'dist-html';
await build({ mode: 'production', logLevel: 'warn', base: './', build: { outDir: out, emptyOutDir: true, assetsInlineLimit: 100_000_000, modulePreload: { polyfill: false }, sourcemap: false } });
let h = readFileSync(join(out, 'index.html'), 'utf8');
const read = p => readFileSync(join(out, p.replace(/^\.?\//, '')), 'utf8');
// entry module + stylesheet inline. "</script" inside JS is escaped so the html parser can't end the tag early.
h = h.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, (_, src) => `<script type="module" crossorigin>${read(src).replace(/<\/(script)/gi, '<\\/$1')}</script>`);
h = h.replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/g, (_, href) => `<style>${read(href)}</style>`);
if (/<script[^>]+\bsrc=|<link[^>]+rel="stylesheet"/.test(h)) throw new Error('build:html: entry script/stylesheet left un-inlined');
// public/ + bundled assets referenced at runtime (./assets/x.svg, `./assets/${n}.svg`, audio fetch) become data: URIs.
const mime = MIME;
const map = {};
const walk = d => { if (!existsSync(join(out, d))) return; for (const e of readdirSync(join(out, d), { withFileTypes: true })) { const r = `${d}/${e.name}`; if (e.isDirectory()) walk(r); else { const x = r.split('.').pop(); if (mime[x]) map[r] = `data:${mime[x]};base64,${readFileSync(join(out, r)).toString('base64')}#${r}`; } } };
walk('assets'); walk('fonts');
let n; [h, n] = inlineAssetRefs(h, map);
const tag = '<script type="module" crossorigin>'; if (!h.includes(tag)) throw new Error('build:html: no inline module script');
h = h.replace(tag, tag + 'const __EFA=' + JSON.stringify(map).replace(/<\//g, '<\\/') + ';');
const file = join(out, 'egg-farm.html'); writeFileSync(file, h);
console.log(`build:html: ${file} (${h.length} bytes, ${n} asset rewrites, ${Object.keys(map).length} inlined files)`);
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
