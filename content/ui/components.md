---
key: "components"
title: "Components"
section: "ui"
description: "Find the @w6w/ui component you need, which entrypoint exports it, and whether it needs the API provider."
format: "markdown"
shared: true
order: 30
position: 3
sourceRepo: "w6w-io/w6w-ui"
sourcePath: "docs/components/index.md"
sourceSha: "41070e7dbbcf337c786cbcfc73cf52c668bd5a13"
sourceRefSha: "0bfbe742d226ecdff034435a37de88f388e96af0"
sourceUrl: "https://github.com/w6w-io/w6w-ui/blob/0bfbe742d226ecdff034435a37de88f388e96af0/docs/components/index.md"
syncedAt: "2026-10-06T03:35:49Z"
---


# Components

Every component `@w6w/ui` exports, grouped by what it's for. Each group page lists the key props
and a short example. Unless a page says otherwise, import from `@w6w/ui` and load
`@w6w/ui/styles.css` once.

Most components are **props in, callbacks out**: they never fetch, so you can feed them from
`@w6w/react`, your own client or fixtures. The five marked "provider" below read the API client
from [`W6WUIProvider`](/ui/components/providers/) and call your W6W server themselves.

| Group | Components |
| --- | --- |
| [Providers and the API client](/ui/components/providers/) | `W6WUIProvider`, `createW6WApi`, `useW6WApi`, `ExpressionOptionsProvider` |
| [Buttons and icons](/ui/components/buttons/) | `IconButton`, `Icon`, `EditButton`, `DeleteButton` |
| [Data display](/ui/components/data-display/) | `AppIcon`, `ListItem`, `Copyable`, `CopyableText` |
| [Forms](/ui/components/forms/) | `AppPicker` (provider), `ActionTestForm` (provider), `ParamsForm`, `PropertyEntryForm`, `AuthFieldsForm`, `ExpressionInput`, `NodeConfigForm`, `RetryPolicyFields` |
| [Editors](/ui/components/editors/) | `CodeBlock`, `CodeEditor`, `JsonEditor`, `YamlEditor` |
| [Workflow canvas](/ui/components/flow-editor/) | `WorkflowFlowEditor` (provider, from `@w6w/ui/flow`) |
| [Modals](/ui/components/modals/) | `Modal`, `ConfirmModal`, `AddConnectionModal` (provider), `StepBuilderModal` (provider) |
| [Status and health](/ui/components/status/) | `HealthStatusPill`, `StepStatusPill`, `UptimeStrip`, `HistoryTimeline`, `RepoSyncIndicator` |
| [Executions](/ui/components/executions/) | `ExecutionList`, `ExecutionFilters`, `ExecutionStats`, `ExecutionDetail`, `ExecutionLogPanel`, `ApiCallsPanel` |
| [Server resources](/ui/components/server-resources/) | `ServerResourcesCard`, `ServerResourcesCardSmall`, `ServerResourcesRail`, `ServerResourcesBadge` |

## What you compose yourself

There's no ready-made table of workflows, functions or connections. Build those lists from your own
components (or `ListItem`) with data from `@w6w/react` or your own client. `@w6w/ui` supplies the
interactive pieces around them: the pickers, modals, forms, the canvas and the run views.

## Types and helpers

The root entrypoint also exports the wire types these components take, so you can type your own
data: `AppSummary`, `ActionDef`, `ActionParam`, `AuthDef`, `AuthField`, `ConnectionSummary`,
`ApiCallRecord`, `FunctionSummary`, `FunctionDetail`, `WorkflowSummary`, `WorkflowDetail`,
`TriggerSummary`, `SubscriptionSummary`, `ThemeMode` (`"light" | "dark"`), and the expression
envelopes `ExprValue`, `ExprPart`, `ExprPartKind` and `SecretValue`, with the type guards
`isExprValue(v)` and `isSecretValue(v)`.

## Where to next

- **[Overview](/ui/overview/)**: install, stylesheet and provider setup.
- **[Providers and the API client](/ui/components/providers/)**: start here before using a
  provider component.
