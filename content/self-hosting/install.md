---
key: "install"
title: "Install"
section: "self-hosting"
description: "Install w6w on your own infrastructure: requirements, the server image, a fresh or existing Postgres database, Studio, TLS, the app catalog, operator sign-in and activation."
summary: null
format: "markdown"
shared: true
order: 10
position: 1
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/self-hosting/install.md"
sourceSha: "6a34dda53fd7e17926d3b0b45bac2f1ad65a25b8"
sourceRefSha: "1eee1ca1c273fcccc91988c49213335e02b22b4e"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/1eee1ca1c273fcccc91988c49213335e02b22b4e/docs/self-hosting/install.md"
syncedAt: "2026-10-06T21:21:22Z"
---


# Install

This page takes you from nothing to a running, activated w6w install: the requirements, the server
image, the database, Studio, TLS, the app catalog, operator sign-in and activation. For the shortest
path see the [self-host quickstart](/get-started/self-host-quickstart/); for every setting see the
[configuration reference](/self-hosting/config-reference/).

## Requirements

- **Postgres 16.** Any 16.x server is expected to work. No Postgres extensions are required, so a
  stock server is enough.
- **A role that may create objects**, for the bootstrap step only. It creates the database, the
  schema and, optionally, a dedicated application role. Afterwards the server needs only its
  connection URL.
- **Docker** to run the images. Deno 2.8.2 is needed only if you run the server or its command-line
  tools from a source checkout.
- **No outbound access is needed to run.** Activation talks to the warden (see
  [Activation](#activation)), which an all-in-one install runs for you. A configured operator IdP is
  the one other exception: with `W6W_OPERATOR_OIDC_ISSUER` set, every operator sign-in contacts that
  IdP. With it unset, nothing here makes an outbound call. See
  [Air-gapped installs](/self-hosting/air-gap/) if you have no network at all.
- **CPU, memory and disk** are application-sized; size them to your workload. Parallel executions
  are counted install-wide rather than per process, so running more replicas does not consume more
  of your allowance.

## Install

### 1. Get the image

Use the published server image, or build it from the monorepo root (the image bundles the server and
its sibling packages, so a server-only directory does not build):

```sh
docker build -f deploy/Dockerfile --build-arg W6W_PROFILE=self-host -t w6w-server:self-host .
```

`W6W_PROFILE=self-host` is what makes this the self-host image. The image's entrypoint reads that
baked profile and starts the self-host entry for you; you never choose an entry file yourself, and
arguments passed to `docker run` are ignored.

### 2. Bootstrap a fresh database

A brand-new database is created by the **install CLI**, never by `deno task migrate`, which assumes
the baseline schema is already there and fails on an empty database. The install CLI creates the
database, the schema and the optional application role, applies the baseline schema, then applies
every pending migration, and leaves the database empty of application data.

Passwords come from the **environment** (`ADMIN_PASSWORD`, plus `DB_PASSWORD` when you ask for a
dedicated role), never from flags, because flags are visible in `ps` on a shared host. Keep them in
a file, source it, and they never reach a command line:

```sh
# install.env (chmod 600): ADMIN_PASSWORD=…, DB_PASSWORD=…
set -a; . ./install.env; set +a
deno task install --host db.internal --port 5432 \
  --admin-user postgres --admin-db postgres \
  --db-name w6w --db-user w6w_app --schema w6w
```

From the image, run the same step by overriding the entrypoint (otherwise `docker run` starts the
server and drops the arguments) and pass the environment from an env file:

```sh
docker run --rm --env-file ./host.env --entrypoint deno w6w-server:self-host task install \
  --host db.internal --port 5432 --admin-user postgres --admin-db postgres \
  --db-name w6w --db-user w6w_app --schema w6w
```

This step needs no network beyond the database it is pointed at.

### 3. Configure and start

```sh
docker run -d --name w6w --env-file ./host.env -p 8787:8787 w6w-server:self-host
```

On start the server applies any migration that landed after the database was bootstrapped, which is
why no separate migrate step exists, and then serves HTTP. `GET /health` answers without a token;
`GET /health/ready` needs one (see [Activation](#activation)).

Every environment variable the self-host process reads is in the
[configuration reference](/self-hosting/config-reference/).

## Using your own Postgres database

You do not have to give w6w a database of its own. The install CLI's `--existing-db` mode puts one
w6w install into **one schema** of a database you already run, beside tables that are not w6w's,
without a superuser. It is also how several installs share a single database: each gets its own
schema, found again through its own `DB_SCHEMA`.

### What the app role needs

- **The role w6w connects as owns the schema the install lives in.** The installer creates the
  schema as that role (`create schema <s> authorization <role>`) and runs the baseline and every
  migration as it, so everything it creates is owned by the app role from the start. No object-level
  `GRANT` is issued, now or by a later migration.
- **No database-level `CREATE`, no `CREATEDB`/`CREATEROLE`, no superuser** for the app role. The one
  `create schema` statement runs as whoever applies it (your admin connection, or your DBA), so that
  role needs `CREATE` on the database once, and only while the schema does not exist yet. If even
  that is too much, let your DBA pre-create the schema empty and owned by the app role.
- **Your admin connection must be a member of the app role.** Every statement runs through a role
  switch to it, so a non-member admin is refused before anything is written, naming the fix:
  `GRANT <role> TO <admin>;`.

### Path 1 — your DBA renders and applies the SQL

`deno task schema:sql` renders the exact SQL a live install would run into one file, and opens no
database connection. `--owner <role>` creates the schema and everything in it owned by that role
rather than by whoever applies it:

```sh
deno task schema:sql --schema <s> --owner <role> > w6w-schema.sql
psql -h <host> -U <dba> -d <db> -v ON_ERROR_STOP=1 -q -f w6w-schema.sql
```

The applying role must be a member of `<role>`. The script is one transaction, so a run that stops
half-way leaves the target exactly as it was; `-v ON_ERROR_STOP=1` is what turns that into a
non-zero exit. It is a from-nothing script, not a catch-up: applied to a schema that already holds
an install, it aborts on the first object already there and rolls back.

For an [upgrade](/self-hosting/upgrade/), add `--from <applied-version>`, the newest version in the
target schema's `schema_migrations`, which is what `GET /version` reports as `schema.applied`. The
script then carries only the later migrations and refuses to apply unless the schema really is at
that version:

```sh
deno task schema:sql --schema <s> --owner <role> --from <version> > w6w-upgrade.sql
psql -h <host> -U <dba> -d <db> -v ON_ERROR_STOP=1 -q -f w6w-upgrade.sql
```

### Path 2 — let the installer do it

`--existing-db` never creates, drops or alters the _database_: the database and the app role must
already exist, and both are checked before anything is written. Passwords come from the environment,
as above:

```sh
set -a; . ./install.env; set +a
deno task install --existing-db --db-name <db> --schema <s> --db-user <role>
```

The target schema must be in exactly one of four states, checked in this order:

1. **Absent** — created (owned by `--db-user`, when given) and installed into.
2. **Empty** — installed into.
3. **Already a w6w install** — verified, then any pending migration applied. Re-running the command
   is safe and is a supported catch-up.
4. **Anything else** — refused, listing what was found; nothing is written.

Refusals worth knowing before you try:

- **Foreign objects.** A schema holding objects that are not a recognised w6w install is never
  touched: _"schema `<s>` already contains objects that are not a recognized w6w install … Refusing
  to touch it."_
- **`--drop-existing` is rejected alongside `--existing-db`.**
- **A non-member admin**, and **an app role without `CREATE` on an already-empty schema**, are
  refused up front, naming the `GRANT` to run.
- **A w6w install whose objects the app role does not own** is refused naming `--fix-ownership`,
  which re-owns every table, sequence, view, function and standalone type in the schema to the app
  role, then retries.

With `--print-sql` in place of a live connection, the same install is printed to stdout as the
script of path 1 and no connection is opened. `--db-name` is still required and the admin credential
must still be in the environment, even though neither is used.

### What an install creates, and what it never touches

Into an existing database an `--existing-db` install creates exactly two things:

- **One schema** (`--schema`), holding the `schema_migrations` ledger, the baseline objects and
  every migration's objects, all owned by the app role.
- **With `--db-user`, one role setting in that database** — `search_path` for that role in that
  database — so whatever later connects as the app role lands in the install's own schema. The
  installer never creates the role, changes its password or grants it anything.

It never touches any other schema, any database-level setting, any other role's settings, membership
or password, or any other install's locks. Locks are keyed on the install's own schema name, so one
install's scheduler tick and migration runs neither wait on nor block another's.

### Pointing the server at the schema

An install outside `public` is only found again if the server is told where it is: set `DB_SCHEMA`
to the schema name, and the server pins `search_path` to that schema alone on every connection.
`DB_SCHEMA` unset means `public`.

If the two disagree, or the schema is not a w6w install, the server **refuses to boot** rather than
serve out of the wrong schema, and names the fix:

```text
Refusing to start: current_schema() is "public", but this process is configured for schema "w6w" — check DB_SCHEMA and the role's schema grants.
Refusing to start: schema "w6w" has no w6w install — run deno task install --existing-db --schema w6w to bootstrap it.
```

### Compose

The self-host compose bundle has a variant for this shape: no Postgres service of its own, the same
`--existing-db` install step run once against the database you manage, and the app role's own
credentials (never a superuser's) handed to the server. Its header lists the environment it expects.

## Deploying Studio

Studio is a separate static single-page-app image, built from the monorepo root because its
dependencies are resolved by path, for the same reason the server image is.

- `VITE_API_BASE` is a **build-time** argument. Vite inlines it into the bundle, so a different API
  origin is a different image.
- `W6W_API_BASE` is a **run-time** environment variable on the built image's container. It is
  written to `/config.json` before the web server starts, so one built image can be pointed at a
  different API origin per container with no rebuild. Unset or empty writes `{}` and Studio falls
  back to the build-time `VITE_API_BASE`. A set value must be an absolute `http://` or `https://`
  URL, or a same-origin path with exactly one leading `/` (never `//`, which a browser resolves as a
  different host); anything else refuses to write the file at all. The self-host bundle sets
  `W6W_API_BASE=/api`, matching the proxy's `/api/*` route below.

You can also serve the built `dist/` from any static host: `pnpm build` in Studio's package produces
the same output the image bundles.

## TLS and reverse proxy

Neither the server nor Studio terminates TLS; both serve plain HTTP. Two supported shapes:

- **The self-host bundle's Caddy** does it for you: one `Caddyfile`, automatic certificates for the
  single domain in `W6W_DOMAIN`, `/api/*` stripped and proxied to the server, everything else
  proxied to Studio.
- **Your own reverse proxy** (nginx, Envoy, a cloud load balancer) in front of the two images.
  Whatever you use, set `PUBLIC_BASE_URL` to the public URL your proxy publishes for the API's root,
  including any path prefix it adds (the bundle sets `https://${W6W_DOMAIN}/api`, not a bare
  origin), since an exposed Endpoint's callable URL is rendered against it. Set `STUDIO_BASE_URL` to
  wherever Studio ends up, so invite-redemption links point at the right host. Passkeys, if you
  enable them, are bound by `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGINS` instead.

## Loading the app catalog

A new install starts with an empty catalog. Three ways to load the official first-party pack baked
into the image:

- **At boot, automatically.** Set `W6W_IMPORT_PACK=official` (the bundle's `.env.example` already
  does; unset or blank never imports). The import runs in the background after the server has begun
  listening, so it never holds back the container health check, and logs one summary line:
  `[official-pack] <registered> registered, <already present> already present, <failed> failed of
  <total> (<ms> ms)`.
- **On demand, as an operator.** `POST /apps/import-pack` with no body. Which pack is "official" is
  the host's decision, never the caller's. It answers `404 official_pack_unavailable` if the host
  has no baked pack, `201`/`200` on success and `207` if some entries failed.
- **From Studio, as an operator.** The Apps page's **Import official catalog** button calls the same
  route.

Re-running any of them is safe: an already-registered entry is skipped, never rewritten, and one bad
manifest entry never blocks the rest.

## Operator SSO

Staff can sign in through an external IdP instead of the single `AUTH_USERNAME`/`AUTH_PASSWORD` pair
once `W6W_OPERATOR_OIDC_ISSUER` and its companion variables (see the
[configuration reference](/self-hosting/config-reference/)) are set. `GET /auth/oidc/start`
redirects to the IdP, which redirects back to `<PUBLIC_BASE_URL>/auth/oidc/callback` — register
exactly that URL as this client's callback — and a successful sign-in lands the operator in Studio
with a session of its own.

Break-glass login (the `AUTH_USERNAME`/`AUTH_PASSWORD` pair) is kept whether or not Operator SSO is
configured. It mints a revocable session too, through the same `GET`/`DELETE /auth/sessions`
surface, governed by `W6W_OPERATOR_SESSION_TTL`.

Which IdP groups grant operator access is `W6W_OPERATOR_OIDC_OPERATOR_GROUPS`: a comma-separated
list of `group` (every scope), `group:*` (every scope, explicit) or `group:scope[+scope...]`, with
scopes `operator:installation`, `operator:tenants`, `operator:apps`, `operator:audit` and
`operator:read`. A mapped group currently grants **full** operator access whatever scopes it lists;
the scopes are recorded on the session for a future release to enforce.

## Activation

A new install runs at base level until it is activated. Activation is how you supply your licence
key.

### Sign in to Studio

Sign in at Studio's `/login` with the operator credentials from `AUTH_USERNAME` and `AUTH_PASSWORD`,
then open **Settings → Installation**. The panel is operator-only: a non-operator gets `403` from
`GET /installation`, and a request with no token gets `401`.

### Activate at the warden

The warden is the component that holds your installation's identity and your licence. Run it
embedded by setting `W6W_WARDEN=embedded` in the all-in-one image, or point the host at a remote one
with `W6W_WARDEN_URL` and its enrol token and CA file. Supply the one-time activation token (your
licence key, as issued to you) on standard input, so it never enters shell history or process
arguments:

```sh
w6w-warden activate - < token.txt
w6w-warden status
```

Activate through the warden command line, not Studio: on a warden install the **Activate** button in
Settings → Installation answers `409 link_not_configured`. `GET /installation` shows the host's
licence level, limits and warden status. If the warden has not been activated or cannot be reached,
the host runs at base level: it keeps serving, with base limits. Work above the available
parallel-execution cap waits in the run queue, and synchronous invocations over the cap answer
`429 concurrency_exceeded`.

### Check readiness

`GET /health/ready` needs a bearer token: a probe with none gets `401`. With one it checks Postgres,
the resolved auth secret and app storage, and reports the licence state and a node summary:

```json
{
  "ok": true,
  "checks": {
    "pg": { "ok": true },
    "secrets": { "ok": true },
    "storage": { "ok": true },
    "licence": { "ok": true, "mode": "self-host", "state": "evaluation" },
    "nodes": { "ok": true, "total": 2, "stale": 0 }
  }
}
```

`evaluation` is the base-level state before activation; an activated install reports `licensed`.
`checks.licence` and `checks.nodes` are informational and always `ok: true`: an unactivated or
unreachable warden does not make the host unready, and `stale` counts nodes that missed their
heartbeat. Use `GET /health` for unauthenticated liveness, and a token header for an orchestrator
readiness probe.

## Next steps

- [Configuration reference](/self-hosting/config-reference/) — every setting.
- [Upgrade](/self-hosting/upgrade/) and [Backup and restore](/self-hosting/backup/).
- [Hub and spokes](/self-hosting/hub-spokes/) — running executors on other machines.
- [Troubleshooting](/self-hosting/troubleshooting/) — when something does not come up healthy.
