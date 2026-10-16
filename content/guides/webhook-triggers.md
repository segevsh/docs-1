---
key: "webhook-triggers"
title: "Webhook triggers"
section: "guides"
description: "What a webhook delivery looks like to your workflow, which request headers are stored as [redacted], where a credential belongs, and how poll triggers check an app on an interval."
summary: null
format: "markdown"
shared: true
order: 80
position: 16
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/guides/webhook-triggers.md"
sourceSha: "323c64cdf15fc7bbba715a3ef5ad10ae693a551d"
sourceRefSha: "801217d024e3bf11a372f2876ef6bed8a10a1bfb"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/801217d024e3bf11a372f2876ef6bed8a10a1bfb/docs/guides/webhook-triggers.md"
syncedAt: "2026-10-09T00:00:11Z"
---


# Webhook triggers

**Applies to:** HTTP · Studio · MCP (the subscription is created through the trigger routes; the
delivery itself is a plain HTTP request to the subscription's `webhookUrl`).

A `@w6w/webhook` subscription gives you a public URL. Each request to it that passes the
subscription's authentication starts a run of the bound Workflow, and is also logged as a trigger
event so you can look at what arrived.

## The event

Your workflow reads the request as `trigger.event`, with five fields:

| Field     | What it holds                                                                                               |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| `method`  | The HTTP method, upper case.                                                                                |
| `path`    | The request path.                                                                                           |
| `query`   | The query string as an object of strings.                                                                   |
| `headers` | The request headers, with lower-case names.                                                                 |
| `body`    | The parsed JSON body, or the raw text when it is not JSON (or when the subscription asks for the raw body). |

The same object is stored on the trigger event and on the run, so what you see in a run is what was
logged.

## Headers that arrive as `[redacted]`

The header that proves the caller is allowed in must not become a reusable copy of that credential
in your stored events and runs. So these headers keep their **name** but their value is replaced
with `[redacted]`:

- `authorization`, `proxy-authorization`, `cookie` and `set-cookie`, for every authentication mode,
  including none.
- When the subscription authenticates with a **header**, the header you configured as its name (the
  match ignores case, so `X-Hook-Key` redacts `x-hook-key`).

The name stays so a workflow can still tell that a credential was sent, for example to branch on
`{{ trigger.event.headers.authorization }}` being present. Authentication itself is checked on the
real request before anything is stored, so redaction never changes who gets in.

Every other header arrives exactly as sent.

### Signature headers are kept on purpose

Headers such as `x-hub-signature-256` and `stripe-signature` are **not** redacted. They are a
signature over the body, not a reusable secret, and a workflow may verify them itself.

## Query strings and bodies are stored as sent

Only headers are redacted. The `query` and `body` fields are stored and passed to the run exactly as
the caller sent them. Put a credential in a header, never in the query string or the body.

Events stored before this behaviour existed are not rewritten.

## Who can see a subscription

A subscription belongs to the account that created it. Every subscription call (list, read, delete,
its events, requeueing one of its events, and its schedules) acts only on your own account's
subscriptions. Another account's subscription id answers `404`, exactly as if it did not exist, so
an id never reveals that it belongs to somebody else.

Secret parameters are write-only. A secret you set, such as a basic-auth password, is stored
encrypted and every response that returns the subscription (create, list, read) shows it as
`__stored__` instead of its value. The same goes for any secret held in the subscription's `state`.
Non-secret settings, such as the basic-auth user name or the header name, are returned as set. The
public `webhookUrl` is not affected: the id in it is what a caller posts to, and it is only returned
to the account that owns the subscription.

## Registration and teardown

Some apps must tell the vendor where to send events before anything arrives, and tell it to stop
when you are done. Such an app declares an `onSubscribe` hook (register) and an `onUnsubscribe` hook
(tear down). A trigger that declares neither, and the built-in `@w6w/webhook` and `@w6w/scheduler`
triggers, need no registration: they are `registered` at once.

**Register on create or publish.** Creating a subscription on a workflow that is already published
registers it straight away, before the create call returns. A subscription on a workflow that has
never been published stays `pending` and is registered when the workflow is published. The hook runs
as the subscription's owner, with the owner's connection, and receives the subscription's
parameters, its id, the public URL events should be sent to (`callbackUrl`) and the host's origin
(`hostUrl`). Whatever state the hook returns is stored on the subscription.

**Status.** Every subscription response carries a `status`:

| status       | meaning                                                                      |
| ------------ | ---------------------------------------------------------------------------- |
| `pending`    | Not registered yet, for example because the workflow is not published.       |
| `registered` | Registered, or needing no registration. Events are accepted.                 |
| `failed`     | `onSubscribe` threw or the app was not allowed to run. `lastError` says why. |
| `destroying` | Teardown has started; the row is deleted when it finishes.                   |
| `destroyed`  | Torn down. A deleted subscription is gone, so you rarely read this value.    |

A failed registration never fails the create call: the subscription is stored with
`status: "failed"` and a `lastError` of `{ code, message }`, the message cut to 500 characters. An
app your tenant has blocked counts as a failure here too.

**Destroy before delete.** `DELETE /subscriptions/:id` first marks the subscription `destroying`,
then runs `onUnsubscribe` when the subscription was `registered` and the trigger declares it, then
deletes the row. Another account's id still answers the same `404` as a missing one, and runs no
hook.

**A failed destroy does not block the delete.** If `onUnsubscribe` throws, the delete goes ahead and
still answers `200`. The failure is written to the audit log as `trigger.destroy_failed`, targeting
the subscription, with only an error code in its detail: never the message, the parameters or the
state. The vendor may still hold a registration for it, so check the audit log if you rely on a
clean teardown.

## Any HTTP method, parsers, and ignored calls

The sections above describe `@w6w/webhook`, which enforces its own method list, authentication and
options. Every **other** subscription (an app's own trigger) has a public URL too, and its listener
works differently: it accepts **any HTTP method**, records the call, and answers `200` at once. It
never starts a run itself; the dispatcher does that afterwards.

A poll trigger has no public URL; calls to it get the same 404 as an unknown subscription, and nothing is stored.

**The whole call is recorded.** Each call is stored as `method`, `path`, `query`, `headers` and
`body`, the same five fields as above. A `GET` has `body: null`. A body that is not JSON is stored
as its text. Headers are masked exactly as in "Headers that arrive as `[redacted]`" (signature
headers are kept), and the stored copy is immutable. The body is capped at 1 MiB; a larger one is
answered `413 payload_too_large` and nothing is stored. The `@w6w/webhook` listener has no such cap.

**Ingest parser.** A trigger may declare `handleIngest`, which turns the call into zero or more
events. It receives the call with its credential headers **unmasked**, so it can check the vendor's
own credential; only the masked call is stored. One row is stored per returned event, with the
masked call as `raw` and the event as `normalized`. Returning no events stores nothing and still
answers `200`. If the parser throws, exactly one row is stored with status `failed`,
`last_error.code` `ingest_failed` and no `normalized`, and the caller still gets `200`. A trigger
with no parser, a disabled subscription, or an inactive app (below) skips the parser, and
`normalized` is the posted body.

**Ignored calls.** When the dispatcher picks up a call it marks it `ignored`, with no run, if the
subscription is disabled or the app is archived or disabled for the owner's tenant: the app is no
longer in the registry, or your tenant has blocked it in `deny` mode. A tenant block in `hide` mode
only hides the app from lists and does not ignore anything. `@w6w/webhook` and `@w6w/scheduler` are
built in and are never ignored for this reason. `ignored` is final: an ignored call is never
replayed, and requeue only accepts a `failed` one.

**Output parser.** Otherwise, if the trigger declares `parseOutput`, it receives the stored `call`,
the `normalized` event and the subscription id, and what it returns is the run's `trigger.event`.
Without one, `trigger.event` is the `normalized` event. If `parseOutput` throws, the call is retried
like any other delivery failure.

## Poll triggers

Some apps cannot send you events, so w6w asks them instead. A trigger of that kind is a **poll
trigger**: you subscribe to it exactly as you do to a webhook trigger
(`POST /apps/:id/triggers/:key/subscriptions`), and the subscription's `type` reads `poll`.

**How often.** Send `intervalMs`, the time between checks in milliseconds. Leave it out and you get
the shortest allowed interval. The shortest allowed interval is the longest of three numbers: one
minute, the host's `TRIGGER_MIN_INTERVAL_MS` (5 minutes unless the operator changed it), and the
minimum the trigger itself declares. An interval below it is refused with `422` and
`interval_below_minimum`, and `error.minimumMs` in the response says what the minimum is. The
longest allowed interval is 30 days (2592000000 ms); anything above it is refused with `400` and
`invalid_interval`. An `intervalMs` that is not a whole number, or that you send to a webhook trigger, is refused with `400` and
`invalid_interval`. Nothing is stored when a request is refused.

**What a check does.** Every check runs the app's `poll` hook as the subscription's owner, with
the owner's connection, and receives the subscription's parameters and the state it returned last
time. Each event it returns is stored in the event log like any other event, and the state it
returns is kept for the next check. The workflow runs from those stored events, one run per event,
never from the check itself. If a check fails, the failure is kept on the subscription as
`lastError` and the next check happens at the usual time.

**What is not checked.** Only subscriptions that are `registered` and enabled are polled. A
subscription whose app your tenant has blocked is skipped, with no call to the app, until the app
is allowed again.

## Managing triggers

**List the calls received.** `GET /trigger-events` returns the event log of every subscription you
own, newest first. Another account's events never appear. Four optional query parameters narrow it:

| Parameter        | Effect                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `subscriptionId` | Only that subscription's events. An id that is not yours answers `404 unknown_subscription`, the same body as an id that does not exist. |
| `status`         | One of `received`, `dispatching`, `dispatched`, `failed`, `ignored`. Anything else is `400 invalid_status`.                              |
| `limit`          | A positive whole number (default 50); larger values are capped at 200. Anything else is `400 invalid_limit`.                             |
| `before`         | An ISO-8601 timestamp: only events received strictly earlier. Anything else is `400 invalid_before`.                                     |

**Connections.** A connection you attach to a subscription must belong to the trigger's app;
otherwise the request answers `400 connection_app_mismatch` and nothing is created. A stored
subscription that already pairs a trigger with another app's connection fails to register with the
same code, and its hooks never run.

**Retry a registration.** `POST /subscriptions/:id/retry-registration` runs `onSubscribe` again for
a `failed` (or still `pending`) subscription you own and answers `200` with the subscription as it
now reads, `registered` on success or still `failed` with a fresh `lastError`. A subscription in any
other status answers `409 not_retryable`. Another account's id answers the same `404` as a missing
one, and runs no hook.

**Registration at publish.** Publishing a workflow registers every enabled `pending` or `failed`
subscription bound to it, after the publish has committed. A vendor failure never fails the publish:
it answers its normal response, and the subscription reads `failed` with a `lastError` until you
retry or publish again. Publishing a function or an endpoint does nothing here.

**Destroy on workflow delete.** `DELETE /workflows/:id`, which needs an archived workflow, destroys
every subscription that depends on the workflow first, with the same rules as the destroy above: a
failed `onUnsubscribe` is audited as `trigger.destroy_failed` and the delete still goes ahead. A
workflow that is not archived is refused as before, and none of its subscriptions are touched.

**Destroy on connection delete.** `DELETE /connections/:id` destroys every subscription built on
that connection before it deletes the connection, so `onUnsubscribe` still has the credential it
needs to remove the vendor's webhook. The same rules apply: a failed `onUnsubscribe` is audited as
`trigger.destroy_failed` and the delete still goes ahead with `200`. Another account's connection
id answers the same `404` as a missing one and destroys nothing.
