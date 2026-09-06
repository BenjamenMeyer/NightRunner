# Enable Workload Identity & IAM APIs
resource "google_project_service" "iamcredentials" {
  service            = "iamcredentials.googleapis.com"
  disable_on_destroy = false
}

# Dedicated Service Account for GitHub Actions CI/CD
resource "google_service_account" "github_cicd" {
  account_id   = "nightrunner-github-cicd"
  display_name = "NightRunner GitHub Actions CI/CD Service Account"
}

# Grant Artifact Registry Writer role (Push Docker images)
resource "google_project_iam_member" "cicd_artifact_registry" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_cicd.email}"
}

# Grant Cloud Run Developer role (Deploy to Cloud Run)
resource "google_project_iam_member" "cicd_cloud_run" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.github_cicd.email}"
}

# Grant Storage Object Admin role (Upload frontend build to GCS)
resource "google_storage_bucket_iam_member" "cicd_gcs_frontend" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.github_cicd.email}"
}

# Allow CI/CD SA to act as the Cloud Run runtime Service Account
resource "google_service_account_iam_member" "cicd_sa_user" {
  service_account_id = google_service_account.cloud_run_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_cicd.email}"
}

# Workload Identity Pool for GitHub Actions
resource "google_iam_workload_identity_pool" "github_pool" {
  provider                  = google-beta
  depends_on                = [google_project_service.iamcredentials]
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Workload Identity Pool for GitHub Actions CI/CD"
}

# Workload Identity Provider for GitHub OIDC
resource "google_iam_workload_identity_pool_provider" "github_provider" {
  provider                           = google-beta
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions-provider"
  display_name                       = "GitHub Actions Provider"
  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.actor"            = "assertion.actor"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
  }
  attribute_condition = var.github_org != "" ? "assertion.repository_owner == '${var.github_org}'" : null
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Allow GitHub Actions repository OIDC assertion to impersonate CI/CD Service Account
resource "google_service_account_iam_member" "github_oidc_impersonation" {
  service_account_id = google_service_account.github_cicd.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.repository_owner/${var.github_org != "" ? var.github_org : "YOUR_GITHUB_ORG"}"
}

# ------------------------------------------------------------------------------
# GitHub Actions Repository Secrets
# (Created when var.github_repo_name is set)
# ------------------------------------------------------------------------------

resource "github_actions_secret" "gcp_project_id" {
  count           = var.github_repo_name != "" ? 1 : 0
  repository      = var.github_repo_name
  secret_name     = "GCP_PROJECT_ID"
  plaintext_value = var.project_id
}

resource "github_actions_secret" "gcp_region" {
  count           = var.github_repo_name != "" ? 1 : 0
  repository      = var.github_repo_name
  secret_name     = "GCP_REGION"
  plaintext_value = var.region
}

resource "github_actions_secret" "gcp_workload_identity_provider" {
  count           = var.github_repo_name != "" ? 1 : 0
  repository      = var.github_repo_name
  secret_name     = "GCP_WORKLOAD_IDENTITY_PROVIDER"
  plaintext_value = google_iam_workload_identity_pool_provider.github_provider.name
}

resource "github_actions_secret" "gcp_service_account" {
  count           = var.github_repo_name != "" ? 1 : 0
  repository      = var.github_repo_name
  secret_name     = "GCP_SERVICE_ACCOUNT"
  plaintext_value = google_service_account.github_cicd.email
}

resource "github_actions_secret" "gcp_artifact_registry_url" {
  count           = var.github_repo_name != "" ? 1 : 0
  repository      = var.github_repo_name
  secret_name     = "GCP_ARTIFACT_REGISTRY_URL"
  plaintext_value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.backend_repo.name}/backend"
}

resource "github_actions_secret" "gcp_cloud_run_service" {
  count           = var.github_repo_name != "" ? 1 : 0
  repository      = var.github_repo_name
  secret_name     = "GCP_CLOUD_RUN_SERVICE"
  plaintext_value = google_cloud_run_v2_service.backend.name
}

resource "github_actions_secret" "gcp_frontend_bucket" {
  count           = var.github_repo_name != "" ? 1 : 0
  repository      = var.github_repo_name
  secret_name     = "GCP_FRONTEND_BUCKET"
  plaintext_value = google_storage_bucket.frontend.name
}

