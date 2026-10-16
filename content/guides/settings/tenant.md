---
key: "settings/tenant"
title: "Tenant"
section: "guides"
description: "For tenant admins: choose how people sign in, add your own domains, and register your own OAuth clients so every account in your tenant connects through them."
summary: null
format: "markdown"
shared: true
order: 60
position: 25
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/settings/tenant.md"
sourceSha: "44242139dee03dcbd934dfb047764f735987e846"
sourceRefSha: "5c12eada9888c3fb1031d01714feb32337be265b"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/5c12eada9888c3fb1031d01714feb32337be265b/docs/settings/tenant.md"
syncedAt: "2026-10-14T14:03:50Z"
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

1. Under **Configured clients**, click **Register OAuth app**. The picker searches every eligible
   app by name or id; pick the app. If the app has its own setup guidance, the window shows it,
   with a link to the provider's developer console.
2. Copy the **Callback URL** shown in the Register OAuth app window. It is the same URL for every
   app on this server. If the app offers more than one sign-in method, choose the one to register
   under **Sign-in method**. At the provider (for example Google or GitHub), create an OAuth app
   and register that callback URL in it. Note its client ID and client secret.
3. Enter the **Client ID** and **Client secret**. Provider-specific settings go under **Extra
   (JSON)**, which stays collapsed behind **Add extra settings (JSON)** until you need it. It opens
   by itself when the app suggests a starting value, or when the client already has extra settings
   stored.
4. Leave **Default sign-in method for this app** ticked to preselect this client when your users
   connect the app. It is ticked for you when no other client of this app is the default, and
   unticked when one already is. Editing a client never changes it unless you tick or untick it.
5. Click **Save**.

The long explanations in the window (what changing or removing a client does to existing
connections) sit behind the small **i** button. Click it to read them.

How you know it worked: the app is listed under **Configured clients** with its icon, its name and
**enabled**, plus a **Default** tag if it is the default. The secret line shows a masked hint of the
stored secret (the last few characters); older entries without one show "client secret stored".
New OAuth integrations for that app, in every account in your tenant, go through
your client.

## Disable or remove a client

- **Edit** changes the client ID, secret, extra settings or the default choice. Leave the secret
  empty to keep the stored one. The form has no per-field **Remove** buttons: to clear a client,
  use **Remove** on the list row.
- **Disable** hides that OAuth option from your users until you click **Enable**. Ticking
  **Disabled for this tenant** in the form does the same.
- **Remove** deletes your client. The app falls back to W6W's own client. Existing integrations
  aren't moved: users have to reconnect, and reconnecting creates a new integration, so workflow
  steps pinned to the old one need repointing.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| The provider says the redirect URI doesn't match | The callback URL registered at the provider differs from the one shown in the Register OAuth app window (for example, a typo or a different environment's URL). | Open the app's **Edit** window, copy the **Callback URL** again and paste it exactly, replacing the old one. |
| `No OAuth apps are available to register.` | Every app that offers OAuth sign-in and is available to your tenant already has your client registered, or your tenant's catalog has no such app. | To change an existing client, use **Edit** on it. If you expected an app to be listed, check that it is installed and not blocked for your tenant. |
| A domain stays **pending** | The DNS record isn't published or hasn't propagated yet. | Check the record, wait, and click **Validate** again. |

## Where to next

- **[Integrations](/guides/integrations/)**: connecting with OAuth.
- **[Sign in and projects](/guides/sign-in/)**: what your users see.
