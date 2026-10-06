---
key: "settings/billing"
title: "Billing"
section: "studio"
description: "See your account's plan, its limits and your usage, download invoices, and upgrade or switch plans."
format: "markdown"
shared: true
order: 30
position: 22
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/settings/billing.md"
sourceSha: "bc9b2302ab7030db367e96b9423f7f3b798160ed"
sourceRefSha: "d1bba44c58b043319966cf16e85a13196e68fe4a"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/d1bba44c58b043319966cf16e85a13196e68fe4a/docs/settings/billing.md"
syncedAt: "2026-10-06T03:44:03Z"
---


# Billing

**Settings** → **Billing** shows your account's plan and invoice history. Everyone in the account
can see it.

## What's on the page

- **Your plan**: its name and limits, such as how many executions can run in parallel. **Upgrade**
  opens the plans; on a plan sold by contract, **Contact us** opens **Contact sales** instead.
- **Usage & credits**: what you've used in the current period.
- **Invoices**: one row per invoice, with **View invoice** to open it.

## Upgrade from a free plan

{% webui %}

1. Click **Upgrade** on the Billing page, or **Upgrade to &lt;plan&gt;** in the top bar.
2. Choose **Monthly** or **Annual** billing. **Annual** is selected first.
3. Click **Upgrade** on the plan you want. You're taken to a secure checkout page to pay.

{% endwebui %}

How you know it worked: back in Studio, you see "You're on &lt;plan&gt;" and "Your upgrade is
complete — thanks for subscribing.". **Billing** shows the new plan.

## Switch between paid plans

1. Click **Upgrade** and pick the other plan.
2. **Switch to &lt;plan&gt;** shows what you'll be charged or credited for the rest of the period.
3. Click **Confirm**.

How you know it worked: **Plan updated** appears, and **Billing** shows the new plan.

## Talk to sales

For a plan with an SLA, a named contact or a custom contract, click **Contact sales** (or
**Contact us**), write your message and click **Send**.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `Couldn't load your plan. Try refreshing the page.` | The billing service didn't answer. | Refresh the page. |
| `Your current plan isn't in the catalog.` | Your account is on a plan that's no longer sold, or a custom contract. | Nothing to do; contact sales to change it. |
| `No invoices yet.` | You haven't been billed yet. | None. |
| You hit a limit, such as parallel executions | Your plan's limit is reached. | Upgrade, or spread the work out. |

## Where to next

- **[Dashboard](/studio/dashboard/)**: how much is running.
- **[Team](/studio/settings/team/)**: who's in the account.
