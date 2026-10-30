// pacing-x1-stack (v5 manifest row 1, §13.2a AC-X1 / sizing §15b): WHICH DATA the check runs on. This is the one switch.
// HoE ruling 2026-10-30 10:57: X1 reads the SHIPPED data/economy.csv (and src/config/balance.json) from the tree under test,
// with the full M5.0 stack (streak and pause ON as V5-HOP-1 ships them; no streak-off re-prediction). The 8dc90e2b CSV is
// never an X1 input. The sha256 of each file read is recorded in every shard and in the run's results.
import type { Stack } from '../bot-m5';

/** Bot-modelled M5.0 flags the check toggles one at a time against the stack (§15b "each flag's off/on delta").
 *  `pause` is not here: G5-P pause rows wait on Features (X1 note, D-HOE-20261029-05) and the stack keeps pause: false. */
export const X1_TOGGLES = { golden: { golden: null }, streak: { streakCap: 0 }, tapCoins: { tapShare: 0 }, broody: { broody: false }, abilities: { abil: false } } as const satisfies Record<string, Partial<Stack>>;
export type X1Toggle = keyof typeof X1_TOGGLES;

export interface X1DataSource {
  /** Shown in every summary line. */ label: string;
  /** Tree-relative paths read as-is (hashed, not pinned). */ csv: string; balanceJson: string;
  /** Overrides on the bot's AssZ stack (M5X_BASE); {} = Econ's harness-of-record stack exactly. */ stack: Partial<Stack>;
  /** Flags off in this mode: their off/on delta is reported as n/a. */ offFlags: X1Toggle[];
}
export const X1_SOURCES = {
  /** The shipped CSV + balance.json of the tree under test, full M5.0 stack (pause rows out). */
  'shipped-tree': { label: 'shipped data/economy.csv + src/config/balance.json from the tree, full M5.0 stack (pause rows out)',
    csv: 'data/economy.csv', balanceJson: 'src/config/balance.json', stack: {}, offFlags: [] },
} as const satisfies Record<string, X1DataSource>;
export type X1SourceKey = keyof typeof X1_SOURCES;

/** THE SWITCH (HoE 10:57: shipped data from the tree, full stack). */
export const X1_DATA: X1SourceKey = 'shipped-tree';
