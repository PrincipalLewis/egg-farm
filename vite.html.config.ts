// Single-file HTML release build (`npm run build:html`): one self-contained .html that runs from file:// with no
// network. JS/CSS are inlined by vite-plugin-singlefile; every public/ asset (SVGs, fonts, audio, OFL.txt) is inlined
// as a data: URL (CSS url(/fonts/..), index.html links, and runtime paths via src/asset-url.ts __INLINE_ASSETS__).
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs'; import path from 'node:path';
import { gitBuildId } from './scripts/build-id';

const BUILD = gitBuildId();
const PUBLIC = path.resolve(__dirname, 'public');
const MIME: Record<string, string> = { svg: 'image/svg+xml', woff2: 'font/woff2', png: 'image/png', webp: 'image/webp', mp3: 'audio/mpeg', ogg: 'audio/ogg', txt: 'text/plain;charset=utf-8' };
function inlineMap(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (rel: string) => { for (const e of fs.readdirSync(path.join(PUBLIC, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(r);
    else { const m = MIME[e.name.split('.').pop()!.toLowerCase()]; if (m) out[r] = `data:${m};base64,${fs.readFileSync(path.join(PUBLIC, r)).toString('base64')}`; }
  } };
  walk(''); return out;
}
const INLINE = inlineMap();

function inlinePublic(): Plugin {
  const sub = (s: string) => s.replace(/url\(\s*["']?\/((?:assets|fonts)\/[^"')]+)["']?\s*\)/g, (m, r) => INLINE[r] ? `url("${INLINE[r]}")` : m);
  return {
    name: 'egg-farm-inline-public', enforce: 'pre',
    transform(code, id) { return /\.css($|\?)/.test(id) ? sub(code) : null; },
    transformIndexHtml(html) {
      return html
        .replace(/<link rel="preload"[^>]*as="font"[^>]*>\s*/g, '') // fonts are inlined in the CSS
        .replace(/(href|src)="\/((?:assets|fonts)\/[^"]+)"/g, (m, a, r) => INLINE[r] ? `${a}="${INLINE[r]}"` : m);
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [inlinePublic(), viteSingleFile({ removeViteModuleLoader: true })],
  build: { outDir: 'dist-html/.tmp', emptyOutDir: true, assetsInlineLimit: Number.MAX_SAFE_INTEGER, cssCodeSplit: false },
  define: { __BUILD__: JSON.stringify(BUILD), __IOS_FLAG__: 'false', __INLINE_ASSETS__: JSON.stringify(INLINE) },
});
