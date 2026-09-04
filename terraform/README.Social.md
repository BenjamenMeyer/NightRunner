# Social Authentication Setup Guide (Firebase / Identity Platform)

This guide provides step-by-step instructions for obtaining OAuth credentials for all supported Social Login providers (**Google**, **GitHub**, **Facebook**, **Twitter / X**, and **Apple**).

Once obtained, paste the respective credentials into your `terraform/terraform.tfvars` file.

> **Note on Redirect URIs**: For all providers, Firebase / GCP Identity Platform handles authentication callbacks via the following URL pattern:
> ```text
> https://<YOUR_GCP_PROJECT_ID>.firebaseapp.com/__/auth/handler
> ```
> Replace `<YOUR_GCP_PROJECT_ID>` with your GCP project ID (e.g. `my-project-10976-no-forms`).

---

## 1. Google OAuth 2.0 Setup (`google.com`)

1. Go to the **[GCP Console Credentials Page](https://console.cloud.google.com/apis/credentials)**.
2. Select your GCP project.
3. Configure the **OAuth Consent Screen** (if not already set up):
   - Choose **External** (or **Internal** if using Google Workspace).
   - Fill in App Name (e.g. `NightRunner`), User Support Email, and Developer Contact Email. Save and continue.
4. Click **+ Create Credentials** -> **OAuth client ID**.
5. Set **Application type** to **Web application**.
6. Set **Name** to `NightRunner Web`.
7. Under **Authorized redirect URIs**, click **+ Add URI** and enter:
   ```text
   https://<YOUR_GCP_PROJECT_ID>.firebaseapp.com/__/auth/handler
   ```
8. Click **Create**.
9. Copy the generated **Client ID** and **Client Secret** into `terraform.tfvars`:
   ```hcl
   google_client_id     = "1234567890-xxx.apps.googleusercontent.com"
   google_client_secret = "GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
   ```

---

## 2. GitHub OAuth Setup (`github.com`)

1. Log in to GitHub and go to **[GitHub Developer Settings -> OAuth Apps](https://github.com/settings/developers)**.
2. Click **New OAuth App**.
3. Fill in the fields:
   - **Application name**: `NightRunner`
   - **Homepage URL**: `https://<YOUR_GCP_PROJECT_ID>.firebaseapp.com` (or your custom domain)
   - **Authorization callback URL**:
     ```text
     https://<YOUR_GCP_PROJECT_ID>.firebaseapp.com/__/auth/handler
     ```
4. Click **Register application**.
5. Copy the **Client ID**.
6. Click **Generate a new client secret** and copy the **Client Secret**.
7. Add both to `terraform.tfvars`:
   ```hcl
   github_client_id     = "Iv1.xxxxxxxxxxxxxxxx"
   github_client_secret = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

---

## 3. Facebook Setup (`facebook.com`)

1. Log in to **[Meta for Developers](https://developers.facebook.com/)**.
2. Click **My Apps** -> **Create App**.
3. Select **Authenticate and manage users (Facebook Login)** and click **Next**.
4. Set App Name to `NightRunner` and complete creation.
5. In the app dashboard, navigate to **Facebook Login** -> **Settings**.
6. Under **Valid OAuth Redirect URIs**, enter:
   ```text
   https://<YOUR_GCP_PROJECT_ID>.firebaseapp.com/__/auth/handler
   ```
7. Click **Save Changes**.
8. Go to **App Settings** -> **Basic** in the left sidebar.
9. Copy the **App ID** (`facebook_client_id`).
10. Click **Show** next to **App Secret** and copy the secret (`facebook_client_secret`).
11. Add both to `terraform.tfvars`:
    ```hcl
    facebook_client_id   = "1234567890123456"
    facebook_client_secret = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    ```

---

## 4. Twitter / X Setup (`twitter.com`)

1. Log in to the **[X / Twitter Developer Portal](https://developer.x.com/en/portal/dashboard)**.
2. Create a **Project** and an **App** (or open an existing App).
3. Under App Settings, click **Set up** under **User authentication settings**:
   - **App permissions**: Select **Read**.
   - **Type of App**: Select **Web App, Automated App or Bot**.
   - **Callback URI / Redirect URL**:
     ```text
     https://<YOUR_GCP_PROJECT_ID>.firebaseapp.com/__/auth/handler
     ```
   - **Website URL**: Enter your homepage or domain.
4. Click **Save**.
5. Navigate to **Keys and Tokens**.
6. Under **Consumer Keys** (or OAuth 2.0 Client ID / Secret), copy:
   - **API Key** (`twitter_client_id`)
   - **API Key Secret** (`twitter_client_secret`)
7. Add both to `terraform.tfvars`:
   ```hcl
   twitter_client_id    = "xxxxxxxxxxxxxxxxxxxxxxxxx"
   twitter_client_secret = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

---

## 5. Apple Sign-In Setup (`apple.com`)

> **Prerequisite**: Requires an active **Apple Developer Program** account ($99/yr).

1. Log in to **[Apple Developer Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)**.
2. Under **Identifiers**, click **+** and choose **Services IDs**, then click **Continue**.
3. Enter Description (`NightRunner Web`) and Identifier (e.g. `com.example.nightrunner.service`). Enable **Sign In with Apple**.
4. Click **Configure** next to Sign In with Apple:
   - Select your **Primary App ID**.
   - Under **Domains and Subdomains**, enter:
     ```text
     <YOUR_GCP_PROJECT_ID>.firebaseapp.com
     ```
   - Under **Return URLs**, enter:
     ```text
     https://<YOUR_GCP_PROJECT_ID>.firebaseapp.com/__/auth/handler
     ```
5. Save and Register the Services ID. Your Services ID is your `apple_client_id`.
6. Go to **Keys** -> click **+** -> Name your key and check **Sign in with Apple** -> click **Configure** and select your Primary App ID.
7. Click **Register**, then **Download** your private key file (`.p8`). Note your **Key ID** and **Team ID**.
8. Paste your **Services ID** (`apple_client_id`) and formatted private key / secret (`apple_client_secret`) into `terraform.tfvars`:
   ```hcl
   apple_client_id     = "com.example.nightrunner.service"
   apple_client_secret = "YOUR_APPLE_GENERATED_SECRET_OR_PRIVATE_KEY"
   ```

---

## Testing & Verifying in Firebase

After provisioning via `terraform apply`:
1. Any provider with non-empty credentials in `terraform.tfvars` will automatically appear as **Enabled** in the GCP Identity Platform / Firebase Auth Console.
2. In your frontend React application, standard Firebase Auth SDK calls (`signInWithPopup(auth, googleProvider)`, `signInWithPopup(auth, githubProvider)`, etc.) will work out of the box!
