---
key: "integrations/test-actions"
title: "Test an action"
section: "guides"
description: "Run one of an app's actions through your integration, see the exact calls W6W made, add vendor fields the action doesn't declare, and save the call as a reusable test."
summary: null
format: "markdown"
shared: true
order: 10
position: 3
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/integrations/test-actions.md"
sourceSha: "c27afb104d44860dd64c35533fa423528cd81daf"
sourceRefSha: "015853978c4f9263eb1dc504226820872c8f26bd"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/015853978c4f9263eb1dc504226820872c8f26bd/docs/integrations/test-actions.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Test an action

Before you build on an action, try it. The action tester runs one action through your integration,
with the parameters you fill in, and shows the result alongside every HTTP call W6W made to the
vendor. Save the call as a test and you can rerun it later. Some workflow steps also need a passing
saved test before you can publish (see [Workflows](/guides/workflows/)).

## Run an action

{% webui %}

1. Open **Integrations** and click the integration.
2. Under **Actions**, click the action you want.
3. Under **Parameters**, fill in the form. Switch to **JSON** to paste the parameters as one JSON
   object instead.
4. Click **Run action**.

{% endwebui %}

How you know it worked: **Result** shows the vendor's answer, and **API calls (N)** lists each
request W6W sent, with its status and timing.

## Add a field the action doesn't declare

Sometimes the vendor accepts a field the action's form doesn't offer, such as an extra header or a
less common body field. Use **Overrides** for those:

1. Expand **Overrides** ("Reach a vendor field this action's own params don't declare").
2. Enter a JSON object in **Body**, **Query** or **Headers**, naming each field the way the
   vendor's own API reference names it, for example `{"cc": [{"email": "ops@example.com"}]}`.
3. If the action makes more than one HTTP call, choose which ones get the override with **Target**
   (`first`, the default; `first-write`, the first call that isn't a GET or HEAD; or `all`), and optionally
   narrow it with **Match**, a piece of text the request URL must contain.
4. Click **Run action**.

Overrides are merged onto the outgoing request at the wire. Objects merge field by field and arrays
merge item by item, so adding one field keeps the rest of what the action sends. To replace a value outright, end
its key with `!`, for example `{"categories!": ["transactional"]}`. Overrides never change
authentication or the request's host and path.

How you know it worked: expand the call under **API calls (N)** and the field appears in the
request.

## Save the call as a test

1. After a run, click **Save test**.
2. In **Name this saved test**, give it a name and save.

How you know it worked: the test is listed under the action on the integration's page. Click it to
reopen the tester with the same parameters. **Delete** removes it.

## Call it from code

Click **Call from code** in the tester for the same call as a ready-made snippet, with **Node**,
**CLI** and **Python** tabs. The snippet uses your W6W token from `W6W_TOKEN` and the server address
from `W6W_BASE_URL`. See [Node SDK](/clients/node/) and [CLI](/clients/cli/).

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `Permission denied by the provider — …` | The integration's credentials lack the scope or role this action needs. | Grant it at the vendor, or connect with an account that has it. |
| A required-field error before anything is sent | A required parameter is empty. | Fill in every field marked required. |
| The JSON view refuses your text | It isn't a single valid JSON object. | Fix the JSON, or switch back to **Form**. |
| An override seems to be ignored | It targets the wrong call or the wrong part of the request. | Check **API calls (N)**, then set **Target** and **Match** to the call you meant. |

## Where to next

- **[Integrations](/guides/integrations/)**: add or rotate the credentials behind this action.
- **[Functions](/guides/functions/)**: wrap the action in a stable name for your code.
- **[Workflows](/guides/workflows/)**: use the action as a step.
