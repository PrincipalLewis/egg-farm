/**
 * M5.1 Breeds UI PR-B extension entry (load trigger, FINAL Architect + HoE ruling 2026-11-10 01:05 CET).
 * PR-A's mountBreeds eager-loads `import.meta.glob('./breeds-ext-*.ts', { eager: true })` inside its m4.flags.breeds guard;
 * this module's import registers the PR-B extender (Present chip, BB strip, yard) with PR-A's registerBreedsExt.
 * Flag off: PR-A's mountBreeds returns null before any extender runs, so flag-off DOM is byte-identical. No app.ts reference.
 * Idempotent: registerBreedsPrB registers PRB_EXT once however often this module is evaluated.
 */
import { registerBreedsPrB } from './breeds-hud';

registerBreedsPrB();
