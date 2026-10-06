---
key: "hub-spokes"
title: "Hub and spokes"
section: "self-hosting"
description: "Run execution nodes that hold no database access and no credential key, enrolled to one hub."
summary: null
format: "markdown"
shared: true
order: 60
position: 6
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/self-hosting/hub-spokes.md"
sourceSha: "c70c3e1ca6159996f0439794a5b979d7340c3efb"
sourceRefSha: "1eee1ca1c273fcccc91988c49213335e02b22b4e"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/1eee1ca1c273fcccc91988c49213335e02b22b4e/docs/self-hosting/hub-spokes.md"
syncedAt: "2026-10-06T21:23:31Z"
---


# Hub and spokes

A **hub** is your normal w6w server: it owns the database, tenancy, credentials and Studio. A
**spoke** is an extra execution node that pulls runs from the hub over HTTPS and runs them with the
same engine and the same apps. A spoke has no database connection and no credential key.

## When to use it

By default you scale out by running replicas that all share one Postgres. That is the simplest
choice when every node sits inside the database's trust boundary. Pick hub and spokes when execution
nodes should not have database access or the credential key, for example nodes in a more exposed or
less trusted network segment.

|                      | Replicas sharing one database | Hub and spokes                     |
| -------------------- | ----------------------------- | ---------------------------------- |
| Database connection  | every node                    | the hub only                       |
| `W6W_CREDENTIAL_KEY` | every node                    | the hub only                       |
| How a node gets work | claims runs from the database | pulls runs from the hub over HTTPS |
| Network              | every node reaches Postgres   | a spoke reaches only the hub       |

Spokes are meant for your local network. Spokes reaching a hub across the public internet are not
supported.

## Enrolling a spoke

1. **Mint a one-time token on the hub.** In Studio, open **Settings → Installation → Nodes** and
   press **Enroll a spoke**, or call `POST /nodes/enroll-tokens` with an operator token and an empty
   body `{}`. The token is shown once, works once, and expires after 15 minutes.
2. **Start the spoke** with the same image version as the hub and these variables:
   - `W6W_NODE_ROLE=spoke`
   - `W6W_HUB_URL`: the hub's public base URL, including any proxy prefix (on the bundle,
     `https://<hub-host>/api`). It must be `https:`; plain `http:` is allowed only with
     `W6W_DEV_MODE` on the spoke, for development.
   - `W6W_HUB_ENROLL_TOKEN`: the token from step 1.
3. **Remove the token** once the spoke has enrolled. Later starts do not need it.

The compose bundle includes a commented-out `w6w-spoke` service to start from.

Enrolment writes the spoke's own key to `W6W_SPOKE_KEY_FILE` (default `./spoke-key.json`). Keep that
file on persistent storage, never share it between spokes, and keep it mode `0600`; the spoke
refuses to start if group or others can read it. The key's `kid` is the spoke's id.

A spoke also refuses to start if `DATABASE_URL`, `W6W_CREDENTIAL_KEY` or `W6W_CREDENTIAL_KEY_NEXT`
is set in its environment. That is the point of the topology.

| Variable                    | Where             | Default            | Purpose                                                |
| --------------------------- | ----------------- | ------------------ | ------------------------------------------------------ |
| `W6W_NODE_ROLE`             | spoke             | `all`              | Set to `spoke` on a spoke. Not a valid value on a hub. |
| `W6W_HUB_URL`               | spoke             | none               | The hub's base URL.                                    |
| `W6W_HUB_ENROLL_TOKEN`      | spoke, first boot | none               | One-time enrolment token.                              |
| `W6W_SPOKE_KEY_FILE`        | spoke             | `./spoke-key.json` | The spoke's key file.                                  |
| `W6W_SPOKE_CREDENTIAL_MODE` | hub               | `handoff`          | How spokes get credentials (below).                    |

## How spokes see credentials

`W6W_SPOKE_CREDENTIAL_MODE` is set on the hub and picks one of two modes.

- **`handoff` (default).** When a step needs a credential, the spoke asks the hub for it. The hub
  checks the step may use that connection, records the handoff in the audit log (never the
  credential itself) and returns it. The spoke holds it in memory only while the step runs. A
  compromised spoke can therefore see the credentials of steps it ran, for as long as they ran.
- **`proxy` (strict).** The spoke never sees a credential. It sends the hub the request it wants
  made, and the hub signs and sends it. This suits CPU-heavy steps; the hub's network becomes the
  bottleneck.

## What runs on a spoke

- **Some runs stay on the hub.** A workflow whose steps need the hub's database mid-run (a Function
  or other callable step other than `@w6w/call`, or a step that reads a document) is marked
  `w6w:hub-only` and is never offered to a spoke. In `proxy` mode, runs that use vault secrets or a
  socket-targeted connection are hub-only as well. Such runs need an `all` or `executor` node. A run
  queued before an upgrade or a mode switch can still reach a spoke and fail with
  `spoke_unsupported_step`.
- **Same version everywhere.** Run one image version on the hub and every spoke. A spoke checks each
  app's digest against the hub's catalog, and a mismatch fails the step with `spoke_app_mismatch`. A
  spoke runs only each app's latest registered version, so a run pinned to an older app version
  fails the same way.
- **One capacity cap.** Spokes share the install's single parallel-execution cap; adding a spoke
  does not raise it. A spoke short on memory, or loaded above its CPU limit, is offered nothing that
  round.
- **Placement works as on replicas.** A run naming `x-w6w-placement` labels goes only to a node that
  carries all of them; a spoke reports its labels from `W6W_NODE_LABELS`.

## Operating it

- **A spoke that stops** loses its claim on a run after 30 seconds without a heartbeat; the hub or
  another spoke resumes the run from its last checkpoint.
- **The roster.** Spokes appear in **Settings → Installation → Nodes** with role `spoke`, their
  active runs and last-claim time (also in `GET /nodes`). They are not counted in the `w6w_nodes`
  metric.
- **Hub role.** A hub started as `all` still executes runs itself; as `api` it executes none and
  leaves that to other nodes. The hub can be several replicas behind one address, and spokes enroll
  with that address.
