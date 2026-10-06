---
key: "settings/repository"
title: "Repository"
section: "guides"
description: "Bind a project to a path in a GitHub repository so its documents live in Git: pull changes in, and push your Studio edits back as a pull request or a direct commit."
summary: null
format: "markdown"
shared: true
order: 10
position: 20
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/settings/repository.md"
sourceSha: "666f5e8014f983197d0154011cf27eaf9f32d955"
sourceRefSha: "015853978c4f9263eb1dc504226820872c8f26bd"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/015853978c4f9263eb1dc504226820872c8f26bd/docs/settings/repository.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Repository

Bind a project to a GitHub repository to keep its [documents](/guides/documents/) in Git, where you
can review and version them like code. Studio pulls them in automatically, and pushes back only
when you ask it to.

Each project has at most one binding.

## Before you start

- An integration with the GitHub app, with access to the repository. You can create one during the
  steps below. If GitHub isn't offered, it isn't registered on your server; ask your administrator.
- In the repository, under the path you'll bind, a `.w6w/manifest.json` that lists each document and
  points to its file under `documents/`. **How this works** on the Repository page shows an example
  and explains every field.

## Bind a repository

{% webui %}

1. Open **Settings** → **Repository** and click **Add**. **Bind a repository** opens.
2. Pick the GitHub app and an integration for it, or create a new integration.
3. Enter the **Repo** as `owner/name`, the **Branch** (for example `main`) and, optionally, a **Path
   prefix** if the files aren't at the repository root.
4. Tick **Allow pushing to this repository** if you want to push Studio edits back.
5. Click **Save**.

{% endwebui %}

How you know it worked: the page shows the binding and the manifest it found, and the top bar shows
a sync indicator. Open **Documents**: the repository's documents are listed as synced.

## Keep it in sync

- Opening **Documents** pulls the latest from the repository automatically. That pass only ever
  pulls; it never pushes.
- **Sync now** on the Repository page pulls on demand.
- **Sync from repository** on a single document pulls just that one.

## Push your edits back

**Push upstream** appears only if the binding allows pushing.

1. Click **Push upstream**.
2. Choose **Open a pull request** or **Push directly (merge)**.
3. Click **Push**.

How you know it worked: the pull request or commit appears in the repository.

Nothing goes to GitHub until you click **Push**.

## Change or remove the binding

- **Edit** reopens the binding with its current values, so you can change the branch, path prefix,
  pushing permission or integration.
- **Unbind** removes the binding after you confirm **Unbind repository**. The repository itself is
  untouched.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `No repository bound yet — click “Add” to connect one.` | The project has no binding. | Click **Add**. |
| No documents arrive after binding | There's no `.w6w/manifest.json` under the path prefix, or its paths don't match the files. | Check the manifest against the example in **How this works**. |
| Sync fails with an access error | The GitHub integration can't read the repository or branch. | Give it access at GitHub, or pick another integration under **Edit**. |
| **Push upstream** isn't shown | The binding doesn't allow pushing. | Click **Edit** and tick **Allow pushing to this repository**. |

## Where to next

- **[Documents](/guides/documents/)**: how synced documents behave in Studio.
- **[Integrations](/guides/integrations/)**: create or fix the GitHub integration.
