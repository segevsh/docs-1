output "pages_subdomain" {
  description = "The *.pages.dev subdomain Cloudflare assigned to the project."
  value       = cloudflare_pages_project.docs.subdomain
}

output "project_name" {
  description = "Pass to `wrangler pages deploy --project-name=...`."
  value       = cloudflare_pages_project.docs.name
}

output "production_url" {
  description = "Public URL once DNS has propagated."
  value       = "https://${var.domain}"
}
