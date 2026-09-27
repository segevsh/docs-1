---
title: "Self-host air-gapped install"
description: "Installing, loading the app catalog, and licensing a self-host install with no outbound network access at all."
---

# Air-gapped install

Nothing about running w6w requires outbound access. Three things to know if your install has none
at all.

## Installing with no network

The published image bakes in everything the install step needs — including the installer's own
argument parser — so bootstrapping a fresh database needs no reach to any package registry:

```sh
docker run --rm --env-file ./host.env --entrypoint deno ghcr.io/w6w-io/w6w-server:<tag> task install \
  --host db.internal --port 5432 --admin-user postgres --admin-db postgres \
  --db-name w6w --db-user w6w_app --schema w6w
```

Run this from any machine that can reach your database — nothing else. `host.env` supplies the
credentials this one command needs: the target database's superuser password (`ADMIN_PASSWORD`) and
the password to set for the dedicated app role this step creates (`DB_PASSWORD`) — the same two
values the self-host bundle's `w6w-init` service passes to this same install step (see
[Install](/self-hosting/install/)). It carries nothing else; the running server's own configuration
(`W6W_CREDENTIAL_KEY`, `JWT_SECRET`, and the rest of the [configuration
reference](/self-hosting/config-reference/)) is a separate file, supplied to the `w6w-server`
container itself.

### Getting the images onto an offline host

`docker pull` and `docker run` both need network access to `ghcr.io` unless the images already sit
in the target host's local Docker image store. To move a published image without ever pulling it on
the offline host: on a machine that *can* reach `ghcr.io`, `docker pull` the exact tag, `docker save
ghcr.io/w6w-io/w6w-server:<tag> ghcr.io/w6w-io/w6w-studio:<tag> -o w6w-images.tar`, transfer that
tarball to the offline host by whatever means your environment allows (removable media, an internal
artifact store), then `docker load -i w6w-images.tar` there. `docker compose up -d` then finds the
images already present and never attempts to pull.

## Loading the app catalog with no network

The official first-party app pack is baked into the image alongside the app catalog it's imported
from. Setting `W6W_IMPORT_PACK=official` imports it at boot from that local copy, with zero calls
out — the same is true of `POST /apps/import-pack`, or Studio's **Import official catalog** button,
if you'd rather trigger it on demand instead.

## Licensing with no network

A fetched licence and a licence file go through the same check, so a licence obtained entirely
offline works identically to one your install fetched itself:

1. `GET /installation` (as an operator) reports this installation's own public key even before it's
   ever activated — send it to your vendor.
2. Your vendor issues a licence file bound to that exact key.
3. Drop the file at the path `W6W_LICENCE_FILE` names, set `W6W_CONTROL_PUBLIC_KEY` to your vendor's
   signing key, and restart (or wait for the next poll tick — the file is re-read every 15 minutes).
   The host verifies it locally, with zero network calls.

A file issued against a different installation's key is refused, and the install stays in its
unlicensed `evaluation` state rather than accepting it.
