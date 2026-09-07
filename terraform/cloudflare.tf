# Cloudflare Free CDN & DNS Integration (Option B: Single Domain with Path Routing)
# (Enabled when cdn_provider = "cloudflare" and cloudflare_zone_id is provided)

locals {
  enable_cloudflare = var.cdn_provider == "cloudflare" && var.cloudflare_zone_id != "" && var.domain_name != ""
}

# Single CNAME record for custom domain (e.g. nightrunner.example.com)
resource "cloudflare_record" "app" {
  count   = local.enable_cloudflare ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = var.domain_name
  type    = "CNAME"
  value   = replace(replace(google_cloud_run_v2_service.backend.uri, "https://", ""), "/", "")
  proxied = true # Enables Cloudflare Free CDN, SSL, and DDoS Protection
  ttl     = 1    # Auto TTL when proxied
}

# Cloudflare Page Rule 1: Bypass cache for API calls (/v1/* -> Cloud Run)
resource "cloudflare_page_rule" "api_no_cache" {
  count    = local.enable_cloudflare ? 1 : 0
  zone_id  = var.cloudflare_zone_id
  target   = "*${var.domain_name}/v1/*"
  priority = 1

  actions {
    cache_level = "bypass"
  }
}

# Cloudflare Page Rule 2: Aggressive caching for frontend static assets (/assets/* -> GCS CDN)
resource "cloudflare_page_rule" "static_assets" {
  count    = local.enable_cloudflare ? 1 : 0
  zone_id  = var.cloudflare_zone_id
  target   = "*${var.domain_name}/assets/*"
  priority = 2

  actions {
    cache_level    = "cache_everything"
    edge_cache_ttl = 86400 # 24 hours edge cache
  }
}

# Cloudflare Worker: Sign requests to Private GCS bucket using HMAC Key
resource "cloudflare_worker_script" "gcs_signer" {
  count      = local.enable_cloudflare ? 1 : 0
  account_id = var.cloudflare_account_id
  name       = "nightrunner-gcs-signer"
  content    = <<EOF
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Pass API requests directly to Cloud Run backend
  if (url.pathname.startsWith('/v1/') || url.pathname === '/health') {
    return fetch(request)
  }

  // Construct GCS Origin URL
  const gcsHost = "${google_storage_bucket.frontend.name}.storage.googleapis.com"
  const gcsUrl = new URL(url.pathname === '/' ? '/index.html' : url.pathname, "https://" + gcsHost)

  // Fetch static asset from Private GCS bucket using HMAC secret header authentication
  const modifiedRequest = new Request(gcsUrl.toString(), {
    method: request.method,
    headers: new Headers({
      'Host': gcsHost,
      'Authorization': 'Bearer ' + GCS_HMAC_SECRET,
      'User-Agent': 'Cloudflare-Worker-GCS-Signer'
    })
  })

  return fetch(modifiedRequest)
}
EOF

  secret_text_binding {
    name = "GCS_HMAC_SECRET"
    text = google_storage_hmac_key.cdn_hmac.secret
  }
}

# Cloudflare Worker Route: Map frontend domain to GCS Worker Signer
resource "cloudflare_worker_route" "gcs_signer_route" {
  count       = local.enable_cloudflare ? 1 : 0
  zone_id     = var.cloudflare_zone_id
  pattern     = "*${var.domain_name}/*"
  script_name = cloudflare_worker_script.gcs_signer[0].name
}
