// serve-own behaviour (CCR #27 n3: exercise it, don't pattern-match the source). Real vite preview on temp outDirs.
import { it, expect, afterEach } from 'vitest';
import net from 'node:net';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error plain .mjs helper without types
import { freePort, serveOwn } from '../scripts/serve-own.mjs';
const cleanup: (() => void)[] = [];
afterEach(() => { while (cleanup.length) cleanup.pop()!(); });
const site = (ref = true) => { const d = mkdtempSync(join(tmpdir(), 'serveown-')); mkdirSync(join(d, 'out', 'assets'), { recursive: true });
  writeFileSync(join(d, 'out', 'assets', 'index-abc123.js'), 'console.log(1)');
  writeFileSync(join(d, 'out', 'index.html'), `<!doctype html><script type="module" src="./assets/${ref ? 'index-abc123' : 'index-other'}.js"></script>`); return d; };
const hold = async (http = false) => { const s = net.createServer(c => { if (http) c.end('HTTP/1.1 200 OK\r\ncontent-length: 5\r\n\r\nother'); /* else: accept, never answer */ });
  await new Promise<void>(r => s.listen(0, '127.0.0.1', () => r())); cleanup.push(() => { s.close(); });
  return { port: (s.address() as net.AddressInfo).port, sockets: s }; };

it('freePort returns distinct bindable ports', async () => {
  const a = await freePort();
  const s = net.createServer(); await new Promise<void>(r => s.listen(a, '127.0.0.1', () => r()));
  expect(await freePort()).not.toBe(a); s.close();
});
it('serves our own build on a probed free port (no fixed default)', async () => {
  const d = site(); const ports: number[] = [];
  const s = await serveOwn('out', undefined, d, { onAttempt: (p: number) => ports.push(p) }); cleanup.push(() => s.stop());
  expect(ports).toHaveLength(1); expect(s.port).toBe(ports[0]);
  expect(await (await fetch(s.url)).text()).toMatch(/index-abc123\.js/);
}, 30000);
it('explicit port held by a non-HTTP listener fails fast with EADDRINUSE, no hang (QA #27 Low 2)', async () => {
  const d = site(); const { port } = await hold(); const t0 = Date.now();
  await expect(serveOwn('out', port, d)).rejects.toMatchObject({ code: 'EADDRINUSE' });
  expect(Date.now() - t0).toBeLessThan(20000);
}, 30000);
it('retries a probed port only on EADDRINUSE', async () => {
  const d = site(); const busy = await hold(true); const ports: number[] = []; let n = 0;
  const s = await serveOwn('out', 0, d, { probe: async () => (n++ ? freePort() : busy.port), onAttempt: (p: number) => ports.push(p) });
  cleanup.push(() => s.stop());
  expect(ports[0]).toBe(busy.port); expect(ports).toHaveLength(2); expect(s.port).toBe(ports[1]);
}, 30000);
it('does not retry non-port failures (foreign build, missing outDir) (CCR #27 n2)', async () => {
  const ports: number[] = []; const onAttempt = (p: number) => ports.push(p);
  await expect(serveOwn('out', 0, site(false), { onAttempt })).rejects.toThrow(/is not serving out/);
  expect(ports).toHaveLength(1);
  const err = await serveOwn('missing', 0, site(), { onAttempt }).catch((e: NodeJS.ErrnoException) => e);
  expect(err.code).toBe('ENOENT'); expect(ports).toHaveLength(2);
}, 30000);
