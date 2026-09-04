# Enable Billing Budgets API
resource "google_project_service" "billingbudgets" {
  service            = "billingbudgets.googleapis.com"
  disable_on_destroy = false
}

# GCP Billing Budget & Alert Thresholds
resource "google_billing_budget" "project_budget" {
  count           = var.billing_account_id != "" ? 1 : 0
  depends_on      = [google_project_service.billingbudgets]
  billing_account = var.billing_account_id
  display_name    = "NightRunner Budget ($${var.monthly_budget_amount})"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = floor(var.monthly_budget_amount)
      nanos         = floor((var.monthly_budget_amount - floor(var.monthly_budget_amount)) * 1000000000)
    }
  }

  # Alert at 50% of budget spent
  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }

  # Alert at 80% of budget spent
  threshold_rules {
    threshold_percent = 0.8
    spend_basis       = "CURRENT_SPEND"
  }

  # Alert at 100% of budget spent
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  # Forecasted Alert: Warn if spend is projected to exceed 100% of budget
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = []
    disable_default_iam_recipients  = false # Sends email to Billing Account Admins & Project Owners
  }
}
