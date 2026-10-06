---
key: "mcp"
title: "MCP tools"
section: "reference-api"
description: "Every tool the w6w MCP server offers: what it does, its arguments, what it returns, and whether it reads or writes."
summary: null
format: "markdown"
shared: true
order: 10
position: 16
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/reference/mcp.md"
sourceSha: "a9d739b283a8bbf9afbf32b368ac2000a6401810"
sourceRefSha: "1eee1ca1c273fcccc91988c49213335e02b22b4e"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/1eee1ca1c273fcccc91988c49213335e02b22b4e/docs/reference/mcp.md"
syncedAt: "2026-10-06T21:32:49Z"
---


# MCP tools

**Applies to:** MCP — any client that speaks the Model Context Protocol over HTTP. To register the
server in Claude Code, Cursor or VS Code, start with [Connect an MCP client](/guides/connect-mcp/).

This page lists each tool the server offers, in the order a model usually reaches for them: find,
inspect, connect, run, follow up, check health. For the same operations over plain HTTP, see
[Call any API](/guides/call-any-api/) and the [HTTP API](/reference-api/http-api/) reference.

| Tool | Does | Reads or writes | On |
|---|---|---|---|
| `w6w_search_capabilities` | Finds what you can run, with its health | Read-only | `/mcp`, `/mcp/console` |
| `w6w_list_apps` | Lists your apps and your connection to each | Read-only | `/mcp`, `/mcp/console` |
| `w6w_describe` | Shows the inputs and outputs of one target | Read-only | `/mcp`, `/mcp/console` |
| `w6w_connect_app` | Hands back a link to connect an app | Writes | `/mcp`, `/mcp/console` |
| `w6w_invoke` | Runs a Function, Workflow, Endpoint or app action | Writes, may be destructive | `/mcp`, `/mcp/console` |
| `w6w_run_status` | Reports how a Workflow run is going | Read-only | `/mcp`, `/mcp/console` |
| `w6w_check_health` | Reports whether a target is working | Read-only | `/mcp`, `/mcp/console` |
| `w6w_api_search` | Finds an API route for a task | Read-only | `/mcp/console` |
| `w6w_api_get` | Reads through a `GET` route | Read-only | `/mcp/console` |
| `w6w_api_write` | Creates or updates through a route | Writes, not destructive | `/mcp/console` |
| `w6w_api_delete` | Deletes, archives or cancels through a route | Destructive | `/mcp/console` |
| `w6w_guide` | Returns a worked example for a topic | Read-only | `/mcp/console` |

"Reads or writes" is the tool's own annotation: the `readOnlyHint` and `destructiveHint` your client
uses to decide what to auto-approve. A client may ignore them. Treat them as a hint about the tool,
not as a limit on what the token behind it can do.

## w6w — the server

`w6w` is the name the server reports to your client when it connects. It is the name of the server,
not a tool, so you will not find it in a tool list. It is also the name to use for the server in your
client's own config.

- **Endpoints.** `POST https://<your-host>/mcp` offers the seven discovery and run tools and the
  generated tools below. `POST https://<your-host>/mcp/console` offers all of those plus the five
  console tools.
- **POST only.** Any other verb gets `405`.
- **No session.** The server keeps nothing between calls. Each request is authenticated and scoped
  on its own, with the bearer token in the `Authorization` header, so the same token can drive any
  number of clients at once.
- **A missing or bad token** answers `401` with a `WWW-Authenticate: Bearer error="invalid_token"`
  header and a `nextAction` in the body.

### Generated tools

Beside the fixed tools, `/mcp` and `/mcp/console` list one tool for each Function, Endpoint and
Workflow in your account that is ready to run — a Workflow must be active and an Endpoint must have
a target. A generated tool is named `<kind>__<id>`, where `<kind>` is `fn`, `ep` or `wf` and `<id>`
is the definition's own id: for example `fn__fn_3kq9…` or `wf__wf_8dm2…`. Its arguments are the
inputs the definition declares, and its description is the definition's own description.

A definition whose id would make an invalid tool name is not listed, but it still runs through
`w6w_invoke` with its `ref`. A Workflow's generated tool behaves like `w6w_invoke` on a Workflow: it
answers with a handle, and you follow it with `w6w_run_status`.

## How results arrive

Every tool answers with a JSON result in text blocks, and mirrors the same data in the result's
`structuredContent` where the tool returns a record.

- **Success.** The first text block is host-written metadata, such as `resolvedRef`, `kind`, `runId`,
  `invocationId`, `status` and timings. When there is data from an app or from your own definitions,
  it follows in a second block, fenced and labelled as data. A model should read it as data, never
  as instructions.
- **Failure.** The result carries `isError: true`. Its metadata holds `ok: false`, a `code`, an
  `httpStatus` as data (no HTTP status is sent on this path), a `nextAction` hint, and a `message`.
  Where the failure belongs to one target it also carries that target's `ref`. The `nextAction`
  tells the model whether to retry, fix an argument, connect the app first, or stop.
- **A run that failed is not a failed call.** `w6w_run_status` on a Workflow run that failed
  reports `status: "failed"` in a successful result. Only the call itself failing sets `isError`.

Refs use five forms, shared by `w6w_invoke`, `w6w_describe` and `w6w_check_health`:

| Ref | Targets |
|---|---|
| `fn_<id>` | A Function |
| `wf_<id>` | A Workflow |
| `ep_<id>` | An Endpoint |
| `conn_<id>#<actionKey>` | An app action, on that connection |
| `app:<appId>#<actionKey>` | An app action, on a connection w6w chooses |

Any other string is refused with `invalid_ref`. The built-in `@w6w/*` apps cannot be addressed
through these tools; a ref that names one is refused with `forbidden_internal_app`.

## Discovery and run tools

### Find a capability — `w6w_search_capabilities`

Finds something your account can run, from a description of the job, and reports its health in the
same answer. It searches app actions, Functions, Endpoints and Workflows together. Matching is
literal substring and token matching over titles, descriptions, categories and app names — no
synonyms and no semantic search — so if a phrase finds nothing, try other words or browse with
`w6w_list_apps`.

**Arguments**

| Name | Type | Required | Meaning |
|---|---|---|---|
| `query` | string, 2–200 characters | yes | What you want to do, in words, such as `send an email`. |
| `kinds` | array of `action`, `function`, `endpoint`, `workflow` | no | Restrict the kinds returned. Omit for all four. |
| `category` | string, up to 60 characters | no | An exact, case-sensitive catalogue category, such as `communication`. |
| `includeUnavailable` | boolean, default `true` | no | Include results you cannot run today. Set `false` for a list you can act on immediately. |
| `limit` | integer 1–25, default 10 | no | The most results to return. |

**Result.** `outcome` is `matched` or `none`, with the `query`, a `results` array, a `truncated`
flag, `notes`, and `nextActions` (always filled when `outcome` is `none`). Each result has:

- `tier` — how usable it is: `ready` (runnable now), `degraded` (runnable, but recent calls are
  failing), `unconnected` (needs a connection first) or `unentitled` (in the catalogue, but your
  account's app policy excludes it).
- `kind`, `ref` when it is directly runnable, `title`, `description`, and the owning `app`
  (`id`, `displayName`).
- `async` — `true` when running it returns a handle rather than a result.
- `annotations` — the target's own read/write hints.
- `connections` — your candidate connections for an app action.
- `nextAction` — the call to make next.
- For a `degraded` result: `health` (state, the calls and errors behind it, and what the vendor's own
  status check reports) and up to three ranked `alternatives`.

**Annotation:** read-only, idempotent. It runs nothing.

### List apps — `w6w_list_apps`

Lists the apps your account may run, with your own connection state for each. The list is the same
for everyone in the account, apart from the connection fields — and apart from any app you imported
under your own user, which only you see. It returns no actions: call `w6w_describe` for those. No
health probe is made, so the health block only says what a probe could use.

**Arguments** (all optional)

| Name | Type | Meaning |
|---|---|---|
| `connected` | boolean | `true`: only apps you already have a connection for. `false`: only apps you have none for. Omit for all. |
| `q` | string, up to 100 characters | Case-insensitive substring match on app id, name or display name. |
| `category` | string | An exact category tag, such as `communication`. |
| `limit` | integer 1–200 | Page size. |
| `cursor` | string | The `nextCursor` of a previous call. |

**Result.** `catalogueGrain`, a `note`, `apps` and `nextCursor` (`null` on the last page). Each app
has `id`, `displayName`, `version`, `description`, `categories`, and:

- `entitlement` — `entitled` (always `true`, because the list is already filtered), `basis`
  (`owner` or `policy`) and `ownerScope` (`global`, `tenant` or `user`).
- `connection` — `state` (`none`, `one` or `multiple`, counted over connections that are usable),
  `count`, `usable`, and `items`, each with the connection's `id`, a ready `refTemplate`,
  `displayName`, `authKey`, `state` (`pending`, `connected`, `needs_refresh`, `broken` or
  `revoked`), `lastTestOk` and `lastTestedAt`. A `lastTestOk` of `null` means never tested, not
  failed.
- `health` — `declaredChecks`, `publicProbeAvailable`, and a `state` that is always `not_evaluated`.
  Call `w6w_check_health` for a verdict.
- `refTemplate` — `app:<id>#<actionKey>`, or `null` when you hold two or more connections to the
  app and must choose one.

Leaving an app off this list does not mean you are denied it, and being on it does not grant
permission: access is decided when you run something.

**Annotation:** read-only, idempotent.

### Describe a target — `w6w_describe`

Returns the declared interface of one target without running it: its parameters, a JSON Schema built
from them, its declared output and its safety hints. Give it one ref. Drop the `#<actionKey>` from
an `app:` or `conn_` ref to get that app's action index instead: every action key with a short
title. That is the call to make when you know the app but not the action.

The schema describes what the target declares. The server does not check your arguments against it.

**Arguments**

| Name | Type | Required | Meaning |
|---|---|---|---|
| `ref` | string | yes | One ref in any of the five forms. |

**Result** for a single target:

- `ref` (as resolved), `kind` (`action`, `function`, `endpoint` or `workflow`) and `async`.
- `app` (`id`, `version`, `owner`) for the two app forms, and `title` and `description`.
- `params` — the declared parameters, with a secret parameter marked `secret: true`.
- `inputSchema` — a JSON Schema for `params`, or `null` when one cannot be built, with
  `schemaOmittedReason` saying why. `schemaChecked` is `false`: nothing checks arguments against it.
- `output` and `outputDeclared`. Output `null` with `outputDeclared: false` means the output is not
  declared, not that it is empty.
- `annotations` — `readOnlyHint`, `destructiveHint` and `idempotentHint`, plus `idempotentDeclared`,
  which tells you whether idempotency was declared or defaulted.
- `connections` — for an app action, your candidate connections, each with a ready `ref`, `authKey`,
  `state`, `lastTestOk` and `lastTestedAt`; otherwise `null`.
- `warnings`.

**Annotation:** read-only, idempotent.

### Connect an app — `w6w_connect_app`

Gets a link that a person opens in a browser to connect an app to the account. It never returns a
credential field. A model must not ask anyone for a key, password or token, and must give the
person `connect.url` exactly as returned.

**Arguments**

| Name | Type | Required | Meaning |
|---|---|---|---|
| `appId` | string | yes | The catalogue app id, such as `io.w6w.slack`. |
| `authKey` | string | no | Which of the app's declared auth methods to connect. Omit if it declares one. |

**Result.** `app` (`id`, `displayName`), `authKey`, `authType`, `status`, `connect`, `guidance`, and
`existing` when you already hold connections to the app. `status` is one of:

| `status` | Meaning |
|---|---|
| `link_issued` | `connect` holds a one-time link: `url`, `origin`, `expiresAt` and `singleUse: true`. Hand `url` to the person. |
| `already_connected` | You already have a working connection; it is listed in `existing`. |
| `unavailable` | The app's sign-in is not set up on this host. `reason` is `host_config_missing`, `requiresHostConfig` names the three missing fields, and `fixableBy` is `operator`. Only an operator can fix it. |
| `no_user_action` | The auth method is provisioned by an operator; nothing for a person to do. |

`connect` is `null` for `unavailable` and `no_user_action`.

**Annotation:** writes, not destructive, not idempotent. Each call issues a fresh single-use link.

### Run a target — `w6w_invoke`

Runs anything your account can run, addressed by one `ref`. It is the MCP form of
[`POST /run`](/guides/call-any-api/).

**Arguments**

| Name | Type | Required | Meaning |
|---|---|---|---|
| `ref` | string | yes | The target, in any of the five ref forms. |
| `params` | object | no | The payload. Never put a credential, token or secret in it. |
| `connection` | string | no | A `conn_…` id. Valid only with an `app:` ref, to choose between several connections. |
| `overrides` | object | no | Extra request detail an action does not declare, merged into the outgoing request. It cannot replace an auth header or change the request's host or path. See [Overrides](/guides/overrides/). |

**Result.** The metadata carries `resolvedRef`, `kind`, `invocationId`, `status`, `startedAt`,
`finishedAt` and `durationMs`. The data follows as `output`.

- A **Function** or **app action** answers with its result in `output`, and `status` says how the
  attempt went. `invocationId` looks the call up later; see [Invocations](/guides/invocations/).
- A **Workflow**, or an Endpoint whose target is a Workflow, answers with a **handle**: a `runId` and
  `status: "queued"`. That means *started*, not *done*. Call `w6w_run_status` with the `runId` to
  learn the outcome.

With an `app:` ref and several usable connections, the call fails with `ambiguous_connection` and
lists the `conn_…` refs to pick from. With none, it fails with `no_connection`, and the model should
call `w6w_connect_app`. The full list of failures is in
[Connect an MCP client](/guides/connect-mcp/#when-it-goes-wrong).

**Annotation:** writes, destructive, not idempotent, open-world. The tool can reach every action in
the catalogue, so it states the worst case.

### `w6w_run_status` — follow a run

Reads the state of one Workflow run — the follow-up to a `w6w_invoke` call that returned
`status: "queued"` and a `runId`. It starts, retries and cancels nothing.

**Arguments**

| Name | Type | Required | Meaning |
|---|---|---|---|
| `runId` | string, starting `run_` | yes | The `runId` from `w6w_invoke`, or from a step output that started a sub-run. |

**Result.**

- `runId`, `ref` (the Workflow), `status` (`queued`, `running`, `succeeded`, `failed` or `canceled`),
  and `terminal`, which is `true` once the run can no longer change.
- `willRetry` — `true` when a worker crashed and the platform is resuming the run from its saved
  progress. Keep polling; do not run it again.
- `attempt`, `startedAt`, `finishedAt`.
- `completedSteps` and `steps` — only the steps that have **finished**. Each has `stepId`, `status`
  (`succeeded`, `failed` or `skipped`), timings, and `output` or `error`. A step running right now is
  not listed, so the last listed step is not necessarily the last step. Step inputs are never
  returned.
- `failedStepId` when a step failed.
- `output` once the run has `succeeded`; `error` when it has not. `stepErrors` lists failures a step
  recorded and carried on from.
- `pollAfterMs` — a polling hint (`null` once terminal) — and `guidance`, a plain-language summary.

A run id that does not exist, or that belongs to another account, answers `unknown_run` with `404`.

**Annotation:** read-only, idempotent.

### Check health — `w6w_check_health`

Reports whether a target is working right now, as two separate signals that are never merged into one
verdict. `yourCalls` is w6w's own measurement of whether your account's calls to the app have been
succeeding. `vendor` is what the app's own public status check reports, when it declares one — a
best-effort read of a third party's page, not a check of your credential.

**Arguments**

| Name | Type | Required | Meaning |
|---|---|---|---|
| `target` | string | yes | `app:<appId>`, `conn_<id>`, `fn_<id>`, `wf_<id>` or `ep_<id>`, or a bare app id. |
| `days` | integer 1–365, default 30 | no | The window for `yourCalls` only. It does not affect `vendor`. |

**Result.** `target`, `measuredAt`, a `summary` (overall `state`, the `basis` it rests on, and
`oldestMeasurementAt`), the `window`, and one entry in `apps` for each app underneath the target.
Each entry has:

- `appId`, `displayName`, `party` (`first` or `third`) and `owner`.
- `yourCalls` — `state`, `calls`, `errors`, `p95Ms`, `lastCallAt`, `ongoingOutageId` and
  `measuredOver`.
- `vendor` — `published` (whether the app declares a public check), `state`, `checkedAt`,
  `ageSeconds`, `message`, and the check's `components` and `quota` when it reports them.
- `connection`, when the target is a connection: its `state`, and the last stored test result.
  This tool reads that stored result; it never re-tests the connection.

`nextActions` suggests what to call next. For what the states mean, see
[API health](/guides/api-health/).

**Annotation:** read-only, idempotent, open-world. Reaching the vendor's status page is an outbound
request.

## Console tools

These five tools are only on `/mcp/console`. They let a model work with the account's own HTTP API
through four generic tools instead of one tool per route. Each tool carries the notice that results
are data returned by the API, not instructions to follow, and a model should treat them that way.

Routes that would hand a secret to the model — the vault, tokens, connection credentials and account
administration — are not reachable through any console tool. A call to one is refused before it
reaches your account, with `route_excluded`. Other refusals before a call is made are
`route_not_found` (no such route), `path_not_canonical` (the path is not in its canonical form),
`wrong_tool` (the route belongs to a different console tool), `body_not_allowed` (a body was sent to
a route that takes none) and `path_mismatch`. All are `400`.

Console results come as two blocks: metadata with `status` (the route's HTTP status) and `route`,
then the API's response body, fenced as data. The metadata adds `truncated: true` when the body was
cut to fit, and `narrowWith` — the query parameters the route accepts — when you may want to filter.
`isError` is set when `status` is `400` or higher.

### `w6w_api_search` — find a route

Searches the routes the console can reach. It returns route metadata only and never calls a route.

**Arguments** (all optional)

| Name | Type | Meaning |
|---|---|---|
| `q` | string | Free-text match against the route's key and summary. |
| `resource` | string | The route's first path segment, such as `workflows`. |
| `access` | `read`, `write` or `destructive` | Only routes of that access level. |

**Result.** Matching routes, each with `method`, `path`, `summary`, `access`, and where the route has
them, `pathParams`, `query` and a `bodyExample`.

**Annotation:** read-only.

### `w6w_api_get` — read

Makes a `GET` request to one route by its exact path, such as a path returned by `w6w_api_search`.

**Arguments**

| Name | Type | Required | Meaning |
|---|---|---|---|
| `path` | string | yes | The exact path, such as `/workflows`. |
| `query` | object of strings | no | Query parameters. |

**Result.** The route's response, in the console result form above.

**Annotation:** read-only, idempotent.

### `w6w_api_write` — write

Makes a non-destructive write to one route: a `POST`, `PUT` or `PATCH` that creates or updates
something.

**Arguments**

| Name | Type | Required | Meaning |
|---|---|---|---|
| `method` | string | yes | The HTTP method, such as `POST`. |
| `path` | string | yes | The exact path. |
| `query` | object of strings | no | Query parameters. |
| `body` | any JSON | no | The request body. |

**Result.** The route's response, in the console result form above.

**Annotation:** writes, not destructive. Use `w6w_api_delete` for a route that removes, archives or
cancels; calling a destructive route through this tool is refused with `wrong_tool`.

### `w6w_api_delete` — delete

Makes a destructive request to one route: a `DELETE`, or an archive-style or cancel-style `POST`.

**Arguments**

| Name | Type | Required | Meaning |
|---|---|---|---|
| `method` | string | yes | The HTTP method, such as `DELETE`. |
| `path` | string | yes | The exact path. |
| `query` | object of strings | no | Query parameters. |
| `body` | any JSON | no | The request body, for routes that take one. |

**Result.** The route's response, in the console result form above.

**Annotation:** destructive. Leave this tool on manual approval.

### `w6w_guide` — get an example

Returns a short, host-written authoring reference for a topic and, where it can, a live example from
your account's own API.

**Arguments**

| Name | Type | Required | Meaning |
|---|---|---|---|
| `topic` | string | yes | One of `workflows`, `functions`, `endpoints`, `expressions` or `performance`. |

**Result.** The `topic` and the `guide` text, with one of three kinds:

- `example` — also returns the `routeKey` and `status` of the request it made, and the response
  `body`.
- `none` — there was no example to fetch, and a `note` says so.
- `error` — the call failed. An unsupported topic is refused with `invalid_argument` and `400`.

**Annotation:** read-only.
