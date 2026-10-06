---
key: "backup"
title: "Backup and restore"
section: "self-hosting"
description: "Back up and restore a self-hosted w6w install, what lives outside the dump, and how to rotate the credential key."
summary: null
format: "markdown"
shared: true
order: 40
position: 4
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/self-hosting/backup.md"
sourceSha: "09d7a94bc6fa35dea87a8b301cb9dcbbe526ca0c"
sourceRefSha: "40127346cb4c16c6f06e5b4546527b9d7a62a25b"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/40127346cb4c16c6f06e5b4546527b9d7a62a25b/docs/self-hosting/backup.md"
syncedAt: "2026-10-06T21:22:18Z"
---


# Backup and restore

Two commands in the image do this. `deno task backup --out <dir>` writes a restorable backup of the
install into `<dir>`: `w6w.dump` (a `pg_dump --format=custom`) plus `MANIFEST.json`. The manifest
records which migrations were applied, the dump's SHA-256, and the credential-key **fingerprint**
the host was running under. It never holds a key or a credential.

The dump holds the install's own schema, the one `DB_SCHEMA` names, plus the legacy `commerce`
schema on an install old enough to still have one. A schema of your own is not in the dump.

`deno task restore --from <dir>` is the other half. It verifies the manifest, restores the dump into
the **same schema name** in the target database (that one schema must be absent or empty, not the
whole database), then runs the migration runner so the install ends up on this image's migration
set.

```sh
deno task backup --out ./w6w-backup      # <dir> must be absent or empty
deno task restore --from ./w6w-backup    # same schema name, absent or empty — not the DB
```

Both accept an optional `--database-url <url>`, but a URL that carries a password is **refused**,
because argv is readable by every other process on the host. Supply the password through
`DATABASE_URL` or `PGPASSWORD`. With neither set, both fall back to
`PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`, which is what makes the compose recipe below
work with no URL at all. A `DB_SCHEMA` install needs no special handling.

## What `backup` refuses

It checks before creating or changing anything:

- A credential-key rotation is in progress (`W6W_CREDENTIAL_KEY_NEXT` is set). A snapshot taken
  mid-rotation cannot be read whole by either key. Back up before step 1 and after step 3 of the
  rotation below, never in between.
- `--out` exists and is not an empty directory. A backup directory is written once, never merged
  into.
- `pg_dump` is missing from `PATH`, or its major version is older than the connected server's.

## What `restore` refuses

It checks before writing anything:

- The manifest's credential-key fingerprint does not match this host's `W6W_CREDENTIAL_KEY`.
- The manifest records a migration this image does not recognize. Restore with an image that matches
  or postdates the backup.
- The target database already has a relation in one of the schemas the backup holds. Other schemas
  of that database are never examined.
- The backup's install schema is not the one this host is configured for (`DB_SCHEMA`). Restore into
  a database configured for the backup's own schema.
- The backup was taken during a rotation, or this host is in one now.
- The dump's checksum does not match the manifest. A truncated or altered dump is refused, never
  half-restored.
- `pg_restore` is missing from `PATH`, or older than the `pg_dump` that produced the backup.

**There is no `--force`.** Every refusal leaves the target untouched. Fix the mismatch it names,
then retry.

## Running it from the compose bundle

In the published image the working directory is `/app/server`, and the `w6w-server` container
carries the `PG*` variables but no `DATABASE_URL`. Run the command inside the container and copy the
files out:

```sh
docker compose exec w6w-server deno task backup --out /tmp/w6w-backup
docker compose cp w6w-server:/tmp/w6w-backup ./w6w-backup
```

Restore into the same schema name, absent or pre-created empty, the other way round:

```sh
docker compose cp ./w6w-backup w6w-server:/tmp/w6w-backup
docker compose exec w6w-server deno task restore --from /tmp/w6w-backup
```

Rehearse this once on a real install (back up, restore into an empty schema of a scratch database)
before you rely on it.

## How often, and what lives outside the dump

- **At least daily, before every upgrade, and before and after every credential-key rotation**
  (never during one). Treat that as the floor and tighten it to your recovery objective.
- **Back up `W6W_CREDENTIAL_KEY` separately**, out of band from the dump (a secrets manager or a
  sealed file, never alongside the dump). It never appears in Postgres, so `pg_dump` cannot capture
  it, and it is the only thing that decrypts what the dump does capture. The dump holds stored
  connection and vault credentials as ciphertext. Restoring under a different key, or without the
  backed-up key, leaves them undecryptable.
- **Back up the warden's data** (its identity and any offline licence state) separately from the
  host database dump.

Take the backup while the old version is running or stopped. See [Upgrade](/self-hosting/upgrade/)
for how a restore relates to a rollback.

## Credential-key rotation

`W6W_CREDENTIAL_KEY` is the AES-256-GCM key that protects stored connection credentials and vault
secrets. Rotate it in **exactly three steps, in this order**. `deno task credential-key:rotate` is
the middle one.

1. **Set `W6W_CREDENTIAL_KEY_NEXT` on every replica and restart them all.** It must be a fresh
   64-hex key, different from `W6W_CREDENTIAL_KEY` (`openssl rand -hex 32`). This starts dual-key
   mode: every replica reads both keys, and every new write is encrypted under NEXT. A value that is
   not 64 hex characters, or that equals the current key, refuses to boot, and the message never
   echoes the value.
2. **Run the rotate command until it prints `SAFE TO PROMOTE.`** It takes the database from the
   environment only (`DATABASE_URL`, else the `PG*` variables) and accepts no arguments at all, not
   even `--database-url`: everything except `--help` is refused without being echoed.

   ```sh
   DATABASE_URL=postgresql://… deno task credential-key:rotate
   ```

   It is safe to run while the app serves traffic and safe to re-run, since it resumes where it
   stopped. It sweeps every existing row onto NEXT, then re-checks every row's ciphertext. Only a
   clean verify pass prints `SAFE TO PROMOTE.` and exits 0. Otherwise it prints
   `Rotation incomplete — do not promote W6W_CREDENTIAL_KEY_NEXT yet.` and exits 1. Re-run it.
3. **Promote, on every replica:** set `W6W_CREDENTIAL_KEY` to the value of
   `W6W_CREDENTIAL_KEY_NEXT`, unset `W6W_CREDENTIAL_KEY_NEXT`, restart.

**Before step 3, close or reload every Studio editor that was open before step 1, then re-run
step 2.** A Studio editor holds sealed secret values client-side. One left open across the rotation
still holds a value sealed under the old key, and saving it after promotion writes ciphertext the
new single key cannot read, permanently. Closing the editor and re-running step 2 sweeps anything it
saved in the meantime.

**Back up before step 1 and after step 3, never in between.** Both `backup` and `restore` refuse
during a rotation.

A replica that finds rows stamped under a key it has not loaded logs a warning at boot, naming each
table and its count, and **never refuses to start**. During a rotation that is expected. Outside one
it means a key is missing or the wrong key is configured.
