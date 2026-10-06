---
key: "overview"
title: "Self-hosting overview"
section: "self-hosting"
description: "What self-hosting w6w means, what you need to run it, and where each part of the operator guide lives."
summary: null
format: "markdown"
shared: true
order: 0
position: 0
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/self-hosting/overview.md"
sourceSha: "0a979e8eec44b5d0775e78dad539fd7a695470ee"
sourceRefSha: "1eee1ca1c273fcccc91988c49213335e02b22b4e"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/1eee1ca1c273fcccc91988c49213335e02b22b4e/docs/self-hosting/overview.md"
syncedAt: "2026-10-06T21:23:31Z"
---


# Self-hosting overview

Self-hosting means running the w6w server, its Postgres database and (optionally) Studio on
infrastructure you control. You get the same API, the same apps and the same engine as the hosted
product, with your data and credentials staying inside your own network.

## Requirements

- **Postgres 16.** Tested against 16.x. No extensions are required, so a stock server is enough.
- **A Postgres role that can create objects** for the one-time bootstrap (database, schema and,
  optionally, a dedicated application role). After that the server needs only its connection URL.
- **Docker** to run the image, or Deno 2.8.2 to run from a source checkout.
- **No outbound access is needed to run.** Licensing is handled by the warden, which can work
  offline (see [Air-gapped installs](/self-hosting/air-gap/)). The one other exception is an
  operator identity provider: if you configure operator SSO, each operator sign-in contacts that
  provider.
- **CPU, memory and disk** are sized to your workload; w6w does not pin them.

## Running more than one replica

The server is stateless apart from its database, so several replicas can share one Postgres.

- **Scheduled jobs and migrations are safe by default.** A schedule fires exactly once however many
  replicas run, and replicas booting together against a pending migration take turns.
- **The parallel-execution cap is install-wide.** It is counted in the database, so adding a replica
  never raises it. When the cap is reached you get `429 concurrency_exceeded`, or the run waits in
  the queue.
- **Give every replica a stable, unique `REPLICA_ID`.** Without one, each restart registers as a new
  node and leaves a `gone` entry behind.
- **Triggers are at-least-once.** A trigger event stuck mid-dispatch is re-queued after 10 minutes,
  so handlers should be idempotent.
- **Rate limits are shared** across replicas through Postgres.
- **Give containers a stop timeout above 5 seconds** so the usage meter can flush on shutdown.

### Nodes

Every running process registers itself as a **node**, heartbeats every 10 seconds and shows as
`live` (seen within 30 s), `stale` (within 10 minutes) or `gone`. See the roster in Studio under
**Settings → Installation → Nodes**, or call `GET /nodes` with an operator token (`?include=gone`
shows departed nodes).

Each node reports its CPU count and cgroup CPU limit, memory, load, free disk by role, and any GPUs
it finds. Inside a container the CPU count is the host's, so size `RUN_CONCURRENCY_PER_REPLICA`
against the node's CPU limit instead. GPUs are inventory only: w6w does not run work on them.

Set `W6W_NODE_LABELS` (for example `gpu,zone:lab-2`) to label a node. A workflow's `x-w6w-placement`
annotation names labels, and its run is claimed only by a node carrying all of them; until one is
live, the run reports `waiting_for_capacity`.

To run execution nodes with no database access, see [Hub and spokes](/self-hosting/hub-spokes/).

## Retention

The server prunes its own history hourly, one replica at a time. The window is your licence's
retention setting when it has one, otherwise `W6W_RETENTION_DAYS_FLOOR` (default 30 days; a value
that is not a whole number of days, 1 or more, refuses to boot).

- **After the bodies window**, request and response bodies and run-log detail are cleared.
- **After the metadata window**, finished runs, API calls, run logs, invocations and usage events
  are deleted. Queued and running runs are never touched.
- **Processed trigger events** are deleted after 7 days.
- **Audit-log entries** are kept at least 90 days on installs licensed with the governance bundle.

`GET /installation` reports the policy and the last run, and Studio shows the same under **Settings
→ Installation**.

## Metrics

`GET /metrics` serves Prometheus metrics on the API port while `W6W_METRICS_ENABLED` is on (the
default). Set it to `false` and the route disappears.

A scrape is allowed from an address in `W6W_METRICS_ALLOW_CIDRS` (default: loopback only) when the
request carries no `X-Forwarded-For` or `Forwarded` header, or with an operator bearer token.
Anything else gets one uniform `403`. So the supported shape is a scraper that reaches the server
directly. Widen the allow-list only when the server is not behind something that rewrites client
addresses (`docker run -p`, a Kubernetes Service): there every client looks private and `/metrics`
would be exposed.

The compose bundle already sets this up for its internal network, blocks `/metrics` at its proxy,
and offers an optional `monitoring` profile (Prometheus plus Grafana on loopback only).

Families exposed: `w6w_run_queue_depth`, `w6w_runs_running_by_tenant`, `w6w_sync_in_flight`,
`w6w_admission_refusals_total`, `w6w_http_request_duration_seconds`, `w6w_licence_state`,
`w6w_usage_report_last_sent_age_seconds` and `w6w_nodes`.

## Usage reporting

The warden collects each host's admitted executions, peak parallel count and refusals, and reports
them to your vendor. The server itself sends nothing to the vendor. The local usage ledger and API
call log stay available on your install. On an air-gapped install you hand the reports over as a
file (see [Air-gapped installs](/self-hosting/air-gap/)).

## Where to go next

| Page                                                       | What it covers                                                                      |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [Install](/self-hosting/install/)                          | Image, database bootstrap, your own Postgres, Studio, TLS, catalog, SSO, activation |
| [Configuration reference](/self-hosting/config-reference/) | Every environment variable                                                          |
| [Upgrade](/self-hosting/upgrade/)                          | Moving to a new version and rolling back                                            |
| [Backup and restore](/self-hosting/backup/)                | Backups, restores and credential-key rotation                                       |
| [Air-gapped installs](/self-hosting/air-gap/)              | Licensing with no outbound access                                                   |
| [Hub and spokes](/self-hosting/hub-spokes/)                | Execution nodes with no database access                                             |
| [Troubleshooting](/self-hosting/troubleshooting/)          | Refusals and errors, and what to do                                                 |

For the shortest path to a running instance, see the
[self-host quickstart](/get-started/self-host-quickstart/).
