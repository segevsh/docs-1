---
key: "workflows/expressions"
title: "Expressions"
section: "guides"
description: "Fill a step's parameter from an earlier step's output, the trigger, an input, a variable, a secret or a document, using the expression editor and the double-brace syntax."
summary: null
format: "markdown"
shared: true
order: 30
position: 10
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/workflows/expressions.md"
sourceSha: "b166001be88078ab45fe37cd1a89a0387710fcfc"
sourceRefSha: "5c12eada9888c3fb1031d01714feb32337be265b"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/5c12eada9888c3fb1031d01714feb32337be265b/docs/workflows/expressions.md"
syncedAt: "2026-10-13T12:10:33Z"
---


# Expressions

Most parameters don't hold a fixed value. An email step needs the address the trigger received, an
API call needs a key from your secrets, a message needs a template from your documents. An
expression is how a field says "use that value here". The same editor works in workflow steps and
in the **Input mapping** of [Functions](/guides/functions/) and [Endpoints](/guides/endpoints/).

## Insert a value with the expression editor

{% webui %}

1. Click **ƒx** inside the field. (On a field that already holds an expression, the button reads
   "Edit expression — browse variables, secrets & step outputs".)
2. In **Edit expression**, click a source in the left-hand column to insert it:
   - **Workflow state**: ⚡ `trigger.event`, and ▸ each earlier step's output. Click the arrow on a
     step to pick one field of its output. Steps that call an app also list a **Metadata** group
     with **App**, **App version**, **Action** and **Connection ID**: which app, version, action
     and connection the step used. The group is offered before you have tested the step, and not
     for built-in steps, Functions, Workflows or flow control.
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

You can also type references directly. Each one sits inside double braces. (A JSON field instead
takes a whole-value binding, described [below](#bind-a-whole-output-to-a-json-field), which is a
JSON value rather than text.)

| Reference | Value |
| --- | --- |
| `{{ trigger.event }}` | The payload of the event that started the run. |
| `{{ steps.<id>.output }}` | An earlier step's whole output. |
| `{{ steps.<id>.output.<field> }}` | One field of it. |
| `{{ steps.<id>.meta.app }}` | The id of the app an earlier step ran. |
| `{{ steps.<id>.meta.version }}` | The app version that actually ran, not the workflow's version. |
| `{{ steps.<id>.meta.action }}` | The action that ran. |
| `{{ steps.<id>.meta.connectionId }}` | The stored connection the step used as its source. Empty (`null`) when the step used no stored connection, including when the host synthesised a credential or was given an inline one. |
| `{{ inputs.<key> }}` | A Function's or Endpoint's input. In **Input mapping**, plain `inputs.<key>` works too. |
| `{{ vars.<name> }}` | A variable. See [Secrets & variables](/guides/secrets-and-variables/). |
| `{{ secrets.<name> }}` | A secret. Its value never appears in Studio. |
| `{{ documents.<KEY> }}` | A document's content. See [Documents](/guides/documents/). |
| `{{ documents.<KEY>.<field> }}` | One top-level field of a JSON or YAML document. |
| `{{ vars.region \|\| "eu" }}` | A fallback: the first value that's set. `??` works the same way. |

A step id can't contain a dot (`.`), because the dot separates the parts of a `steps.<id>…`
reference.

Typing the closing `}}` turns the text into a chip. Double-click a chip to edit it as text again,
or click **×** to remove it.

Double braces around anything other than the roots above (`trigger`, `steps`, `inputs`, `vars`,
`secrets`, `documents`, `foreach`, `output`) are left alone as plain text. That's so a vendor's own
placeholders, such as `{{first_name}}` in an email template, pass through untouched.

## Step metadata

Only a step that ran successfully gives later steps its metadata. A skipped or failed step gives
them none, and neither do runs and saved step tests from before this feature existed. Nothing is
backfilled: test the step again to record it. A `{{ }}` reference to absent
metadata reads as empty text everywhere, including when it is the only thing in a field. Only a
`{ "$": "steps.<id>.meta.<key>" }` marker typed by hand as JSON reads as no value, so a required
parameter bound that way fails. The editor does not offer metadata when you bind a JSON field, so
such a marker exists only if you type it as JSON.

For example, to hand an Eventbrite event to a Cohost step, map these into the next step's
parameters, where the earlier step is `get_event_1` (app `io.w6w.eventbrite`, action `get-event`):

- `{{ steps.get_event_1.output.id }}`: the event's id.
- `{{ steps.get_event_1.meta.connectionId }}`: the id of the connection the Eventbrite step used.

The destination parameter names are the Cohost action's own; use the ones it declares. The
connection id is plain input data. It is not the Cohost step's own connection and grants no access
to anything: the Cohost step still signs in with the connection chosen on that step.

## Bind a whole output to a JSON field

A JSON parameter, such as **Eventbrite Event (JSON)** on a transformer step, can take another
step's entire output as one value.

1. Click **ƒx** on the JSON field.
2. Under the upstream step, pick **Entire output**. If the step's fields are known, you can instead
   expand them and pick one field.

Studio saves a whole-value binding: `{ "$": "steps.get_event_1.output" }` for **Entire output**, or
`{ "$": "steps.get_event_1.output.<field>" }` for a single field. Metadata is not offered
here. The field then shows the reference with **Edit** and **Clear** buttons. The step
receives the native object, not text. Cancelling the
picker changes nothing. **Edit** reopens the picker; **Clear** goes back to the JSON text the
field held before, while the field stays open; after a reload there is nothing to go back to and
Clear leaves the field empty. Fields you can't edit (read-only) don't offer the picker.

A literal JSON value that is exactly an object with the single key `$` and a string value, in the
form above, is read as a binding, even if you typed it by hand. In a step **Test**, the binding
uses the upstream step's last saved test result.

A step **Test** reads only saved upstream step tests for `steps.<id>` references. A `{{ }}`
reference to metadata or output the saved test doesn't have (no saved test, or one saved before
metadata was recorded) reads as empty text, with no error. A `{ "$": ... }` binding to something
missing is refused instead, and the Test asks you to re-run that upstream test.
A malformed expression you wrote in the step is reported as a request error before the action
runs.

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
| `steps.<id>.meta.*` is empty | The step was skipped, failed, or ran before metadata was recorded. Built-in (`@w6w/*`), Function and Workflow steps never show Metadata. | Test or run the earlier app step again. |
| A document field resolves to nothing | Only top-level fields of JSON and YAML documents can be addressed. | Use the whole document, or restructure it. |

## Where to next

- **[Secrets & variables](/guides/secrets-and-variables/)**: create the values expressions refer to.
- **[Documents](/guides/documents/)**: store templates and configuration.
- **[Run and debug](/guides/workflows/runs/)**: see what each expression resolved to in a real run.
