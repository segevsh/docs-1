---
title: "Core concepts"
description: "The nouns used across w6w: API, App, Action, Connection, Function, Endpoint, Workflow and tenancy."
section: "get-started"
order: 30
---

# Core concepts

- **API** — the thing w6w manages: a service your product calls, whether you own it or buy it.
- **App** — a packaged integration for one API, installed into the catalog.
- **Action** — a single operation an App exposes (for example "send an email").
- **Connection** — the stored, authenticated link between a tenant and an App; how one authenticates.
- **Function** — a vendor-abstracted single operation that sits above an App Action, so the
  underlying vendor can change without changing callers.
- **Endpoint** — a callable entry point you expose, backed by a Function, Action or Workflow.
- **Workflow** — a graph of steps that composes several calls when one isn't enough.
- **Tenancy** — every resource is owned by a tenant (and, below it, an account and project);
  variables, secrets, documents and connections are scoped accordingly.

The authoritative definitions live in the [specification](/reference-spec/).
