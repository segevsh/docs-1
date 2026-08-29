variable "cloudflare_api_token" {
  description = "Cloudflare API token with Pages:Edit + Zone:DNS:Edit + Zone:Read scopes."
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns the Pages project."
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for the apex domain (found on the domain overview page)."
  type        = string
}

variable "project_name" {
  description = "Cloudflare Pages project name. Determines the *.pages.dev subdomain."
  type        = string
  default     = "w6w-docs"
}

variable "production_branch" {
  description = "Branch treated as production. All other branches produce preview deployments."
  type        = string
  default     = "main"
}

variable "domain" {
  description = "Public domain served by the Pages project."
  type        = string
  default     = "docs.w6w.io"
}

variable "www_redirect" {
  description = "Provision a www.<domain> record that Cloudflare will proxy to the same project."
  type        = bool
  default     = false
}
