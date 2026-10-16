---
key: "embed-session-migration"
title: "Move from OIDC to session exchange"
section: "guides"
description: "Switch an embedded product from direct OIDC tokens to the server-side session helper without sending any user to a different or empty account — with a read-only check to run first."
summary: null
format: "markdown"
shared: true
order: 120
position: 21
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/guides/embed-session-migration.md"
sourceSha: "caed4fd7ab091fa1a607e16252a59c13efb2fb45"
sourceRefSha: "801217d024e3bf11a372f2876ef6bed8a10a1bfb"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/801217d024e3bf11a372f2876ef6bed8a10a1bfb/docs/guides/embed-session-migration.md"
syncedAt: "2026-10-14T21:48:37Z"
---


# Move from OIDC to session exchange

**Applies to:** HTTP (`POST /auth/exchange`, `GET /auth/me`) · SDK (`createEmbedSessionClient` /
`EmbedSessionClient` in `@w6w/sdk/server`) · Studio (not affected). For setting up the host side
of the session helper, see [Embed w6w](/guides/embed/).

If your users already reach w6w with a token from your own identity provider (direct OIDC), you can
move to a session your backend mints per user. Both ways land a user in the same account when you
hand over the same account value. This page shows how to keep that true, and how to check it
before any user is switched. **OIDC stays supported and registered; nothing here removes it.**

## Why the account stays the same

Both doors turn a non-blank account value into an account the same way: they call
`AccountResolver.resolveExternal(tenant, value.trim())`, which looks up the account by
`(tenant, external_ref)`.

- The OIDC door reads the claim you registered as the account claim from the verified token.
- The session exchange reads `account` from the request body (the helper's `accountRef`).

The match is exact and **case-sensitive** after trimming surrounding whitespace. So the same value,
under the same tenant, gives the same `acct_…` account and the same resources.

## Three conditions

1. **`accountRef` is the exact string your IdP puts in the registered account claim.** Not a
   lower-cased copy, not an id from your own database that happens to correspond to it.
2. **`subject` is the exact value of the registered subject claim** (`sub` unless you registered
   another claim name). A different subject is a different user inside the account.
3. **The client credentials belong to the tenant the issuer is registered under.** The same value
   under another tenant is another account.

If all three hold, the user sees the account, and the resources, they had under OIDC.

## Two hazards

### Never pass a host-side composite

Any ref the tenant has not seen before **provisions a new, empty account on first use**. That is the
right behaviour for onboarding a new company, and it is what the OIDC door does too. It is wrong
here: if you pass something you built yourself, such as `"<tenantId>:<companyId>"`, or a link you
stored, instead of the claim value, the ref is unseen, and the user lands in a brand-new empty
account. The call succeeds; nothing tells you it was the wrong account. Always pass the claim value
verbatim.

### A non-string or blank account claim means the default account

If the account claim in a user's OIDC token is not a string (for example a number) or is blank
(empty or whitespace only), the OIDC door treats it as no claim and resolves the tenant's **default account**.
The session helper behaves differently: `accountRef` must be a non-blank string, and it fails
locally otherwise.

Such users have **always been in the default account**. This page does not change that. To keep them
there, use the raw `exchangeToken` without `account`, which also resolves to the default account.
Moving them to a named account is a data change and out of scope here.

## Check before you switch

Do this per company, before switching it. Steps 1 and 2 are read-only and create nothing. Step 3 is
the first real exchange: if the ref is wrong it provisions an account (see "Never pass a host-side composite"), so run it server-side
for ONE known user of the company, compare `account`, and only then switch the rest of the company.

1. With a current OIDC token for one user of that company, call `GET /auth/me` and record the
   `account` it returns. That company's account already exists under OIDC, so this call creates
   nothing.
2. Confirm the account claim in that token is a **string**. If it is not a string, is blank, or the
   claim is absent, the user was never in a named account: the recorded `account` is the tenant's default
   account (see "A non-string or blank account claim means the default account"). Keep that company on OIDC, or on the raw `exchangeToken` without
   `account`.
3. Run one exchange through the session helper for that one user, passing the claim value as
   `accountRef`, and compare the `account` the session returns with the id recorded in step 1. If
   they differ, **stop and keep (or switch back) the company on OIDC**; the mismatched exchange may
   have provisioned a stray empty account, which you can ignore. OIDC is still registered, so
   nothing is lost.

Do **not** run the exchange for a company before step 1. If its ref is unseen, the exchange
provisions an account (see "Never pass a host-side composite") and you have changed state you were trying to check.

## The switch itself

On your backend, build the client once and call `create` per signed-in user:

```ts
import { createEmbedSessionClient } from "@w6w/sdk/server";

const sessions = createEmbedSessionClient({ baseUrl, clientId, clientSecret });

// subject = the registered subject claim; accountRef = the registered account claim value
const session = await sessions.create({ subject, accountRef });
// session.account is the resolved acct_… id: compare it with what you recorded.
```

Keep the client credentials on your server; hand the browser only the returned token. A blank or
non-string `subject` or `accountRef` is rejected before any request is made.

## What does not change

- OIDC tokens keep working for every company you have not switched, and for any you switch back.
- The account model is the same on both doors: tokens are account-scoped, and which resources are
  shared across an account is decided per resource class.
