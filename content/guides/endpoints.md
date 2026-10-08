---
key: "endpoints"
title: "Endpoints"
section: "guides"
description: "Give an action, Function or Workflow a stable URL that callers POST to, choose who may call it, and re-point it later without breaking anyone."
summary: null
format: "markdown"
shared: true
order: 140
position: 6
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/endpoints.md"
sourceSha: "1fb76337d637e309afa3001143324c04ad382b3a"
sourceRefSha: "2e25e297622dec7966f7baafd584add3eba28641"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/2e25e297622dec7966f7baafd584add3eba28641/docs/endpoints.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Endpoints

An Endpoint is a stable URL that callers POST to. It dispatches to one target: an app action, a
Function or a Workflow. Callers bind to the URL, so you can later move the target from an action to
a Function or a Workflow without breaking a single caller. Each Endpoint also chooses its own
authentication, so you can hand a URL to a vendor's webhook settings or a partner without giving
them a W6W token.

Endpoints belong to your account.

## Create an Endpoint

{% webui %}

1. In the sidebar, under **Build**, click **Endpoints**.
2. Click **+ New endpoint**. The **New endpoint** dialog opens.
3. Enter a **Name**, for example "Notify Customer", and a **Key**, for example `notify-customer`:
   lowercase, kebab-case, 3–39 characters. The key is part of the URL and can't be changed later.
4. Optionally add a **Description**, then click **Create**.

{% endwebui %}

How you know it worked: the Endpoint's editor opens with its **Identity** card filled in.

## Configure it

1. **Input**: declare the fields callers send, with **+ Add input**. Leave it empty to pass the raw
   request body through to the target unchanged.
2. **Target**: pick a **Kind** (**Action (synchronous)**, **Function (synchronous)** or
   **Workflow (asynchronous)**), choose the target, and map its parameters under **Input mapping**
   with `inputs.<key>`. A Workflow target queues a run and answers straight away.
3. **Security**: choose **Who may call it**:

   | Option | Who can call | Runs as |
   | --- | --- | --- |
   | **Platform auth (default)** | Anyone with a W6W token (or your organisation's sign-in token), like the rest of the API. | The caller. |
   | **None — public** | Anyone with the URL. | The Endpoint's owner. |
   | **Basic auth** | Callers with the **Username** and **Password** you set. | The Endpoint's owner. |
   | **Header auth** | Callers that send the **Header name** with the **Header value** you set. | The Endpoint's owner. |
   | **JWT (HMAC)** | Callers with a Bearer JWT signed HS256 with the **JWT secret (HS256)** you set. | The Endpoint's owner. |

4. Click **Save**.

How you know it worked: **Saved.** appears, and the list no longer shows the **Unfinished** tag on
this Endpoint.

## Find its URL

The **URL** card shows the address to call, `POST <url>`, with a copy button.

- **By id** is the stable address issued by the server. It never changes.
- **By key** is the readable address built from your account and the key.
- If your server offers more than one domain, choose one under **Domain**. A domain marked
  **Not routable yet** has no DNS or TLS behind it, so calls to it fail until it does.

Send the declared input as a JSON body.

## Test it

An Endpoint must be published before it can be invoked.

1. Save, then click **Publish** in the **Settings** panel on the tool rail (see
   [Publish and versions](/guides/publishing/)).
2. In **Test invoke**, fill in the inputs and click **Invoke**.

How you know it worked: the result shows the status and timing above the target's answer. From
outside Studio, a call to the URL answers the same way:

```bash
curl -X POST "<endpoint-url>" \
  -H "Authorization: Bearer $W6W_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"a@example.com"}'
```

Use the header your **Security** choice requires in place of `Authorization` when it isn't
**Platform auth (default)**.

## Call it from code

{% sdk-node %}

```ts
const result = await client.endpoints.run("notify-customer", { payload: { email: "a@example.com" } });
```

See [Node SDK](/clients/node/).

{% endsdk-node %}

{% cli %}

```bash
w6w endpoints run notify-customer --payload '{"email":"a@example.com"}'
```

See [CLI](/clients/cli/).

{% endcli %}

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| **Unfinished** tag in the list | No target is set, so the Endpoint can't be invoked. | Finish the **Target** card and save. |
| `Can’t save yet — the target needs …` | A required parameter of the target has no mapping. | Map it under **Input mapping**. |
| `401` from the URL | The caller didn't send what **Who may call it** requires. | Send the token, header, Basic credentials or JWT you configured. |
| The answer says it `has never been published and cannot be invoked` | You saved but never published. | Click **Publish** in the **Settings** panel. |
| The URL can't be reached | The selected domain is **Not routable yet**. | Pick another **Domain**, or wait until DNS and TLS are set up. |

## Where to next

- **[Publish and versions](/guides/publishing/)**: publish, roll back, disable or archive.
- **[Functions](/guides/functions/)**: build a reusable target for this Endpoint.
- **[Workflows](/guides/workflows/)**: run several steps behind one URL.
