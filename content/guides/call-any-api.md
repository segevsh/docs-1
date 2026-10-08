---
key: "call-any-api"
title: "Call any API"
section: "guides"
description: "Run an app action, a Function, an Endpoint or a Workflow through one call, one URL and one token — and read what comes back."
summary: null
format: "markdown"
shared: true
order: 10
position: 9
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/guides/call-any-api.md"
sourceSha: "af3887131c8de95cb7101951f6ec3faa8fd0043e"
sourceRefSha: "40127346cb4c16c6f06e5b4546527b9d7a62a25b"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/40127346cb4c16c6f06e5b4546527b9d7a62a25b/docs/guides/call-any-api.md"
syncedAt: "2026-10-06T21:22:44Z"
---


# Call any API

**Applies to:** SDK · CLI · HTTP. (From an MCP client, the same call is the `w6w_invoke` tool — see [Connect an MCP client](/guides/connect-mcp/).)

One request runs anything in your account. You give it a **URN** — a string that says what to run
— and w6w works out whether that is an action on one of your connected apps, a Function, an
Endpoint or a Workflow, runs it with your credentials, and tells you which kind it hit.

You need the same two things as every other w6w call:

```bash
export W6W_BASE_URL=https://<your-host>
export W6W_TOKEN=<your-token>   # Studio → Tokens → New token
```

## What a URN can be

| You pass | It runs | Needs `action`? |
|---|---|---|
| `conn_01H…` | An action on one of your connected apps | Yes — the action's key |
| `fn_01H…` or `fn:<key>` | A Function | No |
| `ep_01H…` or `ep:<key>` | An Endpoint | No |
| `wf_01H…` or `wf:<key>` | A Workflow | No |
| `<alias-name>` | Whatever that [alias](/guides/aliases/) points at | No |

An ID you copy from Studio and a key you chose yourself both work. A Function, Endpoint or Workflow
ID that carries no prefix does not: write `fn:send-welcome` (its key), not the bare ID.

## Run an app action

The connection id comes from Studio → **Connections**, or from `client.connections.list()`.

{% sdk-node %}
```ts
import { W6WClient } from "@w6w/sdk";

const client = new W6WClient(); // reads W6W_BASE_URL and W6W_TOKEN

const result = await client.run({
  urn: "conn_01H…",
  action: "<action-key>",
  payload: { to: "ada@example.com", subject: "Hello" },
});

if (result.kind === "action") console.log(result.value);
```
{% endsdk-node %}

{% api %}
```bash
curl -sS "$W6W_BASE_URL/run" \
  -H "Authorization: Bearer $W6W_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "urn": "conn_01H…",
    "action": "<action-key>",
    "payload": { "to": "ada@example.com", "subject": "Hello" }
  }'
```
{% endapi %}

{% cli %}
```bash
w6w run conn_01H… --action <action-key> --payload '{"to":"ada@example.com","subject":"Hello"}'
```
{% endcli %}

The answer is `200` with the app's result:

```json
{
  "kind": "action",
  "value": { "…": "whatever the app returned" },
  "output": { "…": "the same payload as value" },
  "invocationId": "inv_01H…",
  "status": "succeeded",
  "startedAt": "2026-10-06T09:30:00.000Z",
  "finishedAt": "2026-10-06T09:30:00.412Z",
  "durationMs": 412
}
```

`value` and `output` hold the same payload. `status` is w6w's own verdict on the call — it is not
the status code the app's vendor sent back inside its payload. The `invocationId` is your receipt;
see [Invocations](/guides/invocations/).

## Run a Function

A Function takes `payload` and returns `output`.

{% sdk-node %}
```ts
const result = await client.run({
  urn: "fn:send-welcome",
  payload: { email: "ada@example.com" },
});

if (result.kind === "function") console.log(result.output);
```
{% endsdk-node %}

{% api %}
```bash
curl -sS "$W6W_BASE_URL/run" \
  -H "Authorization: Bearer $W6W_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "urn": "fn:send-welcome", "payload": { "email": "ada@example.com" } }'
```
{% endapi %}

If you already know it is a Function, the dedicated route does the same thing:
`POST /functions/<id-or-key>/invoke` with a body of `{ "inputs": { … } }`. The SDK form is
`client.functions.run("send-welcome", { … })`. An Endpoint has the equivalent at
`POST /endpoints/<id-or-key>/invoke`.

## Start a Workflow

A Workflow runs in the background, so the call answers straight away with a **handle**, and the
HTTP status is `202`. That is success — the run is queued.

{% api %}
```bash
curl -sS "$W6W_BASE_URL/run" \
  -H "Authorization: Bearer $W6W_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "urn": "wf:nightly-report", "payload": { "day": "2026-10-05" } }'
```
{% endapi %}

```json
{
  "kind": "workflow",
  "runId": "<run-id>",
  "invocationId": "inv_01H…",
  "status": "queued",
  "startedAt": "2026-10-06T09:30:00.000Z"
}
```

`status: "queued"` means *started*, not *finished*. Follow the run with its `runId`:

{% sdk-node %}
```ts
const { body } = await client.request<{ run: { status: string } }>({
  method: "GET",
  path: `/runs/${result.runId}`,
});
console.log(body.run.status);
```
{% endsdk-node %}

{% api %}
```bash
curl -sS "$W6W_BASE_URL/runs/<run-id>" -H "Authorization: Bearer $W6W_TOKEN"
```
{% endapi %}

To start a Workflow and wait for it in one call, use the dedicated route with `?wait=true`:
`POST /workflows/<id-or-key>/run?wait=true` (SDK: `client.workflows.run(id, { wait: true })`). The
wait is bounded; if the run is still going when it ends you get the `202` handle instead, and can
carry on polling.

## Tell the kinds apart

Every success carries a `kind`. Check it rather than guessing from which field is present:

| `kind` | Result field | HTTP status |
|---|---|---|
| `action` | `value` (and `output`) | `200` |
| `function` | `output` | `200` |
| `workflow` | `runId` + `status: "queued"` | `202` |

An Endpoint or an alias answers with the kind of whatever it is wired to. Treat an unfamiliar `kind`
as data to pass along, not as an error — new kinds can appear before your client learns them.

## When it goes wrong

Errors come back as `{ "error": { "code": "…", "message": "…" } }`. The ones you will meet:

| Status | `code` | What it means |
|---|---|---|
| `400` | `invalid_body` | The body is not JSON, `urn` is missing, `urn` is not a recognised form, `action` is missing for a `conn_` URN, or you sent `action` alongside an alias. |
| `400` | `unroutable_id` | You passed the ID of a Function, Endpoint or Workflow that has no `fn_`/`ep_`/`wf_` prefix. Use `fn:<key>`, `ep:<key>`, `wf:<key>`, or an alias. |
| `401` | `unauthorized` | The token is missing, expired or wrong. |
| `403` | `app_not_entitled` | Your account is not allowed to use that app. |
| `404` | `unknown_connection`, `unknown_function`, `unknown_endpoint`, `unknown_workflow` | Nothing by that name in your account. |
| `409` | `ambiguous_key` | The same key exists in two of your projects — use the ID. |
| `422` | `function_incomplete`, `function_disabled`, `function_not_published` | The Function exists but cannot run yet. |
| `424` | (the app's own code) | The app or its vendor refused the call — a wrong scope, a bad parameter. The message is the vendor's reason. |
| `429` | `concurrency_exceeded` and others | You are over a limit. Honour the `Retry-After` header. |

A `424` is deliberately a 4xx: it is almost always something to fix in the call or the connection,
not a w6w outage. Failures carry the same `invocationId` a success does, so you can look the attempt
up afterwards.

## Next

- [Aliases](/guides/aliases/) — give a URN a stable, readable name.
- [Overrides](/guides/overrides/) — reach a vendor field an action does not declare.
- [Invocations](/guides/invocations/) — look a call up after the fact.
- [The HTTP API](/reference-api/http-api/) — every route.
