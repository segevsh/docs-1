---
title: "Self-host troubleshooting"
description: "What a self-host install's own refusal and error messages mean, and what to do about them."
---

# Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `/commerce` or `/commerce/…` answers `404` `commerce_unavailable` | Not a failure. A self-host install has no commerce surface: every `/commerce` request gets this built-in stub, unauthenticated, and nothing is forwarded anywhere. | Nothing — this is the intended answer. |
| `GET /health/ready` answers `401` | Readiness is bearer-guarded. | Probe with an operator token, or use the unauthenticated `GET /health` instead. |
| Activate answers `409 link_not_configured` | `W6W_CONTROL_URL` is not set, so there is nothing to activate against. | Set it, or use the offline licence-file path (see [Air-gapped install](/self-hosting/air-gap/)). |
| Activate answers `409 identity_unavailable` | This installation's private key can't be decrypted. | Usually `W6W_CREDENTIAL_KEY` was changed or lost after first boot — the stored key is unrecoverable, so the installation must be re-provisioned. |
| Activate answers `424 control_unavailable` | The control plane was unreachable, answered a server error, or returned a malformed success body. | Check `W6W_CONTROL_URL`, your egress, and try again — nothing is retried for you. |
| Activate answers `400 activation_rejected` | Your vendor refused the token (unknown, expired, or already used). | Ask for a fresh activation token. |
| Activate answers `409 already_activated` | This host already has an installation id. | Re-activation isn't supported host-side — ask your vendor to work from the installation record. |
| `GET /installation` says `evaluation` even though you installed a licence file | Either `W6W_CONTROL_PUBLIC_KEY` is unset (nothing is trusted by default), the file isn't bound to this host's own key, or `W6W_LICENCE_FILE` doesn't point at a readable file. | Set your vendor's public key, re-check the path, and read the server's own log line — a bad file is reported once per poll tick. |
| Migrations fail with `relation "connections" does not exist` | The migration runner was pointed at an empty database. | Bootstrap with the install step first (see [Install](/self-hosting/install/)); run the migration runner only against an already-installed database. |
| Startup refuses with: *"Refusing to start: this image (version `<image version>`) does not recognize applied migration(s) `<ids>` recorded in schema_migrations. This image's newest known migration is `<newest>`. The database was migrated by a newer or incompatible image — upgrade this image to match it, or restore the database from a compatible backup."* | The database was already migrated by a newer image than the one now booting. | Upgrade this image to match, or restore the database from a backup taken at a compatible version — see [Upgrade](/self-hosting/upgrade/). |
| Startup refuses with: *"Refusing to start: role \"`<role>`\" is missing `<USAGE, CREATE>` on schema \"`<schema>`\". Run this as a superuser, then retry: `GRANT <privileges> ON SCHEMA <schema> TO "<role>";`"* | The connecting Postgres role lacks schema privileges — checked before any migration runs, so this fails fast instead of mid-migration. | Run the printed `GRANT ... ON SCHEMA ... TO "<role>";` statement as a superuser, then retry. |
| Startup refuses with: *"Refusing to start: W6W_IMPORT_PACK must be unset or \"official\", got `<value>`."* | `W6W_IMPORT_PACK` was set to something other than exactly `official`. | Unset it, or set it to exactly `official`. |
| `POST /apps/import-pack` answers `404` with `{"error":{"code":"official_pack_unavailable","message":"No official app pack found: w6w-pack.json is absent from both <dir> and <parent dir>."}}` | This image has no baked-in official app pack to import. | Nothing to import — register apps individually instead, or use an image that bakes one in. |
| `POST /apps/import-pack` otherwise answers `201` (newly registered) or `200` (already present), or `207` if some entries in the pack failed | Not a failure by itself — the status names how the import went. | On `207`, check the response body's per-entry `results` for which ones failed and why. |
| The boot-time `W6W_IMPORT_PACK=official` import logs exactly one summary line either way: `[official-pack] <registered> registered, <already present> already present, <failed> failed of <total> (<ms> ms)` | Informational — the whole record of what an automatic import did. | Check this line if apps you expected aren't registered; a nonzero failed count also lists which entries and why. |
| Startup refuses, naming `W6W_INSTALLATION_MODE` | The value names the other profile than the one this image was built for. | Unset it, or set it to match the image. |
| Startup refuses, naming `W6W_EDGES` | A self-host install always serves exactly the same three surfaces. | Unset `W6W_EDGES`. |
| Startup refuses, naming `W6W_CONTROL_URL` | The value isn't a valid `http://`/`https://` URL. | Fix it, or unset it. |
| Startup refuses, naming `W6W_CONTROL_PUBLIC_KEY` | The value isn't a valid public key (or a JSON array of them). | Fix it, or unset it and accept the unlicensed `evaluation` state. |
| Startup refuses, naming `AUTH_PASSWORD` | Boot safety: the default credential isn't allowed outside development. | Set a real `AUTH_PASSWORD`. |
| Startup refuses, naming `OPS_JWT_SECRET`/`JWT_SECRET` | The two signing secrets collide. | Leave `OPS_JWT_SECRET` unset on self-host, or give it a value distinct from `JWT_SECRET`. |
| Invocations answer `429 concurrency_exceeded`; runs sit queued | The install is at its licensed parallel-execution cap. | Wait for the `Retry-After` the response names, or license more parallel executions. |
| New work answers `402 licence_lapsed` | The licence passed its grace period. | Renew it. Work already running finishes, and you can still sign in. |
| Nothing ever reaches the control plane | `W6W_CONTROL_URL` is unset, the installation never activated, or the licence is lapsed/absent. | Check `GET /installation` — its `link` field tells you whether the host considers itself linked. |
