---
title: "Connect an MCP client"
description: "Point Claude Code, Cursor, or VS Code at your w6w account through the Model Context Protocol — one console surface for your whole API, not one tool per endpoint."
---

# Connect an MCP client

w6w exposes the same account you call through the SDK/CLI as an MCP server:
`https://<your-host>/mcp/console`, authenticated the same way as everywhere else in w6w — a
Bearer token in the `Authorization` header. Point any MCP-capable client at it and the model gets
five tools for your account's whole API surface.

## 1. Get a token

Studio → **Tokens** → **New token**. Treat it like a password — read it from an environment
variable, never paste it into a config file.

```bash
export W6W_TOKEN=tsec_…
```

## 2. Point your client at it

The endpoint is `https://<your-host>/mcp/console` — `<your-host>` is the same origin as the
`W6W_BASE_URL` from the [Quickstart](/quickstart/).

### Claude Code

Add a `.mcp.json` file at your project root. Claude Code expands `${VAR}` from your shell
environment, so the token never lands in the file:

```json
{
  "mcpServers": {
    "w6w-console": {
      "type": "http",
      "url": "https://<your-host>/mcp/console",
      "headers": {
        "Authorization": "Bearer ${W6W_TOKEN}"
      }
    }
  }
}
```

Or register it from the CLI instead of hand-editing JSON:

```bash
claude mcp add --transport http w6w-console https://<your-host>/mcp/console \
  --header "Authorization: Bearer $W6W_TOKEN"
```

### Cursor

Add the same shape to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "w6w-console": {
      "url": "https://<your-host>/mcp/console",
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
    "w6w-console": {
      "type": "http",
      "url": "https://<your-host>/mcp/console",
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

## 3. What the model gets

Five tools, every one scoped to your account:

| Tool | Does | Annotations |
|---|---|---|
| `w6w_api_search` | Finds the right route for a task | read-only |
| `w6w_api_get` | Reads a resource (list or single) | read-only, idempotent |
| `w6w_api_write` | Creates or updates a resource | not read-only, not destructive |
| `w6w_api_delete` | Deletes, archives, cancels, or otherwise destroys a resource | destructive |
| `w6w_guide` | Returns a worked example for a topic (workflows, functions, endpoints, expressions, performance) | read-only |

A number of routes — vault, tokens, connection credentials, tenant/account admin, and anything
that would hand a secret to the model — are excluded from the console entirely, for every tool.
A call that would touch one of those is refused before it reaches your account's API.

### Auto-approve

If your client supports per-tool auto-approval, approve **only** `w6w_api_get`,
`w6w_api_search`, and `w6w_guide` — the three read-only tools. Leave `w6w_api_write` and
`w6w_api_delete` on manual approval; they create, change, and destroy real data in your account.

## Where to next

- **[Quickstart](/quickstart/)** — the same account over the SDK/CLI, if you'd rather call it
  directly than through a model.
- **[Browse the apps](https://w6w.io/apps)** — what each connected app's actions look like, so you know what a
  tool call will actually touch.
