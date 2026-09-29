---
title: "Self-host upgrade"
description: "Moving a self-host install to a new released version safely — what the host checks for you, and what to check yourself."
---

# Upgrade

Every upgrade goes through the same migration step, whether it's the compose bundle, a bare
`docker run`, or a from-source install — so every one of them gets the same three protections:

- **A privilege check up front.** If the database role can't create objects where it needs to, you
  get the exact `grant` statement to run, not a buried error mid-migration.
- **A safe restart under load.** Two instances of the API starting at the same moment don't race —
  one applies pending migrations while the other waits, then correctly finds nothing left to do.
- **A compatibility refusal.** If the database was already migrated by a newer image than the one
  you're starting, the older image refuses to boot rather than guess — naming which migration it
  doesn't recognize and what its own newest known migration is.

`GET /version` reports `schema.applied` (the newest migration this database has recorded) next to
`schema.known` (the newest one this image recognizes), so you can confirm the two agree without
reading logs.

## Doing it

1. **Back up first.** Run the bundled backup command (see [Backup and restore](#backup-and-restore)
   below), and keep `W6W_CREDENTIAL_KEY` backed up separately, out of band — it never lives in
   Postgres, and it's what makes the credentials your backup *does* capture (as ciphertext)
   decryptable at all. A rollback is always "restore the backup, run the previous version" — there
   are no down-migrations.
2. Pull (or rebuild, for a from-source install) the image at the version you're moving to.
3. Restart. The new version applies any pending migration on its own boot, under the protections
   above — there's no separate migration step to run by hand.

The compose bundle's own one-shot init step also re-runs on every restart; against an
already-installed database it runs a read-only check and is *expected* to report a pending
migration and exit non-zero on an upgrade — the bundle tolerates exactly that outcome, since the
API's own boot is what actually applies the migration, under the lock described above.

**There are no down-migrations.** A rollback is two things together, never a partial undo: restore
the backup you took, and run the previous version's image.

## Backup and restore

Two commands in the server image do this for you. `deno task backup --out <dir>` writes
`MANIFEST.json` and `w6w.dump` into a directory you name — it has to be empty (a backup directory is
written once, never merged into). `deno task restore --from <dir>` puts a backup back, but only into
an **empty** database. Neither command has a `--force`.

Both refuse rather than guess:

- **Backup** refuses while a credential-key rotation is in progress, refuses a non-empty `--out`, and
  refuses if `pg_dump` is missing or older than the database server.
- **Restore** refuses — before it writes anything — a backup taken under a different
  `W6W_CREDENTIAL_KEY`, a backup whose schema this image doesn't recognize, a target database that
  already holds anything, a backup taken during a rotation, a dump that doesn't match its own
  manifest, and a missing or too-old `pg_restore`.

Both take an optional `--database-url`, but a URL that carries a password is refused: a password on
a command line is visible to every process on the host, so supply it through `DATABASE_URL` or
`PGPASSWORD` instead. A `DB_SCHEMA` install must set `DATABASE_URL`.

**Run a backup at least daily, before every upgrade, and before *and* after every credential-key
rotation** (never during one — the backup command refuses that). The dump holds stored credentials
only as ciphertext; `W6W_CREDENTIAL_KEY` is never in it, so back that key up out of band as well.

From the compose bundle, run the backup inside the running API container and copy the result out —
it takes its database connection from the same `PG*` variables the container already has:

```sh
docker compose exec w6w-server deno task backup --out /tmp/w6w-backup
docker compose cp w6w-server:/tmp/w6w-backup ./w6w-backup
```

Restoring goes the other way, against a freshly created, empty database:

```sh
docker compose cp ./w6w-backup w6w-server:/tmp/w6w-backup
docker compose exec w6w-server deno task restore --from /tmp/w6w-backup
```

**This pair has not been exercised end to end in our own release build** — there is no Docker daemon
there — so rehearse it once on your own install (back up, drop and recreate an empty database,
restore) before you need it.

## First boot on the new version

Two things happen the first time the new version starts against your existing database:

- **The upgrade builds six indexes while it waits.** Every one is a plain, blocking
  `create index` as part of boot, not a background job, so the upgrade window is longer than usual —
  and noticeably longer on a big history. They are `api_calls(created_at)`, `run_log(occurred_at)`,
  `runs(started_at)`, `invocations(started_at)`, `usage_events(occurred_at)` and
  `trigger_events(received_at)`.
- **History starts ageing out.** An installation that is neither linked to a control plane nor running
  from a licence file runs the hourly retention tick, which on its first run prunes history older than
  30 days. If you need to keep more than that, back the database up first (see above) or raise
  `W6W_RETENTION_DAYS_FLOOR` before you upgrade — see the
  [configuration reference](/self-hosting/config-reference/).
