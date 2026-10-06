---
key: "settings"
title: "Settings"
section: "studio"
description: "Find your way around Studio's settings, which are grouped by scope (this project, your account, your organisation, the installation), and the project's General page."
format: "markdown"
shared: true
order: 130
position: 19
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/settings.md"
sourceSha: "475b49a2e8c7cc41997e76ef5e72f8a769c0dde3"
sourceRefSha: "d1bba44c58b043319966cf16e85a13196e68fe4a"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/d1bba44c58b043319966cf16e85a13196e68fe4a/docs/settings.md"
syncedAt: "2026-10-06T03:44:03Z"
---


# Settings

Click **Settings** at the bottom of the sidebar. The sidebar switches to the settings list, grouped
from the narrowest scope to the broadest. **← Back** returns to the main navigation.

| Group | Page | Who sees it |
| --- | --- | --- |
| **This project** | **General**: the project's name, id and creation date, and deleting it. | Everyone |
| | [Repository](/studio/settings/repository/): sync the project's documents with a GitHub repository. | Everyone |
| **Account** | [My account](/studio/settings/account/): your name, emails, phone, password and passkeys. | Everyone |
| | [Billing](/studio/settings/billing/): your plan, usage and invoices. | Everyone |
| | [Apps](/studio/integrations/apps/): apps your account registered itself. | Everyone |
| | [API tokens](/studio/settings/tokens/): tokens for scripts, servers and the CLI. | Everyone |
| | [Team](/studio/settings/team/): members, roles and invites. | Account owners and admins |
| **Tenant** | [Tenant](/studio/settings/tenant/): your organisation's sign-in methods, domains and OAuth apps. | Tenant administrators |
| **Console** | [Console](/studio/settings/console/): tenants, audit log and system load. | Server operators |
| **Installation** | [Installation](/studio/settings/installation/): licence, lease, usage reporting and nodes. | Self-hosted installations and operators |

When you're inside **Settings**, the sidebar's footer has **Session** instead of **Settings**. It
shows who you're signed in as (tenant, account, user and role), the Studio and API versions, and
the **API server** control (see [Sign in and projects](/studio/sign-in/)).

When Studio is embedded in another product, **Settings** is hidden; manage those things in a
direct Studio visit instead.

## General

**Settings** → **General** shows the current project's **Name**, **Project Id** and when it was
**Created**. Projects can't be renamed yet.

### Delete a project

You can delete any project except your account's default one.

1. Switch to the project you want to delete.
2. Open **Settings** → **General**.
3. Under **Delete project**, click the bin icon and confirm **Delete**.

How you know it worked: Studio switches to another project, and the deleted one is gone from the
**Project** switcher. Its workflows and documents become inaccessible, and this can't be undone.

## Where to next

- **[My account](/studio/settings/account/)**: your own sign-in details.
- **[API tokens](/studio/settings/tokens/)**: a token for the CLI or the SDK.
- **[Team](/studio/settings/team/)**: invite people to your account.
