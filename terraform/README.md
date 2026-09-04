# NightRunner Terraform Infrastructure

This directory contains the Terraform configuration for deploying the **NightRunner** application to **Google Cloud Platform (GCP)** and automatically configuring **GitHub Actions CI/CD Secrets**.

---

## Architecture Overview

- **GCS Buckets**:
  - Terraform remote state bucket (`<project-id>-tf-state-*`).
  - Frontend static assets bucket (`<project-id>-frontend-*`) with `public_access_prevention = "enforced"` (100% Private, direct public access blocked).
- **Cloud CDN / Load Balancer**: Global HTTP Proxy and forwarding rule serving frontend assets securely from the private GCS bucket using a Service Account (`nightrunner-cdn-gcs-reader`).

- **Artifact Registry**: Docker repository (`nightrunner`) for backend images.
- **Cloud Run**: Serverless container hosting the Python ASGI backend connected to Cloud SQL.
- **Cloud SQL**: PostgreSQL instance (`db-f1-micro`) for persistent data storage.
- **Firebase Auth / Identity Platform**: Authentication provider with OAuth Social Logins (Google, GitHub) + email test accounts.
- **GitHub Actions CI/CD**:
  - Workload Identity Federation for keyless authentication.
  - Automatic injection of organization secrets into GitHub.

---

## Prerequisites

1. **GCP Account & Project**: A GCP project with billing enabled.
2. **GCP CLI (`gcloud`)**: Installed and authenticated (`gcloud auth login` & `gcloud auth application-default login`).
3. **Terraform CLI**: Installed (`>= 1.5.0`).
4. **GitHub Personal Access Token (PAT)**: Required if using Terraform to set GitHub Organization secrets. Must have `admin:org` or `repo` permissions.

---

## First-Time Setup & Deployment Push Order

Follow this exact sequence before pushing code to GitHub to ensure smooth CI/CD deployment:

### 1. Initialize Local GCP Project & Billing
```bash
# Set your active gcloud project
gcloud config set project YOUR_GCP_PROJECT_ID

# Authenticate gcloud CLI for Terraform
gcloud auth login
gcloud auth application-default login
```

### 2. Configure Local Terraform Variables
Copy and fill in `terraform.tfvars`:
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

### 3. Multi-Environment Execution & GitHub Secrets Setup
Run Terraform via the `./run-terraform` helper script from the root directory:

```bash
# Execute for Dev environment (Default):
./run-terraform dev plan
./run-terraform dev apply

# Execute for Prod environment:
./run-terraform prod plan
./run-terraform prod apply
```

> **Detailed Multi-Environment Documentation**: See [environments/README.md](file:///home/bmeyer/Devel/nightops/NightRunner/terraform/environments/README.md) for full instructions on setting up `dev`, `prod`, or adding new environments (e.g. `staging`).

> **What `apply` does automatically**:
> - Enables GCP APIs & provisions Cloud SQL, GCS Buckets, and Artifact Registry.
> - Configures GCP Workload Identity Federation OIDC provider.
> - **Auto-populates GitHub Secrets** (`GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, etc.) directly into GitHub!

### 4. Push Code to GitHub
Now push your repo code to `main` to trigger the automated CI/CD pipeline:
```bash
git add .
git commit -m "feat: setup GCP Terraform infrastructure and CI/CD"
git push origin main
```

---

## Quick Start Configuration


### Complete Local Configuration Reference

Here is the complete list of settings for `terraform.tfvars` and local environment variables:

| Setting / Variable | Location | Required? | Description & Example |
| :--- | :--- | :--- | :--- |
| `project_id` | `terraform.tfvars` | **Yes** | Your GCP Project ID (e.g. `my-gcp-project-123`) |
| `region` | `terraform.tfvars` | **Yes** | Primary GCP region (e.g. `us-central1`) |
| `db_password` | `terraform.tfvars` | **Yes** | Password for PostgreSQL database user |
| `GITHUB_TOKEN` | `export GITHUB_TOKEN` | Optional | GitHub Personal Access Token (PAT) with `admin:org` / `repo` permissions (required if `github_org` is set) |
| `github_org` | `terraform.tfvars` | Optional | GitHub Organization name for auto-injecting secrets |
| `github_repo_name` | `terraform.tfvars` | Optional | Repository name (default: `NightRunner`) |
| `billing_account_id` | `terraform.tfvars` | Optional | GCP Billing Account ID (`XXXXXX-XXXXXX-XXXXXX`) for budget alerts |
| `monthly_budget_amount` | `terraform.tfvars` | Optional | Spend cap in USD (default: `20.00`) |
| `cdn_provider` | `terraform.tfvars` | Optional | CDN choice: `"none"` (dev), `"cloudflare"` (Free), or `"gcp"` ($18/mo) |
| `cloudflare_api_token` | `terraform.tfvars` | Optional | Cloudflare API token (required if `cdn_provider = "cloudflare"`) |
| `cloudflare_zone_id` | `terraform.tfvars` | Optional | Cloudflare Domain Zone ID (required if `cdn_provider = "cloudflare"`) |
| `domain_name` | `terraform.tfvars` | Optional | Custom domain name (e.g. `nightrunner.example.com`) |
| `google_client_id` | `terraform.tfvars` | Optional | Google OAuth Client ID for Firebase Social Login |
| `google_client_secret` | `terraform.tfvars` | Optional | Google OAuth Client Secret for Firebase Social Login |
| `github_client_id` | `terraform.tfvars` | Optional | GitHub OAuth Client ID for Firebase Social Login |
| `github_client_secret` | `terraform.tfvars` | Optional | GitHub OAuth Client Secret for Firebase Social Login |
| `facebook_client_id` | `terraform.tfvars` | Optional | Facebook App ID for Firebase Social Login |
| `facebook_client_secret` | `terraform.tfvars` | Optional | Facebook App Secret for Firebase Social Login |
| `twitter_client_id` | `terraform.tfvars` | Optional | Twitter / X API Key for Firebase Social Login |
| `twitter_client_secret` | `terraform.tfvars` | Optional | Twitter / X API Secret for Firebase Social Login |
| `apple_client_id` | `terraform.tfvars` | Optional | Apple Services ID for Firebase Social Login |
| `apple_client_secret` | `terraform.tfvars` | Optional | Apple Secret Key for Firebase Social Login |

> **Detailed Social Auth Instructions**: See [README.Social.md](file:///home/bmeyer/Devel/nightops/NightRunner/terraform/README.Social.md) for step-by-step guides on obtaining OAuth credentials for all 5 social providers.


---

### Step 1: Prepare `terraform.tfvars`

Copy the example file:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Fill in `terraform.tfvars` using the values from the reference table above.


### Step 2: Configure & Set GitHub Token Environment Variable (If `github_org` is set)

To populate GitHub Organization Secrets automatically via Terraform, create a **Fine-Grained Personal Access Token (PAT)** or standard PAT in GitHub with the minimum required scopes:

#### Recommended: Fine-Grained Personal Access Token (Least Privilege)
1. Go to **GitHub Settings** -> **Developer Settings** -> **Personal Access Tokens** -> **Fine-grained tokens**.
2. Click **Generate new token**.
3. Set **Resource Owner** to your **GitHub Organization** (or repository).
4. Under **Repository permissions**:
   - **Secrets**: `Read and write` (Required to create secrets).
5. Under **Organization permissions** (if managing organization-wide secrets):
   - **Organization Secrets**: `Read and write`.
6. Set expiration (e.g. 30–90 days).

#### Alternative: Classic Personal Access Token
- Scope: `admin:org_hook` / `admin:org` (for Org Secrets) OR `repo` (for Repo Secrets).

Export the token in your terminal before running Terraform:

```bash
export GITHUB_TOKEN="github_pat_11AAAAAAA_xxxxxxxxxxxxxxxxxxxxxxxx"
```

#### using `run-terraform`

The `run-terraform` script is provided for convenience and can enable supporting
multiple environments easily. See the README in the terraform/environments file for
details about configuring multiple environments.

When using `run-terraform` store the Github PAT token in the file `.github-pat` at
the project root where you'll run `./run-terraform <env> <terraform command + options> from.
Then just switch out the `terraform` for `./run-terraform <env>` for the terraform
commands below.

#### Terraform vs OpenTofu

This repository should support both Hashicorp's Terraform and the Linux Foundation's OpenTofu
implementation.

### Step 3: Initialize & Apply Terraform

```bash
terraform init
terraform plan
terraform apply
```


---

## Enabling GCS Remote State Backend (Recommended)

After running `terraform apply` for the first time, Terraform will create a dedicated GCS bucket for remote state.

1. Note the `tf_state_bucket_name` from `terraform apply` output.
2. Open `providers.tf` and uncomment the `backend "gcs"` block:

```hcl
backend "gcs" {
  bucket = "YOUR_TF_STATE_BUCKET_NAME"
  prefix = "nightrunner/state"
}
```

3. Re-initialize Terraform to migrate local state to GCS:

```bash
terraform init -migrate-state
```

---

## CI/CD Deployment Flow

Once `terraform apply` completes:

1. **Workload Identity Provider** is created in GCP (`google_iam_workload_identity_pool_provider`).
2. If `github_org` was provided, Terraform automatically populates the following GitHub Organization Secrets:
   - `GCP_PROJECT_ID`
   - `GCP_REGION`
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`
   - `GCP_SERVICE_ACCOUNT`
   - `GCP_ARTIFACT_REGISTRY_URL`
   - `GCP_CLOUD_RUN_SERVICE`
   - `GCP_FRONTEND_BUCKET`
3. Pushing code to the `main` branch triggers `.github/workflows/deploy.yml` which uses **smart path filtering** (`dorny/paths-filter`):
   - **Backend Job (`deploy-backend`)**: Only runs if files in `nightrunner_backend/**`, `Dockerfile`, or `pyproject.toml` change. Builds & pushes the Docker image to Artifact Registry and updates Cloud Run.
   - **Frontend Job (`deploy-frontend`)**: Only runs if files in `nightrunner_frontend/**` change. Builds the Vite React frontend and uploads `dist/` to the GCS bucket.
   - If a push only modifies frontend code, the backend build & Cloud Run deployment are automatically skipped (and vice versa)!


---

## Useful Commands & Verification

- **View Terraform Outputs**:
  ```bash
  terraform output
  ```

- **Cloud Run Logs**:
  ```bash
  gcloud logs read --project=YOUR_PROJECT_ID --resource-type=cloud_run_revision
  ```

- **Cloud SQL Connection**:
  Connection string uses the Cloud SQL Proxy:
  `postgresql+psycopg://user:password@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE`

---

---

## Managing Cloud SQL & Controlling Billing

To keep costs near **$0/month** between events or active development phases, you can stop the Cloud SQL PostgreSQL instance. When paused, GCP stops billing for instance compute CPU/RAM (~$7-$9/mo), and you only pay a few cents (~$0.17/mo) for the 10 GB disk storage.

### Method 1: CLI Management (`gcloud`)

Replace `nightrunner-db-dev` with your instance name (or the output of `terraform output cloud_sql_connection_name`).

- **Stop Database (Pause Compute Billing)**:
  ```bash
  gcloud sql instances patch nightrunner-db-dev --activation-policy=NEVER
  ```

- **Start Database (Resume Instance)**:
  ```bash
  gcloud sql instances patch nightrunner-db-dev --activation-policy=ALWAYS
  ```

- **Check Database Activation Status**:
  ```bash
  gcloud sql instances describe nightrunner-db-dev --format="value(settings.activationPolicy,state)"
  ```

---

### Method 2: Controlling via Terraform

You can also manage the database activation policy directly in `cloud_sql.tf` or set it to pause on deploy:

```hcl
settings {
  tier              = "db-f1-micro"
  activation_policy = "NEVER" # Change to "ALWAYS" to start, or "NEVER" to pause
  ...
}
```

---

### Method 3: Automated Nightly / Off-Hours Shutdown (Optional)

If you want to automatically turn off the database at night (e.g. 10 PM) and start it in the morning (e.g. 8 AM), you can set up a Cloud Scheduler cron job to call the GCP REST API endpoint for `patch` with `activationPolicy: NEVER`.

---

## Expected Costs & Explanation

### Estimated Monthly Cost Breakdown

| Resource Component | Configured Tier / Usage | Active Monthly Cost | Paused / Idle Monthly Cost | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Cloud SQL (PostgreSQL)** | `db-f1-micro` (Shared CPU, 0.6 GB RAM, 10 GB HDD) | **~$7.00 - $9.00 / month** | **~$0.17 / month** (Disk only) | Compute billing stops when paused (`NEVER`). |
| **Cloud Run (Backend)** | Serverless (2M requests/mo, 360k vCPU-sec free) | **$0.00** (Free Tier) | **$0.00** | Scales to 0 instances when idle. |
| **GCS Buckets (Frontend + State)** | Standard Storage (< 1 GB data) | **~$0.05 - $0.10 / month** | **~$0.05 - $0.10 / month** | 100% Private frontend & state buckets. |
| **Artifact Registry** | Docker Repository (< 0.5 GB storage) | **$0.00** (Free Tier) | **$0.00** | Free tier includes up to 0.5 GB/month storage. |
| **Firebase Auth / Identity Platform** | Social Sign-In & Email/Password | **$0.00** (Free Tier) | **$0.00** | Free up to 50,000 Monthly Active Users (MAUs). |
| **Workload Identity Federation** | Keyless GitHub Actions OIDC Auth | **$0.00** | **$0.00** | Native GCP security feature (free). |
| **Global Load Balancer & CDN** *(Optional)* | HTTP Forwarding Rule & Edge Cache | **~$18.00 / month** | **$0.00** (Disabled) | Controlled by `enable_load_balancer` (Default: `false`). |

---

### Total Monthly Cost Summary

- **Active Development Mode** (`enable_load_balancer = false`, Cloud SQL running): **~$7.00 - $9.00 / month**
- **Between Events / Paused Mode** (`enable_load_balancer = false`, Cloud SQL paused): **~$0.25 / month**
- **Production Event Mode** (`enable_load_balancer = true`, Cloud SQL running): **~$25.00 - $27.00 / month**

---

## GCP Billing Budget & Spend Safeguards

Terraform is configured to automatically provision a **GCP Billing Budget** (`google_billing_budget` in `billing_budget.tf`) to prevent unexpected charges or runaway bills.

### Features
- **Configurable Spend Cap**: Set `monthly_budget_amount` in `terraform.tfvars` (default: `$20.00`).
- **Multi-stage Alerts**: Triggers email notifications to Project Owners and Billing Account Admins when:
  - **50% of budget** ($10.00) is reached.
  - **80% of budget** ($16.00) is reached.
  - **100% of budget** ($20.00) is reached.
  - **100% Forecasted Spend**: Early warning triggered if projected monthly spend will exceed the budget cap based on current usage trends.

### Finding Your GCP Billing Account ID
To enable budget alerts, set `billing_account_id` in `terraform.tfvars`. Find your Billing Account ID with `gcloud`:

```bash
gcloud billing accounts list
```
*(Format: `XXXXXX-XXXXXX-XXXXXX`)*

---

## Billing Weaknesses & Built-in Safeguards Audit

Here is the audit of cost vectors and the safeguards configured in Terraform:

1. **Cloud SQL Disk Auto-Expansion Trap**:
   - *Risk*: GCP disks never automatically shrink. If a rogue query or log dump expands the disk, you are billed for that higher disk size permanently.
   - *Safeguard*: Added `disk_autoresize_limit = 20` in `cloud_sql.tf` to hard-cap disk expansion at 20 GB.

2. **Artifact Registry Docker Image Accumulation**:
   - *Risk*: Every GitHub Actions push generates a new Docker image (~200MB). Over time, hundreds of untagged/old images accumulate, driving up storage costs.
   - *Safeguard*: Configured automated `cleanup_policies` in `artifact_registry.tf` to delete untagged images older than 7 days and retain only the 5 most recent tagged versions.

3. **Cloud Run Execution Time & Instance Scaling Cap**:
   - *Risk*: Traffic spikes, DDoS attacks, or hanging API requests keep Cloud Run container instances active and consuming vCPU/RAM.
   - *Safeguard*: Hard-capped maximum container instances (`max_instance_count = var.max_cloud_run_instances`, default: `2`) and added a 15-second request execution timeout (`timeout = "15s"`) in `cloud_run.tf`. Scales down to `0` when idle.


4. **Network Egress (Outbound Traffic)**:
   - *Risk*: Outbound data to the internet costs ~$0.08 - $0.12 / GB.
   - *Safeguard*: Cloud Run and Cloud SQL are placed in the same region (`us-central1`) using Unix socket connections (`/cloudsql/...`) to avoid cross-region internal network egress.

5. **Cloud CDN Cache Misses & Global IP Fees**:
   - *Risk*: Global Load Balancer forwarding rules incur a flat ~$18/month IP reservation fee.
   - *Safeguard*: Configured flexible `cdn_provider` variable (`none`, `cloudflare`, or `gcp`). Using `cdn_provider = "cloudflare"` gives you unlimited free CDN caching, free DDoS protection, and $0 egress fees without paying GCP's $18/mo Load Balancer fee.

---

## CDN Provider Options (`cdn_provider`)

You can switch between CDN strategies in `terraform.tfvars`:

| Setting | Provider | Monthly Cost | Use Case |
| :--- | :--- | :--- | :--- |
| `cdn_provider = "none"` | **Direct / Dev** | **$0.00** | Direct Cloud Run & GCS access during development. |
| `cdn_provider = "cloudflare"` | **Cloudflare Free CDN** | **$0.00** | **Recommended**: Unlimited free CDN, DDoS protection, $0 egress fees, SSL. |
| `cdn_provider = "gcp"` | **GCP Cloud CDN** | **~$18.00 / month** | Native GCP Global HTTP Load Balancer + Cloud CDN. |

### Configuring Cloudflare Free CDN
Set the following in `terraform.tfvars`:

```hcl
cdn_provider         = "cloudflare"
cloudflare_api_token = "YOUR_CLOUDFLARE_API_TOKEN"
cloudflare_zone_id   = "YOUR_CLOUDFLARE_ZONE_ID"
domain_name          = "nightrunner.example.com"
```





