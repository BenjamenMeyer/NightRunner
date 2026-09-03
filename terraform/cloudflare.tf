# Cloudflare Free CDN & DNS Integration
# (Enabled when cdn_provider = "cloudflare" and cloudflare_zone_id is provided)

# CNAME record pointing your custom domain to Cloud Run backend (Proxied via Cloudflare Free CDN)
resource "cloudflare_record" "api" {
  count   = (var.cdn_provider == "cloudflare" && var.cloudflare_zone_id != "" && var.domain_name != "") ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "api"
  type    = "CNAME"
  value   = replace(replace(google_cloud_run_v2_service.backend.uri, "https://", ""), "/", "")
  proxied = true # Enables Cloudflare Free CDN, SSL, and DDoS Protection
  ttl     = 1    # Auto TTL when proxied
}

# Cloudflare Page Rule: Aggressive caching for frontend static assets
resource "cloudflare_page_rule" "static_assets" {
  count    = (var.cdn_provider == "cloudflare" && var.cloudflare_zone_id != "" && var.domain_name != "") ? 1 : 0
  zone_id  = var.cloudflare_zone_id
  target   = "*${var.domain_name}/assets/*"
  priority = 1

  actions {
    cache_level = "cache_everything"
    edge_cache_ttl {
      ttl = 86400 # 24 hours edge cache
    }
  }
}
