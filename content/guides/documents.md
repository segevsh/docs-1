---
key: "documents"
title: "Documents"
section: "guides"
description: "Store named content such as email templates, prompts and configuration as text, Markdown, YAML, HTML or JSON, and read it from steps, Functions and code."
summary: null
format: "markdown"
shared: true
order: 210
position: 18
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/documents.md"
sourceSha: "9a45301d5cd377a92647afbb3dcd782de00eed82"
sourceRefSha: "2e25e297622dec7966f7baafd584add3eba28641"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/2e25e297622dec7966f7baafd584add3eba28641/docs/documents.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Documents

A document is a named piece of content stored as-is: an email template, an AI prompt, a block of
configuration. Steps read it by its key, so you can change the wording without editing any
workflow. Documents belong to the project you're in.

Open the page from the sidebar: **Configure** → **Documents**.

## Add a document

{% webui %}

1. Click **+ Add document**.
2. Enter a **Key**, for example `welcome-email`, up to 128 characters. This is the name you refer
   to it by.
3. Pick a **Format**: `text`, `markdown`, `yaml`, `html` or `json`.
4. Type or paste the **Content**, optionally add a **Description**, and click **Save document**.

{% endwebui %}

{% sdk-node %}

```ts
await client.documents.create({ key: "welcome-email", content: "# Welcome" });
```

See [Node SDK](/clients/node/).

{% endsdk-node %}

{% cli %}

```bash
w6w documents create welcome-email --content "# Welcome"
```

See [CLI](/clients/cli/).

{% endcli %}

How you know it worked: the document is listed by key. Click it to see its **Key** and
**Content**.

Studio doesn't check that `json` or `yaml` content is valid. Check it before you rely on its
fields.

## Use a document

- In a step, insert it from the **Documents** group of the expression editor, or type
  `{{ documents.welcome-email }}`. For a JSON or YAML document, `{{ documents.<key>.<field> }}` reads
  one top-level field. See [Expressions](/guides/workflows/expressions/).
- Add a **Get document** step to load a document whose key is only known at run time.
- **Call from code** on the document's row gives a ready-made snippet to read it.

## Edit or delete

Click the edit icon (**Edit &lt;key&gt;**) on the row, change the content and click **Save
changes**. The key can't change. The bin icon deletes it after you confirm **Delete document**.

## Documents synced from a repository

If the project is bound to a Git repository (see [Repository](/guides/settings/repository/)),
documents from it are marked as synced and show where they came from. A synced document is
read-only in Studio: its row has **Sync from repository** instead of edit and delete, and its page
shows a **Source** card with the repository, path, commit and when it was retrieved. Change it in the
repository, then sync.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `No documents yet.` | This project has no documents. | Click **+ Add document**, or check you're in the right project. |
| `Document not found` | It was deleted, or belongs to another project. | Switch project. |
| A field reference resolves to nothing | The document isn't JSON or YAML, the field isn't at the top level, or the content isn't valid. | Fix the content, or use the whole document. |
| There's no edit button | The document is synced from a repository. | Edit it in the repository and click **Sync from repository**. |

## Where to next

- **[Expressions](/guides/workflows/expressions/)**: use documents in steps, including as templates.
- **[Repository](/guides/settings/repository/)**: keep documents in Git.
- **[Secrets & variables](/guides/secrets-and-variables/)**: for short values and secrets.
