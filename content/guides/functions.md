---
key: "functions"
title: "Functions"
section: "guides"
description: "Give one API operation a stable name and a fixed set of inputs, bind it to an app action, and swap the vendor underneath later without changing any caller."
summary: null
format: "markdown"
shared: true
order: 130
position: 5
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/functions.md"
sourceSha: "9b77f6386668c09ab169ae13694cfac475c5d013"
sourceRefSha: "015853978c4f9263eb1dc504226820872c8f26bd"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/015853978c4f9263eb1dc504226820872c8f26bd/docs/functions.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Functions

A Function is a reusable operation with a name your code calls, such as `send-email` or
`create-contact`, and a fixed set of inputs. Behind it sits one implementation: an app action, another
Function or a Workflow. When you change provider, for example moving email from one vendor to
another, you re-bind the Function, and every caller keeps working without a code change.

Functions belong to your account and every project can use them.

## Create a Function

{% webui %}

1. In the sidebar, under **Build**, click **Functions**.
2. Click **+ New function**. The **New function** dialog opens.
3. Enter a **Name**, for example "Send Email".
4. Enter a **Key**, for example `send-email`: lowercase, kebab-case, 3–39 characters. It becomes part
   of the address callers use, and you can't change it later.
5. Optionally add a **Description**, then click **Create**.

{% endwebui %}

How you know it worked: the Function's editor opens, with an **incomplete** badge because nothing is
bound yet.

## Define its inputs

The **Inputs** card is the Function's contract: what a caller sends.

1. Click **+ Add input**.
2. Fill in its **key** (what callers send, like `to`), a **Label**, and a type: `string`, `text`,
   `number`, `boolean`, `json` or `secret`. Tick required if callers must always send it.
3. Repeat for each input.

## Bind the implementation

1. In the **Implementation** card, pick a **Kind**: **Action (synchronous)**, **Function
   (synchronous)** or **Workflow (asynchronous)**.
2. For an action, click **+ Choose an action**, then pick the app, the integration and the action.
3. Under **Input mapping**, fill in each of the action's parameters. Type `inputs.<key>` to pass one
   of your inputs through, for example `inputs.to`. Anything else is a fixed value. Use the **ƒx**
   button for a variable, secret or document (see [Expressions](/guides/workflows/expressions/)).
4. Click **Save**.

How you know it worked: **Saved.** appears and the **incomplete** badge is gone.

To change provider later, click **Change** in **Implementation**, pick the other app's action, map
the same inputs and save. The key and inputs stay the same, so callers don't notice.

## Test it

A Function must be published before it can be invoked, including from **Test invoke**.

1. Save your edits.
2. Open the **Settings** panel on the right-hand tool rail and click **Publish** (see
   [Publish and versions](/guides/publishing/)).
3. In **Test invoke**, fill in a value for each input and click **Invoke**.

How you know it worked: the result shows a status line (`status · N ms · invocationId`) above the
vendor's answer. Find the call again under [History](/guides/history/).

## Call it from code

{% sdk-node %}

```ts
const result = await client.functions.run("send-email", { payload: { to: "a@example.com" } });
```

See [Node SDK](/clients/node/).

{% endsdk-node %}

{% cli %}

```bash
w6w functions run send-email --payload '{"to":"a@example.com"}'
```

See [CLI](/clients/cli/).

{% endcli %}

The **Code** panel on the tool rail gives the same call ready-made for Node, CLI, Python and curl.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `Can’t save yet — map …` | A required action parameter has no value under **Input mapping**. | Map it to an input or give it a fixed value. |
| The **incomplete** badge stays | No action, Function or Workflow is bound. | Finish **Implementation**. |
| `Pick an app and action to test this function — it has no implementation bound yet.` | **Test invoke** has nothing to run. | Bind an implementation and save. |
| Invoking answers that it `has never been published and cannot be invoked` | You saved but never published. | Click **Publish** in the **Settings** panel. |
| The key is refused as taken | Another Function in your account already uses it. | Choose another key. |

## Where to next

- **[Publish and versions](/guides/publishing/)**: publish, roll back, disable or archive.
- **[The tool rail](/guides/tool-rail/)**: rename, export, call from code and set error handling.
- **[Endpoints](/guides/endpoints/)**: give the Function a URL with its own authentication.
