/**
 * M5.1 Breeds UI PR-B extension entry (load trigger: FINAL Architect + HoE ruling 2026-11-10 01:05 CET; seams §1, registry leaf).
 * PR-A's mountBreeds eager-loads `import.meta.glob(['./breeds-ext-*.ts', '!./breeds-ext-registry.ts'], { eager: true })` behind
 * its m4.flags.breeds guard; importing this module registers the PR-B extender (Present chip, BB strip Hatch target, yard).
 * No app.ts reference. Flag off: mountBreeds never fires an extender, so nothing PR-B renders (byte-identical).
 *
 * Registration goes through PR-A's LEAF registry (`./breeds-ext-registry`, no runtime imports), never `./breeds-mount`, so the
 * eager glob has no import cycle and registering synchronously at import time cannot hit a TDZ. The only other import is
 * PR-B's own extender object, whose module graph does not reach breeds-mount / breeds-ui / app.
 */
import { registerBreedsExt, breedsExtList } from './breeds-ext-registry';
import { PRB_EXT } from './breeds-hud';

// Idempotent against a harness / test that already called registerBreedsPrB() (same registry check it uses).
if (!breedsExtList().includes(PRB_EXT)) registerBreedsExt(PRB_EXT);
