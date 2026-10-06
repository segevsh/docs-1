---
id: null
key: "do-the-thing"
title: "Do the thing"
section: "guides"
description: "One sentence, written for the reader: what they'll have when they finish this page."
format: "markdown"
shared: true
sourceRepo: null
sourcePath: null
sourceSha: null
sourceRefSha: null
sourceUrl: null
syncedAt: null
createdAt: null
updatedAt: null
---

<!--
  docs.w6w.io page template. Copy this into your repo's `docs/` folder, list it in
  `docs/manifest.json` (path, slug, section, title: mirror the frontmatter above; optional
  `order`), and delete every comment before you ship. See CONTRIBUTING.md for the manifest.

  Frontmatter follows the document model: the SDK's `Doc` plus the provenance fields of
  `DocWithProvenance` (`packages/studio/src/repos/documents.ts`). The body below the frontmatter
  is the document's `content`.
  You write:
  - `key`: the page's stable key: its manifest `slug`, lowercase and hyphenated. Two segments
    (`workflows/triggers`) make it a sub-page of the first (`workflows`).
  - `title`: the page heading and its label in the side nav.
  - `section`: which nav group the page goes in.
  - `description`: one sentence, used for the page's meta description and section listings.
  - `format`: always `"markdown"` for a docs page.
  - `shared`: `true` publishes the page. `false` keeps it as a draft, even if it's in the
    manifest.
  Set when the page is collected. Leave these `null`:
  - `id`: server-issued (`doc_…`).
  - `sourceRepo`: `owner/name` of the repo the page came from.
  - `sourcePath`: the file's path within that repo.
  - `sourceSha`: hash of the file's content. Not a commit SHA.
  - `sourceRefSha`: the repo's HEAD commit at collection time. Not a content hash.
  - `sourceUrl`: link to the file on GitHub.
  - `syncedAt`: when the content last actually changed. Not refreshed on every sync.
  - `createdAt`, `updatedAt`: set by the server.
  Don't put comments inside the frontmatter: the importer's frontmatter parser accepts only
  `key: value` lines, and a `#` line makes it leave the whole block in the page body.

  Distilled from the pages that read best today: `quickstart.md`, `connect-mcp.md`,
  `self-host-install.md`, `self-host-troubleshooting.md`.

  House rules
  - Write for someone USING w6w, not building it. Lead with what they get, not how it's built.
    Internals, rationale and contracts belong in Reference (the RFCs), so link there instead of
    explaining them here.
  - "You" and the imperative ("Set", "Run"). Short paragraphs. Product name is `w6w` in code and
    commands, W6W in prose.
  - Every step is something the reader DOES, and most end with how they know it worked.
  - Secrets come from environment variables (`export W6W_TOKEN=…`), never pasted into a file.
  - Placeholders look like `<your-host>`. Ids look like `conn_01H…`. Never a real token or a real
    customer's name.
  - Every command and code block has been run against a real stack before it ships.
  - Link with site routes (`/quickstart/`, `/self-hosting/install/`), not repo paths.
  - One page, one job. If you need a second H2 called "Advanced", it's probably a second page.

  Page types. Keep the sections that fit and delete the rest.
  - Guide / how-to (default): intro, Before you start, numbered steps, optional sections,
    Troubleshooting, Where to next.
  - Concept: intro, then H2s that explain one idea each, a small table if it compares things,
    Where to next. No numbered steps.
  - Reference: intro, then tables (name | default | what it does). Generated where possible.
  - Troubleshooting: intro, one Symptom | Cause | What to do table.
-->

# Do the thing

<!-- 1–3 sentences. What this is, in the reader's terms, and what this page gets them. -->

w6w can do the thing for every API your product calls, from one place. This page takes you from
a connected app to the thing running, in about five minutes.

## Before you start

<!-- Only what the reader must already have. Link to the page that gets them each one. -->

- A w6w account and an API token. See the [Quickstart](/quickstart/).
- At least one connected app.

## 1. First step, named by what the reader does

<!-- One short paragraph of why, then the action. Use channel blocks when the step differs between
     Studio, the CLI, the SDKs and raw HTTP; readers pick their channel once with the toggle.
     Available tags: webui, cli, sdk-node, sdk-python, sdk-react, api. Use only the ones that
     apply, and keep them in that order. -->

{% webui %}

In Studio, open **Connections** → **New connection**, pick the app, and follow the sign-in prompt.

{% endwebui %}

{% cli %}

```bash
w6w connections list
```

{% endcli %}

{% sdk-node %}

```ts
import { W6wClient } from "@w6w/sdk";

const client = new W6wClient(); // reads W6W_BASE_URL and W6W_TOKEN
const connections = await client.connections.list();
```

{% endsdk-node %}

{% sdk-python %}

```python
from w6w import Client

client = Client()  # reads W6W_BASE_URL and W6W_TOKEN
connections = client.connections.list()
```

{% endsdk-python %}

{% api %}

```bash
curl -H "Authorization: Bearer $W6W_TOKEN" "$W6W_BASE_URL/connections"
```

{% endapi %}

## 2. Second step

<!-- Commands that need values: show them as env vars with an inline comment saying where each
     value comes from. -->

```bash
export W6W_BASE_URL=https://<your-host>   # your account's origin, no trailing path
export W6W_TOKEN=…                         # Studio → Tokens → New token
```

## 3. Check that it worked

<!-- Say exactly what success looks like: the output, the status, the screen. If a state looks
     like failure but isn't, say so here. -->

```bash
w6w run conn_01H… --action send_message --payload '{"text":"Hello from w6w"}'
```

You should see the action's result printed as JSON. If you get a `401`, your token is missing or
expired. See [Troubleshooting](#troubleshooting).

## Options

<!-- Optional. A table when there are choices: what each does, and when to pick it. -->

| Option | What it does | Use it when |
| --- | --- | --- |
| `first` | The default. | You don't have a reason to change it. |
| `second` | Something more specific. | You need that specific thing. |

> **Good to know:** one callout at most, for the thing people get wrong. If you need several, they
> belong in the steps.

## Troubleshooting

<!-- Optional. Only symptoms a reader of THIS page will actually hit, worded as they see them:
     the exact error code or message. -->

| Symptom | Cause | What to do |
| --- | --- | --- |
| `401 unauthorized` | The token is missing, expired or revoked. | Create a new one in Studio → **Tokens** and re-export `W6W_TOKEN`. |
| `424` with the vendor's error in the body | The app's own API refused the call. | Check the connection's health in Studio → **Connections**. |

## Where to next

<!-- 2–4 links. Bold link, then a dash and what the reader gets there. The last one may point to
     the Reference page behind this feature, for readers who want the contract. -->

- **[Next task](/guides/next-task/)**: the natural thing to do after this one.
- **[Related concept](/get-started/concepts/)**: what's going on underneath, in plain terms.
- **[Spec: Action](/reference-spec/action/)**: the full contract, if you're building on it.
