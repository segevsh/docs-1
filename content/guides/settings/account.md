---
key: "settings/account"
title: "My account"
section: "guides"
description: "Change your name, password, emails and phone number, and add or revoke the passkeys you sign in with."
summary: null
format: "markdown"
shared: true
order: 20
position: 21
sourceRepo: "w6w-io/w6w-studio"
sourcePath: "docs/settings/account.md"
sourceSha: "0a008defbaeb4d477413c79e22d851e1a2d0f829"
sourceRefSha: "015853978c4f9263eb1dc504226820872c8f26bd"
sourceUrl: "https://github.com/w6w-io/w6w-studio/blob/015853978c4f9263eb1dc504226820872c8f26bd/docs/settings/account.md"
syncedAt: "2026-10-06T21:18:40Z"
---


# My account

**Settings** → **My account** holds your own sign-in details. They follow you across every project
and account you belong to.

## Change your name

1. Next to **Name**, click **Edit**.
2. Type the new name and click **Save**.

How you know it worked: the new name shows on the page and at the bottom of the sidebar.

## Set or change your password

1. Next to **Password**, click **Change password**, or **Set a password** if you've only signed in
   another way so far.
2. To change it, enter your **Current password**, then the **New password**.
3. Click **Change password** (or **Set password**).

How you know it worked: sign out and sign in with the new password.

## Change your email or phone

1. Next to **Email**, click **Add or change email**. (For a phone number, click **Add or change
   phone** next to **Phone**.)
2. Enter the **Email address** or **Phone number** and click **Send code**.
3. Enter the **Confirmation code** you received and click **Confirm**. For an email, tick **Make
   this my primary email** to sign in with it from now on.

How you know it worked: the address shows as verified. Your other addresses are listed under
**Other emails**, where **Make primary** and **Delete** manage them.

If you leave the page before confirming, **A code is waiting** reminds you when you come back.

## Passkeys

A passkey lets you sign in with Touch ID, Windows Hello or a security key instead of a password.

1. Under **Passkeys**, click **Add a passkey**.
2. Give it a **Label** you'll recognise, such as "Work laptop", and click **Continue**.
3. Confirm on your device while Studio shows **Waiting for your device…**.

How you know it worked: the passkey is listed with its label. Next time, use **Sign in with a
passkey** on the sign-in page.

To remove one, for example for a lost device, click **Revoke** and confirm **Revoke passkey**.

## Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `Rotating your password requires your current one.` | **Current password** is empty. | Enter it. If you've forgotten it, sign in with an emailed code or a passkey, then try again. |
| The confirmation code is refused | It was mistyped or has expired. | Send a new code. |
| Adding a passkey fails | The device prompt was cancelled, or the browser doesn't support passkeys. | Try again, or use another browser or device. |

## Where to next

- **[Sign in and projects](/guides/sign-in/)**: every way to sign in.
- **[API tokens](/guides/settings/tokens/)**: credentials for scripts rather than people.
