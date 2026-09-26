---
title: "Self-host troubleshooting"
description: "What a self-host install's own refusal and error messages mean, and what to do about them."
---

# Troubleshooting

| Symptom | Cause | What to do |
| --- | --- | --- |
| `/commerce` or `/commerce/…` answers `404` `commerce_unavailable` | Not a failure. A self-host install has no commerce surface: every `/commerce` request gets this built-in stub, unauthenticated, and nothing is forwarded anywhere. | Nothing — this is the intended answer. |
| `GET /health/ready` answers `401` | Readiness is bearer-guarded. | Probe with an operator token, or use the unauthenticated `GET /health` instead. |
| Activate answers `409 link_not_configured` | `W6W_CONTROL_URL` is not set, so there is nothing to activate against. | Set it, or use the offline licence-file path (see [Air-gapped install](/self-hosting/air-gap/)). |
| Activate answers `409 identity_unavailable` | This installation's private key can't be decrypted. | Usually `W6W_CREDENTIAL_KEY` was changed or lost after first boot — the stored key is unrecoverable, so the installation must be re-provisioned. |
| Activate answers `424 control_unavailable` | The control plane was unreachable, answered a server error, or returned a malformed success body. | Check `W6W_CONTROL_URL`, your egress, and try again — nothing is retried for you. |
| Activate answers `400 activation_rejected` | Your vendor refused the token (unknown, expired, or already used). | Ask for a fresh activation token. |
| Activate answers `409 already_activated` | This host already has an installation id. | Re-activation isn't supported host-side — ask your vendor to work from the installation record. |
| `GET /installation` says `evaluation` even though you installed a licence file | Either `W6W_CONTROL_PUBLIC_KEY` is unset (nothing is trusted by default), the file isn't bound to this host's own key, or `W6W_LICENCE_FILE` doesn't point at a readable file. | Set your vendor's public key, re-check the path, and read the server's own log line — a bad file is reported once per poll tick. |
| Migrations fail with `relation "connections" does not exist` | The migration runner was pointed at an empty database. | Bootstrap with the install step first (see [Install](/self-hosting/install/)); run the migration runner only against an already-installed database. |
| Startup refuses, naming `W6W_INSTALLATION_MODE` | The value names the other profile than the one this image was built for. | Unset it, or set it to match the image. |
| Startup refuses, naming `W6W_EDGES` | A self-host install always serves exactly the same three surfaces. | Unset `W6W_EDGES`. |
| Startup refuses, naming `W6W_CONTROL_URL` | The value isn't a valid `http://`/`https://` URL. | Fix it, or unset it. |
| Startup refuses, naming `W6W_CONTROL_PUBLIC_KEY` | The value isn't a valid public key (or a JSON array of them). | Fix it, or unset it and accept the unlicensed `evaluation` state. |
| Startup refuses, naming `AUTH_PASSWORD` | Boot safety: the default credential isn't allowed outside development. | Set a real `AUTH_PASSWORD`. |
| Startup refuses, naming `OPS_JWT_SECRET`/`JWT_SECRET` | The two signing secrets collide. | Leave `OPS_JWT_SECRET` unset on self-host, or give it a value distinct from `JWT_SECRET`. |
| Invocations answer `429 concurrency_exceeded`; runs sit queued | The install is at its licensed parallel-execution cap. | Wait for the `Retry-After` the response names, or license more parallel executions. |
| New work answers `402 licence_lapsed` | The licence passed its grace period. | Renew it. Work already running finishes, and you can still sign in. |
| Nothing ever reaches the control plane | `W6W_CONTROL_URL` is unset, the installation never activated, or the licence is lapsed/absent. | Check `GET /installation` — its `link` field tells you whether the host considers itself linked. |
