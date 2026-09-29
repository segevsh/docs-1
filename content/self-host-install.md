---
title: "Self-host install"
description: "Stand up w6w on your own infrastructure: Postgres, the API, Studio, and automatic TLS on one domain, from the published images."
---

# Self-host install

This is the fastest path to a running w6w install you operate yourself: one VM, one domain, and
four containers — Postgres, the w6w API, Studio, and a reverse proxy that gets you TLS for free.

## What you get

- **Postgres** — the only state. Everything else is stateless and can be rebuilt from it.
- **The w6w API** (`w6w-server`) — your one access point for every connection, action and workflow.
- **Studio** — the visual editor, served at your domain's root.
- **A reverse proxy** — one domain, automatic TLS, `/api/*` routed to the API and everything else to
  Studio, so you never configure CORS between the two.

The official first-party app pack is baked into the API image and can be imported automatically the
first time it boots — see [App catalog](#app-catalog) below.

## Prerequisites

- A Linux host with Docker and the Compose plugin (`docker compose version` works), with ports 80
  and 443 reachable from wherever your users are.
- A domain name you control, with the ability to add a DNS record.
- Access to pull the published images — see [Air-gapped install](/self-hosting/air-gap/) if you
  cannot reach a network at all from where you're installing.

## 1. DNS

Point an A (and/or AAAA) record for your chosen domain at this host's public IP before you go
further — the reverse proxy requests a TLS certificate for exactly this name on its first request.

## 2. Configure

Copy the bundle's example environment file and fill in every value: your domain, the exact released
version you're installing, a database password, the key that encrypts stored credentials at rest,
the secret that signs sessions, and your own operator login. Every value is required — the bundle
refuses to start with any of them left empty.

```sh
cp .env.example .env
# then edit .env:
#   W6W_DOMAIN, W6W_VERSION       - your domain; the exact released version (never a moving tag)
#   POSTGRES_PASSWORD, W6W_DB_PASSWORD
#   W6W_CREDENTIAL_KEY            - openssl rand -hex 32
#   JWT_SECRET                    - openssl rand -base64 48
#   AUTH_USERNAME, AUTH_PASSWORD  - your own operator login
```

## 3. Authenticate to the image registry

```sh
docker login ghcr.io -u <your-github-username>
# password: a personal access token scoped to read:packages
```

## 4. Bring it up

```sh
docker compose up -d
docker compose ps
```

`docker compose ps` should show: Postgres, the API and Studio reporting `healthy` (each has a
container healthcheck); the one-shot init container reporting `Exited (0)` — it runs once, applies
the schema, and stops, so exited-with-zero is its own success state, not a failure; and the reverse
proxy simply `Up` (it has no healthcheck of its own). A one-shot init step creates the database, a
dedicated non-superuser role, and applies the schema before the API ever starts — you never run a
separate install command by hand.

## 5. Log in

Visit your domain in a browser. The reverse proxy issues its TLS certificate on this first request,
which takes a few seconds. Sign in with the `AUTH_USERNAME` / `AUTH_PASSWORD` you set in step 2.

## App catalog

Setting `W6W_IMPORT_PACK=official` (the example environment file sets this already) imports the
official first-party app pack automatically, in the background, the first time the API boots — most
first-party apps are already there to register by name from Studio or the API. See the
[configuration reference](/self-hosting/config-reference/) for what else there is to configure, and
[Troubleshooting](/self-hosting/troubleshooting/) if something doesn't come up healthy.

## Running more than one replica

The API keeps nothing of its own — every bit of state is in your Postgres — so you can run several
replicas behind a load balancer against the one database. A few things to know first:

- **Set `REPLICA_ID` on every replica.** It has to be **stable across restarts** and
  **unique per replica** (see the [configuration reference](/self-hosting/config-reference/)). Leave
  it unset and each boot invents a fresh random id, so every restart leaves a dead entry behind; two
  live replicas that end up sharing one id also reset each other's counts.
- **Scheduled work and migrations are already safe.** The cron scheduler and the migration runner are
  each a database-wide advisory-lock singleton, so a schedule fires exactly once across the fleet and
  two replicas booting at the same moment serialize rather than race. There is nothing to switch off
  on any replica.
- **Your licence's parallel-execution limit is counted install-wide**, in the database, whenever a
  limit applies to you — synchronous invocations and the run queue draw on the same count, so adding a
  replica cannot widen it. A replica that dies keeps holding its slots until its heartbeat is 30
  seconds stale, which can briefly *under*-admit (a request refused that would have fitted) but never
  over-admit. Two replicas claiming a run at the exact same instant can still go one over the cap.
- **Triggers need no lock.** Each event is claimed by exactly one replica; an event whose dispatch
  stalls for 10 minutes is re-queued, so a dispatch stuck that long can run twice. Trigger handling is
  at-least-once — make your handlers idempotent.
- **Choose what each replica does, and where.** `W6W_NODE_ROLE` sets it: `all` serves the API and
  executes runs, `api` serves the API only, `executor` executes runs only. `W6W_NODE_LABELS` publishes
  labels about the node, a workflow's `x-w6w-placement` annotation names the labels a run needs, and a
  run is claimed only by a node carrying every one of them. Every node — its role, its labels and what
  it is running — is listed in **Studio → Settings → Installation → Nodes**, and the same roster is
  available to operators as `GET /nodes`.
- **Rate limits are shared, not per replica.** The buckets live in the database, so running more
  replicas does not multiply any of the limits above.
- **Give the container a stop grace period above 5 seconds** — the compose default of 10 is fine. On
  a graceful stop, usage events are flushed for at most five seconds and anything still buffered is
  then dropped with a warning; a hard kill loses the events since the previous flush, which is
  normally no more than two seconds' worth and never more than 10,000 events.

## Hub and spokes

The install above is the **shared-database** topology: every node reaches the same Postgres. w6w also
supports a **hub and spokes** topology, for hosts that should hold no database access and no credential
key at all — one hub owns the database, and one or more spokes execute runs for it over HTTPS.

| | Replicas sharing one database | Hub and spokes |
|---|---|---|
| Database connection | every node | the hub only |
| `W6W_CREDENTIAL_KEY` | every node | the hub only |
| How a node gets work | claims runs from the shared database | a spoke leases runs from the hub over HTTPS |
| Roles | `all`, `api`, `executor` | hub: `all` or `api` (plus any `executor` replicas); spoke: `W6W_NODE_ROLE=spoke` |
| Network | every node reaches Postgres | a spoke reaches only the hub, on your local network |
| Choose it when | every node sits inside the database's trust boundary | execution nodes should hold no database access and no credential key |

The hub's `W6W_SPOKE_CREDENTIAL_MODE` decides what a spoke ever sees:

| mode | what the spoke sees | what the hub does | cost |
|---|---|---|---|
| **`handoff` (default)** | per-step credential material, decrypted by the hub, delivered inside the signed lease reply, held in memory, zeroed at step end, never written | decrypts and scopes to the step's connection; audit-logs the handoff | a compromised spoke process sees the credentials of the steps it ran, for their duration |
| **`proxy` (strict)** | nothing — the spoke sends the *unsigned* request intent to the hub; the hub runs `sign` and the egress | becomes the egress point again for those steps | load distribution for CPU-bound steps only; the hub's network is the bottleneck; simplest security story |

> **How this release implements `handoff`:** a spoke does not receive connection credentials in the lease
> reply. It asks the hub for a step's credential at the moment that step needs it, over its signed,
> lease-scoped channel; the hub decides which connection the step may use, refuses anything the run could
> not use on the hub itself, and records each handoff in the audit log — never the credential itself. A
> spoke therefore holds at most the credentials of the steps it is running, for their duration. The one
> exception is the vault secrets a run reads: in `handoff` mode they travel with the lease, and the hub
> records that handoff once for each lease that carries them; in `proxy` mode a run that uses vault
> secrets is never offered to a spoke.

**What a spoke is.** A spoke holds no database connection of its own and no `W6W_CREDENTIAL_KEY`; it is
enrolled to exactly one hub, leases runs from that hub over HTTPS, and executes them with the same engine
and the same apps as any other node.

**What the hub keeps.** The hub owns the database, tenancy, credentials, Studio and the control link. A
hub run as `all` still executes runs itself; one run as `api` executes none of its own, and leaves that
execution to nodes that can.

**Runs a spoke never gets.** A workflow is hub-only when one of its steps needs the hub's database while
the run is in flight — a Function or another callable step other than `@w6w/call`, or a step that reads a
document mid-run — and, in `proxy` mode, any run that uses vault secrets or a connection whose target is
a socket. Such runs are never offered to a spoke: they need an `all` or an `executor` node. A run queued
before you upgraded carries no record of that, so a spoke that reaches such a step fails it with
`spoke_unsupported_step`; a run queued before you switched the hub to `proxy` can fail on a spoke for the
same reason.

**One version on both sides.** Run the same image version on the hub and on every spoke. A spoke checks
each app's digest against the hub's catalog, and a mismatch fails the step with `spoke_app_mismatch`. A
spoke also runs only each app's latest registered version, so a run pinned to an older app version fails
on a spoke with `spoke_app_mismatch`.

**Capacity.** Spokes share the install-wide parallel-execution limit with the rest of the install;
adding a spoke never raises it. A spoke that reports too little available memory, or a load above its CPU
limit, is offered nothing that round.

**Placement.** Labels apply across a hub and its spokes: `x-w6w-placement` names the labels a run needs,
and a spoke is offered only runs whose labels it reports.

**Enrolling a spoke.** An operator mints a one-time enrollment token — in Studio at Settings →
Installation → Nodes, press **Enroll a spoke**, or call `POST /nodes/enroll-tokens` with a body of `{}`
and an operator token holding `operator:installation`. The token is shown once, is single-use, and is
valid for 15 minutes. Start the spoke with `W6W_NODE_ROLE=spoke`, `W6W_HUB_URL` and
`W6W_HUB_ENROLL_TOKEN`; once it has enrolled, later starts need no token.

**What a spoke refuses.** A spoke refuses to start if `DATABASE_URL`, `W6W_CREDENTIAL_KEY` or
`W6W_CREDENTIAL_KEY_NEXT` is set in its environment, or if `W6W_SPOKE_KEY_FILE` is not mode `0600` —
readable by its group or by other users. The spoke's id is stored as the `kid` inside that key file, so
keep the file on persistent storage; a key file mounted read-only must already hold an enrolled key.

**Reaching the hub.** `W6W_HUB_URL` must be an `https:` URL, and only `W6W_DEV_MODE` on the spoke permits
plain `http:` — development only. It is the hub's public base URL including any reverse-proxy prefix
(`https://<hub-host>/api` on the self-host bundle); the spoke signs only the hub's own path, never the
full URL. Spokes are for your local network: cross-site spokes over the public internet are not supported
in this release.

**If a spoke stops.** A spoke that stops heartbeating loses its lease after 30 seconds; the hub, or
another spoke, picks the run up from its last checkpoint.

**The roster.** The hub registers each spoke in the same node roster as every other node: **Studio →
Settings → Installation → Nodes** shows role `spoke`, its active leases and its last lease time. Spoke
rows are not counted in the `w6w_nodes` metric, which covers only `all`, `api` and `executor` nodes —
read spokes from Nodes, or from `GET /nodes`.

**The compose bundle.** The self-host bundle's `docker-compose.yml` carries a commented-out `w6w-spoke`
service to start a spoke from.

**Several hubs.** The hub may itself be several replicas sharing its database behind one address; spokes
enroll with that address.

**What a spoke reads.** A spoke reads `W6W_NODE_ROLE=spoke`, `W6W_HUB_URL`, `W6W_HUB_ENROLL_TOKEN`,
`W6W_SPOKE_KEY_FILE`, `W6W_NODE_LABELS` and `RUN_CONCURRENCY_PER_REPLICA`; the hub reads
`W6W_SPOKE_CREDENTIAL_MODE`. Each of these is described in the
[configuration reference](/self-hosting/config-reference/).

## Where to next

- **[Upgrade](/self-hosting/upgrade/)** — moving to a new version safely.
- **[Backup and restore](/self-hosting/upgrade/#backup-and-restore)** — the built-in backup and
  restore commands, what they refuse, and how often to run them.
- **[Configuration reference](/self-hosting/config-reference/)** — every variable `config.ts`
  declares, plus the handful of variables read outside it.
- **[Air-gapped install](/self-hosting/air-gap/)** — installing, loading the catalog, and licensing
  with no outbound network access at all.
