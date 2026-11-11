import { it } from 'vitest';
import { readFileSync } from 'fs';
import { balance as b0 } from '../src/config/balance';
import { validate, serialize } from '../src/save/save';
import { m5Load } from '../src/save/m5-fields';
const PZ: any = { ...b0, m4: { ...b0.m4!, flags: { ...b0.m4!.flags, pause: 1 }, tc: { ...b0.m4!.tc!, pause_unlock_farm: 10, pause_call_lockout_s: 45 } } };
it('qa probe unknown worker id + tampered JSON', () => {
  const raw = JSON.parse(readFileSync('tests/fixtures/v5-f2/m5-save.json', 'utf8'));
  delete raw.sum; const s = raw.state ?? raw; s.farmLevel = 12;
  s.workers = { ...(s.workers ?? {}), ghost: { energy: 1, cdS: 0, paused: 'x', callLockoutS: -5 }, market_hand: { energy: 40, cdS: 0, paused: true, callLockoutS: '1e400' } };
  const txt = JSON.stringify(raw).replace('"1e400"', '1e400');
  for (const bal of [b0, PZ]) {
    const v: any = validate(txt, bal, 0);
    console.log('QA', bal === PZ ? 'pause' : 'ship', 'validate ok=', v.ok, v.reason ?? '', 'ghost=', JSON.stringify(v.file?.state?.workers?.ghost), 'mh=', JSON.stringify(v.file?.state?.workers?.market_hand));
    if (v.ok) { const o: any = m5Load(v.file.state, bal, 0, []); console.log('QA   m5Load ghost=', JSON.stringify(o.workers.ghost), 'mh=', JSON.stringify(o.workers.market_hand)); }
  }
});
