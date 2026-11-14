// trace10 pins: the ONE place for values that a re-pin changes. Logic never hard-codes these; producer and comparator take
// an override (CLI --card-sha1=<sha1>) for the RC re-pin, recorded in the manifest as inputs.card_sha1_expected.
/** R04 Card #4 version of record: sha1 of product/m5-gate-acs.md (D-HOP-2026-11-10-09, QA-D-1110-BG4REPIN). */
export const PINS = {
  card_sha1: 'e485f7624b9760a0b8a54b2472dd2b955b20077e',
  contract_sha256: 'fc6a938214c8914dde5fed7b6b51fb770b93e66c3472f10e1836b30a0c4b6c99',
} as const;
/** Expected card sha1: CLI override if given (validated 40-hex), else PINS.card_sha1. */
export function expectedCardSha1(override?: string | null): string {
  if (override == null || override === '') return PINS.card_sha1;
  if (!/^[0-9a-f]{40}$/.test(override)) throw new Error(`--card-sha1 must be 40 lowercase hex, got ${override}`);
  return override;
}
