---
key: "publishing"
title: "Publishing an app"
section: "build-apps"
description: "Where an app lives in the pack, what each file is for, and how to ship a change."
summary: null
format: "markdown"
shared: true
order: 20
position: 1
sourceRepo: "w6w-io/w6w-apps"
sourcePath: "docs/publishing.md"
sourceSha: "c2857aca6134aaa9a1ed969a9e3626ff7f8990fb"
sourceRefSha: "4f882267a5f8e73bd52a8e3df666e8d193aac198"
sourceUrl: "https://github.com/w6w-io/w6w-apps/blob/4f882267a5f8e73bd52a8e3df666e8d193aac198/docs/publishing.md"
syncedAt: "2026-11-14T01:59:25Z"
---


# Publishing an app

Apps ship as a pack: a repository with a top-level manifest and one directory per app. This page
covers where your app goes and how a change reaches the pack. Run the checks on
[Testing an app](/build-apps/testing/) first.

## Layout

```
w6w-apps/
├── w6w-pack.json           # top-level pack manifest, the registry entry point
├── apps/                   # every App lives here
│   └── <app>/              # one dir per App
│       ├── README.md       # usage + health check (status, probe, quota)
│       ├── package.json    # manifest (w6w field)
│       ├── deno.json
│       ├── tsconfig.json
│       ├── index.ts
│       ├── assets/icon.{svg,png}
│       ├── assets/icon.dark.svg  # optional dark-theme variant
│       ├── auth/*.ts
│       ├── actions/*.ts
│       ├── health/*.ts     # declared health checks (service, quota, dependency)
│       ├── lib/*.ts
│       └── tests/
└── _tools/                 # scaffolding + porting helpers (not shipped)
```

`w6w-pack.json` lists the apps in the pack. Each app's `package.json` carries its manifest in the
`w6w` field.

## Porting an existing workflow

`_tools/` includes a converter for n8n workflows. From `_tools/`:

```sh
deno task convert
```

## Shipping a change

1. Run the per-app tasks and the conformance audit, and fix every error.
2. Fork the pack repository and make your change on a branch in your fork.
3. Open a pull request against `w6w-io/w6w-apps`. Never push directly to `main`.

Once the pull request is merged, the `Reload apps` workflow publishes it. It builds every app,
compares each one's digest with `apps/index.json` (the record of the last publish, kept in the
blob bucket), uploads only the apps that changed, and asks the w6w API to load them. Apps you did
not touch are not re-sent. An app the API refuses stays marked as changed, so the next run tries
it again. To resend every app, run the workflow by hand with **full** checked.

Each app's own `README.md` documents its usage and health check, and `HEALTHCHECKS.md` indexes them.
For the spec behind the pack, see the [App contract](/reference-spec/app-contract/).

## Listing a third-party app

The pull-request flow above is for the first-party pack. If you publish under your own publisher
namespace, you submit a version for review instead, and w6w lists it once it passes.

1. **Submit.** From your publisher, submit a version of a private app together with its listing
   copy: a summary (up to 280 characters), categories, a support URL, a contact email, and
   optionally an icon, a privacy URL and reviewer notes. Reviewer notes are required when an auth
   needs credentials to test. Only one submission per app can be open at a time.
2. **Checks.** The service runs automatic checks on the submitted version: the app validates, its
   digest matches, it describes itself in the sandbox, every auth has a `test` hook, it declares a
   health check, `network.allow` has no `"*"`, and the listing copy is complete. A failed check
   returns the submission to you as `changes_requested` with each result. Fix it and submit again.
3. **Review.** A submission that passes enters `in_review`. A w6w operator approves it, asks for
   changes with reasons, or rejects it. Reviewer notes are visible to the operator only. You are
   told the decision by email to your listing's contact address, and the status shows on your
   developer page.
4. **Listed.** An approved version is registered for every tenant and the app appears in browse
   and search. Submitting a later version of a listed app goes through the same flow, and the
   previous version keeps serving until the new one is approved.

### States

| State | Meaning |
|---|---|
| `private` | Only your publisher can use it. |
| `in_review` | Passed the checks; waiting for an operator. |
| `changes_requested` | A check failed or the reviewer asked for changes. Submit again. |
| `rejected` | Declined. You may submit again. |
| `listed` | Public. |
| `suspended` | Hidden from browse and search, and no new connections. Existing connections keep running. An operator can reinstate it. |
| `delisted` | Removed. Invocations are refused with `app_delisted`, including explicit and pinned versions and background runs. You cannot submit it again (`listing_delisted`). |

Suspending a publisher suspends its listings too; unsuspending reverses that. A listed app that is
unlisted stays reachable by its direct page and can still be invoked, but is hidden from browse
and search.

### Badge

Listed apps show who published them: **by W6W** for first-party apps, **Verified publisher** for a
verified third-party publisher, or the publisher's display name otherwise. First-party apps are
listed automatically and skip review.
