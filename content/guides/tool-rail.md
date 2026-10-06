---
key: "tool-rail"
title: "The tool rail"
section: "guides"
description: "The panels on the right edge of Studio: rename and tag an item, export or import its definition, get ready-made code to call it, and set retry and failure handling."
summary: null
format: "markdown"
shared: true
order: 160
position: 13
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/tool-rail.md"
sourceSha: "da922fba060c0fa439a590ea7e64217efc6b589a"
sourceRefSha: "015853978c4f9263eb1dc504226820872c8f26bd"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/015853978c4f9263eb1dc504226820872c8f26bd/docs/tool-rail.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# The tool rail

When a Function, Endpoint or Workflow is open, the strip of icons on the right edge of Studio opens
panels about it: **Settings**, **Code** and **Error handling**. Click an icon to open its panel, and
again to close it.

## Settings

The **Settings** panel shows the item's **Name**, **ID**, **Key**, when it was **Updated**, and, for
a workflow, its **Tags**.

- **Edit settings** changes the **Name**, the **Key** of a Function or Workflow (lowercase,
  kebab-case, 3–39 characters; leave it empty to unset a workflow's key) and a workflow's **Tags**.
  An Endpoint's key can't change, because it's part of its URL.
- **Version history** publishes, enables and disables the item and lists its versions. See
  [Publish and versions](/guides/publishing/).
- **Archive**, then **Delete**, retire it. See [Publish and versions](/guides/publishing/).

### Export, edit or import a definition

Click **Export, edit, or import** to open **Definition**:

- **Export** (Functions and Endpoints) shows a portable spec document you can copy into another
  account or keep in version control. Stored secrets are never included.
- **Edit JSON** (Functions and Endpoints) edits the definition directly. Click **Save** to apply it.
- **Import** creates a **new** item from a spec document and opens it. It never replaces the one
  you have open. The same **Import** button is on each list page.

To import:

1. Click **Import**. The **Import function**, **Import endpoint** or **Import workflow** dialog
   opens.
2. Paste the spec document and click **Import**.
3. W6W gives the new item a fresh id and re-binds each integration the document refers to,
   matching it to one your account already has.

How you know it worked: the new item opens. If some references couldn't be matched, the dialog
says the item was created and lists them instead; click **Open the created …** and pick one of
your own integrations in the affected steps or the **Implementation** card.

A document that contains a sealed secret value is refused. Re-enter secrets after importing
instead.

## Code

The **Code** panel reads **Call this from:** followed by a button per language: **Node**, **CLI**,
**Python** and, when the item has a public URL, **curl**. Each opens **Call from code** with a
ready-made snippet for this exact item, including install hints such as `npm i @w6w/sdk`.

The snippets read your server address from `W6W_BASE_URL` and your token from `W6W_TOKEN`. Create
a token under [API tokens](/guides/settings/tokens/) and set both before you run them. For a workflow
with several manual triggers, the dialog notes that every trigger receives the same input.

For the full client reference, see [Node SDK](/clients/node/) and [CLI](/clients/cli/).

## Error handling

The **Error handling** panel decides what happens when the whole call fails. It saves as soon as
you change it.

1. Tick **Retry on failure** and set **Attempts** (default 3), **Delay (ms)** (default 1000) and
   **Backoff** (**Fixed** or **Exponential**).
2. Click **+ Choose what runs on failure** and pick an app action, a Function or a Workflow to run
   when the call still fails after its retries. It's listed as **App action (synchronous)**,
   **Function (synchronous)** or **Workflow (asynchronous)**.
3. **Change** picks a different handler; **Remove handler** removes it.

How you know it worked: the panel shows the handler's name and id.

> **Good to know:** on a workflow, retry re-runs the **whole** workflow from its first step, so steps
> that already succeeded run again. For a step that must not repeat, such as sending an email or
> charging a card, set retry on that step instead, in its **Node settings** (see
> [The workflow editor](/guides/workflows/editor/)).

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `This handler would call itself with the same inputs and can loop forever.` | The failure handler is the item itself. | Choose another handler. |
| An import is refused | The document contains a sealed secret, or isn't a valid spec document. | Remove secret values from the document and import again. |
| An imported item fails to run | Some integrations weren't matched. | Pick your own integration in the affected steps. |
| A snippet answers `401` | `W6W_TOKEN` isn't set, or the token is revoked or disabled. | Create a token under [API tokens](/guides/settings/tokens/). |

## Where to next

- **[Publish and versions](/guides/publishing/)**: the lifecycle behind **Version history**.
- **[API tokens](/guides/settings/tokens/)**: a token for the snippets.
- **[History](/guides/history/)**: see failed calls and what ran on failure.
