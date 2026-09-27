---
title: "Self-host configuration reference"
description: "Every environment variable config.ts declares, generated from the host's own config module, plus the required variables read elsewhere that are hand-documented on this page."
---

# Self-host configuration reference

Generated from the host's own configuration module — the generator refuses to write a page that disagrees with what `config.ts` currently reads. See [Install](/self-hosting/install/) for the compose bundle that sets the handful of these you must supply yourself, and [Troubleshooting](/self-hosting/troubleshooting/) for what happens when one of these is wrong.

## Operator login and sessions

| Variable | Default | What it does |
| --- | --- | --- |
| `AUTH_USERNAME` | `admin` | The operator login used to sign in and manage the app registry. |
| `AUTH_PASSWORD` | `admin` | The operator's password. Outside development mode the server refuses to start if this is unset or left at the default. |
| `JWT_SECRET` | a dev default — never use it in production | Signs the session tokens this host mints. Must differ from `OPS_JWT_SECRET`, or the server refuses to start. |
| `AUTH_TOKEN_TTL_SEC` | 86400 | How long a signed-in session stays valid. |
| `AUTH_EXCHANGE_TTL_SEC` | 900 | Lifetime of a token minted for one of your own end users through the token-exchange endpoint. |
| `AUTH_IMPERSONATION_TTL_SEC` | same as AUTH_EXCHANGE_TTL_SEC | Lifetime of an operator impersonation session. |
| `TENANT_SECRET_ROTATION_OVERLAP_SEC` | 86400 | How long a just-rotated tenant client secret keeps verifying, so an in-flight rotation never breaks a caller mid-request. |
| `SIGNUP_MODE` | invite-only | Whether an uninvited visitor can self-serve sign up. Only the exact value `open` allows it; anything else, including unset, keeps signup invite-only. |
| `SIGNUP_TENANT` | `w6w` | Which tenant a fresh signup, or a request that names none, lands in. |
| `INVITE_TTL_SEC` | 86400 | How long an account invite stays valid. |
| `OPS_JWT_SECRET` | unset | Signs a separate machine-to-machine edge this host does not mount on a self-host install. Leave it unset; it is still checked at boot for a collision with `JWT_SECRET`. |
| `W6W_DEV_MODE` | off | A local-development escape hatch: while on, boot safety no longer refuses to start on a default/insecure `AUTH_PASSWORD`. Leave it unset (off) on any real deployment. |

## Process and storage

| Variable | Default | What it does |
| --- | --- | --- |
| `DATABASE_URL` | none — required | The Postgres connection string this host connects with. Boot refuses immediately if it is unset. |
| `API_PORT` | 8787 | The port the server listens on. |
| `APPS_STORAGE_DIR` | `./storage/apps` | Where app and asset files are read from. A published self-host image points this at its own baked-in app catalog. |

## Public URLs and Studio

| Variable | Default | What it does |
| --- | --- | --- |
| `PUBLIC_BASE_URL` | the local API address | The public URL at which the API's root is reachable, including any proxy path prefix (the self-host bundle sets `https://<domain>/api`). An exposed Endpoint's callable URL is rendered against it, so set this to your real origin or operators will see `localhost` URLs. |
| `WEBHOOK_BASE_URL` | the local API address | URL template inbound webhook triggers are built from, with an `{id}` placeholder. |
| `STUDIO_BASE_URL` | `http://localhost:5173` | Studio's own origin, used to build links such as invite redemption. |
| `SERVE_STUDIO` | off | Serve a built Studio bundle from this same process at `/`, instead of running Studio as its own deployment. |
| `STUDIO_DIST_DIR` | `../studio/dist` | Where the built Studio bundle lives. Only read when `SERVE_STUDIO` is on. |

## Scheduling and execution

| Variable | Default | What it does |
| --- | --- | --- |
| `SCHEDULER_ENABLED` | on | Whether this replica runs the in-process cron scheduler. Every scheduled job is a database-wide advisory-lock singleton, so more than one replica sharing a database never double-fires regardless of this flag. |
| `RUN_CONCURRENCY_PER_REPLICA` | 5 | How many workflow runs this one replica executes at once. In a container, size this against the node's `cpuLimit` (its cgroup CPU ceiling), never against `cpus` — see Nodes and the resource scan. |
| `REPLICA_ID` | generated | This replica's own id, and the **node id** it registers under. A stable value across restarts keeps one node, updated in place; a random one leaves a `gone` row behind per restart — hidden from `GET /nodes` unless you pass `?include=gone`, and not pruned yet. It is also the id claims and log lines carry. |

## Nodes, labels and resource inventory

| Variable | Default | What it does |
| --- | --- | --- |
| `W6W_NODE_LABELS` | unset | Comma-separated labels this replica publishes about itself, e.g. `gpu,zone:lab-2`. Recorded with the node and shown on its row in Studio; nothing places work by label yet. Each entry may be 1–64 characters of letters, digits and `:` `.` `_` `/` `-`; one that is not is dropped with a start-time warning rather than refusing boot. See Nodes and the resource scan. |
| `W6W_REPORT_INVENTORY` | off | **Self-host only.** When explicitly on (`1`/`true`/`yes`/`on`), each usage report additionally carries four integers and nothing else — node count, CPUs, GPUs and memory GiB. Hostnames, GPU models, disk paths and labels never leave the host, and a cloud installation never reports inventory whatever this is set to. See Nodes and the resource scan. |

## System mail (optional)

| Variable | Default | What it does |
| --- | --- | --- |
| `MAIL_FROM` | unset | Envelope `From` address for the one system-sent email (an invite notification). Leaving this or `POSTMARK_SERVER_TOKEN` unset means no system mail is configured; the server still boots. |
| `POSTMARK_SERVER_TOKEN` | unset | Postmark API token for the one system-sent email. Paired with `MAIL_FROM` above. |

## Tenancy

| Variable | Default | What it does |
| --- | --- | --- |
| `TENANT_DOMAIN_SUFFIX` | unset | A DNS zone used to suggest a per-tenant domain. Unset means the suggestion route does not exist at all; serving a tenant's own domain still needs your own DNS, TLS and ingress either way. |
| `SYSTEM_DOCUMENTS_PROJECT` | unset | Overrides which project the host's built-in system documents (such as the one-time login code email template) are resolved from. Leave it unset for the default lookup. |

## The control link and licence

| Variable | Default | What it does |
| --- | --- | --- |
| `W6W_INSTALLATION_MODE` | set by the entrypoint | Which profile this process boots as. A published self-host image sets this itself; leave it unset, since a contradicting value refuses to boot. |
| `W6W_EDGES` | the fixed self-host set | Which API surfaces this process serves. A self-host install always serves exactly the same three; leave it unset. |
| `W6W_CONTROL_URL` | unset — link off | Base URL of the control plane. With it unset the install is fully local: no licence fetch, usage report or commerce call is ever made. |
| `W6W_CONTROL_PUBLIC_KEY` | unset — trusts nothing | The vendor's public key (a JWK, or a JSON array of them) this host trusts for licence documents. Without it, every licence — fetched or from a file — is ignored. |
| `W6W_LICENCE_FILE` | unset | Path to an offline licence file (one signed document). Re-read on every poll tick, so replacing the file takes effect without a restart. |
| `W6W_USAGE_REPORTING` | off | Turns on hourly usage reporting to the control plane. Self-host is opt-in; only `1`/`true`/`yes`/`on` (case-insensitively) enables it — anything else, including unset, leaves it off. |

## App catalog

| Variable | Default | What it does |
| --- | --- | --- |
| `W6W_IMPORT_PACK` | unset | Set to the exact value `official` to import the baked-in first-party app pack automatically at boot. Otherwise import it later, on demand. |

## Usage metering

| Variable | Default | What it does |
| --- | --- | --- |
| `USAGE_METERING_ENABLED` | off | Whether this host records usage events at all. Self-host defaults off (opt-in); only `1`/`true`/`yes`/`on` (case-insensitively) turns it on. The four kind toggles below only matter once this is on. |
| `USAGE_METER_API_CALL` | on | When metering is on, whether an inbound API call counts as a usage event. |
| `USAGE_METER_EGRESS` | on | When metering is on, whether an outbound egress call counts as a usage event. |
| `USAGE_METER_ACTION_INVOKE` | on | When metering is on, whether an action invocation counts as a usage event. |
| `USAGE_METER_WORKFLOW_RUN` | on | When metering is on, whether a workflow run counts as a usage event. |

## Nodes and the resource scan

A **node** is one running host process — one container. Every node registers itself against this
installation's database at start, heartbeats every 10 seconds, and is reported `live` (seen within
30 s), `stale` (within 10 minutes) or `gone` (older than that) — all three derived from the node's
own last-seen stamp, never stored. `REPLICA_ID` is the node's id, which is why its stability
matters: a stable value across restarts keeps one row and updates it, while a random one leaves a
`gone` row behind per restart. Those rows are hidden, not pruned — `GET /nodes` leaves them out
unless you pass `?include=gone`, and pruning arrives with a later project.

Operators reach the roster two ways: **Studio → Settings → Installation → Nodes** (one row per
node, with its own fields) or the operator-only **`GET /nodes`**. `/health/ready` carries only the
counts — `checks.nodes` is `{ok: true, total, stale}` and never a per-node field.

Each node scans its own machine — at boot, then every 60 seconds for the cheap fields and every 10
minutes for the GPU probe. Every probe is feature-detected, time-boxed and never fatal: a field the
node cannot read is reported as `null`, never as a zero and never as a crash.

| Field | Source | What it means |
| --- | --- | --- |
| `cpus` | `navigator.hardwareConcurrency` | The **host's** core count — the wrong number inside a container, where the process sees the machine rather than its own limit. |
| `cpuLimit` | cgroup v2 `cpu.max`, or v1 `cpu.cfs_quota_us`/`period` | The **cgroup ceiling** on how much CPU this node may actually use — the number that bounds it in a container. |
| `memoryTotal`, `memoryAvailable` | `Deno.systemMemoryInfo()` | Host memory, with the same container caveat. |
| `memoryLimit` | cgroup v2 `memory.max`, or v1 `memory.limit_in_bytes` | The cgroup memory ceiling. |
| `load1` / `load5` / `load15` | `Deno.loadavg()` | The 1-, 5- and 15-minute load averages, in that order. |
| `disk[]` | `df -kP` on the apps directory, `W6W_CACHE` and the runtime's own `DENO_DIR` | Free space per storage **role** (`apps`, `cache`, `deno`) — a role name, never the path, so a database dump cannot leak your layout. |
| `gpus[]` | `nvidia-smi` (or `/proc/driver/nvidia/...`), `rocm-smi` plus `/sys/class/drm`, `system_profiler` on macOS | Vendor and model per card, plus memory and driver when the vendor's tooling answers. `[]` means "probed, none found"; `null` means the probe could not run. |
| `os` / `arch` / `deno` / `container` | `Deno.build`, `Deno.version`, `/.dockerenv` | Where the node runs, and whether that is a container. |

**Sizing a replica.** Keep `RUN_CONCURRENCY_PER_REPLICA` proportional to a node's **`cpuLimit`** —
its cgroup ceiling — and not to `cpus`, which inside a container is the host's core count and can be
an order of magnitude too large. The four inventory counters behind `W6W_REPORT_INVENTORY` follow the
same rule: the CPUs they total are each node's cgroup limit where one is known.

**Labels.** `W6W_NODE_LABELS` publishes your own vocabulary (`gpu`, `zone:lab-2`); the scan adds the
capabilities it can prove (`gpu:nvidia`, `arch:x86_64`, `os:linux`). Both are recorded and shown on
the node's row — **nothing places work by label yet**.

**GPUs are inventory only — w6w does not run work on GPUs.** The registry records what the scan finds
so you can plan capacity, and the four inventory counters include GPUs when you opt into reporting
them, but the runtime is a Deno Worker: nothing in this build schedules onto a GPU, and no `gpu`
label places work. Everything a GPU node runs, it runs on its CPUs.

## Required variables not read through `config.ts`

The list above is generated by scanning `config.ts` itself, so it can only ever cover what that one module reads. A small number of required variables are read entirely outside it, by other parts of the server — this generator cannot mechanically prove this section complete, so it is hand-maintained instead.

| Variable | What it does |
| --- | --- |
| `W6W_CREDENTIAL_KEY` | 64 hex chars (32 bytes). Encrypts stored connection credentials and vault secrets at rest. Unset or malformed falls back to a well-known development key with a loud warning — never rely on that outside development. |
