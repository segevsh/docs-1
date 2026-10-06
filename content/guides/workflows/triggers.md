---
key: "workflows/triggers"
title: "Triggers"
section: "guides"
description: "Start a workflow manually, from an inbound webhook, on a schedule, or when an app reports an event, and manage the subscriptions that bind app events to workflows."
summary: null
format: "markdown"
shared: true
order: 20
position: 9
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/workflows/triggers.md"
sourceSha: "42765a1d92120ca283d53288c576ea0e64ddaba3"
sourceRefSha: "015853978c4f9263eb1dc504226820872c8f26bd"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/015853978c4f9263eb1dc504226820872c8f26bd/docs/workflows/triggers.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Triggers

A trigger is what starts a workflow. Add one from the **Triggers** tab of **Add a step** (see
[The workflow editor](/guides/workflows/editor/)). A workflow needs a trigger step before it can be
published. A new workflow starts with a **Manual trigger**.

| Trigger | Starts a run when |
| --- | --- |
| **Manual trigger** | You click **Run**, or a caller runs the workflow through the API, SDK or CLI. |
| **Webhook** | Something sends an HTTP request to the workflow's webhook URL. |
| **Schedule** | A time or interval comes round. |
| App trigger | An app reports an event, such as a new message or a new order. |

Later steps read what the trigger produced as `steps.<trigger-id>.output.<field>`, or, for an
app event, as `trigger.event`.

## Manual trigger

Declare the fields the run starts with:

1. Edit the trigger step and, under **Fields**, add one per value.
2. Give each a **Key** (such as `email`), a **Type** (**String**, **Number**, **Boolean** or
   **JSON**), an optional **Default**, and tick **Required** if it must be sent.
3. On the **Test** tab, fill in sample values and click **▶ Test run**.

How you know it worked: **Output state (filled values)** shows your sample. Studio saves it, and
the header's **Run** uses those values from then on.

## Webhook

1. On the **Triggers** tab, pick **Webhook**.
2. Edit the step. In **Configure**, set:
   - **HTTP Methods**: which methods are accepted (default `POST`).
   - **Authentication**: **None**, **Basic auth** (**Username**, **Password**), **Header auth**
     (**Header name**, **Header value**) or **JWT (HMAC)** (**JWT secret**).
   - **Respond**: **Immediately (ASAP)** (the default), **When the run finishes**, **Using a
     Response node** (add a **Respond to Webhook** step that decides the reply) or **Streaming**.
   - **Response status code** and **Response body (immediate)**. An empty body replies
     `{ "message": "Workflow was started" }`.
   - Under the advanced options: **IP allow list** (empty allows everyone), **CORS allowed
     origin**, **Response headers**, **Raw body**, **Ignore bots** and **Binary field name**.
3. At the top of **Configure**, click **Create webhook URL**.
4. Copy the URL and give it to whoever sends the requests.
5. Publish the workflow so callers run a fixed version.

How you know it worked: send a test request and a run appears in the workflow's
**Execution history**:

```bash
curl -X POST "<webhook-url>" -H "Content-Type: application/json" -d '{"hello":"world"}'
```

Treat the webhook URL like a password when **Authentication** is **None**: anyone who has it can
start runs.

## Schedule

1. On the **Triggers** tab, pick **Schedule**.
2. Edit the step and choose a **Mode**:
   - **Cron**, the default, with a **Cron expression** such as `0 9 * * 1-5` (09:00 on weekdays);
   - **Once**, with **Run at**, such as `2026-01-01T09:00:00Z`;
   - **Interval**, with **Interval (seconds)**.
3. Optionally set **Timezone** (default `UTC`) under the advanced options.

> **Good to know:** Studio saves the schedule on the step but doesn't yet switch it on by itself.
> If no run appears in **History** after the first due time, ask your W6W administrator to
> activate the schedule for this workflow.

## App triggers

Some apps declare events you can subscribe to, such as a new message in a chat app.

1. On the **Triggers** tab, under **App triggers**, search **Search apps with triggers…** and pick
   an app.
2. Pick the event.

This creates a **subscription** that binds the app's event to this workflow. It doesn't add a step
to the canvas. Each time the event fires, the workflow runs with the event's payload available as
`trigger.event`.

## Manage subscriptions

Subscriptions have their own page, which isn't in the sidebar. Open
`https://<your-studio-host>/<account-id>/<project-id>/subscriptions`.

- **Active subscriptions** lists each one: the app, the event key, the workflow it starts, and
  whether it's **enabled** or **disabled**.
- **Copy URL** copies the subscription's webhook address, to paste into the vendor's webhook
  settings. Treat it like a password.
- **Delete** removes the subscription. The workflow stops receiving that event.

To add one by hand:

1. Click **+ Add subscription**.
2. Choose the **App**, then the **Trigger**. If the app hasn't declared any, type the **Trigger
   key** yourself, for example `new-message`.
3. Choose the **Workflow** and click **Save subscription**.

How you know it worked: the subscription appears under **Active subscriptions** as **enabled**.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `No apps declare triggers yet.` | None of your registered apps offers events. | Use a **Webhook** trigger and point the vendor at its URL. |
| The webhook URL answers `401` | The request didn't carry what **Authentication** requires. | Send the header, Basic credentials or JWT you configured. |
| The webhook answers but no run appears | The method isn't in **HTTP Methods**, the request came from an address outside **IP allow list**, or the workflow is disabled or archived. | Check those settings, and that the workflow is published and enabled. |
| `No subscriptions yet — bind a trigger to a workflow above.` | Nothing is subscribed in this project. | Add one with **+ Add subscription** or from the **Triggers** tab. |

## Where to next

- **[Run and debug](/guides/workflows/runs/)**: test the trigger and read each run.
- **[Expressions](/guides/workflows/expressions/)**: use the trigger's output in later steps.
- **[Endpoints](/guides/endpoints/)**: a stable, authenticated URL in front of a workflow.
