# GCP Cloud CDN & Load Balancer (Option B: Single Domain with Path Routing)
# Provisioned when cdn_provider = "gcp" or enable_load_balancer = true

locals {
  use_gcp_cdn = var.cdn_provider == "gcp" || var.enable_load_balancer
}

# Backend Bucket pointing to Private GCS Frontend Bucket
resource "google_compute_backend_bucket" "frontend_backend" {
  count       = local.use_gcp_cdn ? 1 : 0
  name        = "nightrunner-frontend-backend"
  description = "Backend bucket for NightRunner frontend private GCS bucket"
  bucket_name = google_storage_bucket.frontend.name
  enable_cdn  = true

  cdn_policy {
    cache_mode       = "CACHE_ALL_STATIC"
    client_ttl       = 3600
    default_ttl      = 3600
    max_ttl          = 86400
    negative_caching = true
  }

  custom_response_headers = [
    "X-Frame-Options: SAMEORIGIN",
    "X-Content-Type-Options: nosniff"
  ]
}

# Serverless NEG pointing to Cloud Run backend
resource "google_compute_region_network_endpoint_group" "serverless_neg" {
  count                 = local.use_gcp_cdn ? 1 : 0
  name                  = "nightrunner-backend-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  cloud_run {
    service = google_cloud_run_v2_service.backend.name
  }
}

# Backend Service for Cloud Run Serverless NEG
resource "google_compute_backend_service" "backend_service" {
  count       = local.use_gcp_cdn ? 1 : 0
  name        = "nightrunner-backend-service"
  protocol    = "HTTPS"
  port_name   = "http"
  timeout_sec = 30

  backend {
    group = google_compute_region_network_endpoint_group.serverless_neg[0].id
  }
}

# URL Map directing /v1/* to Cloud Run and /* to GCS Frontend Bucket
resource "google_compute_url_map" "frontend_url_map" {
  count           = local.use_gcp_cdn ? 1 : 0
  name            = "nightrunner-url-map"
  default_service = google_compute_backend_bucket.frontend_backend[0].id

  host_rule {
    hosts        = ["*"]
    path_matcher = "allpaths"
  }

  path_matcher {
    name            = "allpaths"
    default_service = google_compute_backend_bucket.frontend_backend[0].id

    path_rule {
      paths   = ["/v1", "/v1/*", "/health"]
      service = google_compute_backend_service.backend_service[0].id
    }
  }
}

# Target HTTP Proxy
resource "google_compute_target_http_proxy" "frontend_http_proxy" {
  count   = local.use_gcp_cdn ? 1 : 0
  name    = "nightrunner-http-proxy"
  url_map = google_compute_url_map.frontend_url_map[0].id
}

# Global Forwarding Rule (Public Single IP entrypoint)
resource "google_compute_global_forwarding_rule" "frontend_forwarding_rule" {
  count      = local.use_gcp_cdn ? 1 : 0
  name       = "nightrunner-forwarding-rule"
  target     = google_compute_target_http_proxy.frontend_http_proxy[0].id
  port_range = "80"
}
