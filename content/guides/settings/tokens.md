---
key: "settings/tokens"
title: "API tokens"
section: "guides"
description: "Create API tokens for scripts, servers, CI and the CLI, see when each was last used, and disable or revoke one."
summary: null
format: "markdown"
shared: true
order: 40
position: 23
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/settings/tokens.md"
sourceSha: "3dd928ea4d96b3bc9fcaf2cb7df92bd44ea6d0a9"
sourceRefSha: "015853978c4f9263eb1dc504226820872c8f26bd"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/015853978c4f9263eb1dc504226820872c8f26bd/docs/settings/tokens.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# API tokens

An API token lets code call W6W as you: the SDKs, the CLI, a CI job or your own server. It's the one
credential your code needs. The vendors' own keys stay inside your
[integrations](/guides/integrations/).

A token acts with your access in your account. Tokens have no scopes, so give each use its own
token and revoke it when the use ends.

## Create a token

{% webui %}

1. Open **Settings** → **API tokens** and click **+ Create token**.
2. In **Create API token**, enter a **Name** you'll recognise later, such as `ci-deploy`, and click
   **Create token**.
3. **API token created** shows the **Token secret**. Copy it now: it isn't shown again.
4. Click **Done**.

{% endwebui %}

Store the secret in an environment variable or your secret manager, never in source code:

```bash
export W6W_BASE_URL="https://<your-api-host>"
export W6W_TOKEN="<token secret>"
w6w me
```

How you know it worked: `w6w me` prints your user and account. Back in Studio, the token's row
shows when it was last used.

## Disable, enable or revoke a token

Each token is listed with its name, an **active** or **disabled** tag, when it was created and
when it was last used.

- **Disable** stops the token working straight away, without deleting it. **Enable** turns it back
  on.
- **Revoke** deletes it for good, after you confirm **Revoke token**. Anything still using it gets
  `401`.

If a token may have leaked, revoke it, create a new one and update the places that used the old
one.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `401` from the SDK or CLI | The token is wrong, disabled or revoked, or `W6W_BASE_URL` points at another server. | Check both variables, and the token's tag in this list. |
| You lost the secret | It's only shown once. | Create a new token and revoke the old one. |
| `No API tokens yet.` | You haven't created any. | Click **+ Create token**. |

## Where to next

- **[Node SDK](/clients/node/)** and **[CLI](/clients/cli/)**: use the token.
- **[The tool rail](/guides/tool-rail/)**: ready-made snippets that read `W6W_TOKEN`.
