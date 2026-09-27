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
- **Rate limits are shared, not per replica.** The buckets live in the database, so running more
  replicas does not multiply any of the limits above.
- **Give the container a stop grace period above 5 seconds** — the compose default of 10 is fine. On
  a graceful stop, usage events are flushed for at most five seconds and anything still buffered is
  then dropped with a warning; a hard kill loses the events since the previous flush, which is
  normally no more than two seconds' worth and never more than 10,000 events.

## Where to next

- **[Upgrade](/self-hosting/upgrade/)** — moving to a new version safely.
- **[Backup and restore](/self-hosting/upgrade/#backup-and-restore)** — the built-in backup and
  restore commands, what they refuse, and how often to run them.
- **[Configuration reference](/self-hosting/config-reference/)** — every variable `config.ts`
  declares, plus the handful of variables read outside it.
- **[Air-gapped install](/self-hosting/air-gap/)** — installing, loading the catalog, and licensing
  with no outbound network access at all.
