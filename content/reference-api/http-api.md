---
key: "http-api"
title: "HTTP API"
section: "reference-api"
description: "Every HTTP endpoint the w6w API serves, generated from the client contract."
summary: null
format: "markdown"
shared: true
order: 0
position: 0
sourceRepo: "w6w-io/w6w-wrappers"
sourcePath: "endpoints.json"
sourceSha: "b7e7dd1fc861eb7770dc442a020b486ef0598c80"
sourceRefSha: "47f8253f24009b48ed2a1fd22a7ed9e5ed60ad98"
sourceUrl: "https://github.com/w6w-io/w6w-wrappers/blob/47f8253f24009b48ed2a1fd22a7ed9e5ed60ad98/endpoints.json"
syncedAt: "2026-10-02T15:56:29Z"
---

Every operation the w6w HTTP API exposes to its client libraries. Each entry shows the route, its parameters and what it returns, with the call as spelled in the TypeScript and Python clients and the CLI.

## me

`GET /auth/me`

Caller identity plus w6w component versions.

**Returns:** `Me`

- TypeScript: `client.me()`
- Python: `client.me()`
- CLI: `w6w me`

## connections.list

`GET /connections`

List the caller's connections (credentials redacted).

**Returns:** `ConnectionSummary[]`

- TypeScript: `client.connections.list()`
- Python: `client.connections.list()`
- CLI: `w6w connections list`

## workflows.list

`GET /workflows`

List the caller's workflow definitions.

| Parameter | In | Type | Required |
|---|---|---|---|
| `project` | query | string | no |

**Returns:** `WorkflowSummary[]`

- TypeScript: `client.workflows.list(opts?)`
- Python: `client.workflows.list(project=None)`
- CLI: `w6w workflows list [--project <id>]`

## workflows.run

`POST /workflows/{id}/run`

Enqueue a workflow run; optionally wait for a terminal state.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |
| `wait` | query | boolean | no |
| `variables` | body | object | no |
| `trigger` | body | string | no |
| `input` | body | object | no |

**Returns:** `RunResult`

- TypeScript: `client.workflows.run(id, opts?)`
- Python: `client.workflows.run(id, wait=False, variables=None, trigger=None, input=None)`
- CLI: `w6w workflows run <id> [--wait] [--input <json>]`

## workflows.cancel

`POST /runs/{id}/cancel`

Cancel a queued or running workflow run.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `WorkflowCancelResult`

- TypeScript: `client.workflows.cancel(runId)`
- Python: `client.workflows.cancel(id)`
- CLI: `w6w workflows cancel <id>`

## workflows.get

`GET /workflows/{id}`

Fetch one workflow's stored definition.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `WorkflowDetail`

- TypeScript: `client.workflows.get(id)`
- Python: `client.workflows.get(id)`
- CLI: `w6w workflows get <id>`

## workflows.create

`POST /workflows`

Create a workflow definition.

| Parameter | In | Type | Required |
|---|---|---|---|
| `definition` | body | object | yes |
| `project` | query | string | no |

**Returns:** `WorkflowSaveResult`

- TypeScript: `client.workflows.create(definition, opts?)`
- Python: `client.workflows.create(definition, project=None)`
- CLI: `w6w workflows create --definition <json> [--project <id>]`

## workflows.update

`POST /workflows`

Overwrite a workflow definition.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | body | string | yes |
| `definition` | body | object | yes |
| `project` | query | string | no |
| `ifUnmodifiedSince` | header | string | no |

**Returns:** `WorkflowSaveResult`

- TypeScript: `client.workflows.update(id, definition, opts?)`
- Python: `client.workflows.update(id, definition, project=None, if_unmodified_since=None)`
- CLI: `w6w workflows update <id> --definition <json> [--project <id>] [--if-unmodified-since <ts>]`

## workflows.archive

`POST /workflows/{id}/archive`

Archive a workflow — the required step before deleting it.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `WorkflowDefinition`

- TypeScript: `client.workflows.archive(id)`
- Python: `client.workflows.archive(id)`
- CLI: `w6w workflows archive <id>`

## workflows.delete

`DELETE /workflows/{id}`

Delete an archived workflow.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `void`

- TypeScript: `client.workflows.delete(id)`
- Python: `client.workflows.delete(id)`
- CLI: `w6w workflows delete <id>`

## documents.list

`GET /documents`

List the caller's documents in a project.

| Parameter | In | Type | Required |
|---|---|---|---|
| `project` | query | string | no |

**Returns:** `Doc[]`

- TypeScript: `client.documents.list(opts?)`
- Python: `client.documents.list(project=None)`
- CLI: `w6w documents list [--project <id>]`

## documents.get

`GET /documents/{id}`

Fetch one document by its `doc_…` id.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |
| `project` | query | string | no |

**Returns:** `Doc`

- TypeScript: `client.documents.get(id, opts?)`
- Python: `client.documents.get(id, project=None)`
- CLI: `w6w documents get <id> [--project <id>]`

## documents.getByKey

`GET /documents/by-key/{key}`

Fetch one document by its human-chosen `key`.

| Parameter | In | Type | Required |
|---|---|---|---|
| `key` | path | string | yes |
| `project` | query | string | no |

**Returns:** `Doc`

- TypeScript: `client.documents.getByKey(key, opts?)`
- Python: `client.documents.get_by_key(key, project=None)`
- CLI: `w6w documents get-by-key <key> [--project <id>]`

## documents.create

`POST /documents`

Create a document under a caller-chosen `key`.

| Parameter | In | Type | Required |
|---|---|---|---|
| `key` | body | string | yes |
| `content` | body | string | yes |
| `format` | body | string | no |
| `description` | body | string | no |
| `project` | query | string | no |

**Returns:** `Doc`

- TypeScript: `client.documents.create(input, opts?)`
- Python: `client.documents.create(key, content, format=None, description=None, project=None)`
- CLI: `w6w documents create <key> --content <text> [--format <f>] [--description <d>] [--project <id>]`

## documents.update

`PATCH /documents/{id}`

Patch a document's content, format or description.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |
| `content` | body | string | no |
| `format` | body | string | no |
| `description` | body | string | no |
| `project` | query | string | no |

**Returns:** `Doc`

- TypeScript: `client.documents.update(id, patch, opts?)`
- Python: `client.documents.update(id, content=None, format=None, description=None, project=None)`
- CLI: `w6w documents update <id> [--content <text>] [--format <f>] [--description <d>] [--project <id>]`

## documents.delete

`DELETE /documents/{id}`

Delete a document.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |
| `project` | query | string | no |

**Returns:** `void`

- TypeScript: `client.documents.delete(id, opts?)`
- Python: `client.documents.delete(id, project=None)`
- CLI: `w6w documents delete <id> [--project <id>]`

## vars.list

`GET /vars`

List the caller's typed variables.

**Returns:** `Var[]`

- TypeScript: `client.vars.list()`
- Python: `client.vars.list()`
- CLI: `w6w vars list`

## vars.get

`GET /vars/{id}`

Fetch one variable by its `var_…` id.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `Var`

- TypeScript: `client.vars.get(id)`
- Python: `client.vars.get(id)`
- CLI: `w6w vars get <id>`

## vars.getByName

`GET /vars/by-name/{name}`

Fetch one variable by its human-chosen `name`.

| Parameter | In | Type | Required |
|---|---|---|---|
| `name` | path | string | yes |

**Returns:** `Var`

- TypeScript: `client.vars.getByName(name)`
- Python: `client.vars.get_by_name(name)`
- CLI: `w6w vars get-by-name <name>`

## vars.create

`POST /vars`

Create a typed variable under a caller-chosen `name`.

| Parameter | In | Type | Required |
|---|---|---|---|
| `name` | body | string | yes |
| `type` | body | string | yes |
| `value` | body | any | yes |
| `description` | body | string | no |

**Returns:** `Var`

- TypeScript: `client.vars.create(input)`
- Python: `client.vars.create(name, type, value, description=None)`
- CLI: `w6w vars create <name> --type <t> --value <v> [--description <d>]`

## vars.update

`PATCH /vars/{id}`

Patch a variable's type, value or description.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |
| `type` | body | string | no |
| `value` | body | any | no |
| `description` | body | string | no |

**Returns:** `Var`

- TypeScript: `client.vars.update(id, patch)`
- Python: `client.vars.update(id, type=None, value=None, description=None)`
- CLI: `w6w vars update <id> [--type <t>] [--value <v>] [--description <d>]`

## vars.delete

`DELETE /vars/{id}`

Delete a variable.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `void`

- TypeScript: `client.vars.delete(id)`
- Python: `client.vars.delete(id)`
- CLI: `w6w vars delete <id>`

## functions.run

`POST /functions/{idOrKey}/invoke`

Run one Function by its key (or id) and return its output.

| Parameter | In | Type | Required |
|---|---|---|---|
| `idOrKey` | path | string | yes |
| `inputs` | body | object | no |

**Returns:** `unknown`

- TypeScript: `client.functions.run(name, opts?)`
- Python: `client.functions.run(name, payload=None)`
- CLI: `w6w functions run <name> [--payload <json>]`

## functions.list

`GET /functions`

List the caller's Function definitions.

**Returns:** `FunctionSummary[]`

- TypeScript: `client.functions.list()`
- Python: `client.functions.list()`
- CLI: `w6w functions list`

## functions.get

`GET /functions/{id}`

Fetch one Function's stored definition.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `FunctionDetail`

- TypeScript: `client.functions.get(id)`
- Python: `client.functions.get(id)`
- CLI: `w6w functions get <id>`

## functions.create

`POST /functions`

Create a Function definition.

| Parameter | In | Type | Required |
|---|---|---|---|
| `definition` | body | object | yes |

**Returns:** `SaveResult`

- TypeScript: `client.functions.create(definition)`
- Python: `client.functions.create(definition)`
- CLI: `w6w functions create --definition <json>`

## functions.update

`POST /functions`

Overwrite a Function definition.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | body | string | yes |
| `definition` | body | object | yes |

**Returns:** `SaveResult`

- TypeScript: `client.functions.update(id, definition)`
- Python: `client.functions.update(id, definition)`
- CLI: `w6w functions update <id> --definition <json>`

## functions.delete

`DELETE /functions/{id}`

Delete a Function.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `void`

- TypeScript: `client.functions.delete(id)`
- Python: `client.functions.delete(id)`
- CLI: `w6w functions delete <id>`

## endpoints.run

`POST /endpoints/{idOrKey}/invoke`

Run one Endpoint by its key (or id); the envelope's kind says which arm answered.

| Parameter | In | Type | Required |
|---|---|---|---|
| `idOrKey` | path | string | yes |
| `input` | body | object | no |

**Returns:** `RunEnvelope`

- TypeScript: `client.endpoints.run(name, opts?)`
- Python: `client.endpoints.run(name, payload=None)`
- CLI: `w6w endpoints run <name> [--payload <json>]`

## run

`POST /run`

Run anything addressable by URN — a connection action, a function, an endpoint or a workflow.

| Parameter | In | Type | Required |
|---|---|---|---|
| `urn` | body | string | yes |
| `action` | body | string | no |
| `payload` | body | object | no |

**Returns:** `RunEnvelope`

- TypeScript: `client.run(input)`
- Python: `client.run(urn, action=None, payload=None)`
- CLI: `w6w run <urn> [--action <a>] [--payload <json>]`
