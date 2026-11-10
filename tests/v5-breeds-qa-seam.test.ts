/**
 * HoQA: ?qaBreeds=1 marker must be rejected by check-release-build in a synthetic release bundle.
 * Full vite production/qa parity lives in tests/release-bundle.test.ts (run at Ready gates only).
 */
import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const runJs = (body: string) => {
  const d = mkdtempSync(join(tmpdir(), 'rb-qabreeds-'));
  mkdirSync(join(d, 'assets'));
  writeFileSync(join(d, 'assets', 'i.js'), body);
  writeFileSync(join(d, 'index.html'), '<!doctype html><script type="module" src="/assets/i.js"></script>');
  try {
    return spawnSync('node', [new URL('../scripts/check-release-build.mjs', import.meta.url).pathname, d], {
      env: { ...process.env, HEAD_COMMIT: '19564ebaaaa' }, encoding: 'utf8',
    });
  } finally {
    rmSync(d, { recursive: true, force: true });
    made.push(d);
  }
};
const made: string[] = [];
const base = 'const B="m4.1+abc1234"; window.eggfarmExportTelemetry=()=>{};';

describe('HoQA qaBreeds release seam', () => {
  afterAll(() => { for (const d of made) expect(existsSync(d), d).toBe(false); });
  it('clean bundle passes', () => { expect(runJs(base).status).toBe(0); });
  it('rejects get("qaBreeds") marker string', () => {
    const r = runJs(base + 'const q=new URLSearchParams(location.search);q.get("qaBreeds");');
    expect(r.status).toBe(1);
    expect(r.stderr + r.stdout).toMatch(/qaBreeds/);
  });
});
