/**
 * v5 F6: the overlay feature list. app.ts imports this module once; each M5 scene feature joins with ONE import line here, never by
 * editing app.ts. The feature module calls registerFeature() from ./overlay when it is evaluated (API: engineering/tasks/v5-f6-rebuild/API.md):
 *   import './golden-egg';   // flag m4.flags.golden  (Generalist)
 *   import './streak-meter'; // flag m4.flags.streak  (Hire 3)
 *   import './broody';       // flag m4.flags.broody  (Generalist)
 * Empty in F6: with nothing registered the overlay adds no DOM (flag-off #app identical to rc/v5).
 */
export {};
