---
key: "aliases"
title: "Aliases"
section: "guides"
description: "Give an action, Function, Workflow or Endpoint a short, stable name, and call it by that name instead of by ID."
summary: null
format: "markdown"
shared: true
order: 30
position: 11
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/guides/aliases.md"
sourceSha: "38b5283f9b5eaf6e14d7b874219383f9d4fd4788"
sourceRefSha: "1eee1ca1c273fcccc91988c49213335e02b22b4e"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/1eee1ca1c273fcccc91988c49213335e02b22b4e/docs/guides/aliases.md"
syncedAt: "2026-10-06T21:24:51Z"
---


# Aliases

**Applies to:** HTTP · SDK (calling an alias) · Studio. Creating and editing aliases is an HTTP
operation (or Studio); the MCP `w6w_invoke` tool does not take an alias — it takes a `ref`, see
[Connect an MCP client](/guides/connect-mcp/).

An **alias** is a name you choose, pointing at one thing you can run: an app action, a Function, a
Workflow or an Endpoint. Once it exists you call the name wherever you would have passed a URN:

```
send-email   →   the "send" action on your SendGrid connection
```

Use an alias when a script, a cron job or another team hard-codes *what to call*, and you want to
change *what answers* later without touching them. Re-point the alias; the callers keep using the
same string.

## The name

An alias name is 3–39 characters, starts with a lowercase letter, and contains only lowercase
letters, digits and single hyphens: `send-email`, `nightly-report`, `crm2-sync`. It never contains
an underscore, so it can never be mistaken for a `conn_…`, `fn_…`, `wf_…` or `ep_…` ID.

Two rules to remember:

- **A name is permanent.** Once saved, the name of an alias cannot be changed — it is the string
  other people's scripts depend on. To rename, create the new alias and delete the old one.
- **The target is not.** You can re-point an existing alias at something else at any time.

An alias always has a target. There is no draft alias: the target must exist in your account when you
save.

## Create an alias

You choose the alias's `id` (any non-empty string you like — it is what you use to read, update or
delete it) and the `name`. The `target` says what the name runs; it takes one of four shapes:

| `target.kind` | Required fields | Optional |
|---|---|---|
| `action` | `uses.app`, `uses.action` | `uses.connection` (a `conn_…` ID) |
| `function` | `function` (a `fn_…` ID) | |
| `workflow` | `workflow` (a `wf_…` ID) | |
| `endpoint` | `endpoint` (an `ep_…` ID) | |

{% api %}
```bash
curl -sS "$W6W_BASE_URL/aliases" \
  -H "Authorization: Bearer $W6W_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "als_send_email",
    "name": "send-email",
    "displayName": "Send the welcome email",
    "description": "Calls the welcome-email Function.",
    "target": { "kind": "function", "function": "fn_01H…" }
  }'
```
{% endapi %}

The answer is `201` — on a create and on an update alike:

```json
{ "alias": { "id": "als_send_email", "name": "send-email" } }
```

Saving again with the same `id` and `name` but a different `target` re-points the alias.

To list, read or delete (`DELETE` answers `{ "ok": true }`):

```bash
curl -sS "$W6W_BASE_URL/aliases"            -H "Authorization: Bearer $W6W_TOKEN"
curl -sS "$W6W_BASE_URL/aliases/als_send_email" -H "Authorization: Bearer $W6W_TOKEN"
curl -sS -X DELETE "$W6W_BASE_URL/aliases/als_send_email" -H "Authorization: Bearer $W6W_TOKEN"
```

The list returns `{ "aliases": [ { id, name, displayName, description, updatedAt, target } ] }` —
the aliases of your current account.

## Call an alias

Pass the name in the `urn` slot of [`POST /run`](/guides/call-any-api/), exactly as you would a URN.
An alias carries its own target, so do **not** send `action` — it is already part of the alias.

{% sdk-node %}
```ts
import { W6WClient } from "@w6w/sdk";

const client = new W6WClient(); // reads W6W_BASE_URL and W6W_TOKEN

const result = await client.run({
  urn: "send-email",
  payload: { to: "ada@example.com" },
});
```
{% endsdk-node %}

{% api %}
```bash
curl -sS "$W6W_BASE_URL/run" \
  -H "Authorization: Bearer $W6W_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "urn": "send-email", "payload": { "to": "ada@example.com" } }'

# or, the same alias as a URL — the request body is the payload:
curl -sS "$W6W_BASE_URL/invoke/send-email" \
  -H "Authorization: Bearer $W6W_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "to": "ada@example.com" }'
```
{% endapi %}

The answer has the same shape as calling the target directly: its `kind` is whatever the alias
points at (`action`, `function`, or `workflow` with a `runId` — see
[Call any API](/guides/call-any-api/)), and it carries an `invocationId` you can look up under
[Invocations](/guides/invocations/).

## Errors you will see

Errors come back as `{ "error": { "code": "…", "message": "…" } }`.

**Saving an alias** (`POST /aliases`):

| Status | `code` | What it means |
|---|---|---|
| `400` | `invalid_body` | The body is not JSON. |
| `400` | `invalid_alias` | A required field is missing (`id`, `name` or `target`), `target.kind` is not one of the four, the name breaks the format above, or **the target does not resolve in your account**. |
| `409` | `alias_name_immutable` | You saved an existing alias with a different `name`. Create a new alias and delete the old one. |
| `409` | `alias_name_conflict` | That name is already held by another alias. |
| `409` | `alias_conflict` | That `id` belongs to an alias you do not own. |
| `404` | `unknown_alias` | `GET` or `DELETE` with an `id` that is not one of your aliases. |

The "target does not resolve" message is deliberately identical whether the thing you named does not
exist at all or belongs to someone else, so a save cannot be used to probe other accounts.

**Calling an alias** (`POST /run`):

| Status | `code` | What it means |
|---|---|---|
| `400` | `invalid_body` | You sent `action` alongside an alias, or the `urn` is not a URN, key or alias at all. (`POST /invoke/<name>` answers the same condition with `invalid_urn`.) |
| `404` | `unknown_function`, `unknown_workflow`, `unknown_endpoint`, `unknown_connection` | The alias exists but its target has since been deleted. |

Deleting a Function, Workflow, Endpoint or connection does **not** delete or disable an alias that
points at it. The alias stays, and calls through it fail with the `404` above until you re-point or
delete it. Saving an alias proves the target resolved *at that moment*, not for ever.

## Next

- [Call any API](/guides/call-any-api/) — the URN forms an alias can stand in for.
- [Invocations](/guides/invocations/) — find a call you made through an alias.
