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

    # Set 15-second request execution timeout cap
    timeout = "15s"

    containers {
      image = var.backend_image != "" ? var.backend_image : "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.backend_repo.repository_id}/backend:latest"

      env {
        name  = "DATABASE_URL"
        value = "postgresql+psycopg://${var.db_user}:${var.db_password}@/${var.db_name}?host=/cloudsql/${google_sql_database_instance.main.connection_name}"
      }

      env {
        name  = "DEV_MODE"
        value = "false"
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

# Allow unauthenticated invocations for Cloud Run backend
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
