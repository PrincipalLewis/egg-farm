# Activity dashboard refresh (owner: HoO)
Page: "Egg Farm Studio activity", wide.
- canvas_id: da8cf3b4-26dc-4cdf-b02b-95c0408cfe65
- url: https://cursor.com/canvas/store-174aa590-361b-4894-b147-4a5a61882cfc/da8cf3b4-26dc-4cdf-b02b-95c0408cfe65
Refresh daily; never create a new Page.

## Sources (read slices only, rule 14)
- status.md, decisions.md, archive/decisions/*.md (decisions in force)
- ops-log.md: last ~3 days via rg by date
- qa/, product/, art-ux/ queue + status; engineering/m4.1-backlog.md, status.md (tail), parked.md
- Recently changed files (find -newermt)
- `git -C game log --all --since='3 days ago' --format='%h %ci %an %s'`
- Optional: newest transcript slice of CEO, HoE, HoQA, HoP

## Layout (v2, 2026-10-27 20:50 CET; patterns in research/agent-dashboard-patterns.md)
Wide Page, kit look only (no custom colors). Data: consts SNAPSHOT, EVENTS, DAYS, WAITING, STATUS.
1. Summary: "Snapshot <day date>, <HH:MM> CET" + counts (waiting, live, held, stale, finished).
2. "Waiting on you (n)": 3-column Grid of cards (WAITING): Status pill "Waiting <age>" (from `since` vs SNAPSHOT), Since, Decision ID, owner, one-line need. Vadim-only items.
3. Grid of two:
   - Timeline: stacked ColumnSeries of events per day by group (Engineering, QA & review, CEO, Ops & product; map in `group()`), day Segmented with counts, bot Select, Rows newest first. One entry per commit, decision, gate result or ops-log line, ~5 days, CET (CEST −1h).
   - Status: Segmented Live / Held / Stale / Finished with counts, Rows with pills. Live = file or commit in last 24h; Held = under a CEO decision ID; Stale = still "in progress" with no activity; Finished = last ~7 days.
Facts only from files; SHAs as given; no secrets.

## How to refresh
1. ReadCanvas with the canvas_id.
2. One EditCanvas with every change in `edits` (SNAPSHOT + summary time, WAITING, STATUS, EVENTS, DAYS; drop days older than ~5), or WriteCanvas with the same canvas_id for wide changes.
3. Log one ops-log line.
