// QA probe config (no vite.config.ts: its build-id plugin needs git). Copied into the scratch 3f582db tree root; max 2 workers.
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/qa-m5/**/*.test.ts'], pool: 'forks', poolOptions: { forks: { maxForks: 2, minForks: 1 } }, maxWorkers: 2, minWorkers: 1 } });
