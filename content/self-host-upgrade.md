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

1. **Back up first.** `pg_dump` your database, and keep `W6W_CREDENTIAL_KEY` backed up separately,
   out of band — it never lives in Postgres, and it's what makes the credentials your dump *does*
   capture (as ciphertext) decryptable at all. A rollback is always "restore the backup, run the
   previous version" — there are no down-migrations.
2. Pull (or rebuild, for a from-source install) the image at the version you're moving to.
3. Restart. The new version applies any pending migration on its own boot, under the protections
   above — there's no separate migration step to run by hand.

The compose bundle's own one-shot init step also re-runs on every restart; against an
already-installed database it runs a read-only check and is *expected* to report a pending
migration and exit non-zero on an upgrade — the bundle tolerates exactly that outcome, since the
API's own boot is what actually applies the migration, under the lock described above.

**There are no down-migrations.** A rollback is two things together, never a partial undo: restore
the backup you took, and run the previous version's image.
