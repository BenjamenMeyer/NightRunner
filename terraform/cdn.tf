# GCP Cloud CDN & Load Balancer (Provisioned when cdn_provider = "gcp" or enable_load_balancer = true)
locals {
  use_gcp_cdn = var.cdn_provider == "gcp" || var.enable_load_balancer
}

# Backend Bucket pointing to Private GCS Frontend Bucket with Cloud CDN
resource "google_compute_backend_bucket" "frontend_backend" {
  count       = local.use_gcp_cdn ? 1 : 0
  name        = "nightrunner-frontend-backend"
  description = "Backend bucket for NightRunner frontend private GCS bucket"
  bucket_name = google_storage_bucket.frontend.name
  enable_cdn  = true

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    client_ttl        = 3600
    default_ttl       = 3600
    max_ttl           = 86400
    negative_caching  = true
  }

  custom_response_headers = [
    "X-Frame-Options: SAMEORIGIN",
    "X-Content-Type-Options: nosniff"
  ]
}

# URL Map directing traffic to the backend bucket
resource "google_compute_url_map" "frontend_url_map" {
  count           = local.use_gcp_cdn ? 1 : 0
  name            = "nightrunner-frontend-url-map"
  default_service = google_compute_backend_bucket.frontend_backend[0].id
}

# Target HTTP Proxy
resource "google_compute_target_http_proxy" "frontend_http_proxy" {
  count   = local.use_gcp_cdn ? 1 : 0
  name    = "nightrunner-frontend-http-proxy"
  url_map = google_compute_url_map.frontend_url_map[0].id
}

# Global Forwarding Rule (Public IP entrypoint for CDN)
resource "google_compute_global_forwarding_rule" "frontend_forwarding_rule" {
  count      = local.use_gcp_cdn ? 1 : 0
  name       = "nightrunner-frontend-forwarding-rule"
  target     = google_compute_target_http_proxy.frontend_http_proxy[0].id
  port_range = "80"
}
