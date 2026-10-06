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
sourceSha: "abb73e9581aed74c4b7296487a8bea542725ab63"
sourceRefSha: "cc9e339259c021a218ff2693f20b4a180d1f5fa8"
sourceUrl: "https://github.com/w6w-io/w6w-apps/blob/cc9e339259c021a218ff2693f20b4a180d1f5fa8/docs/publishing.md"
syncedAt: "2026-10-06T21:20:18Z"
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

Each app's own `README.md` documents its usage and health check, and `HEALTHCHECKS.md` indexes them.
For the spec behind the pack, see the [App contract](/reference-spec/app-contract/).
