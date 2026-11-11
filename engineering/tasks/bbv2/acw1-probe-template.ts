// Temporary investigation harness; production code and original assertions unchanged.
import { afterAll, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { balance } from '../src/config/balance';
const rows = vi.hoisted(() => [] as {seed:number,t10:number|null,t18:number|null}[]);
vi.mock('./bot-m2', async (original) => {
  const mod = await original<typeof import('./bot-m2')>();
  return { ...mod, runM2: (...args: Parameters<typeof mod.runM2>) => {
    const result = mod.runM2(...args);
    rows.push({seed:args[1],t10:result.reach.get(10) ?? null,t18:result.reach.get(18) ?? null});
    return result;
  }};
});
// Part-A-only ablation: legacy planner income, keeping BBv2 ranking and ties enabled.
vi.mock('../src/econ/income', async (original) => {
  const mod = await original<typeof import('../src/econ/income')>();
  return {...mod, incomePerSec: (...args: Parameters<typeof mod.incomePerSec>) => {
    if (process.env.ACW1_VARIANT === 'parta' && args[2]?.assumeWorking) {
      args[1] = {...args[1],m4:{...args[1].m4,flags:{...args[1].m4.flags,bestBuyV2:0}}};
    }
    return mod.incomePerSec(...args);
  }};
});
balance.m4.flags.bestBuyV2 = process.env.ACW1_VARIANT === 'off' ? 0 : 1;
balance.m4.flags.zeroGainUi = 0;
afterAll(() => writeFileSync(`/workspace/egg-farm-studio/engineering/tasks/bbv2/acw1-${process.env.ACW1_VARIANT}.json`,JSON.stringify({variant:process.env.ACW1_VARIANT,flags:balance.m4.flags,rows},null,2)));
await import('./pacing-acw1.test');
