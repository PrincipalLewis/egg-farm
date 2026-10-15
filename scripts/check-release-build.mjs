// Release gate: the shipped build id must not carry "+dirty" (built from uncommitted changes). Run after `vite build`.
import { readdirSync, readFileSync } from 'node:fs';
const dir = process.argv[2] || 'dist';
const js = readdirSync(`${dir}/assets`).filter(f => f.endsWith('.js')).map(f => readFileSync(`${dir}/assets/${f}`, 'utf8')).join('\n');
const ids = [...new Set(js.match(/m3-rc\d[^"'`\s]*/g) ?? [])];
if (!ids.length) { console.error('check-release-build: no build id found in bundle'); process.exit(1); }
const dirty = ids.filter(i => i.includes('+dirty'));
if (dirty.length) { console.error(`check-release-build: build id ${dirty.join(', ')} - commit or stash your changes before a release build (git status --porcelain must be empty)`); process.exit(1); }
console.log(`check-release-build: ${ids.join(', ')} ok`);
