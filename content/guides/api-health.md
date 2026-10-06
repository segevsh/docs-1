---
key: "api-health"
title: "API health"
section: "guides"
description: "See whether the APIs you depend on are working — from your own call history and from the vendor's own status — and read both signals correctly."
summary: null
format: "markdown"
shared: true
order: 60
position: 14
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/guides/api-health.md"
sourceSha: "08b972d125e5fc28a9eca44449fc6ce4bd0ea601"
sourceRefSha: "1eee1ca1c273fcccc91988c49213335e02b22b4e"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/1eee1ca1c273fcccc91988c49213335e02b22b4e/docs/guides/api-health.md"
syncedAt: "2026-10-06T21:28:36Z"
---


# API health

**Applies to:** HTTP · SDK (through `client.request`) · MCP (`w6w_check_health`) · Studio (the
**Reliability** board). There is no dedicated method for these routes in the SDK's stable surface
today, so the SDK form is the generic `client.request`.

w6w answers "is this API working?" with **two separate signals**, and never blends them into one
number:

| Signal | Question it answers | Where it comes from |
|---|---|---|
| **Your calls** | Have *your* calls to this API been succeeding? | w6w's own record of the calls your account made. |
| **Vendor status** | What does the API say about itself right now? | The app's own public status check, when the app declares one. |

Both are reported as one of four states: `ok`, `degraded`, `down` or `unknown`. There is no fifth
state. An API you have never called is `unknown`, never `ok`.

The two can disagree, and that is useful. A vendor can say `ok` while your calls fail because *your*
credential expired. Your calls can look fine while the vendor reports an incident that has not hit
you yet. "Your calls" measures your traffic, not the vendor's status page.

## Check a target with an MCP client

The `w6w_check_health` tool takes a target and returns both signals. It is read-only: it never
re-tests a connection or sends traffic to the API on your behalf, apart from fetching the vendor's
public status.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "w6w_check_health",
    "arguments": { "target": "app:sendgrid", "days": 30 }
  }
}
```

`target` is an app (`app:<appId>`, or just the bare app id), a connection (`conn_…`), or a Function,
Workflow or Endpoint (`fn_…`, `wf_…`, `ep_…`). `days` is the window for "your calls" only, from 1 to
365 (default 30); it does not change the vendor check.

The result carries one entry per app the target touches, plus an overall `summary`:

```json
{
  "target": "app:sendgrid",
  "measuredAt": "2026-10-06T09:30:00.000Z",
  "summary": { "state": "ok", "basis": ["…"], "oldestMeasurementAt": "2026-10-06T09:28:41.000Z" },
  "window": { "from": "2026-09-06T00:00:00.000Z", "to": "2026-10-07T00:00:00.000Z", "days": 30 },
  "apps": [
    {
      "appId": "sendgrid",
      "displayName": "SendGrid",
      "yourCalls": {
        "state": "ok",
        "calls": 412,
        "errors": { "e4xx": 3, "e429": 0, "eAuth": 0, "e5xx": 0 },
        "p95Ms": 380,
        "lastCallAt": "2026-10-06T09:14:02.826Z",
        "ongoingOutageId": null
      },
      "vendor": {
        "published": true,
        "state": "ok",
        "checkedAt": "2026-10-06T09:28:41.000Z",
        "ageSeconds": 79,
        "message": null,
        "attributedTo": []
      }
    }
  ],
  "nextActions": []
}
```

(`yourCalls` and `vendor` carry a few more fields — a description of what the window measured,
per-component states and quota — omitted here.)

How to read it:

- **`summary.state` is the worst of the states already reported.** It is not a third opinion.
- **`vendor.published: false`** means the app declares no public status check. That is a different
  fact from `vendor.state: "unknown"`, which means a check exists but gave no answer.
- **`vendor.ageSeconds`** tells you how old the vendor reading is. Vendor readings are cached, so a
  repeat check inside the cache window returns the same reading rather than hitting the vendor again.
- **A connection target** adds a `connection` block with the *last stored* result of testing it
  (`lastTestOk`, `lastTestedAt`). The tool never runs a new test; for that, use
  [the connection test](#test-a-connection).

## Read the reliability board over HTTP

Studio's Reliability board is `GET /reliability/services`. It is scoped to a project and to the apps
you name:

{% sdk-node %}
```ts
import { W6WClient } from "@w6w/sdk";

const client = new W6WClient(); // reads W6W_BASE_URL and W6W_TOKEN

const { body } = await client.request({
  method: "GET",
  path: "/reliability/services",
  query: { project: "prj_01H…", apps: "sendgrid,stripe", days: 30 },
});

for (const s of body.services) {
  console.log(s.appId, s.state, s.vendorStatus?.state ?? "no public check");
}
```
{% endsdk-node %}

{% api %}
```bash
curl -sS "$W6W_BASE_URL/reliability/services?project=prj_01H…&apps=sendgrid,stripe&days=30" \
  -H "Authorization: Bearer $W6W_TOKEN"
```
{% endapi %}

| Query | Meaning |
|---|---|
| `project` | Required. The project whose calls are counted. |
| `apps` | Required. Comma-separated app ids, at most 10. |
| `days` | Window, 1–365. Default 30. |
| `limit` | Cap the number of rows. The most urgent rows are kept, so a cap cannot hide a service that is down. |

The answer has the account, the `window`, a plain-words `uptimeMeans` ("your calls succeeded, not
the vendor's own status page"), the `definition` of what counts as an outage, and a `services` list.
Each service has:

- `state` — your calls' verdict for the app.
- `calls`, `errors` (`e4xx`, `e429`, `eAuth`, `e5xx`), `p95Ms`, `lastCallAt`.
- `uptime` — one cell per day with its own `state`, `calls` and `errors`, which is the uptime strip.
- `ongoingOutageId` — set while an outage is open.
- `vendorStatus` — the vendor's signal (`state`, `message`, `checkedAt`, `attributedTo`, and
  component and incident detail when the vendor publishes it), or `null` when the app has no public
  check.
- `attention` — `now` (degraded or down right now, on either signal), `recent` (clear now but there
  was a failure in the window), or `none`.

To find out which apps a project has used, list them first:

```bash
curl -sS "$W6W_BASE_URL/reliability/services/members?project=prj_01H…&days=30" \
  -H "Authorization: Bearer $W6W_TOKEN"
# → { "account": "…", "window": { … }, "appIds": ["sendgrid", "stripe"], … }
```

## Check an app's public status directly

`GET /apps/{id}/health` runs the app's *public* health checks — the ones that need no credential —
and rolls them up. It needs no connection and sends nothing signed.

```bash
curl -sS "$W6W_BASE_URL/apps/sendgrid/health" \
  -H "Authorization: Bearer $W6W_TOKEN"
```

```json
{
  "state": "ok",
  "attributedTo": [],
  "results": [
    { "key": "status-page", "report": { "state": "ok" }, "checkedAt": "2026-10-06T09:28:41.000Z", "durationMs": 212 }
  ]
}
```

`state` is the worst state across the checks, `attributedTo` lists the checks that were not `ok`,
and each entry in `results` is one check's own report. Repeat calls inside a check's minimum interval
are answered from cache. Pass `?version=` to check a specific version of the app.

If the app has no public check, the answer is `{ "state": "unknown", "attributedTo": [], "results": [] }`
— "nothing was probed", not "all clear".

## Test a connection

Whether *your credential* works is a different question, and the answer is on the connection:

```bash
curl -sS -X POST "$W6W_BASE_URL/connections/conn_01H…/test" \
  -H "Authorization: Bearer $W6W_TOKEN"
# → { "ok": true, "actionKey": "list-contacts" }
```

The test checks the app's own credential check and runs one harmless read action when the app has
one. If the app has neither, you get `{ "ok": true, "untested": true, "message": "…" }` — the
credential was stored, but nothing was verified. A failed test marks the connection invalid until it
passes again or its credential changes.

## Errors

| Status | `error.code` | When |
|---|---|---|
| `400` | `missing_project` | `project` was left off a `/reliability/*` request. |
| `400` | `unknown_project` | The project does not exist in your account. |
| `400` | `invalid_app_filter` | `apps` is missing, empty, or lists more than 10 apps. |
| `400` | `invalid_days` | `days` is not a whole number from 1 to 365. |
| `400` | `invalid_limit` | `limit` is not a positive integer. |
| `404` | `unknown_app` | The app id is not in the catalog you can see. A hidden app answers the same as one that does not exist. |
| `404` | `unknown_connection` | The connection is not yours or does not exist. |

From MCP, `w6w_check_health` refuses with `invalid_argument` (empty `target`), `unknown_ref`
(nothing resolves for the target), `unknown_app`, or `app_not_entitled` (your account has no access
to that app). Reserved built-in `@w6w/*` apps are refused with `forbidden_internal_app`.

## Next

- [Invocations](/guides/invocations/) — look up one specific call.
- [Connect an MCP client](/guides/connect-mcp/) — set up `w6w_check_health`.
- [The HTTP API](/reference-api/http-api/) — every route.
