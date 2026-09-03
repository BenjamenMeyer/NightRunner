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

# GCS Bucket for Frontend Static Files (PRIVATE - Public access blocked)
resource "google_storage_bucket" "frontend" {
  name                        = "${var.project_id}-frontend-${random_id.bucket_suffix.hex}"
  location                    = var.region
  force_destroy               = true
  uniform_bucket_level_access = true

  # Block public access at bucket level
  public_access_prevention = "enforced"

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }
}

# Service Account for Cloud CDN to access Private GCS Bucket
resource "google_service_account" "cdn_gcs_reader" {
  account_id   = "nightrunner-cdn-gcs-reader"
  display_name = "NightRunner Cloud CDN GCS Reader Service Account"
}

# Grant Object Viewer on Private GCS Bucket ONLY to CDN Service Account
resource "google_storage_bucket_iam_member" "cdn_private_reader" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.cdn_gcs_reader.email}"
}

# HMAC Key for CDN Private GCS Bucket Origin Authentication
resource "google_storage_hmac_key" "cdn_hmac" {
  service_account_email = google_service_account.cdn_gcs_reader.email
}
