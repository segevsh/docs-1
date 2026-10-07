---
key: "workflows/editor"
title: "The workflow editor"
section: "guides"
description: "Add, connect and configure steps on the workflow canvas: app actions, Functions, other workflows, branches, loops, scripts, HTTP calls and error routes."
summary: null
format: "markdown"
shared: true
order: 10
position: 8
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/workflows/editor.md"
sourceSha: "d57af397dc5c71bb5ae7fe5a4852741f5f232f34"
sourceRefSha: "2e25e297622dec7966f7baafd584add3eba28641"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/2e25e297622dec7966f7baafd584add3eba28641/docs/workflows/editor.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# The workflow editor

Open a workflow from **Workflows** to get the visual editor: a canvas of steps joined by arrows. The
header holds the workflow's name and its actions; the canvas holds the steps.

## The header

| Control | What it does |
| --- | --- |
| **← Workflows** | Back to the list. |
| The title | Click to rename. Saves when you click away. |
| **Run** | Runs the whole workflow now, even as a draft. See [Run and debug](/guides/workflows/runs/). |
| **Stop this run** | Shown while a run is in flight. |
| **Publish** / **● Published** | Publishes a new version. Disabled, with the reason on hover, until the workflow is valid. |
| **Execution history** (clock) | Past runs of this workflow. Disabled until it has run once. |
| **Edit raw JSON definition** | Opens the whole definition as JSON. |
| **Workflow settings** (gear) | Auto-save, canvas-view saving and declared inputs. See [Workflows](/guides/workflows/). |

The canvas has zoom, fit-to-view and **Auto-layout**, which re-flows the graph into columns, plus a
minimap.

## Add a step

{% webui %}

1. Click **+ Step** at the top left of the canvas, or drag from a step's output handle and drop it
   on empty canvas.
2. In **Add a step**, pick a tab:

   | Tab | What's in it |
   | --- | --- |
   | **Ready to use** | Apps you've already connected, and your Functions and Workflows. |
   | **Apps** | Every registered app, searchable and filterable by category. |
   | **AI** | AI apps. |
   | **Workflows** / **Functions** | Call another workflow or a Function as a step. |
   | **Triggers** | What starts the workflow. See [Triggers](/guides/workflows/triggers/). |
   | **Controls** | **If**, **For each**, **Parallel**, **Wait**, **Aggregate**. |
   | **Utilities** | **Run script**, **Render template**, **HTTP request**, **Respond to Webhook**, **Call workflow**, **Get document**. |
   | **Data** | Typed key/value variables for later steps. |

3. For an app step, on **Setup**, choose the integration (or **+ New** to add one) and the
   **Action**, then go to **Configure** and fill in its parameters.
4. Click **Add step** (or **Done**).

{% endwebui %}

How you know it worked: the step appears on the canvas, already wired after the previous step, and
its card shows the app, the action and the step id.

If you dropped the drag on empty canvas, the new step is connected to the step you dragged from.
With **+ Step**, a new step attaches to the end of the chain.

## Connect steps

- Drag from one step's output handle to another's input handle.
- To send a step's **failure** somewhere other than the main path, drag from the red port at the
  bottom of the step. The arrow is labelled **on error**.
- To switch an existing arrow between paths, click it and use **Run on**: **Success** or **Error**.
  An error arrow overrides that step's **On error** setting.
- Select an arrow and press Backspace or Delete to remove it.

## Edit a step

Double-click a step, or select it and click **Edit**. The **Edit step** dialog has three tabs:

- **Setup**: the **App**, the **Connection** (with **+ New connection**) and the **Action**.
  Changing the app clears the action, its parameters and the connection.
- **Configure**: the parameters. Switch the view between **Form**, **JSON** (the whole step,
  read-only), **Params JSON** (the parameters, editable) and **Node settings**. Less common
  parameters are folded under **Additional parameters (N)**. Click **ƒx** on a field to use an
  expression (see [Expressions](/guides/workflows/expressions/)).
- **Test**: run this one step. See [Run and debug](/guides/workflows/runs/).

Rename a step with the pencil next to its id. Step ids are how later steps refer to its output, as
in `steps.<id>.output`.

**Node settings** controls what happens when the step fails:

- **Retry on failure**: re-runs the step up to **Attempts** times (default 3), waiting **Delay
  (ms)** (default 1000), with **Fixed** or **Exponential** backoff.
- **On error**: **Stop the run (default)**, **Continue to the next step**, or **Continue to the
  next step & record the error**. Retries run first.
- **Notes**: a short description shown under the step on the canvas. It isn't executed.

Selecting a step also shows a toolbar: **Test-run this step**, **Edit**, **Duplicate** (the copy's
id ends in `_copy`) and **Delete**.

## Built-in steps

| Step | What it does |
| --- | --- |
| **If** | Branches on **Condition**: a boolean, or an expression such as a step's output. |
| **For each** | Runs the following steps once per item in **Items**. |
| **Parallel** | Runs the following branches at the same time. |
| **Wait** | Pauses for **Duration**, a duration such as `30s`, `1h30m30s`, or `3d30s` (units: weeks, days, hours, minutes, seconds; either case). Toggle between shorthand and a value/unit input, or choose a timestamp. Existing ISO-8601 durations also work. |
| **Aggregate** | Gathers several incoming results into an **Array** or an **Object** (up to 10 inputs). |
| **Run script** | Runs JavaScript or Python. The script is a function body; `return` its output. Python has no network access. |
| **Render template** | Renders a Handlebars **Template** with the **Values** you pass. |
| **HTTP request** | Calls a URL with a **Method**, **Headers**, **Query params** and **Body**. |
| **Respond to Webhook** | Sets the reply a webhook caller gets. See [Triggers](/guides/workflows/triggers/). |
| **Call workflow** | Runs another workflow or Function by id, optionally waiting for it. |
| **Get document** | Reads a document by **Key**. See [Documents](/guides/documents/). |
| **Data** | Declares typed variables for later steps. |

## Save

With auto-save on (the default), the editor saves about a second after you stop editing, and when
you leave the page. **Save** in the footer, or Cmd/Ctrl+S, saves straight away.

How you know it worked: the footer shows **Saved.**, and **Save** is greyed out until you change
something.

If someone else saved the same workflow after you opened it, your save is refused and **This
workflow changed on the server** appears. **Reload from server** replaces your canvas with their
version; **Keep editing** keeps yours, but every save is refused until you reload, so copy out
anything you need first.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `Fix the JSON to render the visual editor.` | The raw JSON definition is invalid. | Open **Edit raw JSON definition** and fix it. |
| `No apps registered yet. Register one from the Apps page first.` | No apps are available to you. | See [Apps](/guides/integrations/apps/). |
| `This app needs a connection before its actions can run.` | No integration exists for this app. | Click **Create connection**. |
| `the id “…” is already taken by another edge.` | Two step ids combine into an arrow id that clashes. | Rename one of the steps it connects. |
| `Invalid JSON: …` when saving | The raw definition has a syntax error. | Fix the JSON, or reload the page. |
| The canvas is read-only and **+ Step** is gone | A run is in flight. | Wait for it to finish or click **Stop this run**. |

## Where to next

- **[Triggers](/guides/workflows/triggers/)**: choose how the workflow starts.
- **[Expressions](/guides/workflows/expressions/)**: pass data between steps.
- **[Run and debug](/guides/workflows/runs/)**: test steps and read the run log.
