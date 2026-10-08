---
key: "secrets-and-variables"
title: "Secrets & variables"
section: "guides"
description: "Store plaintext, typed variables and encrypted secrets by name so steps, Functions and Endpoints can use them, and rotate a secret without touching anything that uses it."
summary: null
format: "markdown"
shared: true
order: 200
position: 17
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/secrets-and-variables.md"
sourceSha: "45be5a12d26fb67782e3730690c8d08b544157fd"
sourceRefSha: "2e25e297622dec7966f7baafd584add3eba28641"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/2e25e297622dec7966f7baafd584add3eba28641/docs/secrets-and-variables.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Secrets & variables

Keep values that change between environments, or that must stay secret, out of your workflow
definitions. Store them once by name and refer to them with an expression:

- A **variable** is a typed, plaintext value, such as a base URL, a sender address, a limit or a
  flag. Variables belong to the project you're in.
- A **secret** is encrypted at rest and never returned by the server, such as an API key or a
  signing secret. Secrets belong to your account and every project can use them.

Change the value here and every step that refers to it picks up the new value on its next run.

Open the page from the sidebar: **Configure** → **Secrets & variables**.

## Add a variable

{% webui %}

1. Under **Variables**, click **+ Add variable**.
2. Enter a **Name**, for example `api_base_url`: lowercase letters, digits and underscores,
   starting with a letter or underscore, up to 64 characters.
3. Pick a **Type**: `string`, `number`, `boolean` or `json`, and enter the **Value**.
4. Optionally add a **Description**, then click **Save variable**.

{% endwebui %}

{% sdk-node %}

```ts
await client.vars.create({ name: "api_base_url", type: "string", value: "https://api.example.com" });
```

See [Node SDK](/clients/node/).

{% endsdk-node %}

{% cli %}

```bash
w6w vars create api_base_url --type string --value https://api.example.com
```

See [CLI](/clients/cli/).

{% endcli %}

How you know it worked: the variable appears in the list with a preview of its value. Use it in a
step as `{{ vars.api_base_url }}` (see [Expressions](/guides/workflows/expressions/)).

To change one, click its edit icon (**Edit &lt;name&gt;**) and click **Save changes**. The name can't
change. Each row also has **Call from code**, with a ready-made snippet to read the variable.

## Add a secret

1. Under **Secrets**, click **+ Add secret**.
2. Enter a **Name**, for example `openai_api_key`, with the same rules as a variable name.
3. Paste the **Value**, optionally add a **Description**, and click **Save secret**.

How you know it worked: the secret is listed by name. Its value is never shown again, anywhere in
Studio. Use it as `{{ secrets.openai_api_key }}`.

Never put a secret's value in a variable, a document or a parameter typed in plain text. Those are
stored and shown as plaintext.

## Rotate a secret

1. Click **Rotate** on the secret's row.
2. Paste the new value in **New value**. Leaving it blank keeps the current value, so you can change
   only the description.
3. Click **Save changes**.

How you know it worked: run a step that uses it, or open the step's run log: the call succeeds
with the new credentials.

## Delete

Click the bin icon and confirm **Delete variable** or **Delete secret**. Steps that still refer to
it fail on their next run, so search your workflows first.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `Value must be \`true\` or \`false\`.` | A boolean variable has another value. | Pick `true` or `false`. If you didn't change the default, choose it explicitly before saving. |
| `Value must be a finite number.` | A number variable isn't a number. | Enter a number. An empty number field saves as `0`. |
| The name is refused | It uses capitals, dashes or spaces, or starts with a digit. | Use lowercase letters, digits and underscores. |
| A step still uses the old value | It ran before you saved, or it refers to a different name. | Check the reference in the step, then run again. |
| A delete seems to do nothing | The delete failed without an error message. | Reload the page to check, and try again. |

## Where to next

- **[Expressions](/guides/workflows/expressions/)**: use variables and secrets in steps.
- **[Documents](/guides/documents/)**: store longer content, such as templates.
- **[Integrations](/guides/integrations/)**: for an API's own credentials, use an integration
  rather than a secret.
