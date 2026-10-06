---
key: "workflows"
title: "Workflows"
section: "studio"
description: "Compose several API calls into one durable, multi-step run that starts on a trigger: create a workflow, declare its inputs, publish it and call it from code."
format: "markdown"
shared: true
order: 50
position: 7
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/workflows.md"
sourceSha: "ecf6f1bbd4fc45a00bf8684245ec82d377655bdb"
sourceRefSha: "d1bba44c58b043319966cf16e85a13196e68fe4a"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/d1bba44c58b043319966cf16e85a13196e68fe4a/docs/workflows.md"
syncedAt: "2026-10-06T03:44:03Z"
---


# Workflows

A Workflow is a durable, multi-step run. It starts on a trigger (a manual run, a webhook, a schedule
or an app event), and each step calls an app action, a Function or another Workflow, or does
something built in like branching, waiting or running a script. Every run keeps its own state,
history and error handling.

Workflows belong to the project you're in.

## Create a workflow

{% webui %}

1. In the sidebar, under **Build**, click **Workflows**.
2. Click **+ New workflow**.

{% endwebui %}

How you know it worked: the visual editor opens on a new workflow called "Untitled workflow", with
a manual trigger and no other steps. Click the title to rename it; the name saves when you click
away.

From here:

1. Add steps on the canvas: see [The workflow editor](/studio/workflows/editor/).
2. Choose how it starts: see [Triggers](/studio/workflows/triggers/).
3. Pass data between steps: see [Expressions](/studio/workflows/expressions/).
4. Run it and read the result: see [Run and debug](/studio/workflows/runs/).

## Read the list

**Workflows** lists every workflow in the project with its description, tags, run count and status:

| Status | Meaning |
| --- | --- |
| `draft` | Never published. You can run it from the editor, but callers can't invoke it. |
| `active` | Published. Callers and triggers run it. |
| `archived` | Archived. Only shown when you tick **Show archived**. |

Click a row to open it in the editor. **Import** creates a workflow from a spec document (see
[The tool rail](/studio/tool-rail/)).

## Declare the workflow's inputs

Inputs are what API and AI (MCP) callers see as the workflow's input schema.

1. In the editor's header, click the settings (gear) icon, **Workflow settings**.
2. Open the **Variables** tab and click **+ Add variable**.
3. Give each one a **key**, a type (`string`, `number`, `boolean`, `object` or `array`), tick
   **required** if callers must send it, and optionally a **default**.

How you know it worked: the tab reads "N variable(s) declared". With none declared, callers may
send anything.

The **General** tab of the same dialog has two switches, both on by default: **Auto-save edits**
and **Save step positions and canvas view**. They belong to the workflow, so everyone who opens it
gets the same behaviour.

## Publish

Callers and triggers need a published version. The header's **Publish** button is enabled only
when the workflow is valid:

- it has a trigger step;
- every step has an app and an action, and every required parameter is filled;
- every step that calls a real app has a **passing saved test** (see
  [Run and debug](/studio/workflows/runs/)).

When it's disabled, hover over it to see the reason, for example `no trigger step` or
`send_email: saved test`.

How you know it worked: the button reads **● Published**. Click it again after later edits to
publish a new version. For versions, rollback, disabling and archiving, see
[Publish and versions](/studio/publishing/).

## Call it from code

A workflow call queues a run and answers with its run id. Ask the client to wait if you need the
result.

{% sdk-node %}

```ts
const run = await client.workflows.run("wf_01H…", { wait: true, variables: { email: "a@example.com" } });
```

See [Node SDK](/clients/node/).

{% endsdk-node %}

{% cli %}

```bash
w6w workflows run wf_01H… --wait --var email=a@example.com
```

See [CLI](/clients/cli/).

{% endcli %}

The **Code** panel on the tool rail gives the same call ready-made for Node, CLI, Python and curl.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `None yet — click “New workflow” to create one.` | The project has no workflows. | Click **+ New workflow**, or check you're in the right project. |
| **Publish** is greyed out | The workflow isn't valid yet. | Hover over it for the reason, and fix that step. |
| A caller gets an error that the workflow isn't published | It's still a `draft`. | Click **Publish**. |
| `Workflow not found` | The workflow was deleted, or belongs to another project. | Switch project, or go back to **Workflows**. |

## Where to next

- **[The workflow editor](/studio/workflows/editor/)**: add and connect steps.
- **[Triggers](/studio/workflows/triggers/)**: start it from a webhook, a schedule or an app event.
- **[Run and debug](/studio/workflows/runs/)**: test steps, run the whole thing and read the log.
