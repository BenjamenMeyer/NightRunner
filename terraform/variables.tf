variable "project_id" {
  type        = string
  description = "The GCP Project ID where resources will be created."
  default     = "YOUR_GCP_PROJECT_ID"
}

variable "region" {
  type        = string
  description = "The default GCP region for resources."
  default     = "us-central1"
}

variable "environment" {
  type        = string
  description = "Deployment environment (e.g. dev, staging, prod)."
  default     = "dev"
}

variable "db_password" {
  type        = string
  description = "Password for the PostgreSQL database user."
  sensitive   = true
  default     = "ChangeMeInProduction123!"
}

variable "db_name" {
  type        = string
  description = "Name of the PostgreSQL database."
  default     = "nightrunner"
}

variable "db_user" {
  type        = string
  description = "Username for the PostgreSQL database user."
  default     = "nightrunner_user"
}

variable "backend_image" {
  type        = string
  description = "Docker image tag for the backend Cloud Run service."
  default     = "us-central1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/nightrunner/backend:latest"
}

# ------------------------------------------------------------------------------
# Social Auth Credentials (Firebase / Identity Platform)
# ------------------------------------------------------------------------------

variable "google_client_id" {
  type        = string
  description = "Google OAuth Client ID for Firebase Social Sign-In."
  default     = ""
}

variable "google_client_secret" {
  type        = string
  description = "Google OAuth Client Secret for Firebase Social Sign-In."
  sensitive   = true
  default     = ""
}

variable "github_client_id" {
  type        = string
  description = "GitHub OAuth Client ID for Firebase Social Sign-In."
  default     = ""
}

variable "github_client_secret" {
  type        = string
  description = "GitHub OAuth Client Secret for Firebase Social Sign-In."
  sensitive   = true
  default     = ""
}

# ------------------------------------------------------------------------------
# GitHub Organization & CI/CD Setup
# ------------------------------------------------------------------------------

variable "github_org" {
  type        = string
  description = "The GitHub Organization name where secrets will be stored."
  default     = ""
}

variable "github_repo_name" {
  type        = string
  description = "The GitHub Repository name inside the organization."
  default     = "NightRunner"
}

variable "enable_load_balancer" {
  type        = bool
  description = "Whether to provision Global HTTP Load Balancer & CDN (~$18/mo). Set to false during dev to save costs."
  default     = false
}

# ------------------------------------------------------------------------------
# GCP Billing Budget & Cost Safeguards
# ------------------------------------------------------------------------------

variable "billing_account_id" {
  type        = string
  description = "GCP Billing Account ID (format: XXXXXX-XXXXXX-XXXXXX) for setting up budget alerts."
  default     = ""
}

variable "monthly_budget_amount" {
  type        = number
  description = "Monthly budget cap in USD for spend alerts."
  default     = 20.00
}

variable "max_cloud_run_instances" {
  type        = number
  description = "Hard cap on maximum Cloud Run container instances to limit execution costs."
  default     = 2
}

# ------------------------------------------------------------------------------
# CDN Provider & Cloudflare Configuration
# ------------------------------------------------------------------------------

variable "cdn_provider" {
  type        = string
  description = "CDN Provider option: 'none' (Direct/Dev), 'cloudflare' (Free CDN & DDoS protection), or 'gcp' (GCP Cloud CDN + Load Balancer)."
  default     = "none"
  validation {
    condition     = contains(["none", "cloudflare", "gcp"], var.cdn_provider)
    error_message = "cdn_provider must be 'none', 'cloudflare', or 'gcp'."
  }
}

variable "cloudflare_api_token" {
  type        = string
  description = "Cloudflare API Token for managing DNS & Cache rules."
  sensitive   = true
  default     = ""
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Cloudflare Zone ID for your custom domain."
  default     = ""
}

variable "domain_name" {
  type        = string
  description = "Custom domain name (e.g. nightrunner.example.com)."
  default     = ""
}






