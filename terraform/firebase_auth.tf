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
    ["localhost", "storage.googleapis.com"],
    var.domain_name != "" ? [var.domain_name] : [],
    length(google_compute_global_forwarding_rule.frontend_forwarding_rule) > 0 ? [google_compute_global_forwarding_rule.frontend_forwarding_rule[0].ip_address] : []
  ))
}

# Firebase / Identity Platform Web API Key
resource "google_apikeys_key" "firebase_api_key" {
  name         = "firebase-web-api-key-${random_id.bucket_suffix.hex}"
  display_name = "Firebase Web Auth API Key"
  project      = var.project_id

  restrictions {
    api_targets {
      service = "identitytoolkit.googleapis.com"
    }
    api_targets {
      service = "securetoken.googleapis.com"
    }
  }
}



# Google Social Auth Identity Provider Configuration
resource "google_identity_platform_default_supported_idp_config" "google" {
  count         = var.google_client_id != "" ? 1 : 0
  provider      = google-beta
  depends_on    = [google_identity_platform_config.default]
  idp_id        = "google.com"
  client_id     = var.google_client_id
  client_secret = var.google_client_secret
  enabled       = true
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

# Facebook Social Auth Identity Provider Configuration
resource "google_identity_platform_default_supported_idp_config" "facebook" {
  count         = var.facebook_client_id != "" ? 1 : 0
  provider      = google-beta
  depends_on    = [google_identity_platform_config.default]
  idp_id        = "facebook.com"
  client_id     = var.facebook_client_id
  client_secret = var.facebook_client_secret
  enabled       = true
}

# Twitter / X Social Auth Identity Provider Configuration
resource "google_identity_platform_default_supported_idp_config" "twitter" {
  count         = var.twitter_client_id != "" ? 1 : 0
  provider      = google-beta
  depends_on    = [google_identity_platform_config.default]
  idp_id        = "twitter.com"
  client_id     = var.twitter_client_id
  client_secret = var.twitter_client_secret
  enabled       = true
}

# Apple Social Auth Identity Provider Configuration
resource "google_identity_platform_default_supported_idp_config" "apple" {
  count         = var.apple_client_id != "" ? 1 : 0
  provider      = google-beta
  depends_on    = [google_identity_platform_config.default]
  idp_id        = "apple.com"
  client_id     = var.apple_client_id
  client_secret = var.apple_client_secret
  enabled       = true
}
