# Enable Cloud Run API
resource "google_project_service" "run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

# Service Account for Cloud Run backend
resource "google_service_account" "cloud_run_sa" {
  account_id   = "nightrunner-backend-sa"
  display_name = "NightRunner Backend Cloud Run Service Account"
}

# Grant Cloud SQL Client role to Cloud Run SA
resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Cloud Run v2 Service with Strict Scaling Caps
resource "google_cloud_run_v2_service" "backend" {
  depends_on = [
    google_project_service.run,
    google_sql_database_instance.main
  ]
  name     = "nightrunner-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run_sa.email

    # Hard cap scaling to prevent runaway compute costs
    scaling {
      min_instance_count = 0
      max_instance_count = var.max_cloud_run_instances
    }

    # Set request execution timeout cap (300s allows container cold start + DB migrations)
    timeout = "300s"

    containers {
      image = var.backend_image != "" ? var.backend_image : "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.backend_repo.repository_id}/backend:latest"

      env {
        name  = "DATABASE_URL"
        value = "postgresql://${var.db_user}:${var.db_password}@/${var.db_name}?host=/cloudsql/${google_sql_database_instance.main.connection_name}"
      }

      env {
        name  = "DEV_MODE"
        value = "false"
      }

      env {
        name  = "FRONT_END_URL"
        value = var.domain_name != "" ? "https://${var.domain_name}" : "https://${google_storage_bucket.frontend.name}.storage.googleapis.com"
      }

      env {
        name  = "OIDC_ISSUER"
        value = "https://securetoken.google.com/${var.project_id}"
      }

      env {
        name  = "OIDC_AUDIENCE"
        value = var.project_id
      }

      env {
        name  = "JWKS_URL"
        value = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
      }

      env {
        name  = "APP_VERSION"
        value = "v0.1.0"
      }

      ports {
        container_port = 8000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }
  }
}

# Service Account for Cloudflare Worker to invoke Cloud Run securely
resource "google_service_account" "cloudflare_invoker" {
  account_id   = "cloudflare-run-invoker"
  display_name = "Cloudflare Worker Cloud Run Invoker"
  description  = "Service account used by Cloudflare Worker to generate OIDC ID tokens for Cloud Run invocation"
}

# Service Account Private Key for Cloudflare Worker RS256 JWT signing
resource "google_service_account_key" "cloudflare_invoker_key" {
  service_account_id = google_service_account.cloudflare_invoker.name
}

# Restrict Cloud Run invocation to the dedicated Cloudflare Invoker Service Account
resource "google_cloud_run_v2_service_iam_member" "cloudflare_invoker_access" {
  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.cloudflare_invoker.email}"
}
