# Agent / ops activity dashboard patterns
**Question:** What layout patterns do dashboards use to show one owner what many agents/bots are doing?
**Answer:** Attention-first ("waiting on me" on top), counts in headers/tabs, a snapshot summary sentence, cards with owner + age + status pill, few status levels, status as tabs, a filterable newest-first timeline, one small aggregate chart. Details below.
**Sources:** see Sources section.
**Checked:** 2026-10-27, Head of Operations.
**Refresh rule:** re-check after 90 days (2027-01-25) or when the dashboard layout changes.
Used for: the "Egg Farm Studio activity" Page (canvas da8cf3b4-26dc-4cdf-b02b-95c0408cfe65).
## Patterns that matter (ranked)
1. **Attention first.** The top answers "what needs me?" before any grid. Linear My Issues orders by focus (urgent, blockers, active, then done); status-page guidance says lead with one plain-state sentence, then the active incident, components last. byalexai's Grok Bot dashboard puts "Waiting on me (22)" as the first column.
2. **Counts in headers and tabs.** GitHub Projects shows the card count (and limit) at the top of each board column; byalexai shows "Waiting on me (22)", day tabs "All 28 / Mon 26 17 / Sun 25 3" and status tabs "In progress 10 / Finished 17".
3. **Summary sentence with snapshot time + counts.** byalexai: "what your bots did Sat–Mon… Snapshot as of Mon Oct 26 23:40: 22 waiting, 10 in progress, 17 finished." Datadog: annotated overview at the top.
4. **Cards with owner, due/age and a status pill.** byalexai cards: bot name, due date, "Due today" tag. Linear rows: status dot, ID, assignee, labels.
5. **Few status levels, defined in writing.** Status-page guidance: as few levels as you can act on (working / degraded / down + maintenance). For us: Waiting, Live, Held, Stale, Finished.
6. **Status as tabs/columns (kanban-lite).** GitHub Projects board by Status field; byalexai uses an In progress / Finished tab pair instead of full columns to stay compact.
7. **Filterable timeline.** byalexai: day tabs + "All bots" dropdown, newest first, time + bot + one line. LangSmith/AgentOps: session list with filters, then a chronological timeline/waterfall; trajectory first, details on demand.
8. **One small aggregate chart.** Datadog: counts as bars, aligned axes, legends; AgentOps "session overview" meta-analysis. A per-day stacked bar by bot is enough here; trace waterfalls are overkill for a daily owner view.
Also: truthful times (never invent ordering; label zone, flag ambiguity), relative age ("waiting 3 d") next to the absolute date.

## Sources
- byalexai post: https://x.com/byalexai/status/2114837470680318365 (fetch blocked 403; screenshot /workspace/byalexai-dashboard.jpg read 2026-10-27)
- Linear My issues: https://linear.app/docs/my-issues
- GitHub Projects board layout: https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/customizing-the-board-layout
- Vercel status: https://vercel.statuspage.io/ ; status-page design: https://phoenix.studio/blog/status-page-design-2026
- Datadog dashboard guidelines: https://datadoghq.dev/integrations-core/guidelines/dashboards/
- AgentOps dashboard: https://docs.agentops.ai/v2/usage/dashboard-info ; core concepts: https://docs.agentops.ai/v2/concepts/core-concepts
- LangSmith view traces: https://docs.langchain.com/langsmith/view-traces
- Trace waterfall contract (truthful time): https://github.com/HomenShum/agentic-ui-qa/blob/main/TRACE-WATERFALL.md
- Notion: not researched this pass.
