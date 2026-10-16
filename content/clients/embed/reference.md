---
key: "embed/reference"
title: "Embed API and lifecycle"
section: "clients"
description: "Provider and editor props, themes, session boundaries, logout, Next.js integration and troubleshooting."
summary: null
format: "markdown"
shared: true
order: 20
position: 31
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/embed/reference.md"
sourceSha: "e23c4501b30099ef71c0f3077e40ad0ec64ed4cd"
sourceRefSha: "5c12eada9888c3fb1031d01714feb32337be265b"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/5c12eada9888c3fb1031d01714feb32337be265b/docs/embed/reference.md"
syncedAt: "2026-10-16T00:52:17Z"
---


# Embed API and lifecycle

Use the [quickstart](/clients/embed/) for setup and the
[Automations page](/clients/embed/workflows/) for a working list, create and navigation example.
This reference describes the managed editor's current behavior.

## Public entry points

| Import | Use |
| --- | --- |
| `@w6w/embed` | `W6WEmbedProvider` and `W6WEmbedProviderProps`. |
| `@w6w/embed/editor` | `WorkflowEditor`, `WorkflowEditorProps`, `WorkflowEditorNavigation`, `WorkflowEditorSlots`. |
| `@w6w/embed/styles.css` | One stylesheet for the editor, UI components and canvas. |
| `@w6w/embed/repos` | Data hooks, including `useWorkflowsQuery`, `useCreateWorkflowMutation`, and ID helpers. |
| `@w6w/embed/draft` | Advanced draft lifecycle, `useEmbedClient` and `useDraftRegistry`. |
| `@w6w/embed/lib` | Lower-level editor utilities; not needed for the standard integration. |

`@w6w/embed/chrome` is a workspace-only export, absent from the published export map. Do not
import it or `src/` paths in a host app. The root entry exports the provider; import the editor
from `/editor`, not the root.

## Provider props

| Prop | Meaning |
| --- | --- |
| `apiOrigin: string` | Required w6w API origin. |
| `getSession: () => Promise<Session>` | Required callback returning `{ token, expiresAt, expiresIn? }`; `expiresAt` is ISO-8601 and `expiresIn` is seconds. Throw on a failed host endpoint response. |
| `identityKey: string` | Required stable key identifying the user and company. Change it when either changes. Include tenant/environment if your host switches those too. |
| `project?: string` | Default w6w project ID for the editor. It does not select an account. |
| `theme?: "light" \| "dark"` | Your host's resolved theme. Omit to use the library's default theme resolution. |
| `ready?: boolean` | Defaults to `true`. Forwarded to the React bindings' read hooks; it is not a global request or mutation gate. |
| `fetch?: FetchLike` | Optional SDK transport override, usually for tests. It does not replace the fetch you write inside `getSession`. |
| `children` | Your embedded area. The provider owns its query cache and composes the API and UI providers. |

Do not render the editor or embed repository hooks before your host has an authenticated user
and an authorized company. `ready={false}` alone does not stop the editor's draft loader or
`@w6w/embed/repos` requests. Gate their rendering; for repository queries that accept it, also
use the `enabled` argument.

Session status is available through `useW6WSession` from `@w6w/react` if you want a host status
indicator: `loading`, `ready`, `renewing`, `expired` or `error`, plus `error`, `expiresAt` and
`refresh()`. It is not re-exported from `@w6w/embed`; declare `@w6w/react` as a direct dependency
if your code imports it, and keep it aligned with embed's dependency to share the same context.

## Editor props

| Prop | Meaning |
| --- | --- |
| `workflowId: string` | Required ID of a workflow that already exists. |
| `project?: string \| null` | Overrides the provider's project. Omission inherits it; `null` or `""` explicitly means no project. |
| `initialRunId?: string` | Displays this run at mount and when the value changes. |
| `onNavigate?: (to) => void` | Navigation requests described below. Omission is a no-op. |
| `slots?: WorkflowEditorSlots` | Customize the header as described below. |

The editor must be inside `W6WEmbedProvider`. With no resolved project, it shows a notice and
refuses saves and publishing. It never chooses the account's default project for a save.
Pass the workflow's actual project, since the supplied project is the destination of the save.

Navigation requests have these shapes:

```ts
type WorkflowEditorNavigation =
  | { type: "list" }
  | { type: "workflow"; id: string }
  | { type: "run"; id: string; runId: string };
```

Use `slots.backLabel` to rename the Back control and `slots.headerActions` to append your own
content while keeping Run, Publish and the other built-in controls:

```tsx
<WorkflowEditor
  workflowId={workflowId}
  slots={{
    backLabel: "← Automations",
    headerActions: <a href="/help/automations">Help</a>,
  }}
/>
```

`slots.header` replaces the entire built-in header, including its title, Back, Run and Publish
controls. When set, `headerActions` is ignored. Prefer the smaller slots for ordinary branding.

## Autosave, testing and conflicts

Autosave defaults to on and waits about 1.2 seconds after an edit. Workflow settings can disable
it. The Save control and Ctrl/Cmd+S allow an immediate save. Uncommitted expression-dialog edits
must first be saved in that dialog.

The editor's Run and Publish actions flush the draft before acting. A blocked or failed save
prevents the action. Run tests the stored draft; Publish also requires a trigger, configured
steps, required fields and passing saved tests where the app requires them.

A `409` save conflict marks the draft stale and stops automatic saves. **Reload from server**
replaces the local draft and discards its unsaved edits. **Keep editing** preserves the local
text but does not resolve the conflict; saves remain blocked until reload. There is no automatic
merge or retry that overwrites the newer server version.

The editor attempts a flush on workflow changes, unmount and page hide when autosave is enabled.
A browser close or reload may interrupt the request; this is not durable offline storage.

## Switching companies and signing out

For a company change, keep the same provider mounted and update `identityKey`, `getSession` and
the selected project together. Reset your route to the new company's list or a workflow in that
company. Do not add `key={identityKey}` to the provider: that bypasses its coordinated switch.

The provider keeps the old session callback, client and project while it attempts to flush
registered drafts. Then it replaces the API client and query cache, remounts its children, and
clears the old cache. Draft writes keep their original account/project context.

The flush waits at most five seconds. A failed, blocked or timed-out save does **not** cancel the
switch, and unsaved edits can be lost. They are not retried with the new company's identity.
This behavior differs from Run and Publish, which require a successful flush before proceeding.

Keep session requests tied to the company they were created for, as in the quickstart. A callback
that only asks for whichever company is currently active on the backend can mint the wrong
company's token during the old identity's flush. The endpoint must authorize the requested
company every time.

For an explicit logout, flush **before** destroying the host session or unmounting the provider.
A logout control inside the provider can use the existing registry:

```tsx
"use client";

import { useDraftRegistry } from "@w6w/embed/draft";
import { useState } from "react";

export function SignOutButton({ signOut }: { signOut: () => Promise<void> }) {
  const registry = useDraftRegistry();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function logout() {
    setPending(true);
    setError(undefined);
    try {
      await registry?.flushAll();
      await signOut();
    } catch {
      setError("Could not sign out. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button disabled={pending} onClick={() => void logout()}>
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
```

`signOut` is your host operation: end its session and remove the authenticated Automations area.
Disable further editing while logout is pending. `flushAll()` is bounded and never rejects;
completion means the attempt ended, not that every draft was saved. Changing `ready` to `false`
is neither logout nor a cache reset. An expired or already revoked host login may prevent the
last save from succeeding.

## Theme and layout

Pass your resolved `"light"` or `"dark"` mode to the provider. There is no `"system"` value;
omit the prop to follow `data-theme` on `<html>`, otherwise the OS preference. For a host with its
own theme state, pass that state explicitly so both CSS and theme-aware components agree.

The provider sets a `data-theme` wrapper with `display: contents`; it does not set the theme on
your document. Editor chrome rules are scoped under `.w6w-embed-root`. Give the editor a parent
with an explicit height and enough width for its canvas and tools.

Override the namespaced tokens on your embedded area after importing the stylesheet:

```css
.my-automations .w6w-embed-root {
  --w6w-accent: #6d4aff;
  --w6w-radius: 8px;
}
```

Wrap the editor container in `className="my-automations"` to apply these overrides. Components
rendered in portals may need the same token overrides on their own theme scope.

## Next.js

The published provider and editor entries have `"use client"` directives. Keep the quickstart's
`getSession` callback and any router callbacks in your own client component, and import the
stylesheet from the root layout. No `transpilePackages` entry for w6w source is needed when
using the compiled package.

A server component cannot pass an ordinary callback across the client boundary. The simplest
setup is the quickstart's POST route plus `AutomationsProvider.tsx`. Alternatively, pass a server
action as `getSession`: re-read and authorize the host session on every invocation, derive the
user from that session, validate any company selection, and return only the browser session
fields. Never trust caller-provided identity merely because the function is a server action.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Editor has no height or the canvas looks unstyled | Import `@w6w/embed/styles.css` once and give the container a height. |
| Project required / Save or Publish disabled | Pass an actual w6w project ID for this workflow. An explicit `null` or empty editor prop overrides a provider default. |
| Publish remains disabled | Check for a trigger, required step fields, required passing tests and save conflicts. |
| Back or workflow links do nothing | Map the navigation object in `onNavigate` to your router. |
| A new company appears empty | Check the plain `accountRef`, the selected project and `identityKey`; a different reference can create a new account. |
| Requests start before host login is ready | Conditionally mount the editor and data consumers; `ready` is not a universal gate. |
| Session requests fail or loop through errors | Inspect the host endpoint's status, current membership, token expiry format and matching API origins. Never return an error JSON body as a successful session. |
| OAuth is unavailable | Ask the operator to check allowed apps and that provider's OAuth credentials. |
| Another tab changed the workflow | Resolve the editor's conflict prompt; Keep editing does not enable overwriting the server copy. |

The package uses some internal server operations, so keep it compatible with your server when
upgrading. The managed editor does not add a stable contract for those operations.
