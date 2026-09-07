# Firebase OIDC & Local Development Guide

This guide details how to configure **Firebase Authentication / GCP Identity Platform** for production and development environments, register OAuth redirect callbacks, and toggle local development between the **Mock OIDC Server** and **Live Firebase Auth**.

---

## 1. Firebase / GCP Identity Platform Setup

### A. Authorized Domains
Go to **GCP Console** -> **Identity Platform** -> **Settings** -> **Authorized Domains**:
Add the following domains:
- `localhost`
- `storage.googleapis.com`
- `nightops.2bameyer.net` (or your production custom domain)

### B. Google OAuth 2.0 Client Credentials
Go to **GCP Console** -> **APIs & Services** -> **Credentials** -> Select your **OAuth 2.0 Client ID** (Web application):

1. **Authorized JavaScript origins**:
   - `http://localhost:3000` (Local Vite frontend container)
   - `http://localhost:5173` (Local Vite dev server)
   - `https://nightops.2bameyer.net` (Live custom domain)

2. **Authorized redirect URIs**:
   - `http://localhost:3000/callback`
   - `http://localhost:5173/callback`
   - `https://nightops.2bameyer.net/callback`
   - `https://<YOUR_GCP_PROJECT_ID>.firebaseapp.com/__/auth/handler`

---

## 2. Local Development Modes in Docker Compose

NightRunner supports two local authentication modes in `docker-compose.yaml`.

### Mode A: Mock Provider (Default for Offline / Quick Local Dev)
By default, running `docker compose up` starts an in-memory Mock OIDC container (`soluto/oidc-server-mock`) on `http://localhost:4000`.

- **Start Stack**:
  ```bash
  docker compose up --build
  ```
- **Pre-seeded Testing Accounts**:
  - `adminuser` / `password`
  - `organizeruser` / `password`
  - `scoreruser` / `password`

---

### Mode B: Live Firebase OIDC Provider (Local Testing against Real Firebase)
To test live Google OAuth or Firebase user accounts on your local machine:

1. Create a `.env.local` file in the project root:
   ```env
   # Toggle to Firebase OIDC
   VITE_OIDC_AUTHORITY=https://securetoken.google.com/tlnightops-nightrunner-dev
   VITE_OIDC_CLIENT_ID=550013958206-b8itq3abj95t7hs75cm914mgsfpdtgkt.apps.googleusercontent.com
   OIDC_ISSUER=https://securetoken.google.com/tlnightops-nightrunner-dev
   OIDC_AUDIENCE=tlnightops-nightrunner-dev
   JWKS_URL=https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com
   FRONT_END_URL=http://localhost:3000
   ```

2. Start Docker Compose using `.env.local`:
   ```bash
   docker compose --env-file .env.local up --build
   ```

### Mode C: Frontend Direct Dev Server (`npm run dev` vs `npm run dev:firebase`)

When developing directly inside `nightrunner_frontend/`:

- **Mock OIDC Mode** (default):
  ```bash
  npm run dev
  ```
  Runs Vite with default settings pointing to `http://localhost:4000`.

- **Live Firebase Mode**:
  1. Create a `.env.firebase.local` file inside `nightrunner_frontend/`:
     ```env
     VITE_OIDC_AUTHORITY=https://securetoken.google.com/tlnightops-nightrunner-dev
     VITE_OIDC_CLIENT_ID=550013958206-b8itq3abj95t7hs75cm914mgsfpdtgkt.apps.googleusercontent.com
     ```
  2. Run Vite with `--mode firebase`:
     ```bash
     npm run dev:firebase
     ```

---

## 3. Automated Terraform Environment Deployment

When running Terraform via `./run-terraform dev apply`, OpenTofu automatically:
1. Configures GCP Identity Platform base settings and authorized domains.
2. Exports `GCP_GOOGLE_CLIENT_ID` into GitHub Secrets.
3. Injects live OIDC variables into Cloud Run backend containers.
