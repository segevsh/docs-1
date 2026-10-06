---
key: "publishing"
title: "Publish and versions"
section: "guides"
description: "Publish a Function, Endpoint or Workflow so callers can invoke it, look at and invoke earlier versions, roll back, disable it, archive it and delete it."
summary: null
format: "markdown"
shared: true
order: 155
position: 12
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/publishing.md"
sourceSha: "3532d8449a4d7e3a702d371138becead66127979"
sourceRefSha: "015853978c4f9263eb1dc504226820872c8f26bd"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/015853978c4f9263eb1dc504226820872c8f26bd/docs/publishing.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Publish and versions

Functions, Endpoints and Workflows share one lifecycle:

1. **Save** stores your edits. Callers run what's saved.
2. **Publish** takes a numbered snapshot: version 1, 2, 3 and so on. Something that has never been
   published can't be invoked at all.
3. **Disable** stops it from being invoked, without losing anything. **Enable** turns it back on.
4. **Archive** retires it for good, and only then can you **Delete** it.

Everything on this page happens in the **Settings** panel on the right-hand
[tool rail](/guides/tool-rail/), with the item open.

## Publish

{% webui %}

1. Save your edits.
2. On the tool rail, open **Settings** and click **Version history**.
3. Click **Publish**.

{% endwebui %}

How you know it worked: the panel reads **Published: vN**, one higher than before. Workflows also
have a **Publish** button in the editor's header, which turns into **● Published**.

A workflow's header **Publish** button stays disabled until the workflow is valid; hover over it
for the reason. See [Workflows](/guides/workflows/).

## Look at, invoke or restore an earlier version

1. Click **Version history**, then open **All versions**. Each row shows `vN`, its date, and
   **Published** on the current one.
2. Click a version to open **Version N**, which shows its full definition.
3. Choose:
   - **Invoke this version** to run exactly that version, for example to compare it with the
     current one;
   - **Revert to this version** to copy it back over your current definition. The key and the
     address callers use stay the same. Confirm with **Revert**.

How you know a revert worked: the editor shows the restored definition. It's saved, not
published, so click **Publish** when you're happy with it.

## Disable and enable

Click **Disable** under **Version history**. Callers get an error until you click **Enable**.
Nothing is deleted, and you can keep editing while it's disabled.

## Archive and delete

At the bottom of the **Settings** panel:

1. Click **Archive** and confirm. Archiving is one-way: there's no unarchive. An archived Function
   or Endpoint can no longer be invoked or edited; an archived workflow stops running and can no
   longer be published. Archived items are hidden from lists unless you tick **Show archived**.
2. Once it's archived, the button becomes **Delete**. Click it and confirm to remove it
   permanently. Anything that still points at a deleted Function or Endpoint (a workflow step, an
   Endpoint, a caller) starts failing with a not-found error. A deleted workflow's run history is
   deleted too and can't be recovered.

How you know it worked: Studio returns you to the list, and the item is gone (or, after
archiving, shown only with **Show archived** ticked).

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| Callers get `has never been published and cannot be invoked` | It was saved but never published. | Click **Publish**. |
| Callers get an error after you edited it | Your edit is live as soon as you save. | Revert to a previous version, or fix and save again. |
| **Publish** isn't offered on an archived item | Archived items can't be published. | Create a new one, or import its definition (see [The tool rail](/guides/tool-rail/)). |
| **Delete** isn't offered | Only archived items can be deleted. | Archive it first. |

## Where to next

- **[The tool rail](/guides/tool-rail/)**: rename, export, call from code and error handling.
- **[History](/guides/history/)**: see each invocation and its result.
