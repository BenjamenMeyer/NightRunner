import { describe, it, expect } from 'vitest';

describe('Live Backend & OIDC Integration Tests', () => {
  const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8000';
  const oidcUrl = process.env.VITE_OIDC_AUTHORITY || 'http://localhost:4000';

  it('connects to live backend /health endpoint', async () => {
    const res = await fetch(`${backendUrl}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('status', 'ok');
  });

  it('obtains OIDC token from mock provider and authenticates with backend /v1/me', async () => {
    // 1. Request OAuth2 token from mock OIDC provider using password grant
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: 'client-id',
      client_secret: 'secret',
      username: 'adminuser',
      password: 'password',
      scope: 'openid profile email'
    });

    const tokenRes = await fetch(`${oidcUrl}/connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    expect(tokenRes.status).toBe(200);
    const tokenData = await tokenRes.json();
    expect(tokenData).toHaveProperty('access_token');

    // 2. Call backend /v1/me with the Bearer token
    const meRes = await fetch(`${backendUrl}/v1/me`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    expect(meRes.status).toBe(200);
    const meData = await meRes.json();
    expect(meData).toHaveProperty('id');
    expect(meData.email).toBe('admin@example.com');
  });
});
