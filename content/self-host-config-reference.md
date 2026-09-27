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
| `RUN_CONCURRENCY_PER_REPLICA` | 5 | How many workflow runs this one replica executes at once. A per-replica budget, separate from the licence's install-wide parallel-execution limit. |
| `REPLICA_ID` | generated | An id for this replica, used in claims and logs. Set it whenever you run more than one replica: it must be stable across restarts and unique per replica. Unset, the server generates a fresh random id on every boot — each boot then leaves one dead entry behind, and two live replicas that picked up the same id reset each other's counts. |

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

## Variables not read through `config.ts`

The list above is generated by scanning `config.ts` itself, so it can only ever cover what that one module reads. A small number of variables are read entirely outside it, by other parts of the server — this generator cannot mechanically prove this section complete, so it is hand-maintained instead.

| Variable | What it does |
| --- | --- |
| `W6W_CREDENTIAL_KEY` | 64 hex chars (32 bytes). Encrypts stored connection credentials and vault secrets at rest. Unset or malformed falls back to a well-known development key with a loud warning — never rely on that outside development. |
| `W6W_CREDENTIAL_KEY_NEXT` | Optional. 64 hex chars (32 bytes), different from `W6W_CREDENTIAL_KEY`. Set it only while rotating the credential key, on every replica, exactly as the rotation runbook in [Upgrade](/self-hosting/upgrade/) describes — the server then reads both keys, and a value that is not 64 hex characters, or that decodes to the same bytes as `W6W_CREDENTIAL_KEY`, refuses to start. Unset in normal operation. |
