# MANIFEST re-pin note (2026-11-10 ~00:50 CET, authorised by the round-A TASK line)
- Old round-1 MANIFEST.sha256 sha256 457bf960855fd7af9d32c92f11028b522c5c47e1b610006cf9b0b854520ffe83, kept verbatim as MANIFEST.v1-457bf960.sha256.
- Its only failing entry was ./HANDOFF.md: the manifest was written BEFORE one line was appended to HANDOFF.md
  ("00:42 D-CEO-20261110-02 usage cap: STOPPED after round 1 ..."), giving HANDOFF.md f0f8062665a6a0a7cb485d94538acb1397d60b2857d090a9a1f0afddaf46d7c3.
- New MANIFEST.sha256 = old with only the HANDOFF.md line replaced by the current hash (f0f80626...). Command:
  awk replace of the ./HANDOFF.md line with `sha256sum ./HANDOFF.md`; all other 120 entries byte-identical.
- 2026-11-10 ~01:00 CET: HANDOFF.md is a live log (round A appends), so the round-1 entry now points to HANDOFF.round1.md:
  a frozen byte-exact prefix of HANDOFF.md up to the round-A section, sha256 f0f80626... (same hash as before). No other entry changed.
