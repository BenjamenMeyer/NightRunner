# Enable Artifact Registry API
resource "google_project_service" "artifactregistry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

# Artifact Registry Repository for Docker images with automatic cleanup policy
resource "google_artifact_registry_repository" "backend_repo" {
  depends_on    = [google_project_service.artifactregistry]
  location      = var.region
  repository_id = "nightrunner"
  description   = "Docker repository for NightRunner backend images"
  format        = "DOCKER"

  docker_config {
    immutable_tags = false
  }

  # Delete untagged images older than 7 days
  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s" # 7 days
    }
  }

  # Keep only the 5 most recent tagged images
  cleanup_policies {
    id     = "keep-recent-tagged"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
    }
  }
}
