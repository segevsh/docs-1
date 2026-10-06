---
key: "settings/tenant"
title: "Tenant"
section: "studio"
description: "For tenant admins: choose how people sign in, add your own domains, and register your own OAuth clients so every account in your tenant connects through them."
format: "markdown"
shared: true
order: 60
position: 25
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/settings/tenant.md"
sourceSha: "bd8710810346630979b59bfffa157af3c37a45d8"
sourceRefSha: "d1bba44c58b043319966cf16e85a13196e68fe4a"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/d1bba44c58b043319966cf16e85a13196e68fe4a/docs/settings/tenant.md"
syncedAt: "2026-10-06T03:44:03Z"
---


# Tenant

A tenant is the top level of W6W: it holds every account under your organisation. **Settings** →
**Tenant** controls what's shared by all of them: how people sign in, which domains serve Studio,
and which OAuth clients the integrations use.

> **Who sees this:** tenant admins. Others don't see **Tenant** in the settings list, and opening it
> directly shows "Not available for this account.".

## Choose how people sign in

1. Under **Sign-in methods**, tick the methods your users may use: **Email me a sign-in code
   (OTP)** and **Password sign-in**.
2. Click **Save**.

How you know it worked: the sign-in page offers only the methods you ticked.

## Add a domain

1. Under **Domains**, click **Add domain**.
2. Enter the **Domain**, such as `app.example.com`. It can be a host under a domain you own, or
   under one W6W offers.
3. Click **Add domain**.

The domain is listed as **pending** until it's ready. For a domain you own, a notice shows the DNS
record to publish:

4. Publish a DNS record with the **Record name** and **Record value** shown.
5. Click **Validate**.

How you know it worked: the **pending** tag goes away. Until then nothing is served on that host.

To remove one, click **Delete** and confirm **Delete domain**. The **default** domain can't be
deleted.

## Use your own OAuth client for an app

By default, an app that signs in with OAuth uses W6W's own OAuth client. Register your own to have
users see your name on the provider's consent screen, or to use your own quota.

1. Copy the **Callback URL** shown on the page.
2. At the provider (for example Google or GitHub), create an OAuth app and register that callback
   URL in it. Note its client ID and client secret.
3. Back in Studio, under **Configured clients**, click **Register OAuth app** and pick the app.
4. Enter the **Client ID** and **Client secret**. Add provider-specific settings under **Extra
   (JSON)** only if the app needs them.
5. Click **Save**.

How you know it worked: the app is listed under **Configured clients** as **enabled**, with "client
secret stored". New OAuth integrations for that app, in every account in your tenant, go through
your client.

## Disable or remove a client

- **Edit** changes the client ID, secret or extra settings. Leave the secret empty to keep the
  stored one.
- **Disable** hides that OAuth option from your users until you click **Enable**. Ticking
  **Disabled for this tenant** in the form does the same.
- **Remove** deletes your client. The app falls back to W6W's own client. Existing integrations
  aren't moved: users have to reconnect, and reconnecting creates a new integration, so workflow
  steps pinned to the old one need repointing.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| The provider says the redirect URI doesn't match | The callback URL registered at the provider differs from the one shown here. | Copy the **Callback URL** again and paste it exactly. |
| `Every OAuth-capable app already has a client configured.` | Each app that uses OAuth already has your client. | Use **Edit** on the existing one. |
| A domain stays **pending** | The DNS record isn't published or hasn't propagated yet. | Check the record, wait, and click **Validate** again. |

## Where to next

- **[Integrations](/studio/integrations/)**: connecting with OAuth.
- **[Sign in and projects](/studio/sign-in/)**: what your users see.
