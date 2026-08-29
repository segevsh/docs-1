# Terraform — Cloudflare Pages hosting

Provisions the docs site's Cloudflare Pages project and its DNS. Deploys themselves happen from GitHub Actions via `wrangler pages deploy` — this module owns the infra shell, not the build.

## What it creates

- A Cloudflare Pages project (`w6w-docs`) in **direct-upload** mode (no GitHub OAuth link needed).
- A `cloudflare_pages_domain` binding for `docs.w6w.io`, plus `www.docs.w6w.io` as an off-by-default capability (`www_redirect`).
- Proxied CNAME records for both, pointing at the project's `*.pages.dev` subdomain.

## Prereqs

1. A Cloudflare account with the `w6w.io` zone already added — `docs.w6w.io` is a subdomain of that zone, not a zone of its own.
2. An API token scoped to:
   - `Account → Cloudflare Pages → Edit`
   - `Zone → DNS → Edit` (on the `w6w.io` zone)
   - `Zone → Zone → Read`

## State

State is **remote**, in `gs://w6w-io-tf-state` under the **`docs/`** prefix — the same versioned bucket `frontend`'s own Pages module uses, but its own prefix, never `frontend`'s: sharing a prefix would make one `terraform apply` able to destroy the other project's tracked resources, so the two Pages projects stay independently applicable.

Reading or writing state therefore needs GCP credentials on top of the Cloudflare token — either `gcloud auth application-default login`, or a short-lived token:

```bash
export GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)
```

The bucket has **object versioning** (every write keeps the prior generation) and **7-day soft delete**, so state is backed up automatically — no manual copies required. Backup and rollback mechanics are written up once, in `infra/README.md` § State — in the **w6w orchestration repo**, not this one.

## Bootstrap

```bash
cp terraform.tfvars.example terraform.tfvars   # then edit
export GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)
terraform init
terraform plan
terraform apply
```

## Applying changes

Terraform is run **locally only** — there's no CI workflow for it. Because state is remote, a second maintainer can run it from a fresh checkout; nothing is pinned to one working copy. Rerun `terraform plan` / `terraform apply` from this directory whenever the module changes.

`docs.w6w.io` does not exist until a human applies this module — nothing in this repo's CI runs `terraform apply` on its behalf.

## Deploys

Deploys are a separate concern — see [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). CI runs `pnpm check:tokens`, imports content, builds with Astro, then `wrangler pages deploy dist --project-name=w6w-docs`. Preview branches get their own `<sha>.<project>.pages.dev` URL automatically.
