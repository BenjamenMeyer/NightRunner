# Enable Identity Platform API (Firebase Authentication backend)
resource "google_project_service" "identitytoolkit" {
  service            = "identitytoolkit.googleapis.com"
  disable_on_destroy = false
}

# Identity Platform Base Configuration
resource "google_identity_platform_config" "default" {
  provider   = google-beta
  depends_on = [google_project_service.identitytoolkit]

  sign_in {
    allow_duplicate_emails = false

    # Kept enabled for test accounts
    email {
      enabled           = true
      password_required = true
    }

    anonymous {
      enabled = false
    }
  }

  authorized_domains = compact(concat(
    ["localhost"],
    var.domain_name != "" ? [var.domain_name] : [],
    length(google_compute_global_forwarding_rule.frontend_forwarding_rule) > 0 ? [google_compute_global_forwarding_rule.frontend_forwarding_rule[0].ip_address] : []
  ))
}



# Google Social Auth Identity Provider Configuration
resource "google_identity_platform_default_supported_idp_config" "google" {
  count        = var.google_client_id != "" ? 1 : 0
  provider     = google-beta
  depends_on   = [google_identity_platform_config.default]
  idp_id       = "google.com"
  client_id    = var.google_client_id
  client_secret = var.google_client_secret
  enabled      = true
}

# GitHub Social Auth Identity Provider Configuration
resource "google_identity_platform_oauth_idp_config" "github" {
  count         = var.github_client_id != "" ? 1 : 0
  provider      = google-beta
  depends_on    = [google_identity_platform_config.default]
  name          = "github.com"
  display_name  = "GitHub"
  client_id     = var.github_client_id
  client_secret = var.github_client_secret
  enabled       = true
  issuer        = "https://github.com"
}
