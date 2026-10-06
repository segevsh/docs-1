---
key: "self-host-quickstart"
title: "Self-host quickstart"
section: "get-started"
description: "The shortest path to a running self-hosted w6w: bring the stack up with Docker Compose, activate it, and make your first call."
summary: null
format: "markdown"
shared: true
order: 20
position: 8
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/self-host-quickstart.md"
sourceSha: "347ddca0f2cf8f5afab0825b3dbbbd8ab1a69e4e"
sourceRefSha: "40127346cb4c16c6f06e5b4546527b9d7a62a25b"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/40127346cb4c16c6f06e5b4546527b9d7a62a25b/docs/self-host-quickstart.md"
syncedAt: "2026-10-06T21:21:22Z"
---


# Self-host quickstart

Run w6w on your own machine in a few minutes: bring the stack up, activate it, make a call. This is
the short path; [Install](/self-hosting/install/) covers your own Postgres, TLS, Studio and operator
SSO in depth.

You need a Linux host with Docker and the Compose plugin, and a domain pointing at it (for TLS).

## 1. Bring it up

Copy the self-host bundle's example environment file and fill in every value: your domain, the exact
released version, the database passwords, the key that encrypts stored credentials
(`openssl rand -hex 32`), the secret that signs sessions (`openssl rand -base64 48`) and your
operator login (`AUTH_USERNAME`, `AUTH_PASSWORD`). Then:

```sh
cp .env.example .env
docker compose up -d
docker compose ps
```

Postgres, the API and Studio should report `healthy`; the one-shot init container, which creates the
database and applies the schema, ends `Exited (0)`, which is its success state.

## 2. Activate

Sign in to Studio at your domain with the operator login, then supply your licence key by activating
at the warden, with the key on standard input:

```sh
w6w-warden activate - < token.txt
w6w-warden status
```

Until activated the install runs at base level and keeps serving. Open **Settings → Installation**
to see your licence level and limits.

## 3. Make your first call

Check the API is up, then list the app catalog (the bundle imports the official pack on first boot):

```sh
curl https://<your-domain>/api/health
curl -H "Authorization: Bearer <operator-token>" https://<your-domain>/api/apps
```

From here, connect an app in Studio and call one of its actions. The full API and the client
libraries work against `https://<your-domain>/api` exactly as they do against any w6w install.

Next: [Install](/self-hosting/install/) for the details, the
[configuration reference](/self-hosting/config-reference/) for every setting, and
[Troubleshooting](/self-hosting/troubleshooting/) if something does not come up healthy.
