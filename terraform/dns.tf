# Attach `docs.w6w.io` to the Pages project.
resource "cloudflare_pages_domain" "apex" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.docs.name
  domain       = var.domain
}

# Route docs.w6w.io through Cloudflare's proxy at the Pages project.
#
# `w6w.io` is the zone apex, not `docs.w6w.io` — this module's zone (`var.cloudflare_zone_id`) is
# still the `w6w.io` zone, so the record name is the subdomain LABEL `docs`, never `"@"`.
# `frontend`'s equivalent module uses `"@"` only because its own `domain` IS the zone apex.
resource "cloudflare_record" "apex" {
  zone_id = var.cloudflare_zone_id
  name    = "docs"
  type    = "CNAME"
  content = cloudflare_pages_project.docs.subdomain
  proxied = true
  comment = "docs.w6w.io → Cloudflare Pages (${var.project_name})"

  depends_on = [cloudflare_pages_domain.apex]
}

# www.docs.w6w.io — kept as a capability (same shape as `frontend`'s www pair), OFF by default:
# a subdomain-of-a-subdomain redirect has no evident need today (decision #9).
resource "cloudflare_pages_domain" "www" {
  count = var.www_redirect ? 1 : 0

  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.docs.name
  domain       = "www.${var.domain}"
}

resource "cloudflare_record" "www" {
  count = var.www_redirect ? 1 : 0

  zone_id = var.cloudflare_zone_id
  name    = "www.docs"
  type    = "CNAME"
  content = cloudflare_pages_project.docs.subdomain
  proxied = true
  comment = "www.docs.w6w.io → Cloudflare Pages (${var.project_name})"

  depends_on = [cloudflare_pages_domain.www]
}
