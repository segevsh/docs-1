---
key: "workflows/runs"
title: "Run and debug"
section: "guides"
description: "Test one workflow step on its own, save the passing test that publishing needs, run the whole workflow from the editor, and read its run log."
summary: null
format: "markdown"
shared: true
order: 40
position: 11
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/workflows/runs.md"
sourceSha: "90a58c13d8b1e02ad8532e96d7af626ed0f23fe6"
sourceRefSha: "2e25e297622dec7966f7baafd584add3eba28641"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/2e25e297622dec7966f7baafd584add3eba28641/docs/workflows/runs.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Run and debug

You can try a workflow at two sizes: one step at a time while you build it, and the whole
workflow once the steps work. Both run against the real APIs through your integrations, so a step
that sends an email really sends it.

## Test one step

{% webui %}

1. Select the step and click **Test-run this step** in its toolbar, or open **Edit step** and go to
   the **Test** tab.
2. Under **Incoming state**, choose what the step receives: click an earlier step's chip to reuse
   its last saved test result, or expand **Override the incoming state** and type JSON.
3. Click **Test** (or **▶ Run**).

{% endwebui %}

How you know it worked: **Test run: &lt;step id&gt;** shows **Result** and any **Console output**.
If it failed, it shows the error code and message instead.

The test uses the configuration saved on the step; only the incoming state changes between tests.
To change what the step does, edit it on **Configure** first.

A step that calls a real app needs a **passing saved test** before the workflow can be published.
Until it has one, the step shows "Not yet tested — a passing test is required before this step can
be published." Testing the step from here records that test.

For a trigger, the **Test** tab takes sample values for its fields and saves them as the workflow's
test input. Flow-control steps such as **If** and **For each** can't be tested on their own.

## Run the whole workflow

1. Make sure the trigger has sample values (see [Triggers](/guides/workflows/triggers/)). Without
   them the run starts with empty fields.
2. Save your changes. **Run** runs the version saved on the server, not unsaved edits.
3. Click **Run** in the header.

How you know it worked: the button reads **Queued…**, then **Running…**, and each step's border
changes colour as it goes: accent while running, green when it succeeds, red when it fails. A
dashed border means the step hasn't run.

**Run** works on drafts, so you don't need to publish first. **Stop this run** cancels a run in
flight; steps already running finish first.

## Read the run log

The run log opens beside the canvas while a run is in progress.

- Errors are listed first: the run's own error, then each failed step's code and message.
- Below that, one row per step, with a status (**Pending**, **Running**, **Succeeded**,
  **Failed**, **Skipped**, **Queued** or **Canceled**) and its timing.
- Expand a row to see the step's **Input** and **Output**, with every expression already resolved.

Click **×** to close it. To reopen an older run, click **Execution history** in the header, pick
the run and click **Open in visual editor**. The canvas then shows that run's colours and log.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `Fill the required fields to test.` | A required trigger field or parameter is empty. | Fill it in. |
| `The incoming state must be a JSON object to run.` | The override text isn't a JSON object. | Wrap it in `{ … }`. |
| `This step is missing required configuration — set it on the Configure tab.` | A required parameter has no value. | Fill it on **Configure**. |
| `Run failed without reporting a reason.` | The run stopped before any step reported an error. | Open **Execution history** for details, and check the trigger's sample values. |
| A run uses old settings | You ran before saving. | Save, then click **Run** again. |
| **Execution history** is greyed out | The workflow hasn't run yet. | Click **Run** once. |

## Where to next

- **[History](/guides/history/)**: every run in the project, with filters.
- **[The tool rail](/guides/tool-rail/)**: retry and failure handling for the whole workflow.
- **[Publish and versions](/guides/publishing/)**: publish once the steps pass.
