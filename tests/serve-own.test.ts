// serve-own: no fixed default port (CCR #13 nit: 5108 collided across parallel worktrees).
import { it, expect } from 'vitest';
import net from 'node:net';
// @ts-expect-error plain .mjs helper without types
import { freePort } from '../scripts/serve-own.mjs';
import { readFileSync } from 'node:fs';
it('freePort returns distinct bindable ports', async () => {
  const a = await freePort(), b = await freePort();
  expect(a).toBeGreaterThan(0);
  const s = net.createServer(); await new Promise<void>(r => s.listen(a, '127.0.0.1', () => r())); // still bindable
  const c = await freePort(); expect(c).not.toBe(a); s.close(); expect(typeof b).toBe('number');
});
it('check-globals defaults to a probed port, PORT still overrides', () => {
  const src = readFileSync(new URL('../scripts/release-globals-browser.mjs', import.meta.url), 'utf8');
  expect(src).not.toMatch(/5100/); expect(src).toMatch(/process\.env\.PORT \?\? 0/);
  const so = readFileSync(new URL('../scripts/serve-own.mjs', import.meta.url), 'utf8');
  expect(so).toMatch(/if \(\+port\) return serveOnce/); expect(so).toMatch(/on port \$\{p\}/);
});
