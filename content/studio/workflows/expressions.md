---
key: "workflows/expressions"
title: "Expressions"
section: "studio"
description: "Fill a step's parameter from an earlier step's output, the trigger, an input, a variable, a secret or a document, using the expression editor and the double-brace syntax."
format: "markdown"
shared: true
order: 30
position: 10
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/workflows/expressions.md"
sourceSha: "9c01f00d21eec14e31deb19283d1f9e3b43841fb"
sourceRefSha: "d1bba44c58b043319966cf16e85a13196e68fe4a"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/d1bba44c58b043319966cf16e85a13196e68fe4a/docs/workflows/expressions.md"
syncedAt: "2026-10-06T03:44:03Z"
---


# Expressions

Most parameters don't hold a fixed value. An email step needs the address the trigger received, an
API call needs a key from your secrets, a message needs a template from your documents. An
expression is how a field says "use that value here". The same editor works in workflow steps and
in the **Input mapping** of [Functions](/studio/functions/) and [Endpoints](/studio/endpoints/).

## Insert a value with the expression editor

{% webui %}

1. Click **ƒx** inside the field. (On a field that already holds an expression, the button reads
   "Edit expression — browse variables, secrets & step outputs".)
2. In **Edit expression**, click a source in the left-hand column to insert it:
   - **Workflow state**: ⚡ `trigger.event`, and ▸ each earlier step's output. Click the arrow on a
     step to pick one field of its output.
   - **Inputs**: the Function's or Endpoint's declared inputs.
   - **Variables**, **Documents** and **Secrets** from your project and account. **+ Add** creates
     a new variable or secret on the spot.
3. Mix inserted values with plain text in **Expression** if you need to, for example
   `Hello {{ steps.lookup.output.name }}`.
4. Type example data under **Sample values** and check **Result**, the live preview. Secrets show as
   •••.
5. Click **Save**.

{% endwebui %}

How you know it worked: the field shows a chip for each reference, such as `lookup.name`. The chip
is only a label; the full reference is what gets saved. **Use a plain value** turns the field back
into a fixed value.

## The syntax

You can also type references directly. Each one sits inside double braces:

| Reference | Value |
| --- | --- |
| `{{ trigger.event }}` | The payload of the event that started the run. |
| `{{ steps.<id>.output }}` | An earlier step's whole output. |
| `{{ steps.<id>.output.<field> }}` | One field of it. |
| `{{ inputs.<key> }}` | A Function's or Endpoint's input. In **Input mapping**, plain `inputs.<key>` works too. |
| `{{ vars.<name> }}` | A variable. See [Secrets & variables](/studio/secrets-and-variables/). |
| `{{ secrets.<name> }}` | A secret. Its value never appears in Studio. |
| `{{ documents.<KEY> }}` | A document's content. See [Documents](/studio/documents/). |
| `{{ documents.<KEY>.<field> }}` | One top-level field of a JSON or YAML document. |
| `{{ vars.region \|\| "eu" }}` | A fallback: the first value that's set. `??` works the same way. |

Typing the closing `}}` turns the text into a chip. Double-click a chip to edit it as text again,
or click **×** to remove it.

Double braces around anything other than the roots above (`trigger`, `steps`, `inputs`, `vars`,
`secrets`, `documents`, `foreach`, `output`) are left alone as plain text. That's so a vendor's own
placeholders, such as `{{first_name}}` in an email template, pass through untouched.

## Documents as templates

A document chip has a ⇄ button: **Render this as a template** fills in the document's own
placeholders before the value is used, and **Stop rendering as a template** inserts it as-is. Use
it for an email body stored as a document that itself refers to step outputs.

## Secret fields

A parameter of type secret seals when you click away from it. Studio then shows 🔒 •••••• and a
**Replace** button. The value is encrypted and can't be read back through Studio.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| The value arrives as literal `{{ … }}` text | The root isn't one W6W recognises, or it's misspelt. | Insert the reference from the left-hand column instead of typing it. |
| A step's output isn't listed under **Workflow state** | The step doesn't run before this one. | Connect it earlier in the chain. |
| **Result** shows nothing for a step output | There's no sample value for it. | Fill in **Sample values**, or test-run the earlier step. |
| A document field resolves to nothing | Only top-level fields of JSON and YAML documents can be addressed. | Use the whole document, or restructure it. |

## Where to next

- **[Secrets & variables](/studio/secrets-and-variables/)**: create the values expressions refer to.
- **[Documents](/studio/documents/)**: store templates and configuration.
- **[Run and debug](/studio/workflows/runs/)**: see what each expression resolved to in a real run.
