// Inline a vite dist dir's module <script src> and stylesheet <link> into one .html (single-file shape). node inline-dist.mjs <dist> <out.html>
import fs from 'node:fs'; const [d, out] = process.argv.slice(2); let h = fs.readFileSync(`${d}/index.html`, 'utf8');
h = h.replace(/<script([^>]*?)\ssrc="\.?\/?([^"]+)"([^>]*)><\/script>/g, (_, a, s, b) => `<script${a}${b}>${fs.readFileSync(`${d}/${s}`, 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`);
h = h.replace(/<link rel="stylesheet"[^>]*href="\.?\/?([^"]+)"[^>]*>/g, (_, s) => `<style>${fs.readFileSync(`${d}/${s}`, 'utf8')}</style>`);
h = h.replace(/<link rel="modulepreload"[^>]*>/g, ''); fs.writeFileSync(out, h); console.log(out, h.length);
