---
key: "sign-in"
title: "Sign in and projects"
section: "guides"
description: "Sign in to Studio with a password, a passkey, an emailed code or your organisation's SSO, sign up, and switch between or create projects."
summary: null
format: "markdown"
shared: true
order: 110
position: 1
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/sign-in.md"
sourceSha: "7002bb180d216a065bf716bd92a2b9f21ee06385"
sourceRefSha: "015853978c4f9263eb1dc504226820872c8f26bd"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/015853978c4f9263eb1dc504226820872c8f26bd/docs/sign-in.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Sign in and projects

This page covers getting into Studio and moving between projects. The ways to sign in that you see
depend on what your W6W server has turned on, so you may not see every option below.

## Sign in

Open `https://<your-studio-host>/login`. The **Sign in** page offers some or all of these:

{% webui %}

- **Email and password**: enter **Email** and **Password**, then click **Sign in**.
- **Passkey**: click **Sign in with a passkey** and confirm with Touch ID, Windows Hello or your
  security key. You don't need to type your email first.
- **Emailed code**: type your **Email**, click **Email me a sign-in code**, then enter the **Code**
  you receive and click **Sign in**. The code step appears whether or not the address has an
  account, so a missing email doesn't mean you mistyped. Check the address and try again.
- **Your organisation's sign-in**: click **Sign in with your organisation** to go to your company's
  identity provider. This option appears only when your server has single sign-on configured.

{% endwebui %}

How you know it worked: you land on the **Dashboard** of your default project.

After a password sign-in, if you have no passkey yet, Studio asks **Add a passkey?**. Click **Add a
passkey** to set one up, or **Not now** to be asked again in 30 days.

Studio keeps you signed in while the tab is open and visible. Use the **Log out** icon next to your
name at the bottom of the sidebar to sign out.

### Sign in to a different W6W server

The **API server** line under the sign-in form shows which W6W server Studio is talking to.

1. Click **Change**.
2. Enter the server's address, for example `https://<your-api-host>`.
3. Click **Use this server**.

Studio signs you out and reloads on the new server, because a session belongs to the server that
issued it. **Reset to default** goes back to the address your Studio was built or deployed with.
The same control is in **Settings** → **Session**.

## Create an account

If your server allows sign-up, the **Sign in** page shows **No account? Create one**. Many servers
are invite-only: then you join through an invite link from an account owner or admin (see
[Team](/guides/settings/team/)), which opens the same page.

1. **Step 1 of 2 · Create your user**: fill in **Full name**, **Email** and a **Password** of at
   least 10 characters, then click **Continue**.
2. **Step 2 of 2 · Create your account**: optionally fill in **Company name**, **Role** and **What
   will you use w6w for?**, then click **Create account**.

How you know it worked: you land on your new account's **Dashboard**, and Studio offers to add a
passkey. If you joined through an invite to an existing account, step 2 is skipped.

## Switch projects

A project holds workflows, variables and documents. Your account's apps, integrations, Functions,
Endpoints and secrets are shared by all its projects.

1. Click the **Project** switcher in the top bar.
2. Pick a project from the list. The current one has a ✓.

If you're on one item's page, such as a single workflow, Studio opens that section's list in the new
project. Other pages stay where they are.

## Create a project

1. Click the **Project** switcher.
2. Click **+ New project**.
3. Type a **Project name** and click **Add**.

Studio switches to the new project. To delete a project, see [Project settings](/guides/settings/).

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `Login failed` | Wrong email or password, or password sign-in is turned off for your organisation. | Try a passkey or an emailed code, or ask your admin which sign-in methods are on. |
| `Passkey sign-in failed or was cancelled.` | The browser prompt was dismissed, or this device has no passkey for the account. | Sign in another way, then add a passkey in [My account](/guides/settings/account/). |
| `The code could not be verified.` | The code was mistyped, expired or already used. | Click **Back** and request a new code. |
| Sign-up answers with an invite-required error | The server only accepts invited users. | Ask an account owner or admin for an invite link. |
| `Enter an absolute URL, e.g. https://api.w6w.dev` | The API server address is missing `https://`. | Type the full address. |
| `No projects found.` | Your account has no project you can open. | Ask an account admin to add you, or sign in to the right server. |

## Where to next

- **[Studio overview](/guides/overview/)**: the layout and the nouns.
- **[My account](/guides/settings/account/)**: change your name, email, password and passkeys.
- **[Integrations](/guides/integrations/)**: connect your first API.
