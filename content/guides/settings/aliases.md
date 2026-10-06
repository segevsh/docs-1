---
key: "settings/aliases"
title: "Aliases"
section: "guides"
description: "Give an action, Function, Workflow or Endpoint a short name so scripts can run it with w6w run <name>. The page is reachable by URL only."
summary: null
format: "markdown"
shared: true
order: 90
position: 28
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/settings/aliases.md"
sourceSha: "2253cb6625b6722b8297ac6ec1f3b0c0a8ddf149"
sourceRefSha: "015853978c4f9263eb1dc504226820872c8f26bd"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/015853978c4f9263eb1dc504226820872c8f26bd/docs/settings/aliases.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Aliases

An alias is a short name bound to one thing you can run: an app action, a
[Function](/guides/functions/), a [Workflow](/guides/workflows/) or an
[Endpoint](/guides/endpoints/). Scripts then run it by name instead of by id, and you can point
the name somewhere else later without changing the scripts.

> **Where to find it:** aliases aren't in the settings list. Open
> `https://<your-studio-host>/<account-id>/<project-id>/settings/aliases` directly. The page may
> change.

## Create an alias

{% webui %}

1. Open the Aliases page and click **+ New alias**.
2. Under **Identity**, enter a **Name** in lowercase kebab-case, such as `send-email`. You can't
   change it after saving. Optionally add a **Display name** and **Description**.
3. Under **Target**, choose **Action**, **Function**, **Workflow** or **Endpoint**, and pick the
   one this alias runs.
4. Click **Save alias**.

{% endwebui %}

How you know it worked: **Saved.** appears, and the alias is listed under **Registered aliases**.
**Run it** shows the command to call it:

{% cli %}

```bash
w6w run send-email --payload '{"to": "ada@example.com"}'
```

See [CLI](/clients/cli/).

{% endcli %}

A Function or action target answers with its result; a Workflow target starts a run.

## Change or delete an alias

- Open it, pick a different **Target** and click **Save alias**. Everything that calls the name
  now runs the new target.
- Click **Delete** and confirm **Delete alias**. Anything that still calls the name fails straight
  away.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `Name this alias before saving.` | **Name** is empty. | Enter a name. |
| `Pick a target for this alias before saving.` | No target is chosen. | Choose one under **Target**. |
| `w6w run <name>` says it's not found | The name is misspelled, or the alias is in another project. | Check **Registered aliases** in the project your token uses. |

## Where to next

- **[Settings](/guides/settings/)**: the rest of the settings.
- **[CLI](/clients/cli/)**: running things from the terminal.
