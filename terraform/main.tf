provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Cloudflare Pages project — direct-upload mode. Deploys are pushed from CI
# via `wrangler pages deploy`. No `source` block => no GitHub OAuth link
# required, everything stays IaC-owned.
resource "cloudflare_pages_project" "docs" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = var.production_branch

  deployment_configs {
    production {
      environment_variables = {
        NODE_VERSION = "22"
      }
    }
    preview {
      environment_variables = {
        NODE_VERSION = "22"
      }
    }
  }
}
