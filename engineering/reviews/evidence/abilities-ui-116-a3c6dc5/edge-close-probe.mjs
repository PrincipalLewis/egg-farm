/** Architect probe: reopen-while-pending + docked-mid-close attendance (not a product test). */
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
const WT = process.env.WT;
process.chdir(WT);

// Use vitest's jsdom via dynamic import of the test helpers pattern through vite-node
