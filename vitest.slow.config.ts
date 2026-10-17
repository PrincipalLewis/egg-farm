import { defineConfig, mergeConfig, configDefaults } from 'vitest/config';
import base from './vite.config';
/** Slow suites only (*.slow.test.ts): `npm run test:slow`. Always run in CI (ci.yml job `slow`). */
export default defineConfig((env) => {
  const c = mergeConfig(typeof base === 'function' ? base(env) : base, {});
  c.test = { ...c.test, include: ['**/*.slow.test.ts'], exclude: [...configDefaults.exclude] }; // replace, not concat, base's exclude
  return c;
});
