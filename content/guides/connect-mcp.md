---
key: "connect-mcp"
title: "Connect an MCP client"
section: "guides"
description: "Point Claude Code, Cursor or VS Code at your w6w account through the Model Context Protocol, and let a model run your Functions, Workflows and app actions."
summary: null
format: "markdown"
shared: true
order: 20
position: 10
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/guides/connect-mcp.md"
sourceSha: "b17ff025c7f647cd2c7e2b552ca14d2bec2139d6"
sourceRefSha: "1eee1ca1c273fcccc91988c49213335e02b22b4e"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/1eee1ca1c273fcccc91988c49213335e02b22b4e/docs/guides/connect-mcp.md"
syncedAt: "2026-10-06T21:36:52Z"
---


# Connect an MCP client

**Applies to:** MCP — any client that speaks the Model Context Protocol over HTTP (Claude Code, Cursor, VS Code, and others).

w6w answers as an MCP server at your own host. A model connected to it can find what your account
can run, run it, follow a Workflow to the end and check an API's health — with the same token and
the same permissions you use everywhere else.

There are two endpoints. Pick one:

| Endpoint | Gives the model |
|---|---|
| `https://<your-host>/mcp` | Seven **discovery and run** tools, plus one tool for each Function, Workflow and Endpoint you have published as a tool. |
| `https://<your-host>/mcp/console` | Everything above, plus five **console** tools that can read and change anything in your account's API. |

Start with `/mcp`. Use `/mcp/console` when you want a model to manage the account itself, not just
run what is already in it.

## 1. Get a token

Studio → **Tokens** → **New token**. Treat it like a password: read it from an environment
variable and never paste it into a config file.

```bash
export W6W_TOKEN=<your-token>
```

## 2. Point your client at it

`<your-host>` is the same origin as the `W6W_BASE_URL` you use for the SDK and CLI.

### Claude Code

Add a `.mcp.json` file at your project root. Claude Code expands `${VAR}` from your shell, so the
token never lands in the file:

```json
{
  "mcpServers": {
    "w6w": {
      "type": "http",
      "url": "https://<your-host>/mcp",
      "headers": {
        "Authorization": "Bearer ${W6W_TOKEN}"
      }
    }
  }
}
```

Or register it from the command line:

```bash
claude mcp add --transport http w6w https://<your-host>/mcp \
  --header "Authorization: Bearer $W6W_TOKEN"
```

### Cursor

Add the same shape to `.cursor/mcp.json` (this project) or `~/.cursor/mcp.json` (every project):

```json
{
  "mcpServers": {
    "w6w": {
      "url": "https://<your-host>/mcp",
      "headers": {
        "Authorization": "Bearer ${W6W_TOKEN}"
      }
    }
  }
}
```

### VS Code

Add `.vscode/mcp.json` to your workspace:

```json
{
  "servers": {
    "w6w": {
      "type": "http",
      "url": "https://<your-host>/mcp",
      "headers": {
        "Authorization": "Bearer ${input:w6w_token}"
      }
    }
  },
  "inputs": [
    {
      "id": "w6w_token",
      "type": "promptString",
      "description": "w6w API token (Studio → Tokens)",
      "password": true
    }
  ]
}
```

To use the console endpoint, change the URL to `https://<your-host>/mcp/console`. You can register
both under different names.

## 3. What the model gets

### Discovery and run — on `/mcp` and `/mcp/console`

| Tool | Does | Hints |
|---|---|---|
| `w6w_search_capabilities` | Finds what you can run, by describing the job in words. | read-only |
| `w6w_list_apps` | Lists apps in the catalogue, and which ones you have connected. | read-only |
| `w6w_describe` | Shows the exact inputs and outputs of an app, action, Function, Workflow or Endpoint. | read-only |
| `w6w_connect_app` | Starts connecting an app and hands back a one-time link for you to finish in a browser. | writes |
| `w6w_invoke` | Runs a Function, Workflow, Endpoint or app action — the same call as [`POST /run`](/guides/call-any-api/). | writes, may be destructive |
| `w6w_run_status` | Reports how a Workflow run is going. | read-only |
| `w6w_check_health` | Reports whether an app or connection is working, and how it has been doing. | read-only |

A model never sees a credential. To connect an app it calls `w6w_connect_app`, which returns a link
for **you** to open; the secret stays in your browser and w6w.

A Workflow is not finished when `w6w_invoke` returns. It answers `status: "queued"` — *started*, not
*done* — and the model has to call `w6w_run_status` to find out how it went.

### Console tools — on `/mcp/console` only

| Tool | Does | Hints |
|---|---|---|
| `w6w_api_search` | Finds the right route for a task. | read-only |
| `w6w_api_get` | Reads a resource, one or a list. | read-only, idempotent |
| `w6w_api_write` | Creates or updates a resource. | writes, not destructive |
| `w6w_api_delete` | Deletes, archives, cancels or otherwise destroys a resource. | destructive |
| `w6w_guide` | Returns a worked example for a topic. | read-only |

Routes that would hand a secret to the model — the vault, tokens, connection credentials and
account administration — are left out of the console for every tool. A call that would touch one is
refused before it reaches your account. Every tool, with its arguments, is in
[MCP tools](/reference-api/mcp/).

### Auto-approve

Most clients let you auto-approve tools one by one. Approve only the read-only ones:
`w6w_search_capabilities`, `w6w_list_apps`, `w6w_describe`, `w6w_run_status`, `w6w_check_health`
and, on the console, `w6w_api_search`, `w6w_api_get` and `w6w_guide`. Leave `w6w_invoke`,
`w6w_connect_app`, `w6w_api_write` and `w6w_api_delete` on manual approval — they run real work and
change real data in your account.

## A worked example

Before you trust a client, check the connection by hand. The endpoint is plain JSON-RPC over HTTP,
so `curl` is enough.

List what the model will see:

```bash
curl -sS "$W6W_BASE_URL/mcp" \
  -H "Authorization: Bearer $W6W_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }'
```

Then call a tool — here, running a Function by its ID:

```bash
curl -sS "$W6W_BASE_URL/mcp" \
  -H "Authorization: Bearer $W6W_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "w6w_invoke",
      "arguments": { "ref": "fn_01H…", "params": { "email": "ada@example.com" } }
    }
  }'
```

The answer is a JSON-RPC result whose `content` holds the tool's reply as text. The `ref` is one of
`fn_<id>`, `wf_<id>`, `ep_<id>`, or an action. Keys and aliases are not refs — use the ID. Pass an action as `conn_<id>#<action-key>`,
or as `app:<app-id>#<action-key>` to let w6w choose among your connections of that app.

Each server is stateless: there is no session to open or close, and every request carries its own
token.

If you would rather make the same call from code than from a model, use
[`client.run`](/guides/call-any-api/) — the SDK and CLI do not need MCP.

## When it goes wrong

| You see | It means | Do this |
|---|---|---|
| `401` with `WWW-Authenticate: Bearer error="invalid_token"` | The token is missing, wrong or expired. The body names a `nextAction`. | Mint a new token in Studio and update the header. |
| `405` | You sent `GET`, `DELETE` or another verb. The endpoint accepts `POST` only. | Use `POST`. A client that probes with `GET` first can ignore this. |
| A tool result with `isError: true` | The call reached w6w and failed. The text carries a `code` and a `nextAction` hint. | Read the hint. It says whether to retry, fix an argument, or connect the app first. |
| `unknown_function`, `unknown_workflow`, `unknown_endpoint`, `unknown_connection` | Nothing by that name in your account. | Run `w6w_search_capabilities` or `w6w_describe` again and use a ref it returned. |
| `invalid_ref` | The `ref` is not one of the five forms. | Use `fn_…`, `wf_…`, `ep_…`, `conn_…#<action>` or `app:<id>#<action>`. |
| `no_connection`, `connection_pending`, `connection_revoked`, `connection_broken` | The app has no working connection. | Call `w6w_connect_app`, finish the link in your browser, then retry once. |
| `ambiguous_connection` | You have several connections to the app. | Retry with one of the refs the error lists. |
| `app_not_entitled` | Your account is not allowed to use that app. | Ask your operator to enable it. Do not retry. |
| `forbidden_internal_app` | The ref names one of w6w's built-in apps, which a tool cannot run. | Stop. Do not look for a workaround through another tool. |

A failed call carries an `invocationId`, so you can look it up afterwards — see
[Invocations](/guides/invocations/).

## Next

- [MCP tools](/reference-api/mcp/) — every tool, its arguments and its results.
- [Call any API](/guides/call-any-api/) — the same run, over HTTP, the SDK or the CLI.
- [API health](/guides/api-health/) — what `w6w_check_health` reports.
