---
key: "spec-documents"
title: "Spec documents"
section: "guides"
description: "Export a Function, Endpoint or Workflow as a portable JSON document and import it into another account — and read the report of what still needs re-connecting."
summary: null
format: "markdown"
shared: true
order: 70
position: 15
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/guides/spec-documents.md"
sourceSha: "81d1d744c92862bcbe4532f888cb68012a64f405"
sourceRefSha: "1eee1ca1c273fcccc91988c49213335e02b22b4e"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/1eee1ca1c273fcccc91988c49213335e02b22b4e/docs/guides/spec-documents.md"
syncedAt: "2026-10-06T21:29:52Z"
---


# Spec documents

**Applies to:** HTTP · SDK (through `client.request`) · Studio (Export and Import on Functions and
Endpoints; Import on Workflows). Exporting a Workflow is HTTP-only today — Studio has no Export
button for Workflows.

A **spec document** is a portable JSON copy of one Function, Endpoint or Workflow. Use it to move a
definition between accounts or environments, to keep a copy in version control, or to hand one to a
colleague.

```json
{
  "specVersion": "2",
  "kind": "function",
  "callable": {
    "manifestVersion": "1",
    "key": "send-email",
    "inputs": [],
    "impl": { "uses": { "app": "sendgrid", "connection": null } }
  },
  "rebind": [
    { "path": "impl.uses.connection", "kind": "connection", "app": "sendgrid" }
  ]
}
```

- `specVersion` is `"2"`.
- `kind` is `function`, `endpoint` or `workflow`.
- `callable` is the definition itself.
- `rebind` lists every place the definition pointed at something in the source account. It is for
  people to read. Import ignores it and works the list out again from `callable`.

## What travels, and what does not

A document carries a definition's shape. It does **not** carry anything that only means something in
the account it came from.

- **Ids are not carried.** Import gives the new copy a fresh id. A document never overwrites an
  existing resource, even yours.
- **Connections are not carried.** A step that used a connection is cleared on export. On import,
  w6w looks in the *importing* account for a connection to the same app and uses the newest one it
  finds.
- **Secret values never leave the account.** A document holds no secret values, and a document that
  contains one is refused on import.
- **Vars and secrets are referenced by name only.** A reference such as `vars.region` travels as
  written. Import checks that your account has a var or secret of that name and reports it if not. It
  never copies the value across; create them in the new account.
- **An Endpoint's inbound-auth settings are left out.** Set them again on the imported Endpoint.
- **A Workflow's event trigger becomes `manual`.** An event subscription belongs to the source
  account.
- **An imported Workflow always arrives as a draft**, whatever state the original was in. Review it,
  then publish.

## Export

Each kind has its own export route. All three answer `{ "spec": { … } }`.

{% sdk-node %}
```ts
import { W6WClient } from "@w6w/sdk";

const client = new W6WClient(); // reads W6W_BASE_URL and W6W_TOKEN

const { body } = await client.request({
  method: "GET",
  path: "/functions/fn_01H…/spec",
});

console.log(JSON.stringify(body.spec, null, 2));
```
{% endsdk-node %}

{% api %}
```bash
curl -sS "$W6W_BASE_URL/functions/fn_01H…/spec"  -H "Authorization: Bearer $W6W_TOKEN"
curl -sS "$W6W_BASE_URL/endpoints/ep_01H…/spec"  -H "Authorization: Bearer $W6W_TOKEN"
curl -sS "$W6W_BASE_URL/workflows/wf_01H…/spec"  -H "Authorization: Bearer $W6W_TOKEN"
```
{% endapi %}

In Studio, a Function or Endpoint has an **Export** action that shows the same document for you
to copy.

## Import

Send the document, exactly as exported, to `POST /spec/import`. One route handles all three kinds.

{% sdk-node %}
```ts
const { status, body } = await client.request({
  method: "POST",
  path: "/spec/import",
  body: spec, // the document you exported
});

console.log(status, body.callable.id);

const unresolved = body.references.filter((r: { resolved: boolean }) => !r.resolved);
if (unresolved.length > 0) console.warn("Needs attention:", unresolved);
```
{% endsdk-node %}

{% api %}
```bash
curl -sS -X POST "$W6W_BASE_URL/spec/import" \
  -H "Authorization: Bearer $W6W_TOKEN" \
  -H "Content-Type: application/json" \
  -d @send-email.spec.json
```
{% endapi %}

In Studio, the Functions, Endpoints and Workflows pages have an **Import** action: paste the
document and confirm.

The answer is `201`:

```json
{
  "callable": { "id": "fn_0b6c…", "key": "send-email" },
  "references": [
    { "path": "impl.uses.connection", "kind": "connection", "resolved": true, "boundTo": "conn_01H…" }
  ]
}
```

(For a Workflow, `callable` carries `name` instead of `key`.)

### Read the report

**A `201` does not mean everything was re-connected.** The resource is created either way. The
`references` list says, for each place, whether it was resolved. Check `resolved` on every entry —
this is the part of the answer that tells you what to fix.

An unresolved entry carries a `reason`:

| `reason` | What happened | What to do |
|---|---|---|
| `no_local_connection` | Your account has no connection to the app a step uses. The step is cleared. | Connect the app, then pick the connection on the step. |
| `unresolved_reference` | A step or target named another Function, Workflow or Endpoint your account cannot see. The reference is cleared. | Import that resource first, or point the step at one you have. |
| `dynamic_reference` | The reference is an expression, not a fixed id. It is left as written. | Check it still resolves where you run it. |
| `security_not_portable` | An Endpoint's inbound-auth settings are never carried. | Set the Endpoint's security again. |
| `subscription_not_portable` | A Workflow's event trigger pointed at a subscription in the source account. The trigger is set to `manual`. | Re-create the trigger. |
| `no_local_var` | A `vars.<name>` reference has no var of that name in your account. | Create the var. |
| `no_local_secret` | A named secret has no match in your account. | Create the secret. |

## Errors

| Status | `error.code` | When |
|---|---|---|
| `400` | `invalid_body` | The body was not JSON. |
| `400` | `invalid_spec_document` | `specVersion` is not `"2"`, `kind` is not `function`, `endpoint` or `workflow`, `callable` is not an object, or the definition's retry settings are malformed. The message says which. |
| `400` | `spec_secret_refused` | The document contains a secret value. The message names where (the path only). Remove it and import again. |
| `404` | `unknown_function`, `unknown_workflow`, `unknown_endpoint` | On export: no such resource in your account. |
| `409` | `function_key_conflict`, `endpoint_key_conflict`, `workflow_key_conflict` | Your account already has a resource with that `key`. Change the key in the document and import again. |
| `409` | `function_conflict`, `workflow_conflict`, `endpoint_conflict` | The resource could not be created because of an ownership clash. |

Two things that are **not** errors: importing a Workflow whose *name* already exists creates a
second Workflow with the same name, and importing never re-publishes anything.

## Next

- [Call any API](/guides/call-any-api/) — run the Function, Endpoint or Workflow once it is imported.
- [Aliases](/guides/aliases/) — give an imported resource a stable name.
- [The HTTP API](/reference-api/http-api/) — every route.
