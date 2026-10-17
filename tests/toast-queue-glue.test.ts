import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
describe('toast queue glue (main merge): same-frame showToast + queueToasts never drops a toast', () => {
  it('queueToasts reads a synchronous busy flag, not .show (added a frame later by the controller)', () => {
    const q = src.match(/const queueToasts = [^\n]+/)![0];
    expect(q).toMatch(/if \(toastBusy\)/); expect(q).not.toMatch(/classList\.contains\('show'\)/);
    expect(src).toMatch(/const showToast = [^\n]*toastBusy = true;[^\n]*toastShow\(\)/);
    expect(src).toMatch(/hide: \(\) => \{[^\n]*else toastBusy = false;/);
  });
});
