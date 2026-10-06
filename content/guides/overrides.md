---
key: "overrides"
title: "Overrides"
section: "guides"
description: "Reach a vendor field an app action does not declare, by merging extra detail into the outgoing request."
summary: null
format: "markdown"
shared: true
order: 40
position: 12
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/guides/overrides.md"
sourceSha: "a7381cb29ad44d1fb8278937cb1dfb53596c8e30"
sourceRefSha: "1eee1ca1c273fcccc91988c49213335e02b22b4e"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/1eee1ca1c273fcccc91988c49213335e02b22b4e/docs/guides/overrides.md"
syncedAt: "2026-10-06T21:33:41Z"
---


# Overrides

**Applies to:** HTTP · SDK (through `client.request`) · MCP (`w6w_invoke`). Overrides work on **app
actions**. They are not accepted by `POST /invoke/<urn>`, and a Function, Workflow or Endpoint refuses
them.

An app action takes a fixed set of `params` — a form its author designed. Anything you send that the
action does not declare is dropped. That is the right default, and the wrong answer when the vendor
has a field the action never modelled: an undocumented flag, a new option, a field the author chose
not to surface.

`overrides` is the way out that keeps you inside w6w. You still call the action on your connection,
with the credential held safely in that connection. Alongside `params`, you send extra request detail
that w6w merges into the **outgoing HTTP request** just before it goes to the vendor.

Because the merge happens on the wire, **you name a field the way the vendor does**, not the way the
action's form does. Use the vendor's own API documentation as your reference.

## What you can send

| Field | Type | What it does |
|---|---|---|
| `body` | object | Merged over the request body. |
| `query` | object | Merged into the URL's query string. A `null` value **removes** a parameter the action set. |
| `headers` | object | Added to the request headers. A header with the same name (in any letter case) is replaced, so one header never appears twice. |
| `target` | `"first"` · `"first-write"` · `"all"` | Which outgoing request gets the overrides. Default `first`. Use `first-write` for an action that looks something up before it writes, and `all` for every request the action makes. |
| `match` | string | Only apply the overrides to requests whose URL contains this text. |

Everything is optional; send only what you need.

## Worked example: add a CC

Say a send-email action only takes `to`, `subject` and `text`, and you need a CC and the vendor's
sandbox mode on. SendGrid names those fields `personalizations[0].cc` and
`mail_settings.sandbox_mode.enable`:

{% api %}
```bash
curl -sS "$W6W_BASE_URL/run" \
  -H "Authorization: Bearer $W6W_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "urn": "conn_01H…",
    "action": "<action-key>",
    "payload": { "to": "ada@example.com", "subject": "Hello", "text": "Hi Ada" },
    "overrides": {
      "body": {
        "personalizations[0].cc": [{ "email": "cc@example.com" }],
        "mail_settings": { "sandbox_mode": { "enable": true } }
      }
    }
  }'
```
{% endapi %}

The SDK's `client.run()` does not take `overrides`; send the same body through the generic request
method:

{% sdk-node %}
```ts
import { W6WClient } from "@w6w/sdk";

const client = new W6WClient(); // reads W6W_BASE_URL and W6W_TOKEN

const { body } = await client.request({
  method: "POST",
  path: "/run",
  body: {
    urn: "conn_01H…",
    action: "<action-key>",
    payload: { to: "ada@example.com", subject: "Hello", text: "Hi Ada" },
    overrides: {
      body: {
        "personalizations[0].cc": [{ email: "cc@example.com" }],
        mail_settings: { sandbox_mode: { enable: true } },
      },
    },
  },
});
```
{% endsdk-node %}

From an MCP client, pass `overrides` as an argument to `w6w_invoke`:

```json
{
  "ref": "conn_01H…#<action-key>",
  "params": { "to": "ada@example.com", "subject": "Hello", "text": "Hi Ada" },
  "overrides": { "body": { "mail_settings": { "sandbox_mode": { "enable": true } } } }
}
```

The answer is the same as for any app action — `kind: "action"`, the result, and an `invocationId`.
See [Call any API](/guides/call-any-api/).

The same `overrides` field is accepted by the app-test route `POST /apps/<app-id>/actions/<key>/invoke`
that Studio uses to try an action, next to its `params`.

## How the merge works

An override lands on top of the request the action built. The rule is that **it adds to what is
there; it does not wipe it out**:

- **Two objects deep-merge.** Keys that only the built request has survive.
- **Two arrays merge by position.** Entries the built request has and your override does not are
  kept; entries past the built array's end are appended.
- **Anything else takes your value** — there is nothing to merge into.

So in the example above, if the action had already built `personalizations[0].to` (Ada), your CC is
added next to it rather than replacing it. Two more rules keep a valid request valid:

- A body that is an array or a bare value, or an encoding with no named fields, is left untouched —
  there is nothing to merge by name.
- On a method that carries a body where the action built none, your `body` becomes the body.

**A path key** — dotted, with `[n]` for a position — names one exact leaf. In the example,
`"personalizations[0].cc"` reaches into the first personalization without restating the rest.

### Replace a branch instead of merging

Because a plain override never removes anything, `["a","b"]` overridden with `["c"]` gives `["c","b"]`. To replace what is there, end the key with `!`. It works on a plain key and on a path key:

```json
{
  "body": {
    "categories!": ["transactional"],
    "personalizations[0].to!": [{ "email": "only@example.com" }]
  }
}
```

Replacing is always visible in the payload and never happens by accident. If a vendor field really ends in `!` or contains a literal `.`, escape it with a backslash (`"loud\\!"`, `"a\\.b"`).

A path key that is malformed (`"items["`, `"a..b"`, `"items[x]"`), or that points past the end of an array, is refused rather than guessed at. Setting the index equal to the array's length appends.

### What an override cannot do

- **Replace your credential.** The connection's credential is applied *after* your overrides, so an
  override cannot swap or remove an authorization header.
- **Redirect the call.** There is no field for the host or the path. `match` only filters which
  request your overrides apply to.

Overrides add detail to a call you were already allowed to make; they do not widen what that call
can reach.

## When it goes wrong

Errors come back as `{ "error": { "code": "…", "message": "…" } }`. Read the `message` — it names
what was wrong with the overrides.

| Status | `code` | What it means |
|---|---|---|
| `400` | `invalid_body` | `overrides` is not a valid override object — a wrong type, or a `target` that is not one of the three values. The message says which. A mistyped key fails loudly instead of being silently dropped. |
| `400` | `invalid_body` | You sent `overrides` to a target that does not take them: a Function, Workflow or Endpoint (`fn_`, `wf_`, `ep_`). |
| `400` | `invalid_body` | A path key is malformed, or its index is past the end of the array. The message names the key. |
| `424` | (the vendor's own error) | The merged request reached the vendor and it refused it. Check the field against the vendor's documentation — an override is not validated against the vendor's schema. |

From MCP, a malformed `overrides` argument comes back as an `invalid_argument` refusal with status
`400`; `overrides` must be a JSON object.

## Next

- [Call any API](/guides/call-any-api/) — the call that carries your overrides.
- [Invocations](/guides/invocations/) — look the call up afterwards.
- [MCP tools](/reference-api/mcp/) — `w6w_invoke`'s arguments.
