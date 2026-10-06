---
key: "upgrade"
title: "Upgrade"
section: "self-hosting"
description: "Upgrade a self-hosted w6w install: back up, start the new image, and what the first boot does."
summary: null
format: "markdown"
shared: true
order: 30
position: 3
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/self-hosting/upgrade.md"
sourceSha: "5be482a0d3cac3880aa613f35987a70e746bcc9d"
sourceRefSha: "1eee1ca1c273fcccc91988c49213335e02b22b4e"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/1eee1ca1c273fcccc91988c49213335e02b22b4e/docs/self-hosting/upgrade.md"
syncedAt: "2026-10-06T21:22:18Z"
---


# Upgrade

Upgrading means starting a newer image against your existing database. Pending migrations apply on
boot, so there is no separate migrate step to run by hand. `deno task install` is a fresh-database
step only.

## What the migration runner guarantees

Every path that applies migrations (the server's own boot, `deno task migrate`, the installer's
verify step) goes through one runner with three safety properties, in this order:

1. **A privilege pre-flight.** Before any DDL runs, the connecting role's `USAGE` and `CREATE`
   privilege on its schema is checked. A role that lacks it fails fast and the message names the
   exact `GRANT ... ON SCHEMA ... TO "role"` statement to run.
2. **A blocking lock, not a skip.** If two replicas boot together, the second waits for the first,
   then re-reads state and finds nothing left to apply.
3. **A schema-compatibility refusal.** If the database has a migration applied that this image does
   not recognize, the server refuses to start rather than guess. This stops a downgrade from running
   against a schema it does not understand. Upgrade the image to match, or restore a compatible
   backup.

`GET /version` reports `schema.applied` (the newest migration the database has recorded) next to
`schema.known` (the newest one this image recognizes), so you can confirm the database is caught up
with the image without reading logs.

## Doing it

1. **Back up first.** See [Backup and restore](/self-hosting/backup/). A rollback is "restore the
   backup and run the previous image". There are no down-migrations.
2. **Build or pull the new image** at the version you are moving to:

   ```sh
   docker build -f deploy/Dockerfile --build-arg W6W_PROFILE=self-host -t w6w-server:self-host .
   ```

3. **Stop the old container and start the new one** with the same environment file.

With the compose bundle, `docker compose up -d` re-runs the `w6w-init` one-shot service. Against an
already-installed database it does a verify-only pass and is expected to report a pending migration
and exit non-zero on an upgrade. The bundle tolerates that outcome, and `w6w-server`'s own boot
applies the migration under the lock. A real connection or permission failure still surfaces.

### Installs with a dedicated app role

If your install uses a dedicated app role and was bootstrapped by an earlier image, it needs one
repair first. Such installs created the schema and every object in it as the **admin** role and gave
the app role grants on them. Migrations run as the role your server connects as, so the first
migration that alters an existing object fails with _"must be owner of …"_.

Re-own the schema's objects once, with the **new** image's CLI, before the first boot.
`--fix-ownership` re-owns every table, sequence, view, function and standalone type in the schema to
the app role:

```sh
set -a; . ./install.env; set +a
deno task install --existing-db --db-name <db> --schema <s> --db-user <role> --fix-ownership
```

Run it from the image exactly as in the [install steps](/self-hosting/install/). The admin you run
it with must be a member of the app role, as for any `--existing-db` run. On an install whose
objects the app role already owns, the flag has nothing to do.

## What the first boot does

- **Six indexes are built during boot, and they block.** The retention migration creates the age
  indexes the pruner needs with plain `create index` statements, inside the migration's transaction,
  so the build time is part of the boot window and grows with table size. The indexes are
  `api_calls(created_at)`, `run_log(occurred_at)`, `runs(started_at)`, `invocations(started_at)`,
  `usage_events(occurred_at)` and `trigger_events(received_at)`. `run_log` is partitioned, so that
  one statement is one blocking build per existing partition.
- **An unlicensed install starts ageing history out on its first hourly tick.** With no licensed
  retention policy the floor applies, and the first tick prunes everything older than 30 days. Back
  up first, or set `W6W_RETENTION_DAYS_FLOOR` higher _before_ you upgrade. See the
  [configuration reference](/self-hosting/config-reference/).

## Image names

The published images, `ghcr.io/w6w-io/w6w-server` and `ghcr.io/w6w-io/w6w-studio`, are what the
self-host compose bundle pulls. They are separate artifacts from the images of w6w's own hosted
service, with different names by design. Never mix an image reference from one with a tag or digest
from the other.

## Known gaps

- **Operator SSO.** A mapped group currently grants full operator access. Enforcing the per-group
  scopes that are recorded on the session is still on the roadmap.
- **Metrics are pull-only.** There is no OpenTelemetry export and no tracing. `GET /metrics` is the
  whole observability surface, and `w6w_nodes` is `1` because nothing reports a fleet-wide node
  count yet.
