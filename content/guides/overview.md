---
key: "overview"
title: "Studio overview"
section: "guides"
description: "What Studio is, how to sign in, how the screen is laid out, and the handful of nouns every other Studio page uses."
summary: null
format: "markdown"
shared: true
order: 100
position: 0
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/overview.md"
sourceSha: "03e76864e004240b81b4b110c57dbefa0e69e2a7"
sourceRefSha: "015853978c4f9263eb1dc504226820872c8f26bd"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/015853978c4f9263eb1dc504226820872c8f26bd/docs/overview.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Studio overview

Studio is W6W's web app. Everything W6W does for the APIs your product runs on, you can do here
by pointing and clicking: connect an API once, call it through one front door, compose several
calls into a Function, an Endpoint or a Workflow, watch how every API is performing, and change
what's underneath without shipping code.

The SDKs and the CLI do the same jobs from code. Studio is where you set things up and look at
what's happening. Your scripts and services then call what you built.

## Sign in

Open your Studio address (`https://<your-studio-host>`) and sign in on the **Sign in** page with
your email and password, a passkey, or an emailed code. You land on the **Dashboard** of your
default project. See [Sign in and projects](/guides/sign-in/) for every option, including signing
up and pointing Studio at a different API server.

## How the screen is laid out

| Area | Where | What's in it |
| --- | --- | --- |
| Top bar | Across the top | The **w6w studio** logo (takes you to the Dashboard), the **Project** switcher, the repository sync indicator if the project is bound to a repo, the **Upgrade** button, and the theme toggle (light, dark, system). |
| Sidebar | Left | The main navigation, in four groups (below). At the bottom: **Settings**, your name and the **Log out** button. |
| Content | Centre | The page you opened. |
| Tool rail | Right edge | A strip of icons that open panels for the Function, Endpoint or Workflow you have open: **Settings**, **Code** and **Error handling**. See [The tool rail](/guides/tool-rail/). |

The sidebar groups match the work:

| Group | Entries |
| --- | --- |
| **Observe** | **Dashboard**, **Reliability**, **History** |
| **Build** | **Workflows**, **Functions**, **Endpoints** |
| **Connect** | **Integrations** |
| **Configure** | **Secrets & variables**, **Documents** |

**Settings** replaces the sidebar with its own list, grouped by scope: **This project**, then
**Account**, then (if you're allowed to see them) **Tenant**, **Console** and **Installation**.
**← Back** returns to the main navigation.

Every page's address starts with your account and project, for example
`https://<your-studio-host>/<account-id>/<project-id>/workflows`, so you can bookmark or share any
screen.

## The nouns

| Noun | In one line |
| --- | --- |
| **App** | A packaged integration with one API (Stripe, Slack, your own service): what it can do and how it authenticates. |
| **Action** | One operation an app can perform, such as "Send email" or "List contacts". |
| **Integration** (connection) | Your stored credentials for one app. W6W keeps them encrypted on the server, and your callers never hold them. |
| **Function** | A named, reusable operation with a stable set of inputs, bound to one action, Function or Workflow that you can swap later without changing any caller. |
| **Endpoint** | A stable URL that callers POST to. It dispatches to an action, a Function or a Workflow, and you choose who may call it. |
| **Workflow** | A graph of steps that runs when a trigger fires: a webhook, a schedule, an app event or a manual run. |
| **Variable** | A named, typed, plaintext value, like a base URL or a feature flag. |
| **Secret** | A named, encrypted value, like an API key. Studio never shows it again after you save it. |
| **Document** | Named content (text, Markdown, YAML, HTML or JSON) that your steps can read, like an email template. |
| **Project** | A container for workflows, variables and documents. An account can have several. |

Apps, integrations, Functions, Endpoints and secrets belong to the account and are shared by its
projects. Workflows, variables and documents belong to one project.

## Where to next

- **[Sign in and projects](/guides/sign-in/)**: every way to sign in, and how to switch or create a project.
- **[Integrations](/guides/integrations/)**: connect your first API.
- **[Functions](/guides/functions/)**: give one API operation a stable name your code can call.
- **[Workflows](/guides/workflows/)**: compose several calls behind a trigger.
