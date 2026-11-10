# HoQA review: telemetry errata v5 rev. 14 (TELERR8) · 2026-11-05 22:45 CET
Verdict: **PASS (pinnable)**. No blocking wording issue.
Reviewed pins (all verified on disk):
- rev. 14 live `product/collection/telemetry-spec-errata-v5.md` sha1 aa9e80faa7428b782a3a4df8d451e20946aca8b8, sha256 d836f1184153fccb50c49fa0fabd3d998a01f73c5a7ffc343df54ea39406ed2f
- frozen copy `product/collection/telemetry-spec-errata-v5.aa9e80fa.md` (same sha256; it sits in product/collection/, there is no frozen/ dir)
- predecessor `telemetry-spec-errata-v5.pre-rev14.md` is byte-identical to rev. 13 a0e8f6d7; diff `scratch/mrinterp2-errata/rev14.diff` reproduces exactly from a0e8f6d7 to rev. 14
- harness cite `scratch/post-l10/cand/tools/m5mr.ts` sha1 1dde40a7 matches the file
Checks against MRINTERP2 (a)-only (interp-mr-accounting-v2.md 2a521102…, D-ECON-20261105-MRINTERP2 36c01a4b…):
- V-2d(1) (i)/(ii)/dedupe match the signed text verbatim in substance. PASS
- predicate/exemptions (item 2) untouched; 30 s emit floor (4), P95 (5), none_affordable (6), 180 s bar untouched. PASS
- attribution: (3) moves from "second" to "sample", fractional start/end allowed, farm = level at the opening sample, L29→30 inside gap(29), open-at-T and flush open:true untouched. PASS
- emission: the one-to-one check now says end **sample**, fractional allowed; row #22 s stays 1 dp float. PASS
- purchases do not end/reset a stretch, in both (1) and (3); (b) deferred. PASS
- no event/field/type/pin/count change. PASS
Non-blocking notes: n-1, the harness cite must move to the post-sellAll sample site when Economy lands it (already stated). n-2, the one-to-one check needs the s ≥ 30 comparison at 1 dp on both sides.
Not authorised by this review: harness activation, re-screen, gate pass. Next step: Economy's measurement-only cand/tools diff, then HoQA review, then pinned shas, then the R04 d1cff5ac re-screen.
