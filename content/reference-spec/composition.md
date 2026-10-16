---
key: "composition"
title: "Composition"
section: "reference-spec"
description: "How one call becomes a reusable operation, an entry point or a graph: Functions, Endpoints, Workflows, node types and triggers."
summary: "How one call becomes a reusable operation, an entry point or a graph: Functions, Endpoints, Workflows, node types and triggers."
format: "markdown"
shared: true
order: 10
position: 9
sourceRepo: "w6w-io/w6w-core"
sourcePath: "docs/composition.md"
sourceSha: "15e670e27219406635bd34a21f015b2cc90665b4"
sourceRefSha: "1d2b8d07bacd84694e7d355cde99cda0d726d888"
sourceUrl: "https://github.com/w6w-io/w6w-core/blob/1d2b8d07bacd84694e7d355cde99cda0d726d888/docs/composition.md"
syncedAt: "2026-10-07T12:52:16Z"
---


# Composition

How one call becomes a reusable operation, an entry point or a graph: Functions, Endpoints, Workflows, node types and triggers. Each page below is one RFC of the w6w specification.

- [Function](/reference-spec/composition/function/)
- [Endpoint](/reference-spec/composition/endpoint/)
- [Workflow](/reference-spec/composition/workflow/)
- [Node Types](/reference-spec/composition/node-types/)
- [Trigger](/reference-spec/composition/trigger/)

## Fan-out and merge

A step can have more than one outgoing edge. `fanOut` on the step says how those branches run:

- `"sequential"` (the default) — branches run one after another, in plan order.
- `"parallel"` — branches run concurrently. The run waits for all of them, and a downstream step with several inbound edges runs once, after every branch has arrived.

Use the `@w6w/control` `merge` step to join branches back into one value. `mode` is `"array"` (the branch outputs in incoming-edge order) or `"object"` (outputs shallow-merged, the later edge wins). Optional `entries` (`{ key?, value }`) pick exactly what goes in; without `entries`, `merge` behaves as `aggregate`. If an entry's `value` is a single reference, its type is preserved rather than turned into a string. An entry (its `key` or `value`) that reads a vault secret is refused, and the merge step fails with a parameter error, because merge output is stored with the run.

```json
{
  "steps": [
    { "id": "start", "uses": { "app": "@w6w/trigger", "action": "trigger" }, "fanOut": "parallel" },
    { "id": "a", "uses": { "app": "crm", "action": "getUser", "connection": "conn_crm" } },
    { "id": "b", "uses": { "app": "billing", "action": "getPlan", "connection": "conn_bill" } },
    {
      "id": "join",
      "uses": { "app": "@w6w/control", "action": "merge" },
      "with": {
        "mode": "object",
        "entries": [
          { "key": "user", "value": { "$": "steps.a.output" } },
          { "key": "plan", "value": { "$": "steps.b.output" } }
        ]
      }
    }
  ],
  "edges": [
    { "from": "start", "to": "a" }, { "from": "start", "to": "b" },
    { "from": "a", "to": "join" }, { "from": "b", "to": "join" }
  ]
}
```

See the Workflow and Engine RFC amendments of 2026-10-07 for the exact semantics.
