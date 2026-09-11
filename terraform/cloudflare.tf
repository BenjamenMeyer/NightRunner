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
  content = replace(replace(google_cloud_run_v2_service.backend.uri, "https://", ""), "/", "")
  proxied = true # Enables Cloudflare Free CDN, SSL, and DDoS Protection
  ttl     = 1    # Auto TTL when proxied
}

# Cloudflare Page Rule 1: Bypass cache for API calls (/api/* -> Cloud Run)
resource "cloudflare_page_rule" "api_no_cache" {
  count    = local.enable_cloudflare ? 1 : 0
  zone_id  = var.cloudflare_zone_id
  target   = "*${var.domain_name}/api/*"
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
resource "cloudflare_workers_script" "gcs_signer" {
  count      = local.enable_cloudflare ? 1 : 0
  account_id = var.cloudflare_account_id
  name       = "nightrunner-gcs-signer"
  content    = <<EOF
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Pass API requests directly to Cloud Run backend (strictly routes /api/* and health checks)
  const isApiRequest = url.pathname.startsWith('/api/') || url.pathname === '/health'
  if (isApiRequest) {
    const cloudRunHost = "${replace(replace(google_cloud_run_v2_service.backend.uri, "https://", ""), "/", "")}"
    const targetPathname = url.pathname.startsWith('/api/') ? url.pathname.replace('/api', '') : url.pathname
    const backendUrl = new URL(targetPathname + url.search, "https://" + cloudRunHost)
    
    const headers = new Headers(request.headers)
    const userAuth = request.headers.get("Authorization")
    if (userAuth && !request.headers.has("X-Forwarded-Authorization")) {
      headers.set("X-Forwarded-Authorization", userAuth)
    }

    // Generate GCP IAM OIDC token for Cloud Run Invoker SA if GCP_SA_KEY is configured
    if (typeof GCP_SA_KEY !== 'undefined' && GCP_SA_KEY) {
      try {
        const idToken = await getGcpIdToken(GCP_SA_KEY, "https://" + cloudRunHost)
        if (idToken) {
          headers.set("Authorization", "Bearer " + idToken)
        }
      } catch (err) {
        console.error("Failed to generate GCP IAM OIDC token:", err)
      }
    }

    const backendRequest = new Request(backendUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.body
    })
    return fetch(backendRequest)
  }

  // Construct GCS Origin URL (SPA routing: static files vs client-side route fallback to /index.html)
  const gcsHost = "${google_storage_bucket.frontend.name}.storage.googleapis.com"
  const isStaticAsset = url.pathname.startsWith('/assets/') || url.pathname.includes('.')
  const pathname = (url.pathname === '/' || !isStaticAsset) ? '/index.html' : url.pathname
  const gcsUrl = "https://" + gcsHost + pathname

  // Compute HMAC Authorization header using GCS HMAC Access Key & Secret
  const accessKey = "${google_storage_hmac_key.cdn_hmac.access_id}"
  const secretKey = GCS_HMAC_SECRET

  // Date headers
  const now = new Date()
  const dateStr = now.toUTCString()

  // Canonical String for GCS HMAC V2 / Interoperability Auth: GET\n\n\n<date>\n/<bucket>/<path>
  const canonicalString = "GET\n\n\n" + dateStr + "\n/${google_storage_bucket.frontend.name}" + pathname

  // Compute HMAC-SHA1 signature
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secretKey)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(canonicalString))
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))

  const authorizationHeader = "AWS " + accessKey + ":" + signatureBase64

  const modifiedRequest = new Request(gcsUrl, {
    method: 'GET',
    headers: new Headers({
      'Host': gcsHost,
      'Date': dateStr,
      'Authorization': authorizationHeader,
      'User-Agent': 'Cloudflare-Worker-GCS-Signer'
    })
  })

  const response = await fetch(modifiedRequest)

  // If object not found (e.g. direct deep link SPA navigation), serve /index.html
  if (response.status === 404 || response.status === 403) {
    const fallbackPath = '/index.html'
    const fallbackCanonical = "GET\n\n\n" + dateStr + "\n/${google_storage_bucket.frontend.name}" + fallbackPath
    const fallbackSigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(fallbackCanonical))
    const fallbackSigBase64 = btoa(String.fromCharCode(...new Uint8Array(fallbackSigBuffer)))
    const fallbackAuth = "AWS " + accessKey + ":" + fallbackSigBase64

    return fetch("https://" + gcsHost + fallbackPath, {
      method: 'GET',
      headers: new Headers({
        'Host': gcsHost,
        'Date': dateStr,
        'Authorization': fallbackAuth,
        'User-Agent': 'Cloudflare-Worker-GCS-Signer'
      })
    })
  }

  return response
}

async function getGcpIdToken(saKeyJson, targetAudience) {
  const sa = typeof saKeyJson === 'string' ? JSON.parse(saKeyJson) : saKeyJson
  const now = Math.floor(Date.now() / 1000)
  
  const header = { alg: "RS256", typ: "JWT", kid: sa.private_key_id }
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    target_audience: targetAudience,
    iat: now,
    exp: now + 3600
  }

  const base64UrlEncode = str => btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const unsignedToken = encodedHeader + '.' + encodedPayload

  const pemHeader = "-----BEGIN PRIVATE KEY-----"
  const pemFooter = "-----END PRIVATE KEY-----"
  const pemContents = sa.private_key.substring(sa.private_key.indexOf(pemHeader) + pemHeader.length, sa.private_key.indexOf(pemFooter)).replace(/\s/g, '')
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken)
  )

  const jwtAssertion = unsignedToken + '.' + base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwtAssertion
    })
  })

  if (!tokenRes.ok) {
    throw new Error("GCP OAuth token request failed: HTTP " + tokenRes.status)
  }

  const data = await tokenRes.json()
  return data.id_token
}
EOF

  secret_text_binding {
    name = "GCS_HMAC_SECRET"
    text = google_storage_hmac_key.cdn_hmac.secret
  }

  secret_text_binding {
    name = "GCP_SA_KEY"
    text = base64decode(google_service_account_key.cloudflare_invoker_key.private_key)
  }
}

# Cloudflare Worker Route: Map frontend domain to GCS Worker Signer
resource "cloudflare_workers_route" "gcs_signer_route" {
  count       = local.enable_cloudflare ? 1 : 0
  zone_id     = var.cloudflare_zone_id
  pattern     = "${var.domain_name}/*"
  script_name = cloudflare_workers_script.gcs_signer[0].name
}
