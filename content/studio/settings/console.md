---
key: "settings/console"
title: "Console"
section: "studio"
description: "For operators: create and disable tenants, set each tenant's sign-in and app policy, review usage, search the audit log and watch the server's resources."
format: "markdown"
shared: true
order: 70
position: 26
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/settings/console.md"
sourceSha: "81330c1c6c1b364467097287b2b5fe86a6528b28"
sourceRefSha: "d1bba44c58b043319966cf16e85a13196e68fe4a"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/d1bba44c58b043319966cf16e85a13196e68fe4a/docs/settings/console.md"
syncedAt: "2026-10-06T03:44:03Z"
---


# Console

The **Console** is the operator's view across every tenant on the installation. It appears in the
settings list under **Console**, with three pages: **Tenants**, **Audit** and **System**.

> **Who sees this:** operators only. For everyone else the section is hidden, and opening one of
> its pages directly shows a "not available" notice.

## Tenants

**Tenants** lists every tenant with its **Slug**, **Domain**, **Status** and **Usage (last 30
days)**.

### Create a tenant

1. Click **New tenant**.
2. Enter a **Name**. Optionally set the **Slug**, a **Domain** and a **Tenant admin subject**, the
   user who'll administer it.
3. Click **Create tenant**.
4. Copy the **Client id** and **Client secret** shown. The secret isn't shown again. The tenant's
   backend uses them to exchange its own users' sign-ins for W6W sessions.

How you know it worked: the tenant is listed as active.

### Manage a tenant

- **Rename slug** changes the tenant's short name.
- **Disable** turns the tenant off; **Enable** turns it back on.
- Open a tenant for three tabs:
  - **Access**: its backend credentials (**Rotate client secret**), the identity providers it
    accepts (**Register IdP**, with **JWKS URI**, **Audience**, **Subject claim** and **Account
    claim**), a **Custom authorizer**, and its OAuth clients.
  - **Apps policy**: which apps the tenant can see. Switch between allowing everything and an
    allow list, **Add an app**, pin a version, and **Block** or **Hide** an app.
  - **Usage**: the tenant's usage events, in total and for the last 30 days. This is an operator
    ledger, not billing.

## Audit

**Audit** lists who did what: **Time**, **Action**, **Actor**, **Target**, **Tenant**, **Outcome**
and **Detail**.

1. Narrow it with **Action**, **Actor kind**, **Actor id**, **Tenant**, **Outcome** and a date range.
2. Click **Apply filters**. **Clear** resets them.
3. Click **Export NDJSON** to download the matching events.

## System

**System** shows the server's own CPU, memory and load, live.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| No **Console** section | You aren't an operator. | Sign in as an operator. |
| `Resource monitoring is not available on this server.` | The server doesn't expose resource figures. | None. |
| `No audit events match these filters.` | The filters exclude everything. | Click **Clear**. |

## Where to next

- **[Installation](/studio/settings/installation/)**: the server's licence and nodes.
- **[Tenant](/studio/settings/tenant/)**: what a tenant admin manages themselves.
