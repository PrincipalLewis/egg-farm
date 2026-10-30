// pacing-x1-stack (v5 manifest row 1, §13.2a AC-X1 / sizing §15b): WHICH DATA the check runs on. This is the one switch.
// HoE 2026-10-30: read CSV 8dc90e2b once V5-HOP-1 has landed on rc/v5; until then run the current rc/v5 data with the
// streak and pause flags off (D-HOP-2026-10-30-04: an RC cut without V5-HOP-1 ships streak + pause off).
// Every input is a committed fixture with a sha256 assert (D-HOE-20261030-05), never the live data/economy.csv or balance.json.
// The live files are only hashed, so the job summary says when they have moved away from the pinned copies.
import type { Stack } from '../bot-m5';

/** Bot-modelled M5.0 flags the check toggles one at a time against the stack (§15b "each flag's off/on delta").
 *  `pause` is not here: G5-P pause rows wait on Features (X1 note, D-HOE-20261029-05) and the stack keeps pause: false. */
export const X1_TOGGLES = { golden: { golden: null }, streak: { streakCap: 0 }, tapCoins: { tapShare: 0 }, broody: { broody: false }, abilities: { abil: false } } as const satisfies Record<string, Partial<Stack>>;
export type X1Toggle = keyof typeof X1_TOGGLES;

export interface X1DataSource {
  /** Shown in every summary line. */ label: string;
  csv: { fixture: string; sha256: string };
  balanceJson: { fixture: string; sha256: string };
  /** Live data/economy.csv sha256 this mode expects on rc/v5; a different live hash is reported as drift (warning). */
  liveCsvSha256: string;
  /** Overrides on the bot's AssZ stack (M5X_BASE); {} = Econ's harness-of-record stack exactly. */
  stack: Partial<Stack>;
  /** Flags that are off in this mode: their off/on delta is reported as n/a. */ offFlags: X1Toggle[];
}

const BALANCE = { fixture: 'tests/fixtures/x1/balance-883d1b0d.json', sha256: '883d1b0dbc29c44af2f032ee81529aa0d138bf6fe44c41e5f517202aa605dc18' };
export const X1_SOURCES = {
  /** V5-HOP-1 landed: the M5.0 shipping CSV of record, the CSV the §13.2a predictions were measured on (full stack, streak cap 0.28). */
  'v5hop1-8dc90e2b': { label: 'V5-HOP-1 CSV 8dc90e2b, full M5.0 stack (pause rows out)',
    csv: { fixture: 'tests/fixtures/x1/economy-8dc90e2b.csv', sha256: '8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b' },
    balanceJson: BALANCE, liveCsvSha256: '(V5-HOP-1 head: 8dc90e2b + farm_cost r27-29)', stack: {}, offFlags: [] },
  /** V5-HOP-1 not on rc/v5: today's rc/v5 data/economy.csv (b48be8a4, #88 fixture) with streak and pause off. */
  'rcv5-b48be8a4-nostreak': { label: 'rc/v5 CSV b48be8a4, streak + pause off (V5-HOP-1 not landed)',
    csv: { fixture: 'tests/fixtures/economy-b48be8a4.csv', sha256: 'b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857' },
    balanceJson: BALANCE, liveCsvSha256: 'b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857', stack: { streakCap: 0, pause: false }, offFlags: ['streak'] },
} as const satisfies Record<string, X1DataSource>;
export type X1SourceKey = keyof typeof X1_SOURCES;

/** THE SWITCH. Flip to 'v5hop1-8dc90e2b' in the commit that follows V5-HOP-1's merge into rc/v5. */
export const X1_DATA: X1SourceKey = 'rcv5-b48be8a4-nostreak';
