# Enable Cloud SQL Admin API
resource "google_project_service" "sqladmin" {
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

# Cloud SQL PostgreSQL Instance (db-f1-micro)
resource "google_sql_database_instance" "main" {
  depends_on          = [google_project_service.sqladmin]
  name                = "nightrunner-db-${var.environment}"
  database_version    = "POSTGRES_15"
  region              = var.region
  deletion_protection = false

  settings {
    tier              = "db-f1-micro"
    availability_type = "ZONAL"
    disk_size            = 10
    disk_type            = "PD_HDD"
    disk_autoresize      = true
    disk_autoresize_limit = 20 # Prevents database disk from auto-expanding beyond 20 GB


    ip_configuration {
      ipv4_enabled    = true
      # Restrict IP ranges in production as appropriate
      authorized_networks {
        name  = "allow-all-temporary"
        value = "0.0.0.0/0"
      }
    }

    backup_configuration {
      enabled    = true
      start_time = "03:00"
    }
  }
}

# Database
resource "google_sql_database" "database" {
  name     = var.db_name
  instance = google_sql_database_instance.main.name
}

# Database User
resource "google_sql_user" "user" {
  name     = var.db_user
  instance = google_sql_database_instance.main.name
  password = var.db_password
}
