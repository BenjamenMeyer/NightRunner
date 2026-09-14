resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# GCS Bucket for Terraform State (Private)
resource "google_storage_bucket" "tf_state" {
  name                        = "${var.project_id}-tf-state-${random_id.bucket_suffix.hex}"
  location                    = var.region
  force_destroy               = false
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }
}

# GCS Bucket for Frontend Static Files
resource "google_storage_bucket" "frontend" {
  name                        = "${var.project_id}-frontend-${random_id.bucket_suffix.hex}"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true

  # Restrict public access when CDN provider or private origin signing is configured
  public_access_prevention = var.cdn_provider != "none" ? "enforced" : "inherited"

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }
}

# GCS Bucket for Generated Reports (Private - API Access Only)
resource "google_storage_bucket" "reports" {
  name                        = "${var.project_id}-reports-${random_id.bucket_suffix.hex}"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true

  public_access_prevention = "enforced"

  # Lifecycle rules for tiered storage lifecycle management:
  # 0-90 days: STANDARD storage (default)
  # 90 days: Transition to NEARLINE storage
  # 180 days: Transition to COLDLINE storage
  # 365 days: Transition to ARCHIVE storage
  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
    condition {
      age = 90
    }
  }

  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
    condition {
      age = 180
    }
  }

  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
    condition {
      age = 365
    }
  }
}

# Grant public read access to allUsers ONLY when no CDN provider is configured (Direct dev mode)
resource "google_storage_bucket_iam_member" "frontend_public_read" {
  count  = var.cdn_provider == "none" ? 1 : 0
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Service Account for Cloud CDN to access Private GCS Bucket
resource "google_service_account" "cdn_gcs_reader" {
  account_id   = "nightrunner-cdn-gcs-reader"
  display_name = "NightRunner Cloud CDN GCS Reader Service Account"
}

# Grant Storage Object Admin on Private Reports Bucket ONLY to Cloud Run Service Account
resource "google_storage_bucket_iam_member" "backend_reports_storage_admin" {
  bucket = google_storage_bucket.reports.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}
resource "google_storage_bucket_iam_member" "cdn_private_reader" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.cdn_gcs_reader.email}"
}

# HMAC Key for CDN Private GCS Bucket Origin Authentication
resource "google_storage_hmac_key" "cdn_hmac" {
  service_account_email = google_service_account.cdn_gcs_reader.email
}
