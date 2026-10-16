---
key: "publish-app-artifacts"
title: "Publish built apps"
section: "guides"
description: "How CI publishes built app artifacts to a host: read the digests, post batches of artifacts, and what each per-entry outcome and error code means."
summary: null
format: "markdown"
shared: true
order: 110
position: 20
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/guides/publish-app-artifacts.md"
sourceSha: "9a234cc47f33ea6d08c3c5ed56e8c713488c8774"
sourceRefSha: "801217d024e3bf11a372f2876ef6bed8a10a1bfb"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/801217d024e3bf11a372f2876ef6bed8a10a1bfb/docs/guides/publish-app-artifacts.md"
syncedAt: "2026-10-09T02:58:22Z"
---


# Publish built apps

**Applies to:** HTTP (the `/system-ops` machine surface) · CI · cloud and self-host

A built app is an artifact: a manifest envelope plus its `app.js` blob (and an optional source-map
blob). CI uploads the blobs to the host's blob store, then asks the host to register the artifacts
with two routes under `/system-ops`. Both require an ops token (audience `w6w:system-ops`) whose
`scope` claim is **`apps:publish`**. A token that only has `apps:reload` — or no scope — gets
`403 insufficient_scope` on both routes; a token with another audience gets `401`.

## `GET /system-ops/apps/digests`

Returns, for every globally-owned app id, its latest version's digest — and nothing else. The body
is the record itself, with no wrapper:

```json
{
  "io.example.app": {
    "version": "1.2.0",
    "digest": "…",
    "digestVersion": 2,
    "execSha256": "…"
  }
}
```

Only the **latest** version of **global** (non-tenant) apps appears. A source-registered app shows
`digestVersion: 1` and `execSha256: null`; an artifact-backed app shows `digestVersion: 2` and the
sha-256 of its `app.js`. CI compares these with its own build to decide what to post.

## `POST /system-ops/apps/artifacts`

Body:

```json
{ "artifacts": [{ "artifactVersion": 1, "id": "…", "version": "…", "…": "…" }] }
```

`artifacts` is an array of **at most 25** artifact manifests. The route has no extra transport body
limit; the 25-entry cap is the bound.

Whole-body refusals (nothing is processed, no row is written):

| Status | `error.code`             | When                                                                              |
| ------ | ------------------------ | --------------------------------------------------------------------------------- |
| 400    | `invalid_body`           | The body is not JSON, `artifacts` is not an array, or it has more than 25 entries |
| 503    | `blob_store_unavailable` | The host has no blob store configured (the route is still mounted)                |

Otherwise the answer is `200` with one result per entry, in input order:

```json
{
  "results": [
    { "id": "io.example.app", "version": "1.2.0", "outcome": "registered" },
    {
      "id": "io.example.other",
      "version": "2.0.0",
      "outcome": "failed",
      "error": { "code": "exec_missing", "message": "…" }
    }
  ],
  "changed": 1
}
```

`outcome` is one of `registered` (new app), `unchanged` (identical re-post), `bumped` (new content,
version raised by a patch), `upgraded` (an existing source-registered version converted in place to
an artifact row), or `failed`. `changed` counts `registered`, `bumped` and `upgraded`; `unchanged`
and `failed` never count. Entries run one after another and a failed entry never stops the batch.

### Per-entry verification

Each entry is verified, in this order, **before any catalog row is written**. The first failure is
terminal for that entry and writes nothing.

| Order | `error.code`        | Meaning                                                                                                                                                                                    |
| ----- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | `invalid_manifest`  | The entry is not a valid artifact envelope (or its app id / action keys fall outside the permitted identity character class). `id` and `version` echo the entry's own strings, else `null` |
| 2     | `exec_missing`      | No blob exists for `exec.sha256` in the blob store                                                                                                                                         |
| 3     | `exec_sha_mismatch` | The blob's byte length is not `exec.bytes`, or its sha-256 is not `exec.sha256`                                                                                                            |
| 4     | `map_missing`       | `map` is present but no blob exists for `map.sha256`                                                                                                                                       |
| 4     | `map_sha_mismatch`  | The map blob's length or sha-256 does not match `map`                                                                                                                                      |
| 5     | `manifest_mismatch` | The exec is not valid UTF-8, could not be run to describe itself (error or 5 s timeout), or what it describes differs from what was posted                                                 |
| 6     | `id_taken`          | The app id already belongs to a tenant or user; a global publish never overwrites it                                                                                                       |

The `manifest_mismatch` comparison is exact (canonical JSON) over all five described parts:
`actions`, `auth`, `triggers`, `healthChecks` and `interfaces`. The catalog row is built from what
the exec describes, never from the posted copy.

### What is verified, and what is not

The five described parts above are **verified against the exec**. The envelope's `manifest` —
identity, network allowlist, ports and appearance — is **poster-asserted**: the exec cannot describe
it, so the host cannot check it. The `apps:publish` credential is the trust root for those fields.
Issue it only to the pipeline that builds your apps.

## On a self-host install

A self-hosted server serves these same two routes with the same contract, token rules, per-entry
outcomes and error codes as above, so CI can publish built apps straight to your own host. Set
`OPS_JWT_SECRET` to sign the `apps:publish` tokens — a value **distinct from `JWT_SECRET`** (the
server refuses to start if they match). Leave it unset and the routes are closed: every request
answers `401`, whatever it carries. The host also needs a blob store configured, or the artifacts
route answers `503 blob_store_unavailable`.

These two routes are the only `/system-ops` routes a self-host install serves; every other
`/system-ops` path answers `404`.
