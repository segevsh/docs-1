---
key: "settings/team"
title: "Team"
section: "guides"
description: "Invite people to your account with a link, set each member's role, and remove members or revoke invites. For account owners and admins."
summary: null
format: "markdown"
shared: true
order: 50
position: 24
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/settings/team.md"
sourceSha: "fe55d3dbcdcbff0a1460fc4c94906064e584932a"
sourceRefSha: "2e25e297622dec7966f7baafd584add3eba28641"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/2e25e297622dec7966f7baafd584add3eba28641/docs/settings/team.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# Team

**Settings** → **Team** manages who can work in your account.

> **Who sees this:** account owners and admins. Members don't see **Team** in the settings list,
> and opening it directly shows "You don't have permission to manage team members.".

## Invite someone

{% webui %}

1. Open **Settings** → **Team** and click **Create invite link**.
2. Choose the **Role** they'll join with: **member** or **admin**.
3. Copy the **Redemption link** from **Invite link created**. It's shown once.
4. Send the link to the person.

{% endwebui %}

{% cli %}

```bash
w6w team invite --role member   # prints the invite link
w6w team invites                # lists open invites
```

See [CLI](/clients/cli/).

{% endcli %}

How you know it worked: the invite appears under **Pending invites** until they join, and they
then move to the **Roster**. The person opens the link, signs up or signs in, and lands in your
account.

## Manage pending invites

Under **Pending invites**:

- **Get a new token** replaces the invite's link, for example if the first one was lost. The old
  link stops working.
- **Revoke** cancels the invite after you confirm **Revoke invite**.

## Change a role or remove someone

The **Roster** lists everyone with access: **User**, **Email**, **Role** and when they **Joined**.

- Change someone's role with the dropdown in the **Role** column.
- Click **Remove** and confirm **Remove teammate** to take away their access.

How you know it worked: the roster shows the new role, or no longer lists the person.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| **Team** isn't in the settings list | You're a member, not an owner or admin. | Ask an owner or admin. |
| The invite link doesn't work | It was replaced with **Get a new token**, or revoked. | Create a new invite. |
| `No pending invites.` | Every invite has been used or revoked. | None. |

## Where to next

- **[Sign in and projects](/guides/sign-in/)**: what the invited person sees.
- **[API tokens](/guides/settings/tokens/)**: credentials for code, not people.
