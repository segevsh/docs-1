---
key: "tenant-bindings"
title: "Tenant bindings"
section: "guides"
description: "Pre-connect a tenantAuth app for one account of a tenant, or remove that binding, without any user entering a credential."
summary: null
format: "markdown"
shared: true
order: 90
position: 17
sourceRepo: "w6w-io/w6w-server"
sourcePath: "docs/guides/tenant-bindings.md"
sourceSha: "2198be7c1634192417724ddd54985405aa062862"
sourceRefSha: "801217d024e3bf11a372f2876ef6bed8a10a1bfb"
sourceUrl: "https://github.com/w6w-io/w6w-server/blob/801217d024e3bf11a372f2876ef6bed8a10a1bfb/docs/guides/tenant-bindings.md"
syncedAt: "2026-10-07T12:21:27Z"
---


# Tenant bindings

**Applies to:** HTTP (operator scope `operator:tenants`).

A **tenant binding** is a connection to a `tenantAuth` app that stores no secret: the credential is
minted at call time from the tenant's app link. Binding an app makes it "already connected" for
an account, so nobody has to go through a connect flow. Bindings are **per account**. A tenant's
other accounts are untouched by a bind or an unbind in one.

## Bind

```http
POST /tenants/{id}/bindings
{ "app": "io.example.crm", "account": "west", "subject": "user-1" }
```

- `app` is required and must declare a `tenantAuth` method (`not_tenant_auth` otherwise).
- `account` is optional and is the account **claim**, as in `POST /tenants/{id}/provision`. Absent
  or blank means the tenant's default account.
- `subject` is optional attribution only. When absent, `"default"` is stamped. A value that is not a
  string is a `400 invalid_body`.
- The account must already exist under the tenant. A missing account, or one that belongs to
  another tenant, is `404 unknown_account` and nothing is written. Bind never creates an account;
  `POST /tenants/{id}/provision` does.

It is idempotent per account and app. The first call answers `201`, a repeat answers `200`, and
the existing row (and its `subject`) wins:

```json
{ "connection": { "id": "conn_…", "authKey": "tenant" }, "created": true, "account": "west" }
```

`account` in the response is the claim form: `"west"`, or the tenant id for the default account. It
is never the internal `<tenant>:west` id.

## Unbind

```http
DELETE /tenants/{id}/bindings?app=io.example.crm&account=west
```

```json
{ "ok": true, "removed": 1, "account": "west" }
```

It removes only the connections in that account whose auth method is the app's `tenantAuth` method.
A member's own connection to the same app, made with a different method in the same account, is
never removed. Without `account`, the tenant's default account is used.

Errors:

| Status | Code | When |
| --- | --- | --- |
| 404 | `unknown_tenant` | no such tenant |
| 400 | `invalid_query` | `app` is missing |
| 400 | `subject_not_supported` | `subject` is passed without `account`. Bindings are per account; pass `account` |
| 404 | `unknown_account` | the account does not exist under this tenant |
| 404 | `unknown_app` | the app is not registered |
| 400 | `not_tenant_auth` | the app declares no `tenantAuth` method |

`subject` together with `account` is accepted and ignored.

An app that later drops its `tenantAuth` method can no longer be unbound this way: the request
answers `not_tenant_auth`, because the binding can no longer be told apart from a member's own
connection.
