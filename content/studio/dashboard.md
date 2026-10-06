---
key: "dashboard"
title: "Dashboard"
section: "studio"
description: "The page Studio opens on: today's and this week's workflow runs, a compact reliability board for the project, activity over time and the latest runs."
format: "markdown"
shared: true
order: 80
position: 15
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/dashboard.md"
sourceSha: "5b84bf912559dd42ad33cb9f05ab79da6419fe3c"
sourceRefSha: "d1bba44c58b043319966cf16e85a13196e68fe4a"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/d1bba44c58b043319966cf16e85a13196e68fe4a/docs/dashboard.md"
syncedAt: "2026-10-06T03:44:03Z"
---


# Dashboard

The **Dashboard** is the first page you see after signing in, and where the **w6w studio** logo takes
you. It answers "is everything all right?" in one screen.

Open it from the sidebar: **Observe** → **Dashboard**.

## What's on it

| Section | What it shows |
| --- | --- |
| **Today** and **Last 7 days** | Three numbers each: **Workflow runs**, **Succeeded** and **Failed**. |
| **Service reliability** | A compact version of the [Reliability](/studio/reliability/) board for this project: anything that **Needs attention** first, then your services. **Show all services →** opens the full board. |
| **Activity over time** | A chart of runs over recent days and weeks. |
| **Recent activity** | The latest calls and runs, each marked ✓ (succeeded), ✗ (failed) or – (other), with what kind it was (**Workflow run**, **Workflow step**, **Function call**, **Endpoint call**, **App action**, **Connection test** or **Node debug**) and when. Click a title to open that Function or workflow. |

Run counts and activity cover your whole account. The reliability board covers the project you're
in.

## Read it

- A non-zero **Failed** today: open **Recent activity**, or [History](/studio/history/) filtered
  to **Failed**, to see which runs failed and why.
- A service under **Needs attention**: click it to open its detail page on
  [Reliability](/studio/reliability/).
- Everything green and **All clear**: every service you called recently answered without
  degraded stretches or outages.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `No runs yet — activity shows up here once your workflows run.` | Nothing has run in this account yet. | Run a workflow or call a Function. |
| `No recent activity in this window.` | Nothing ran recently. | Check [History](/studio/history/) for older runs. |
| `No services yet — connect an integration or use a service in this project.` | No API has been called from this project. | Add an [integration](/studio/integrations/) and use it. |
| `Select a project to see its reliability.` | No project is selected. | Pick one with the **Project** switcher. |

## Where to next

- **[Reliability](/studio/reliability/)**: the full per-API board.
- **[History](/studio/history/)**: every run, with filters.
