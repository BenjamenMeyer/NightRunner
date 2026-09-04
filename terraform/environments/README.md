# Multi-Environment Configuration Guide

This directory contains environment-specific configuration files for **NightRunner** (`dev`, `prod`, `staging`, etc.).

---

## Directory Structure

```text
terraform/environments/
├── README.md                  # This documentation
├── dev/
│   ├── backend.tfvars         # GCS remote state configuration for dev
│   └── terraform.tfvars       # Input variables for dev environment
└── prod/
    ├── backend.tfvars         # GCS remote state configuration for prod
    └── terraform.tfvars       # Input variables for prod environment
```

---

## Environment File Specifications

Each environment folder requires two files:

### 1. `backend.tfvars` (Remote State Storage)
Defines where OpenTofu / Terraform stores the state file in Google Cloud Storage:

```hcl
bucket = "your-gcp-project-tf-state-12345678"
prefix = "nightrunner/dev/state"
```

> **Initial Bootstrap Note**: When creating a brand-new environment whose GCS state bucket does not exist yet in GCP, leave `bucket` commented out (`# bucket = ...`). The `./run-terraform` script will automatically run in local bootstrap mode to create the GCP project infrastructure and state bucket. Afterwards, paste the created bucket name into `backend.tfvars` and run `./run-terraform <env> init -migrate-state`.

### 2. `terraform.tfvars` (Resource Parameters)
Defines environment-specific resource parameters:

```hcl
project_id            = "tlnightops-nightrunner-dev"
region                = "us-east1"
environment           = "dev"
db_password           = "YourSecurePasswordHere"
db_name               = "nightrunner"
db_user               = "nightrunner_user"
cdn_provider          = "none"                       # Options: "none", "cloudflare", "gcp"
billing_account_id    = "XXXXXX-XXXXXX-XXXXXX"
monthly_budget_amount = 50.00
github_org            = "TLNightOps"
github_repo_name      = "NightRunner"
```

---

## Usage & Execution Commands

Use the `./run-terraform` wrapper script from the root of the repository:

### Development Environment (Default)
```bash
./run-terraform dev plan
./run-terraform dev apply
```
*(Or simply `./run-terraform plan` / `./run-terraform apply` which defaults to `dev`)*

### Production Environment
```bash
./run-terraform prod plan
./run-terraform prod apply
```

---

## How to Add a New Environment (e.g. `staging`)

1. Create a new folder: `terraform/environments/staging/`.
2. Copy `backend.tfvars` and `terraform.tfvars` from `dev/` or `prod/`.
3. Update `project_id`, `environment = "staging"`, and passwords.
4. Execute:
   ```bash
   ./run-terraform staging plan
   ./run-terraform staging apply
   ```
