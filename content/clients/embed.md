---
key: "embed"
title: "Embed the workflow editor"
section: "clients"
description: "Mount w6w's managed workflow editor in your own React app with one package, one stylesheet and one provider."
summary: null
format: "markdown"
shared: true
order: 100
position: 29
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/embed/index.md"
sourceSha: "87ce757894b0a5adddfba0a4c8423a51773bdc82"
sourceRefSha: "5c12eada9888c3fb1031d01714feb32337be265b"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/5c12eada9888c3fb1031d01714feb32337be265b/docs/embed/index.md"
syncedAt: "2026-10-16T00:52:17Z"
---


# Embed the workflow editor

`@w6w/embed` puts the same managed workflow editor used by Studio inside your React app.
Your users sign in through your product, connect apps, build workflows, test them and publish
without leaving it. The package handles session renewal, loading, autosave, run results and
version tools. You supply your login, a session endpoint, the selected company and project,
and your navigation.

For example, Cohost can give Dana an **Automations** area for her Bakery and a separate one for
her Catering company. Each company maps to a w6w account; switching companies changes the
session and clears the previous identity's cached data.

Start with the setup below, then add the [list and New automation button](/clients/embed/workflows/).
See the [reference](/clients/embed/reference/) for props, themes, account switching and logout.

## 1. Get your tenant credentials

A w6w operator provisions your tenant and gives you a client ID and client secret. Keep them
on your backend. The operator can also configure available apps and OAuth credentials for
connections such as Gmail.

Use your own stable, non-blank company ID as `accountRef`, for example `bakery-42`.
Do not prefix it with the tenant ID or substitute a w6w `acct_…` ID: changing the reference can
create a different, empty account. w6w resolves or creates the account on first use.

You need React and React DOM 18 or later, a browser app, and a backend with `fetch` support.
The package ships compiled ESM and types; installing the published package does not require
transpiling w6w source or configuring its expression engine.

## 2. Install

In your React app:

```sh
npm install @w6w/embed
```

React and React DOM are peer dependencies; install them too if your app does not already have
them. The SDK, React bindings, UI library and query library come with the embed package.
You do not need to assemble additional providers.

Import the stylesheet once in your app entry point (or Next.js root layout):

```ts
import "@w6w/embed/styles.css";
```

It includes the canvas styles. No separate React Flow stylesheet is needed.

## 3. Add one session endpoint

Install the server helper in the package that contains your backend:

```sh
npm install @w6w/sdk
```

Declare it directly because your server imports it, even if it is also an embed dependency.
Use `@w6w/sdk/server` only on the server.

The following handler uses standard `Request` and `Response` objects. Mount it at
`POST /api/w6w-session`; in Next.js App Router it can be `app/api/w6w-session/route.ts`.
Replace `authenticate` with your own server-side session and membership lookup. It must return
`null` for an anonymous caller, otherwise `{ userId: string, companyIds: string[] }` from your
trusted records.

```ts
import { createEmbedSessionClient } from "@w6w/sdk/server";
import { authenticate } from "./your-auth";

const sessions = createEmbedSessionClient({
  baseUrl: process.env.W6W_API_ORIGIN!,
  clientId: process.env.W6W_CLIENT_ID!,
  clientSecret: process.env.W6W_CLIENT_SECRET!,
});

function reply(status: number, body: unknown) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const user = await authenticate(request);
  if (!user) return reply(401, { error: "unauthenticated" });

  const body = await request.json().catch(() => null);
  const company = typeof body?.company === "string" ? body.company.trim() : "";
  if (!company) return reply(400, { error: "company_required" });
  if (!user.companyIds.includes(company)) {
    return reply(403, { error: "company_forbidden" });
  }

  try {
    const session = await sessions.create({
      subject: user.userId,
      accountRef: company,
    });
    return reply(200, {
      token: session.token,
      expiresAt: session.expiresAt,
      expiresIn: session.expiresIn,
    });
  } catch {
    return reply(502, { error: "session_unavailable" });
  }
}
```

The browser may request a company, but your server authorizes it. Never accept a user ID or
unchecked account reference from the request. Apply your host app's normal authentication and
CSRF protection to this route. The client secret stays in server environment variables; the
browser receives only a short-lived token and its expiry.

The endpoint is called again for renewal, so it must check login and membership on every call.
`expiresAt` is an ISO-8601 timestamp; `expiresIn` is an optional lifetime in seconds.

## 4. Wrap your Automations area

Keep one provider mounted around the list and editor routes. These props come from your host's
signed-in user and selected company. Only mount this area after your host has resolved them.

```tsx
// AutomationsProvider.tsx
"use client";

import { W6WEmbedProvider } from "@w6w/embed";
import { useCallback, type ReactNode } from "react";

type Props = {
  apiOrigin: string;
  userId: string;
  companyId: string;
  projectId: string;
  children: ReactNode;
};

export function AutomationsProvider({
  apiOrigin, userId, companyId, projectId, children,
}: Props) {
  const getSession = useCallback(async () => {
    const response = await fetch("/api/w6w-session", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: companyId }),
    });
    if (!response.ok) throw new Error(`Session request failed (${response.status})`);
    return response.json();
  }, [companyId]);

  return (
    <W6WEmbedProvider
      apiOrigin={apiOrigin}
      identityKey={JSON.stringify([userId, companyId])}
      getSession={getSession}
      project={projectId}
    >
      {children}
    </W6WEmbedProvider>
  );
}
```

`apiOrigin` is the same w6w API origin used by your backend, for example `https://api.w6w.io`.
The provider renews tokens before expiry, shares concurrent session requests, and rechecks the
session when a tab resumes. You do not need a token timer or browser token storage.

`identityKey` must change when the user or company changes. Keep the provider mounted during
that change; do not add a React `key` that remounts it. The callback captures the selected company
so renewal for the old identity can still request that company while pending edits are flushed.
See [switching and logout](/clients/embed/reference/#switching-companies-and-signing-out).

### Choose an actual project

A company/account and a project are different. `projectId` is the w6w project containing the
workflow, not your company ID. Select an existing project in the current account and use the
same ID for listing, creation and editing. Update it when the selected company changes.

If your product uses one project per company, obtain its default project from
`client.projects.list()` and select the row with `isDefault: true`. Listing ensures a new account
has a default project. A component inside the provider can get the client with `useEmbedClient`
from `@w6w/embed/draft`; see the [project example](/clients/embed/workflows/#choose-the-default-project).
You must still pass that project's ID explicitly to the editor or provider.

## 5. Render a workflow

For an existing workflow, render this inside the provider:

```tsx
import { WorkflowEditor } from "@w6w/embed/editor";

export function WorkflowPage({ workflowId }: { workflowId: string }) {
  return (
    <div style={{ height: "calc(100dvh - 64px)", minHeight: 480 }}>
      <WorkflowEditor workflowId={workflowId} />
    </div>
  );
}
```

Compose the two components in your authenticated host layout:

```tsx
<AutomationsProvider
  apiOrigin="https://api.w6w.io"
  userId={user.id}
  companyId={company.id}
  projectId={project.id}
>
  <WorkflowPage workflowId={workflowId} />
</AutomationsProvider>
```

The editor fills its container; give the container a height. The heavy canvas is imported lazily
when needed. The provider and editor still contribute code to your application bundle.

This minimal example uses the provider's project and opens an existing workflow. Add
`onNavigate` to connect the Back button and workflow links to your router. The
[Automations page example](/clients/embed/workflows/) includes navigation, creating a workflow
before opening it, and loading and error states.

## What your customer can do

| Customer action | What the integration provides |
| --- | --- |
| Open Automations for the Bakery | Your list shows workflows for the Bakery's session and selected project. |
| Create an automation | Your New button creates a saved draft and opens the managed editor. |
| Connect Gmail and add steps | The canvas offers available apps, connection dialogs and field mappings. OAuth requires the operator's provider credentials. |
| Edit the workflow | Autosave is on by default. Save and Ctrl/Cmd+S remain available; Workflow settings can turn autosave off. |
| Test a step, then Run | The editor manages step tests and run results. Run flushes pending edits before starting the stored draft. |
| Publish | The editor flushes pending edits, checks publish requirements and creates a version. Version tools support inspecting and reverting versions. |
| Edit the same workflow in two tabs | A conflicting save is refused and the editor offers recovery instead of overwriting the other tab. |
| Switch to Catering or sign out | The provider can flush pending drafts into the old account; your host coordinates identity changes and logout. This is a bounded attempt, not a guarantee that every edit was saved. |

## Scope and compatibility

The managed screen is the workflow editor. Your host builds the workflow list and its own
navigation; there is no managed Integrations screen, Functions editor, Dashboard or
`EmbeddedStudio` component in this package. An iframe launch is a separate integration.

The editor also uses internal server operations that have no compatibility guarantee. Keep the
embed package and its dependencies current with your w6w server, and test upgrades against your
integration. Installing a client release does not establish which server fixes are deployed.

`@w6w/embed` is source-available under FSL-1.1-ALv2. Its Competing-Use clause applies; each
version converts to Apache-2.0 after two years. The SDK, React bindings and UI library it depends
on are MIT.
