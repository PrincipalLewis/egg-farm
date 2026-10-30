import { defineConfig, mergeConfig, configDefaults } from 'vitest/config';
import base from './vite.config';
/** K10 breeds offset suite only (*.k10.test.ts): `npm run test:k10`. CI job k10-breeds-offset (non-required), gated by scripts/k10-trigger.mjs. */
export default defineConfig((env) => {
  const c = mergeConfig(typeof base === 'function' ? base(env) : base, {});
  c.test = { ...c.test, include: ['**/*.k10.test.ts'], exclude: [...configDefaults.exclude] }; // replace, not concat, base's exclude
  return c;
});
