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
    cache_level = "cache_everything"
    edge_cache_ttl {
      ttl = 86400 # 24 hours edge cache
    }
  }
}
