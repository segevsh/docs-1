---
key: "invocations"
title: "Invocations"
section: "guides"
description: "Every call you make to an action, Function or Endpoint answers inside a frame with an id, a verdict and timing — and the call is recorded so you can look it up later."
summary: null
format: "markdown"
shared: true
order: 50
position: 13
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/guides/invocations.md"
sourceSha: "69b8cac9ea72d3e38a6c826243a7ad69ee8737c5"
sourceRefSha: "1eee1ca1c273fcccc91988c49213335e02b22b4e"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/1eee1ca1c273fcccc91988c49213335e02b22b4e/docs/guides/invocations.md"
syncedAt: "2026-10-06T21:28:00Z"
---


# Invocations

**Applies to:** HTTP · SDK (reading an invocation through `client.request`) · MCP (the `invocationId`
comes back in the `w6w_invoke` result) · Studio (the **History** page). The frame described here
is on the response of every call in [Call any API](/guides/call-any-api/).

An **invocation** is one call you made that ran to an answer right away: an app action, a Function
or an Endpoint. Each one gets an id (`inv_…`), a verdict from w6w, timing, and a stored record. You
can ask for the record afterwards by id — to see what you sent, what came back, and how long it took.

A Workflow run is different: it is queued, and its record is the run itself (`runId`, read with
`GET /runs/{id}`). See [the difference](#invocation-id-or-run-id) below.

## The frame

Every successful call answers like this:

```json
{
  "kind": "function",
  "output": { "accepted": true, "statusCode": 202, "messageId": "k2qI95g6T4iOkCgmTsfTwA" },
  "invocationId": "inv_2f9b7c14-…",
  "status": "succeeded",
  "startedAt": "2026-10-06T09:14:02.401Z",
  "finishedAt": "2026-10-06T09:14:02.826Z",
  "durationMs": 425
}
```

| Field | Meaning |
|---|---|
| `kind` | What actually ran: `action`, `function` or `workflow`. An Endpoint that points at a Workflow still reports `workflow`. |
| `output` | What the thing you ran produced. |
| `value` | The same payload as `output`, sent on action calls for older clients. Deprecated — read `output`. |
| `invocationId` | The id of this attempt. Use it to look the call up. |
| `status` | w6w's verdict on the attempt: `succeeded` or `failed` (a Workflow answers `queued`). |
| `startedAt`, `finishedAt`, `durationMs` | When it ran and for how long. |
| `runId` | Workflow calls only: the run that was queued. |

Two things to keep straight:

- **`status` is w6w's verdict, not the vendor's.** In the example the vendor's own `statusCode` is
  `202`; that sits inside `output` and describes the vendor's request. Whether w6w counted the call
  as a success is the top-level `status`.
- **A failure carries the frame too.** A failed call's error body includes `invocationId`,
  `status: "failed"` and the timing next to the `error`, so even a call that did not work has a
  receipt.

## Read one back

{% sdk-node %}
```ts
import { W6WClient } from "@w6w/sdk";

const client = new W6WClient(); // reads W6W_BASE_URL and W6W_TOKEN

const { body } = await client.request({
  method: "GET",
  path: "/invocations/inv_2f9b7c14-…",
});

console.log(body.invocation);
```
{% endsdk-node %}

{% api %}
```bash
curl -sS "$W6W_BASE_URL/invocations/inv_2f9b7c14-…" \
  -H "Authorization: Bearer $W6W_TOKEN"
```
{% endapi %}

The answer is `{ "invocation": { … } }`: the record of that call — what you sent, the output or the
error, the timing, and links to a parent invocation or a Workflow run when there is one.

## List them

```bash
curl -sS "$W6W_BASE_URL/invocations?kind=function&limit=20" \
  -H "Authorization: Bearer $W6W_TOKEN"
```

The answer is `{ "invocations": [ … ] }`. All filters are optional:

| Query | Filters by |
|---|---|
| `kind` | `action`, `function` or `endpoint`. |
| `function` | One Function. |
| `endpoint` | One Endpoint. |
| `run` | Invocations made inside one Workflow run (by its run id). |
| `parent` | Invocations started by another invocation, by its id. |
| `limit` | Page size. Values out of range are clamped; a value that is not a positive number is ignored. |

Records are private to you: you can only read invocations you made, and a teammate in the same
account cannot read yours, even with the id.

### The History page

Studio's **History** page reads a merged list — Function and Endpoint invocations together with
Workflow runs — from two routes, which you can also call yourself:

```bash
curl -sS "$W6W_BASE_URL/history?kind=function&limit=50" \
  -H "Authorization: Bearer $W6W_TOKEN"
# → { "executions": [ … ], "hasMore": false }

curl -sS "$W6W_BASE_URL/history/stats?kind=function" \
  -H "Authorization: Bearer $W6W_TOKEN"
# → { "stats": { … } }
```

They take `project` or `callable` to scope the list, plus `kind`, `status`, `from`, `to`, `q`,
`limit` and `offset` (`/history` only). An unknown `callable` answers `404 unknown_callable`; a
malformed filter answers `400`.

## One record per call you made

You get one record per call *you* made, not one per internal step:

| You called | Recorded |
|---|---|
| `POST /functions/{id}/invoke` | One `function` invocation. |
| `POST /endpoints/{id}/invoke` pointing at an action | One `endpoint` invocation. |
| `POST /endpoints/{id}/invoke` pointing at a Function | An `endpoint` invocation and a child `function` invocation, linked by `parent`. |
| `POST /run` with a connection and an action, or an app action | One `action` invocation. |
| `POST /run` with an [alias](/guides/aliases/) | One `endpoint` invocation. |
| `POST /run` with a Workflow id | No invocation — the run is the record. |
| A Function step inside a Workflow run | One `function` invocation, tied to that run. |

The app action underneath a Function does not get a record of its own; it is part of the Function.

## Invocation id or run id?

They name different things.

- `invocationId` names **the call**. It is on every action, Function and Endpoint answer, and on
  failures.
- `runId` names **a queued Workflow run** that a call started. Read it with `GET /runs/{id}` or the
  `w6w_run_status` tool.

Calling a Workflow directly gives you a `runId` and no `invocationId` — the run already is the
record. Reach the same Workflow through an Endpoint or an alias and you get both: the
`invocationId` for the call, the `runId` for the run it started.

## What to expect

- **A record is written when the call finishes**, not when it starts. A call that is killed halfway
  leaves no record. Work that cannot afford that belongs in a Workflow, which is queued and can resume.
- **Recording never fails your call.** If w6w cannot save the record, your call still returns its
  real answer. Very rarely that means an `invocationId` that looks up to a `404`.
- **Large payloads are trimmed.** Input, output and error are kept up to 128 KiB of JSON each. Over
  that, the stored value is replaced by `{"_w6w_omitted":"too_large","sizeBytes":…,"capBytes":…}`, so
  you can tell "too big to keep" from "nothing was produced". A value JSON cannot represent is stored
  as `{"_w6w_omitted":"unserializable"}`.
- **Payloads are stored as sent.** Don't pass a token as a Function parameter if you would not want
  it in the call record; keep credentials in a connection or a secret.
- **Old records are pruned** by the retention policy your deployment is configured with.
- **Not every call is recorded before it starts.** A call refused before it runs — an unknown id, a
  disabled Function, a Function that was never published — writes no record.

## Errors

| Status | `error.code` | Meaning |
|---|---|---|
| `404` | `unknown_invocation` | No invocation with that id in your scope. It may belong to someone else, never have been recorded, or have been pruned. |
| `400` | `invalid_kind` | `kind` on `GET /invocations` was not `action`, `function` or `endpoint`. |
| `404` | `unknown_callable` | `callable` on `/history` names nothing you can see. |

A call that is refused *before* it runs, because the thing was never published, answers with the
kind's own code (this is the call's error, not an invocation error):

| You called | Status | `error.code` |
|---|---|---|
| A Function | `422` | `function_not_published` |
| A Workflow | `409` | `workflow_not_published` |
| An Endpoint | `404` | `endpoint_not_published` |

Publish it, pin a version, or pass `"allowUnpublished": true` in the request body to run a draft on
purpose.

## Next

- [Call any API](/guides/call-any-api/) — the calls that produce these frames.
- [API health](/guides/api-health/) — whether your calls have been succeeding, over time.
- [The HTTP API](/reference-api/http-api/) — every route.
