---
key: "embed/workflows"
title: "Build your Automations page"
section: "clients"
description: "List, create and open workflows using the public embed package, with project selection and host routing."
summary: null
format: "markdown"
shared: true
order: 10
position: 30
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/embed/workflows.md"
sourceSha: "6813186373babbdcc358d45d55058ce9e248cbca"
sourceRefSha: "5c12eada9888c3fb1031d01714feb32337be265b"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/5c12eada9888c3fb1031d01714feb32337be265b/docs/embed/workflows.md"
syncedAt: "2026-10-16T00:52:17Z"
---


# Build your Automations page

After the [quickstart](/clients/embed/), your provider handles sessions and the editor handles
workflow authoring. Add a small list screen and connect it to your router to complete the
customer's Automations area.

This example uses only `@w6w/embed` entry points. It reuses the provider's client and query cache;
do not create another provider or a second save loop around the editor.

## List, create and open

Mount `AutomationsPage` inside `W6WEmbedProvider`. Pass your router's current workflow ID,
optional `run` query parameter, and navigation function. Leave `workflowId` unset on the list
route. Pass the selected account's project ID explicitly.

```tsx
// AutomationsPage.tsx
"use client";

import {
  WorkflowEditor,
  type WorkflowEditorNavigation,
} from "@w6w/embed/editor";
import {
  newCallableId,
  useCreateWorkflowMutation,
  useWorkflowsQuery,
} from "@w6w/embed/repos";

type Props = {
  projectId: string;
  workflowId?: string;
  initialRunId?: string;
  navigate: (path: string) => void;
};

function workflowPath(id: string) {
  return `/automations/${encodeURIComponent(id)}`;
}

function WorkflowList({ projectId, navigate }: Pick<Props, "projectId" | "navigate">) {
  const workflows = useWorkflowsQuery(projectId, Boolean(projectId));
  const create = useCreateWorkflowMutation(projectId);

  function createWorkflow() {
    const id = newCallableId("workflow");
    create.mutate({
      manifestVersion: "2",
      id,
      name: id,
      displayName: "Untitled automation",
      trigger: { type: "manual" },
      steps: [],
    }, {
      onSuccess: (result) => navigate(workflowPath(result.workflow.id)),
    });
  }

  if (!projectId) return <p>Select a project to continue.</p>;
  if (workflows.isPending) return <p>Loading automations…</p>;
  if (workflows.isError) {
    return (
      <div role="alert">
        <p>Could not load automations: {workflows.error.message}</p>
        <button onClick={() => void workflows.refetch()}>Try again</button>
      </div>
    );
  }

  return (
    <section>
      <h1>Automations</h1>
      <button disabled={create.isPending} onClick={createWorkflow}>
        {create.isPending ? "Creating…" : "New automation"}
      </button>
      {create.isError && <p role="alert">{create.error.message}</p>}
      {workflows.data.length === 0 && <p>Create your first automation to get started.</p>}
      <ul>
        {workflows.data.map((workflow) => (
          <li key={workflow.id}>
            <button onClick={() => navigate(workflowPath(workflow.id))}>
              {workflow.displayName || workflow.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AutomationsPage({ projectId, workflowId, initialRunId, navigate }: Props) {
  function onNavigate(to: WorkflowEditorNavigation) {
    if (to.type === "list") {
      navigate("/automations");
    } else if (to.type === "workflow") {
      navigate(workflowPath(to.id));
    } else {
      navigate(`${workflowPath(to.id)}?run=${encodeURIComponent(to.runId)}`);
    }
  }

  if (!workflowId) return <WorkflowList projectId={projectId} navigate={navigate} />;

  return (
    <div style={{ height: "calc(100dvh - 64px)", minHeight: 480 }}>
      <WorkflowEditor
        workflowId={workflowId}
        project={projectId}
        initialRunId={initialRunId}
        onNavigate={onNavigate}
        slots={{ backLabel: "← Automations" }}
      />
    </div>
  );
}
```

The create mutation saves the new workflow before navigation. `WorkflowEditor` expects an
existing ID; rendering an invented ID does not create a workflow. Creation also invalidates
the list cache, so the new row appears when the customer returns to the list.

`useWorkflowsQuery` returns the array as `data`, not `data.workflows`. These hooks are from
`@w6w/embed/repos`; they are different from the lower-level `useWorkflows` and
`useCreateWorkflow` hooks in `@w6w/react`.

## Connect your router

| Host route | Props for `AutomationsPage` |
| --- | --- |
| `/automations` | `projectId`, `navigate` |
| `/automations/:id` | Add `workflowId` from the route parameter. |
| `/automations/:id?run=:runId` | Also pass `initialRunId` from the `run` query parameter. |

For React Router, pass `useNavigate()` as `navigate`. In a Next.js client component, pass
`(path) => router.push(path)` from your host router. Keep the provider in the shared Automations
layout, above these routes and any Suspense boundary that hides them. Do not key the editor on
`workflowId`; passing the new ID lets its draft lifecycle handle the old workflow's pending save.

`onNavigate` receives an object (`list`, `workflow` or `run`), not a URL. The example maps all
three to your product's URLs. Adjust `workflowPath` and the list path if your product includes
the company or project in its routes.

## Choose the default project

If your host already knows the selected w6w project, use that ID. Otherwise, for a product with
one project per company, this wrapper selects the current account's default project. Render it
inside `W6WEmbedProvider` without a `project` prop; it passes the resolved ID directly to the
list and editor. It uses the same `AutomationsPage` file above.

```tsx
// DefaultProjectAutomations.tsx
"use client";

import { useEmbedClient } from "@w6w/embed/draft";
import { useEffect, useState, type ComponentProps } from "react";
import { AutomationsPage } from "./AutomationsPage";

type Props = Omit<ComponentProps<typeof AutomationsPage>, "projectId">;

export function DefaultProjectAutomations(props: Props) {
  const client = useEmbedClient();
  const [projectId, setProjectId] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setProjectId(undefined);
    setError(undefined);
    client.projects.list().then((projects) => {
      if (cancelled) return;
      const project = projects.find((item) => item.isDefault);
      if (project) setProjectId(project.id);
      else setError("No default project is available.");
    }).catch(() => {
      if (!cancelled) setError("Could not load the project's details.");
    });
    return () => { cancelled = true; };
  }, [client]);

  if (error) return <p role="alert">{error}</p>;
  if (!projectId) return <p>Loading project…</p>;
  return <AutomationsPage {...props} projectId={projectId} />;
}
```

The provider remounts its children when the identity changes, so this selection runs again for
the new company. Listing projects creates a default project when the account has none.
Explicitly selecting that returned ID is supported; omitting the editor's project and expecting
it to choose one is not.

## Walk through the customer outcome

1. Sign in to your product and open Automations for the Bakery. Click **New automation**.
2. Add a trigger and an app action, such as sending email. Use the step's connection control to
   connect the app. OAuth choices depend on the operator's configured provider credentials and
   the apps allowed for your tenant.
3. Fill required fields and mappings. Autosave is enabled by default. Save any changes inside an
   open expression dialog to commit them to the workflow.
4. Test the trigger with sample input, then test the action. Apps that require a passing saved
   test must have one before publishing.
5. Click **Run**. The editor saves pending edits first, starts the saved draft, and shows live
   results. A blocked or failed flush prevents the run. You can test an unpublished draft.
6. Click **Publish** once the workflow is valid. Publishing also waits for the pending save.
   Use the Settings tool's version history to inspect or revert a previous version. Reverting
   changes the live definition; review it before continuing.
7. Switch to Catering using your host's company switcher. Update the identity, session callback,
   project and route together. The new company's list should contain only its workflows.

See [lifecycle and troubleshooting](/clients/embed/reference/) for conflicting edits, failed
saves, account switching and logout. Run and step tests execute real actions; an email test can
send an email.
