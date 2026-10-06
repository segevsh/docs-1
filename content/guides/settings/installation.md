---
key: "settings/installation"
title: "Installation"
section: "guides"
description: "For operators of a self-hosted W6W: check the installation's licence, lease and usage reporting, activate it, upload a licence file, enroll worker nodes and export usage reports."
summary: null
format: "markdown"
shared: true
order: 80
position: 27
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/settings/installation.md"
sourceSha: "d285c8fc5c613253640e2478bf704e77b619b388"
sourceRefSha: "015853978c4f9263eb1dc504226820872c8f26bd"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/015853978c4f9263eb1dc504226820872c8f26bd/docs/settings/installation.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Installation

**Settings** → **Installation** describes the W6W server itself rather than any tenant or account.
You use it when you run W6W yourself.

> **Who sees this:** operators of the installation. The entry appears only when the server answers
> with installation details for you; for everyone else it's hidden, and opening it directly shows
> "Not available for this account.".

## Check the installation's state

The top of the page shows:

- **Mode** (cloud or self-host), **Installation ID** and **Database schema**.
- **Licence**: its **State**, **Band**, **Parallel executions** and when it expires.
- **Link**: whether the installation reaches W6W's licensing service, and its **Last contact**.
- **Licence warden**, **Lease**, **Usage reporting**, **Last usage report** and **Retention**, when
  the server reports them. **Retention** shows how many days run data is kept and when the last
  prune ran.

## Activate the installation

{% webui %}

1. Under **Activate**, paste the **Activation token** you were given.
2. Click **Activate**.

{% endwebui %}

How you know it worked: **Licence** and **Link** update to show the installation as licensed and
linked. The token is cleared from the page once sent.

If the installation runs the licence warden, the section shows the command to run on the warden
instead: `w6w-warden activate -`, with the token on standard input.

## Upload a licence or lease file

For an installation that can't reach the licensing service:

1. Under **Licence / lease file**, paste the file into **File contents**, or use **…or read it from a
   file**.
2. Click **Upload licence / lease**.

How you know it worked: **Licence** or **Lease** shows the new expiry date.

## Export usage reports

When the installation can't send its usage reports itself, click **Export un-acked reports** under
**Un-acked reports**. You get every report that hasn't been acknowledged yet, one per line, to
deliver by hand. Exporting doesn't mark them as sent.

## Enroll a worker node

**Nodes** lists every server process in the installation, with its role and version, and warns
when versions differ.

1. Click **Enroll a spoke**.
2. Click **Create token**.
3. Copy the **Enrollment token** and click **Done**.
4. Start the new node with that token.

How you know it worked: the node appears under **Nodes**.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| **Installation** isn't in the settings list | You aren't an operator, or the server doesn't report installation details. | Sign in as an operator. |
| `W6W_CONTROL_URL is not set on this installation.` when activating | The server has no licensing service address configured. | Set `W6W_CONTROL_URL` on the server and restart it, or upload a licence file instead. |
| **Licence** shows `grace` or `lapsed` | The licence or lease has expired or couldn't be renewed. | Check **Link**, then activate again or upload a new file. |
| **Enroll a spoke** isn't shown | Your role can't enroll nodes. | Ask an operator with installation rights. |

## Where to next

- **[Console](/guides/settings/console/)**: manage every tenant on the installation.
