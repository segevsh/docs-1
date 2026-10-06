---
key: "history"
title: "History"
section: "studio"
description: "Find any Function call, Endpoint call or workflow run in the project, filter by status, type and date, and open one to read its input, output, error and steps."
format: "markdown"
shared: true
order: 70
position: 14
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/history.md"
sourceSha: "6846c199c20a3ada1a48579d7fe7a5701ede3294"
sourceRefSha: "d1bba44c58b043319966cf16e85a13196e68fe4a"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/d1bba44c58b043319966cf16e85a13196e68fe4a/docs/history.md"
syncedAt: "2026-10-06T03:44:03Z"
---


# History

**History** is the record of everything that ran in the project: every Function call, every
Endpoint call and every workflow run, whether it was started from Studio, the SDK, the CLI, a
webhook or a schedule. Use it to answer "did that run, and what happened?".

## Find a run

{% webui %}

1. In the sidebar, under **Observe**, click **History**.
2. Narrow the list:
   - **Search by id or name**;
   - a status: **Queued**, **Running**, **Succeeded**, **Failed** or **Canceled**;
   - a type: **Function**, **Endpoint** or **Workflow**;
   - a start and end date (the two date boxes).
3. Click a row.

{% endwebui %}

How you know it worked: the detail panel opens with the run's status, its id, **Started**,
**Finished** and **Duration**, and its **Input**, **Output** and **Error**. For a workflow, **Steps**
lists each step's outcome.

The cards along the top summarise what's listed: **Executions**, **Success rate**, **Failed**,
**Avg duration** and, when anything is still going, **In flight**. **Clear** resets the filters.
Results come 25 to a page, with **Previous** and **Next**. The filters are part of the page
address, so you can bookmark or share a filtered view.

## History for one item

- From a workflow, click **Execution history** (the clock) in the editor's header. The same list
  opens in a dialog, filtered to that workflow.
- Functions and Endpoints have the same clock button, **Execution history**, in their editor.

## Open a run on the canvas

For a workflow run, click **Open in visual editor** in the detail panel. The editor opens with that
run's step colours and its run log, so you can see exactly where it failed. See
[Run and debug](/studio/workflows/runs/).

## Look up a run from code

Every synchronous call answers with an `invocationId`, and every workflow run with a `runId`
(`run_…`). Search for either in **Search by id or name**.

{% cli %}

```bash
w6w workflows run wf_01H… --wait
```

The output includes the run id. See [CLI](/clients/cli/).

{% endcli %}

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `No executions yet.` | Nothing has run in this project, or nothing matches your filters. | Click **Clear**, or check you're in the right project. |
| `Couldn't load execution history.` | The server didn't answer. | Reload the page. |
| `This execution is no longer available.` | The run was removed, for example because its workflow was deleted or the run passed your retention period. | It can't be recovered. |
| A call made from code doesn't appear | It ran in a different project. | Switch project with the **Project** switcher. |

## Where to next

- **[Dashboard](/studio/dashboard/)**: today's and this week's totals at a glance.
- **[Reliability](/studio/reliability/)**: how each API is performing.
- **[Run and debug](/studio/workflows/runs/)**: read a workflow run step by step.
