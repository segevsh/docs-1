---
key: "integrations"
title: "Integrations"
section: "guides"
description: "Connect an API once by storing its credentials in W6W, check the connection works, and see what it can do."
summary: null
format: "markdown"
shared: true
order: 120
position: 2
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/integrations.md"
sourceSha: "6127800cc0d0e8fde7fbab0aac3afe58e8ce25cb"
sourceRefSha: "015853978c4f9263eb1dc504226820872c8f26bd"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/015853978c4f9263eb1dc504226820872c8f26bd/docs/integrations.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Integrations

An integration (the API calls it a *connection*) is your credentials for one app, stored encrypted
in W6W. Once it exists, every Function, Endpoint and Workflow in your account can call that API,
and none of your callers ever hold the API key, OAuth token or password themselves.

Integrations belong to your account, so every project in it can use them.

## Before you start

The app you want must be registered with your W6W server. Most servers carry the official
catalog, so search for it first. If you can't find it, see [Apps](/guides/integrations/apps/).

## Add an integration

{% webui %}

1. In the sidebar, under **Connect**, click **Integrations**.
2. Click **+ Add integration**. The **Add connection** dialog opens.
3. Type in **Search apps to connect…**, or narrow the list with the category chips, and pick the
   app.
4. If the app supports more than one way to authenticate, choose one under **Auth method**.
5. Give it a **Display name** you'll recognise, for example "Stripe (live)".
6. Fill in the credential fields the app asks for, such as an API key, then click **Save
   connection**.
   - For an OAuth app, click **Sign in with &lt;app&gt;** instead. A popup opens at the vendor;
     approve access there, and the popup closes itself.
   - For an app that needs no credentials, click **Use this**.

{% endwebui %}

How you know it worked: the new integration appears under **Stored integrations**. Click it: the
banner at the top reads **✓ Connection is valid**, followed by when it was last checked.

## Check an integration

Click an integration in the list to open its page:

- **Test connection** (top right) asks the vendor whether the stored credentials still work. The
  banner turns green when they do, or shows the vendor's reason when they don't.
- The **App** card shows which app this is. **← Integrations** goes back to the list.
- **Actions** lists everything the app can do. A search box appears when there are more than ten.
  Click one to try it; see [Test an action](/guides/integrations/test-actions/).
- **Recent runs** shows the latest calls made through this integration.

## Change or rotate credentials

1. On the **Integrations** list, click the pencil (edit) icon on the row.
2. In **Edit connection**, type only the values you want to change. A field you leave blank keeps
   its current value.
3. Click **Save connection**.

How you know it worked: open the integration and click **Test connection**. The banner reads
**✓ Connection is valid**.

For an OAuth integration there's no re-authorise button. To sign in again (for example, to grant
more permissions), add a new integration for the same app and point your steps at it.

## Delete an integration

Click the bin icon on its row and confirm **Delete connection**. Anything that still uses it
(a Function, a workflow step) fails until you point it at another integration.

## Call it from code

Every call your code makes goes through W6W with your W6W token, never the vendor's credentials.
The integration's id looks like `conn_01H…`.

{% sdk-node %}

```ts
const env = await client.run({ urn: "conn_01H…", action: "send_email", payload: { to: "a@example.com" } });
```

See [Node SDK](/clients/node/).

{% endsdk-node %}

{% cli %}

```bash
w6w connections list
w6w run conn_01H… --action send_email --payload '{"to":"a@example.com"}'
```

See [CLI](/clients/cli/).

{% endcli %}

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| The app isn't in **Search apps to connect…** | It isn't registered on your server, or your organisation's app policy hides it. | Register it under [Apps](/guides/integrations/apps/), or ask your administrator. |
| `No integrations yet — add one above. You'll need a registered app first (see Apps)` | Your account has no integrations. | Click **+ Add integration**. |
| `Popup blocked — allow popups for this site and try again.` | The browser blocked the OAuth popup. | Allow popups for your Studio address and click **Sign in with &lt;app&gt;** again. |
| The row shows an **invalid** tag, or the banner is red | The vendor rejected the stored credentials: a revoked key or an expired token. | Edit the integration with fresh credentials, or add a new one for an OAuth app. |
| `Permission denied by the provider — …` when you run an action | The credentials work but lack a scope or role that action needs. | Grant the permission at the vendor, or connect with an account that has it. |

## Where to next

- **[Test an action](/guides/integrations/test-actions/)**: call one of the app's actions and save the call as a test.
- **[Apps](/guides/integrations/apps/)**: register an app your server doesn't have yet.
- **[Functions](/guides/functions/)**: give one of these actions a stable name your code calls.
- **[Reliability](/guides/reliability/)**: see how this API is performing.
