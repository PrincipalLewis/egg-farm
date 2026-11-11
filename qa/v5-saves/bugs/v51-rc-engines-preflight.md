# v5.1: RC-mode all-engines preflight refusal (deferred)

- Filed: 2026-10-30 12:46 CET by Saves QA. Ruled by HoQ: OUT of v5, goes on the 5.1 list.
- Proposed diff: qa/scratch/draft-rc1/followup-rc-engines-preflight.diff
- Problem: in RC mode the gate starts even when fewer than 3 engines are selected. It still fails closed (each missing engine is logged as NOT RUN, which counts as a hard fail), but the run uses up the single results folder.
- v5 interim rule (HoQ): if an official run is started with fewer than 3 engines, that results folder is void. Re-run under a new folder name and keep the old one as evidence.
- Severity: Minor (process). No product impact.
