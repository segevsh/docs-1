---
key: "testing"
title: "Testing an app"
section: "build-apps"
description: "Run an app's tests and the pack-wide conformance audit before you open a PR."
summary: null
format: "markdown"
shared: true
order: 10
position: 0
sourceRepo: "w6w-io/w6w-apps"
sourcePath: "docs/testing.md"
sourceSha: "eeb4fc3daf04a04f7882e743eaa56a36c661910e"
sourceRefSha: "c3526851298a1ea383ca47ffa3ef048bbb5506e7"
sourceUrl: "https://github.com/w6w-io/w6w-apps/blob/c3526851298a1ea383ca47ffa3ef048bbb5506e7/docs/testing.md"
syncedAt: "2026-10-06T21:20:18Z"
---


# Testing an app

Every app ships its own tests, and the pack has one auditor that checks all of them against the
platform's rules. Run both before you open a pull request. For how to author the app itself, see
[Build a w6w app](/build-apps/build-a-w6w-app/).

## Per-app tasks

Each app has a `deno.json` with local tasks. From the app's directory:

```sh
cd apps/<app>
deno task test
deno task check
deno task lint
```

## The conformance audit

From the repo root, run the pack-wide auditor. It validates every app against `core`'s own
`@w6w/validator`, rebuilds each manifest the way the runtime's loader does, and scans the source
for the sandbox rules that are only visible in code: a global `fetch`, `Deno.*`, credentials
handled outside an auth `sign` hook, and hosts called but missing from `w6w.network.allow`.

```sh
deno run --no-check -A _tools/audit.ts          # every app
deno run --no-check -A _tools/audit.ts slack    # one app
deno run --no-check -A _tools/audit.ts --json   # machine-readable
```

It exits non-zero on any error. Warnings flag optional but recommended metadata, such as `output`,
`idempotent`, and a unit test per action.

The auditor's own tests run from `_tools/` with `deno task test`.

## Health checks

Every app declares its health checks as the [health check spec](/reference-spec/app-contract/healthcheck/)
describes, so a host runs what you say to run instead of guessing at a probe. Declare a `service`
check (is the vendor up?) and a `quota` check (is there headroom?). Use a real probe where the
vendor supports one and an explicit `unavailable` where it does not. Apps addressed by a per-tenant
host add a `dependency` check for the tenant's own site. Credential checks come free: the runtime
derives an `auth:<method>` check from each Auth `test` hook.

Keep status hosts off the app's main egress allowlist. A `service` check widens egress for its own
worker only.

## Icons

Two helpers in `_tools/` check icon quality. Run them from `_tools/`:

```sh
deno task icons         # report every illegible mark
deno task icons:fix     # generate the reversed variants and declare them
deno task icons:normalize   # square and inset every icon
```
