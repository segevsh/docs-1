---
title: "Self-host configuration reference"
description: "Every environment variable config.ts declares, generated from the host's own config module, plus the handful of variables read outside it that are hand-documented on this page."
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
| `W6W_OPERATOR_SESSION_TTL` | `8h` | How long an operator session stays valid. Either a bare number of seconds or a number with an `s`, `m`, `h` or `d` suffix (for example `30m`, `8h`, `7d`), resolving to between one minute and 30 days; anything else — a decimal, a negative number, a unit this page does not list — refuses to start. Signed-in operators can list their own sessions and revoke one. |
| `W6W_OPERATOR_OIDC_ISSUER` | unset — Operator SSO off | The OpenID Connect issuer your operators sign in through. Unset or blank means operator SSO does not exist on this install at all — the login form is the only way in. Once set, it must be a valid URL using `https:` (`http:` is accepted only while `W6W_DEV_MODE` is on) or the server refuses to start; the rest of the `W6W_OPERATOR_OIDC_*` variables below then become required. |
| `W6W_OPERATOR_OIDC_CLIENT_ID` | none — required once the issuer is set | The OIDC client id this install signs in as. Required as soon as `W6W_OPERATOR_OIDC_ISSUER` is set: an empty value refuses to start rather than leaving you with a login page that cannot work. |
| `W6W_OPERATOR_OIDC_CLIENT_SECRET` | unset — a public client | The OIDC client secret. Leaving it unset or empty runs this install as a **public client**: the authorization-code flow with PKCE and no secret, which is what most identity providers expect from a self-hosted install. Set it only when your provider requires a confidential client. |
| `W6W_OPERATOR_OIDC_OPERATOR_GROUPS` | none — required once the issuer is set | Which of the issuer's groups become which operator scopes, written as the group-to-scope mappings this host understands. Required as soon as `W6W_OPERATOR_OIDC_ISSUER` is set, and at least one mapping must resolve; an empty value or a malformed list refuses to start. |
| `W6W_OPERATOR_OIDC_GROUP_CLAIM` | `groups` | Which claim in the issuer's token carries the group list that `W6W_OPERATOR_OIDC_OPERATOR_GROUPS` is matched against. Unset or blank means the claim named `groups`. |

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
| `RUN_CONCURRENCY_PER_REPLICA` | 5 | How many workflow runs this one replica executes at once. A per-replica budget, separate from the licence's install-wide parallel-execution limit; in a container, size it against the node's `cpuLimit` (its cgroup CPU ceiling), never against `cpus` — see Nodes and the resource scan. |
| `REPLICA_ID` | generated | This replica's single identity: the **node id** it registers under AND the id its claims, logs and admission counters carry. Set it whenever you run more than one replica: it must be stable across restarts and unique per replica. Unset, every boot invents a fresh random id, leaving a `gone` node row behind (hidden from `GET /nodes` unless `?include=gone`, not pruned yet) and a dead admission-counter entry (never cleaned up); two live replicas sharing one id also read and reset each other's counts. |

## Nodes, labels and resource inventory

| Variable | Default | What it does |
| --- | --- | --- |
| `W6W_NODE_ROLE` | `all` | What this process is for. `all` serves the API and executes runs; `api` serves the API and executes none; `executor` executes runs and serves no API. Blank or unset means `all`, so a deployment that configures nothing boots exactly as before; any other value refuses to start, and `API` is a mistake rather than a synonym. The value `spoke` starts a spoke instead of a server — see [Hub and spokes](/self-hosting/install/#hub-and-spokes). |
| `W6W_DRAIN_TIMEOUT_SEC` | 60 | How long a shutting-down node waits for the runs it is executing. A whole number of seconds from `0` to `3600`; `0` means do not wait at all; a decimal, a negative number or anything above an hour refuses to start. A run still in flight when the deadline passes is abandoned to the queue — another node picks it up — rather than delaying the shutdown any further. |
| `W6W_NODE_LABELS` | unset | Comma-separated labels this replica publishes about itself, e.g. `gpu,zone:lab-2`. Recorded with the node, shown on its row in Studio, and matched against a workflow's `x-w6w-placement` labels when a run is claimed. Each entry may be 1–64 characters of letters, digits and `:` `.` `_` `/` `-`; one that is not is dropped with a start-time warning rather than refusing boot. See Nodes and the resource scan. |
| `W6W_REPORT_INVENTORY` | off | **Self-host only.** When explicitly on (`1`/`true`/`yes`/`on`), each usage report additionally carries four integers and nothing else — node count, CPUs, GPUs and memory GiB. Hostnames, GPU models, disk paths and labels never leave the host, and a cloud installation never reports inventory whatever this is set to. See Nodes and the resource scan. |

## Hub and spokes

| Variable | Default | What it does |
| --- | --- | --- |
| `W6W_SPOKE_CREDENTIAL_MODE` | `handoff` | **Hub only.** How a hub gives a spoke the credentials a leased step needs. `handoff` (the default) hands each step's credential to the spoke when that step runs, scoped to the step and recorded in the audit log. `proxy` hands the spoke nothing: it sends the unsigned request intent and the hub runs the signing and the egress itself. Any other value refuses to start. See [Hub and spokes](/self-hosting/install/#hub-and-spokes). |

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
| `W6W_USAGE_REPORT_INTERVAL_MINUTES` | unset — the governing lease's own cadence, or 720 (twice a day) with none | Self-host only (a cloud installation always reports live and never reads this). May only **shorten** the base cadence, never lengthen it: `0` goes live; `1`–`4` floors to `5`; a value above the base is **clamped** back to the base with a boot-time warning; anything unparsable is ignored with a warning. Never refuses to boot. |

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

## Data retention

| Variable | Default | What it does |
| --- | --- | --- |
| `W6W_RETENTION_DAYS_FLOOR` | 30 | The minimum age, in days, before old history is pruned — the window used when no licence supplies its own retention policy. Unset (or blank) means 30; any other value must be a whole number of days of at least 1, or the server refuses to start naming this variable. |

## Metrics

| Variable | Default | What it does |
| --- | --- | --- |
| `W6W_METRICS_ENABLED` | on | Serves `GET /metrics` on the API port — read-only Prometheus-format metrics, the same figures a licence and a run queue expose elsewhere. Only `false`/`0`/`off`/`no` turns it off, and then the route does not exist at all: `/metrics` answers exactly like any other unknown path. |
| `W6W_METRICS_ALLOW_CIDRS` | loopback only — `127.0.0.0/8`, `::1/128` | The CIDR blocks allowed to read `/metrics` without a token. A request only qualifies when it reaches the server directly: one carrying `X-Forwarded-For` or `Forwarded` never does, so a scrape through a proxy needs an operator token instead. Widen this list only when the server is **not** reached through something that rewrites client addresses — behind `docker run -p` or a Kubernetes Service every external caller arrives from a private gateway address, so widening it exposes `/metrics`. A malformed entry refuses to start. |

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
the node's row, and both place work: a workflow's `x-w6w-placement` annotation names labels, and
a run of it is claimed only by a node carrying every one of them — while no live node does, the run
waits and reports `waiting_for_capacity`.

**GPUs are inventory only — w6w does not run work on GPUs.** The registry records what the scan finds
so you can plan capacity, and the four inventory counters include GPUs when you opt into reporting
them, but the runtime is a Deno Worker: nothing in this build schedules onto a GPU. A `gpu` label can
place a run on a GPU node, but everything a GPU node runs, it runs on its CPUs.

## Required variables not read through `config.ts`

The list above is generated by scanning `config.ts` itself, so it can only ever cover what that one module reads. A small number of variables are read entirely outside it, by other parts of the server — this generator cannot mechanically prove this section complete, so it is hand-maintained instead.

| Variable | What it does |
| --- | --- |
| `W6W_CREDENTIAL_KEY` | 64 hex chars (32 bytes). Encrypts stored connection credentials and vault secrets at rest. Unset or malformed falls back to a well-known development key with a loud warning — never rely on that outside development. |
| `W6W_CREDENTIAL_KEY_NEXT` | Optional. 64 hex chars (32 bytes), different from `W6W_CREDENTIAL_KEY`. Set it only while rotating the credential key, on every replica, exactly as the rotation runbook in [Upgrade](/self-hosting/upgrade/) describes — the server then reads both keys, and a value that is not 64 hex characters, or that decodes to the same bytes as `W6W_CREDENTIAL_KEY`, refuses to start. Unset in normal operation. |
| `W6W_HUB_URL` | **Spoke only.** The hub this spoke is enrolled to, as the base URL a browser would reach it at — including any reverse-proxy path prefix (`https://hub.example.com/api` on the published self-host bundle). It must use `https:` with no userinfo, query string or fragment; plain `http:` is accepted only while `W6W_DEV_MODE` is on, and only for development. Every call the spoke makes is signed over this URL's own `/hub/...` path and never over the prefix, so the same hub can be reached through your proxy. A spoke only ever reaches its hub, on your local network — cross-site spokes over the public internet are not supported in this release. |
| `W6W_HUB_ENROLL_TOKEN` | **Spoke only.** The one-time token that enrolls this spoke with its hub on its first start. An operator mints it in Studio under Settings → Installation → Nodes → **Enroll a spoke**, or through `POST /nodes/enroll-tokens` with an operator token holding `operator:installation` — the response shows the token once. It is single-use and valid for 15 minutes; the spoke exchanges it for its own key so that later starts need no token, and you can remove it from the spoke's environment after enrolling. |
| `W6W_SPOKE_KEY_FILE` | **Spoke only.** Where the spoke keeps its own key, default `./spoke-key.json`. The spoke mints the key on first enrolment and refuses to start if the file is readable by its group or by other users — mode `0600`, owner-only — and the spoke's own id lives inside that file, so keep the file on persistent storage and never share it between spokes. A read-only mounted secret works too, as long as it already holds an enrolled key file. |
| `W6W_NODE_LABELS` | **Spoke only.** The same variable the node section above documents, read by a spoke with the same parser: on a spoke this is read by the spoke's own configuration module rather than `config.ts`, which is why it is listed here as well. A spoke publishes these labels with its enrolment and every heartbeat, and is offered only runs whose placement names labels it reports. |
| `RUN_CONCURRENCY_PER_REPLICA` | **Spoke only.** The same variable the scheduling section above documents, read by a spoke with the same parser: on a spoke this is read by the spoke's own configuration module rather than `config.ts`, which is why it is listed here as well. It is how many runs this spoke executes at once — unset means 5, and anything but a whole number of at least 1 refuses to start. |
