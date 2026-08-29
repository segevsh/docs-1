terraform {
  required_version = ">= 1.9.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.40"
    }
  }

  # Remote state, so this module is no longer hostage to one working copy.
  # Bucket gs://w6w-io-tf-state (versioned, uniform access) is the same one the
  # root `infra` module (and `frontend`'s own Pages module) uses — one bucket,
  # one prefix per module. This module's prefix is `docs`, deliberately its OWN
  # and never `frontend`'s: sharing a prefix would make one `terraform apply`
  # able to destroy the other project's tracked resources.
  backend "gcs" {
    bucket = "w6w-io-tf-state"
    prefix = "docs"
  }
}
