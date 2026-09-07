output "artifact_registry_repo" {
  value       = google_artifact_registry_repository.backend_repo.name
  description = "Artifact Registry Docker repository name"
}

output "artifact_registry_url" {
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.backend_repo.name}"
  description = "Artifact Registry Docker repository URL"
}

output "cloud_run_backend_url" {
  value       = google_cloud_run_v2_service.backend.uri
  description = "Cloud Run backend URL"
}

output "cloud_sql_connection_name" {
  value       = google_sql_database_instance.main.connection_name
  description = "Cloud SQL instance connection name"
}

output "frontend_bucket_name" {
  value       = google_storage_bucket.frontend.name
  description = "GCS Bucket name for frontend static deployment"
}

output "active_cdn_provider" {
  value       = var.cdn_provider
  description = "The active CDN provider configuration ('none', 'cloudflare', or 'gcp')"
}

output "frontend_cdn_ip" {
  value       = length(google_compute_global_forwarding_rule.frontend_forwarding_rule) > 0 ? google_compute_global_forwarding_rule.frontend_forwarding_rule[0].ip_address : "N/A (GCP CDN Load Balancer disabled)"
  description = "Public IP address of the GCP CDN Load Balancer (if enabled)"
}



output "tf_state_bucket_name" {
  value       = google_storage_bucket.tf_state.name
  description = "GCS Bucket name created for Terraform remote state"
}

output "workload_identity_provider" {
  value       = google_iam_workload_identity_pool_provider.github_provider.name
  description = "GCP Workload Identity Provider resource name for GitHub Actions"
}

output "cicd_service_account_email" {
  value       = google_service_account.github_cicd.email
  description = "GCP CI/CD Service Account email for GitHub Actions"
}

