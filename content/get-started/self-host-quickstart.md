---
key: "self-host-quickstart"
title: "Self-host quickstart"
section: "get-started"
description: "Install the full w6w on Linux with one container, then create your first account."
summary: null
format: "markdown"
shared: true
order: 20
position: 8
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/self-host-quickstart.md"
sourceSha: "aff68254dfb2f562b70ed24406495254399e21b9"
sourceRefSha: "801217d024e3bf11a372f2876ef6bed8a10a1bfb"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/801217d024e3bf11a372f2876ef6bed8a10a1bfb/docs/self-host-quickstart.md"
syncedAt: "2026-10-12T19:01:39Z"
---


# Self-host quickstart

The Linux installer runs Studio, the API, execution, Postgres and the licence Warden in one
container. It reuses Docker or Podman, installs Docker if neither is available, and generates
and saves the internal secrets. You need Linux x86-64, curl, and sudo/root access if a runtime
needs installation. Compose and a domain are optional.

## 1. Install

Obtain `w6w-install.sh` from your W6W release and run:

```sh
sh w6w-install.sh
```

The release installer is pinned to that release's image digest. Images currently require GHCR
access: log in with `docker login ghcr.io` (or `podman login ghcr.io`) first, using sudo for the
login too if Docker needs it. A public installer endpoint is not yet verified. Once hosted,
the same script supports `curl -fsSL <installer-url> | sh`.

For a source checkout, specify an actual release tag (`vX.Y.Z` is a placeholder):

```sh
sh deploy/install.sh --version vX.Y.Z
```

Use `--podman` to select Podman explicitly, installing it if missing. Use `--port 9090` to
change the local port. The installer waits for the application health endpoint before
reporting success.

## 2. Create your account

Open **http://localhost:8787** and complete first-use signup. On a remote host, forward the
local port over SSH, for example `ssh -L 8787:127.0.0.1:8787 user@server`, then open that URL
on your own computer. The installer binds to loopback. Base operation does not require a
licence; paid activation is a later step.

The official app catalog loads in the background. Once loaded, connect an app in Studio
and run an action. Check liveness with:

```sh
curl --fail http://localhost:8787/health
```

## Optional database and Warden

On a fresh installation, use an existing Postgres database and remote Warden:

```sh
sh w6w-install.sh \
  --db-host db.example.com --db-port 5432 \
  --db-name w6w --db-user w6w --db-password-file ./db-password \
  --db-schema w6w \
  --warden warden.example.com:8443 --warden-token-file ./enrollment-token
```

Database options and Warden options can be used independently. The database and user must
already exist and be reachable from inside the container; the user must own or be able to
create the selected schema. The installer initializes/verifies the W6W schema without
creating or dropping the database. Remote Warden uses HTTPS; use `--warden-ca ./ca.pem`
for a private CA. Use `--db-password` or `--warden-token` if you prefer inline values.
`sh w6w-install.sh --help` lists all options.

## Keep your installation

The container is named `w6w`. The `w6w_data` volume holds persistent data, and generated secrets
live in `${XDG_CONFIG_HOME:-$HOME/.config}/w6w/w6w.env` (or `--config-dir`). Back up both. Never
regenerate the credential key for existing data. Signup starts open; after creating your
account, set `SIGNUP_MODE=invite_only` in that file and recreate the container to close signup.

The installer refuses to overwrite an existing container or switch its saved configuration
to a different runtime/user. To restart, use `docker start w6w` or `podman start w6w`. For an
intentional upgrade, back up, stop/remove the container, then run the new release installer
with the same configuration directory and runtime. Omit configuration options to reuse the
saved file; edit it explicitly when changing settings. Keep the volume when removing the
container. Podman reboot startup requires `podman-restart.service`; rootless users also need
lingering enabled, as described in the installer's output.

[Install](/self-hosting/install/) covers advanced Compose/TLS deployments. See the
[configuration reference](/self-hosting/config-reference/) for settings and
[Troubleshooting](/self-hosting/troubleshooting/) for diagnostics.
