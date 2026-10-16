// Step 2 of `npm run build:html`: name the single file dist-html/egg-farm-<tag>-<sha>.html and fail on leftovers.
// <tag> = nearest git tag (git describe --tags --abbrev=0), else v<package version>; <sha> = short HEAD.
import fs from 'node:fs'; import { execSync } from 'node:child_process';
const sh = c => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
const tag = (process.env.HTML_TAG || sh('git describe --tags --abbrev=0') || `v${JSON.parse(fs.readFileSync('package.json', 'utf8')).version}`).replace(/[^A-Za-z0-9._-]/g, '-');
const sha = sh('git rev-parse --short HEAD') || 'unknown';
const src = 'dist-html/.tmp/index.html'; const html = fs.readFileSync(src, 'utf8');
const left = [...new Set(html.match(/(?:src|href)=["'](?!data:|#|javascript:|\$\{)[^"']+["']|url\(\s*["']?(?!data:|\$\{)[^"')]+/g) ?? [])];
if (left.length) { console.error(`build:html: non-inlined references left: ${left.join(', ')}`); process.exit(1); }
if (/<script[^>]+src=|<link[^>]+rel="?stylesheet/.test(html)) { console.error('build:html: external script/stylesheet left'); process.exit(1); }
const out = `dist-html/egg-farm-${tag}-${sha}.html`;
fs.writeFileSync(out, html); fs.rmSync('dist-html/.tmp', { recursive: true, force: true });
console.log(`build:html: ${out} ${(fs.statSync(out).size / 1024).toFixed(1)} KiB`);
