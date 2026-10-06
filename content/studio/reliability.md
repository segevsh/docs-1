---
key: "reliability"
title: "Reliability"
section: "studio"
description: "See how every API your project calls is performing over the last 30 days, from your own calls and from the vendor's status page, and drill into one service's errors and latency."
format: "markdown"
shared: true
order: 90
position: 16
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/reliability.md"
sourceSha: "d7cc9ff5bb504e5a7d04d7760c07c44cecb5659f"
sourceRefSha: "d1bba44c58b043319966cf16e85a13196e68fe4a"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/d1bba44c58b043319966cf16e85a13196e68fe4a/docs/reliability.md"
syncedAt: "2026-10-06T03:44:03Z"
---


# Reliability

**Reliability** shows the health of every API your project depends on, first-party and third-party
alike, in one board. Each service gets two signals:

- **Ops**: how your own calls through W6W went: errors and latency.
- **API**: what the vendor's own status page says, when it publishes one.

A service can be fine on one and not the other. Your calls can fail because a key was revoked
while the vendor reports all green, and the vendor can report an incident that hasn't touched your
calls yet.

The services listed are the integrations across your account. The numbers come from the project
you're in.

## Read the board

{% webui %}

1. In the sidebar, under **Observe**, click **Reliability**.
2. Read **Service reliability** for the window shown (the last 30 days):
   - **Needs attention**: services with a problem now, or earlier in the window, as cards at the
     top;
   - **Performance across your APIs**: a chart of the services;
   - a table with **Service**, **Status** (the **Ops** and **API** lines), a bar for the **Last 30
     days**, and **Latency**.
3. Click a service to open its detail page.

{% endwebui %}

How you know everything's fine: the board shows **All clear**: every service you called in the
window came back without degraded stretches or outages.

Statuses read **Operational**, **Degraded**, **Down**, **Unknown** or **Unavailable**. **Unknown**
means W6W has no recent evidence either way; **Unavailable** on the **API** line means the vendor's
status page couldn't be read.

## Look at one service

The detail page has:

- **Calls in window**, **p95 latency**, **Last call** and **Errors**;
- **Error mix**: which kinds of error, and how many;
- **API status**: what was read from the vendor's own status page, including any incidents;
- **Last 30 days**: the day-by-day bar;
- **Recent calls**: up to the latest 50, with **When**, **Action**, **Method**, **Status** and
  **Took**.

**← Back to all services** returns to the board.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `No services yet — connect an integration or use a service in this project.` | Nothing has been called from this project. | Add an [integration](/studio/integrations/) and call it. |
| A service shows **Unknown** | No calls in the window and no health check result. | Call it, or **Test connection** on its integration. |
| **Ops** is down but **API** is operational | The problem is on your side: credentials, permissions or the parameters you send. | Open **Recent calls** and **Error mix**, then check the [integration](/studio/integrations/). |
| `Select a project to see its reliability.` | No project is selected. | Pick one with the **Project** switcher. |

## Where to next

- **[Integrations](/studio/integrations/)**: fix or rotate a failing service's credentials.
- **[History](/studio/history/)**: the runs behind a failure.
- **[Dashboard](/studio/dashboard/)**: the compact version of this board.
