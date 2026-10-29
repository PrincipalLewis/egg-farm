/**
 * v5 F6: the overlay feature list. Each M5 scene feature mounts with ONE line here, never by editing app.ts
 * (m5.0-sizing.md §4 hotspot 1):
 *   registerFeature(goldenEgg);   // ui/golden-egg.ts   (#1, flag m4.flags.golden)
 *   registerFeature(streakMeter); // ui/streak-meter.ts (#2, flag m4.flags.streak)
 *   registerFeature(broody);      // ui/broody.ts       (#5, flag m4.flags.broody)
 * Empty in F6 (pure refactor).
 */
import { registerFeature } from './overlay';
void registerFeature;
