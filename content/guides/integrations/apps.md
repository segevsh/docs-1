---
key: "integrations/apps"
title: "Apps"
section: "guides"
description: "Register an app from a Git repository so your account can connect to it, refresh it when its source changes, and inspect what it can do."
summary: null
format: "markdown"
shared: true
order: 20
position: 4
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/integrations/apps.md"
sourceSha: "47b1d832834759c9a3fa311192aaff51032ba21e"
sourceRefSha: "2e25e297622dec7966f7baafd584add3eba28641"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/2e25e297622dec7966f7baafd584add3eba28641/docs/integrations/apps.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Apps

An app is the packaged description of one API: how it authenticates, what actions it offers, and
how W6W checks its health. Your server usually carries a catalog of ready-made apps, and you never
need to register those. Register an app yourself when it isn't in the catalog, for example your own
internal API or one you built with [Build apps](/guides/build-a-w6w-app/).

**Settings** → **Apps** lists only the apps your account manages, not the whole catalog.

## Who can register apps

- **Members of an account** can register an app only if your organisation allows it, and only from
  a public Git source: `github:`, `gitlab:` or `bitbucket:`. If **+ Register app** refuses, ask
  your administrator.
- **Server operators** can also register local sources and use **Import official catalog** to load
  the full first-party pack.

## Register an app

{% webui %}

1. In the sidebar, click **Settings**, then under **Account**, click **Apps**.
2. Click **+ Register app**.
3. In **Source ref**, paste where the app lives: a GitHub URL such as
   `https://github.com/<owner>/<repo>` (optionally with `/tree/<branch>`), or the canonical form
   `github:<owner>/<repo>@<ref>`.
4. Click **Register**. If the source holds a pack of several apps, tick the ones you want and
   register them.

{% endwebui %}

How you know it worked: the app appears in the list, and you can find it under **Integrations** →
**+ Add integration**.

Pin a commit SHA rather than a branch name when you can. A branch can move, and a hosted Git
service may serve a cached copy of it for a while.

## Update an app after its source changes

Use the icons on the app's row:

| Icon | What it does |
| --- | --- |
| **Refresh from source** | Fetches the source again and registers a new version if the content changed. |
| **Reload (bust cache)** | Same, but ignores any cached copy. Use it when a refresh didn't pick up a change you just pushed. You get the same effect by ticking **Re-fetch from source (bust cache)** when you register. |
| **Inspect** | Opens the app's details. |
| **Delete** | Removes the app (**Unregister app**). Integrations that use it stop working. |

How you know a refresh worked: **Inspect** shows the new actions or settings.

## Inspect an app

**Inspect** shows:

- **Network access**: the hosts the app is allowed to call. W6W blocks any other host.
- **Health checks**: how W6W checks the vendor is up and your credentials work.
- **Auth methods**: how the app authenticates. **+ Connect** starts a new integration with that
  method.
- **Actions**: every action, with its parameters.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `No apps are managed by this account yet — register one above.` | Your account hasn't registered any apps. Catalog apps don't appear here. | Search for the app under **Integrations** first; register it here only if it's missing. |
| Registering is refused | Your organisation doesn't let members import apps, or the source isn't `github:`, `gitlab:` or `bitbucket:`. | Ask your administrator, or use a supported Git source. |
| A change you pushed doesn't appear | The source was cached, or you pinned an older commit. | Click **Reload (bust cache)**, or register the new commit SHA. |

## Where to next

- **[Integrations](/guides/integrations/)**: connect to the app you just registered.
- **[Build apps](/guides/build-a-w6w-app/)**: write your own app.
