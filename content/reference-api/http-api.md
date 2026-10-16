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
sourceSha: "8a1afe37e3e75bbd62f4719f908267ba5095d140"
sourceRefSha: "73d1fae563271498c8f9c6d92f213ad19903fee3"
sourceUrl: "https://github.com/w6w-io/w6w-wrappers/blob/73d1fae563271498c8f9c6d92f213ad19903fee3/endpoints.json"
syncedAt: "2026-10-14T19:27:57Z"
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

## connections.get

`GET /connections/{id}`

Fetch one connection (credentials redacted).

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `ConnectionSummary`

- TypeScript: `client.connections.get(id)`
- Python: `client.connections.get(id)`
- CLI: `w6w connections get <id>`

## connections.delete

`DELETE /connections/{id}`

Delete a connection.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `void`

- TypeScript: `client.connections.delete(id)`
- Python: `client.connections.delete(id)`
- CLI: `w6w connections delete <id>`

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
| `allowUnpublished` | body | boolean | no |

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

## workflows.listVersions

`GET /workflows/{id}/versions`

List a workflow's published versions.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `VersionList`

- TypeScript: `client.workflows.listVersions(id)`
- Python: `client.workflows.list_versions(id)`
- CLI: `w6w workflows versions <id>`

## workflows.getVersion

`GET /workflows/{id}/versions/{n}`

Read one published version of a workflow, with its definition.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |
| `n` | path | integer | yes |

**Returns:** `VersionDetail`

- TypeScript: `client.workflows.getVersion(id, n)`
- Python: `client.workflows.get_version(id, n)`
- CLI: `w6w workflows version <id> <n>`

## workflows.publish

`POST /workflows/{id}/publish`

Publish the workflow's stored definition as a new immutable version.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `PublishResult`

- TypeScript: `client.workflows.publish(id)`
- Python: `client.workflows.publish(id)`
- CLI: `w6w workflows publish <id>`

## workflows.revert

`POST /workflows/{id}/versions/{n}/revert`

Rewrite the live workflow from a published version.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |
| `n` | path | integer | yes |

**Returns:** `RevertResult`

- TypeScript: `client.workflows.revert(id, n)`
- Python: `client.workflows.revert(id, n)`
- CLI: `w6w workflows revert <id> <n>`

## workflows.enable

`POST /workflows/{id}/enable`

Enable the workflow's invocability.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `void`

- TypeScript: `client.workflows.enable(id)`
- Python: `client.workflows.enable(id)`
- CLI: `w6w workflows enable <id>`

## workflows.disable

`POST /workflows/{id}/disable`

Disable the workflow's invocability.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `void`

- TypeScript: `client.workflows.disable(id)`
- Python: `client.workflows.disable(id)`
- CLI: `w6w workflows disable <id>`

## workflows.runVersion

`POST /workflows/{id}/versions/{n}/run`

Run one published version of a workflow.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |
| `n` | path | integer | yes |
| `wait` | query | boolean | no |
| `variables` | body | object | no |
| `trigger` | body | string | no |
| `input` | body | object | no |

**Returns:** `RunResult`

- TypeScript: `client.workflows.runVersion(id, n, opts?)`
- Python: `client.workflows.run_version(id, n, wait=False, variables=None, trigger=None, input=None)`
- CLI: `w6w workflows run-version <id> <n> [--wait] [--input <json>]`

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
| `allowUnpublished` | body | boolean | no |

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

## functions.archive

`POST /functions/{id}/archive`

Archive a Function — the required step before deleting it.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `FunctionDefinition`

- TypeScript: `client.functions.archive(id)`
- Python: `client.functions.archive(id)`
- CLI: `w6w functions archive <id>`

## functions.listVersions

`GET /functions/{id}/versions`

List a function's published versions.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `VersionList`

- TypeScript: `client.functions.listVersions(id)`
- Python: `client.functions.list_versions(id)`
- CLI: `w6w functions versions <id>`

## functions.getVersion

`GET /functions/{id}/versions/{n}`

Read one published version of a function, with its definition.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |
| `n` | path | integer | yes |

**Returns:** `VersionDetail`

- TypeScript: `client.functions.getVersion(id, n)`
- Python: `client.functions.get_version(id, n)`
- CLI: `w6w functions version <id> <n>`

## functions.publish

`POST /functions/{id}/publish`

Publish the function's stored definition as a new immutable version.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `PublishResult`

- TypeScript: `client.functions.publish(id)`
- Python: `client.functions.publish(id)`
- CLI: `w6w functions publish <id>`

## functions.revert

`POST /functions/{id}/versions/{n}/revert`

Rewrite the live function from a published version.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |
| `n` | path | integer | yes |

**Returns:** `RevertResult`

- TypeScript: `client.functions.revert(id, n)`
- Python: `client.functions.revert(id, n)`
- CLI: `w6w functions revert <id> <n>`

## functions.enable

`POST /functions/{id}/enable`

Enable the function's invocability.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `void`

- TypeScript: `client.functions.enable(id)`
- Python: `client.functions.enable(id)`
- CLI: `w6w functions enable <id>`

## functions.disable

`POST /functions/{id}/disable`

Disable the function's invocability.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `void`

- TypeScript: `client.functions.disable(id)`
- Python: `client.functions.disable(id)`
- CLI: `w6w functions disable <id>`

## functions.runVersion

`POST /functions/{id}/versions/{n}/invoke`

Run one published version of a Function and return its output.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |
| `n` | path | integer | yes |
| `inputs` | body | object | no |

**Returns:** `unknown`

- TypeScript: `client.functions.runVersion(id, n, opts?)`
- Python: `client.functions.run_version(id, n, payload=None)`
- CLI: `w6w functions run-version <id> <n> [--payload <json>]`

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

## team.members.list

`GET /me/account/members`

List the caller's account team: every active member and their role.

**Returns:** `TeamMember[]`

- TypeScript: `client.team.members()`
- Python: `client.team.members()`
- CLI: `w6w team members`

## team.invites.create

`POST /me/account/invites`

Invite someone to the caller's account, or mint an open, shareable invite link.

| Parameter | In | Type | Required |
|---|---|---|---|
| `email` | body | string | no |
| `role` | body | string | no |

**Returns:** `TeamInviteWithLink`

- TypeScript: `client.team.invite(input)`
- Python: `client.team.invite(email=None, role=None)`
- CLI: `w6w team invite [--email <email>] [--role <role>]`

## team.invites.list

`GET /me/account/invites`

List the caller's account's open (pending, unrevoked, unexpired) invites.

**Returns:** `TeamInvite[]`

- TypeScript: `client.team.invites()`
- Python: `client.team.invites()`
- CLI: `w6w team invites`

## team.invites.revoke

`DELETE /me/account/invites/{id}`

Revoke a pending invite before it is redeemed.

| Parameter | In | Type | Required |
|---|---|---|---|
| `id` | path | string | yes |

**Returns:** `void`

- TypeScript: `client.team.revokeInvite(id)`
- Python: `client.team.revoke_invite(id)`
- CLI: `w6w team revoke-invite <id>`

## team.members.updateRole

`PATCH /me/account/members/{userId}`

Change a team member's role.

| Parameter | In | Type | Required |
|---|---|---|---|
| `userId` | path | string | yes |
| `role` | body | string | yes |

**Returns:** `TeamMember`

- TypeScript: `client.team.setRole(userId, role)`
- Python: `client.team.set_role(user_id, role)`
- CLI: `w6w team set-role <userId> --role <role>`

## team.members.remove

`DELETE /me/account/members/{userId}`

Remove a member from the caller's account.

| Parameter | In | Type | Required |
|---|---|---|---|
| `userId` | path | string | yes |

**Returns:** `void`

- TypeScript: `client.team.removeMember(userId)`
- Python: `client.team.remove_member(user_id)`
- CLI: `w6w team remove-member <userId>`

## apps.byIds

`GET /apps`

Resolve a set of app ids to their catalog summaries.

| Parameter | In | Type | Required |
|---|---|---|---|
| `ids` | query | string | yes |

**Returns:** `AppSummary[]`

- TypeScript: `client.apps.byIds(ids, opts?)`
- Python: `client.apps.by_ids(ids)`
- CLI: `w6w apps by-ids <ids>`

## dashboard.stats

`GET /dashboard/stats`

Account-scoped dashboard rollup over the run ledger.

| Parameter | In | Type | Required |
|---|---|---|---|
| `from` | query | string | no |
| `to` | query | string | no |
| `bucket` | query | string | no |

**Returns:** `DashboardStats`

- TypeScript: `client.dashboard.stats(opts?)`
- Python: `client.dashboard.stats(from_=None, to=None, bucket=None)`
- CLI: `w6w dashboard stats [--from <iso>] [--to <iso>] [--bucket day|week]`

## projects.list

`GET /projects`

List the account's active projects.

**Returns:** `Project[]`

- TypeScript: `client.projects.list(opts?)`
- Python: `client.projects.list()`
- CLI: `w6w projects list`

## reliability.list

`GET /reliability/services`

Reliability board for a project and an explicit set of apps.

| Parameter | In | Type | Required |
|---|---|---|---|
| `project` | query | string | yes |
| `apps` | query | string | yes |
| `days` | query | string | no |
| `limit` | query | string | no |

**Returns:** `ReliabilityServices`

- TypeScript: `client.reliability.list(project, appIds, opts?)`
- Python: `client.reliability.list(project, app_ids, days=None, limit=None)`
- CLI: `w6w reliability list --project <id> --apps <ids> [--days <n>] [--limit <n>]`

## reliability.members

`GET /reliability/services/members`

List the app ids a project's calls touch.

| Parameter | In | Type | Required |
|---|---|---|---|
| `project` | query | string | yes |
| `days` | query | string | no |

**Returns:** `ReliabilityServiceMembers`

- TypeScript: `client.reliability.members(project, opts?)`
- Python: `client.reliability.members(project, days=None)`
- CLI: `w6w reliability members --project <id> [--days <n>]`

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
