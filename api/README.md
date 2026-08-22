# NightRunner API Documentation

This directory contains the API contract specification and client playground setup for the NightRunner Backend.

## OpenAPI Specification

The API contract is defined in [`openapi.yaml`](openapi.yaml). 
All routes (except `/health`) are versioned under the `/v1/` prefix.

## Bruno API Client Collection

An organized [Bruno](https://www.usebruno.com/) collection is available in [`bruno/NightRunner Backend/`](bruno/NightRunner%20Backend/). The collection is organized into subfolders per operational area (Events, Patrols, Stations, Configurations, Reports, etc.).

### Updating the Collection via CLI

To regenerate or update the Bruno collection directly from the OpenAPI spec, you can run the following command from the repository root:

```bash
make bruno-import
```

*(This runs `bru import openapi --source api/openapi.yaml --output api/bruno --collection-name "NightRunner Backend"` behind the scenes.)*

### Enabling Automatic OpenAPI Sync in Bruno GUI

To keep your Bruno GUI client continuously synchronized with the `openapi.yaml` spec:

1. Open **Bruno Desktop**.
2. Select **Open Collection** and choose the `api/bruno/NightRunner Backend` folder.
3. Right-click the **NightRunner Backend** collection name in the left sidebar and select **Settings**.
4. Navigate to the **OpenAPI Sync** section.
5. Set the **Source** path to reference the local spec: `../../openapi.yaml`.
6. Enable automatic update checks. Bruno will now detect modifications in the OpenAPI spec and prompt you to merge updates while preserving your request settings, variables, and environments.

## OIDC Frontend Login Flow & React Setup

The NightRunner backend uses standard JWT verification via a JSON Web Key Set (JWKS) endpoint. Rather than routing authentication credentials through the API server, a React-based frontend should coordinate authentication directly with the OIDC Identity Provider (e.g., Duende, Auth0, Keycloak, or our local mock server).

### 1. Recommended Libraries
We recommend using standard, well-maintained OIDC client libraries:
- **`oidc-client-ts`**: Core library for managing OIDC user sessions and token refresh.
- **`react-oidc-context`**: React context wrappers around `oidc-client-ts` providing hooks like `useAuth()`.

### 2. React Configuration Example
Install the dependencies:
```bash
npm install oidc-client-ts react-oidc-context
```

Wrap your application root in the `<AuthProvider>`:
```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import App from "./App";

const oidcConfig = {
  authority: process.env.REACT_APP_OIDC_AUTHORITY || "http://localhost:4000",
  client_id: process.env.REACT_APP_OIDC_CLIENT_ID || "client-id",
  redirect_uri: window.location.origin + "/callback",
  response_type: "code",
  scope: "openid profile email",
  onSigninCallback: () => {
    // Clear OIDC callback state from URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <AuthProvider {...oidcConfig}>
    <App />
  </AuthProvider>
);
```

### 3. Accessing Authentication State
Use the `useAuth` hook inside components to log in, log out, and retrieve the JWT access token:
```typescript
import React from "react";
import { useAuth } from "react-oidc-context";

export const Profile = () => {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div>Loading authentication status...</div>;
  }

  if (auth.error) {
    return <div>Authentication error: {auth.error.message}</div>;
  }

  if (auth.isAuthenticated) {
    return (
      <div>
        <p>Welcome, {auth.user?.profile.name}!</p>
        <button onClick={() => auth.removeUser()}>Log out</button>
      </div>
    );
  }

  return <button onClick={() => auth.signinRedirect()}>Log in</button>;
};
```

### 4. Routing Requests to the API
When making requests to the API server, extract the `access_token` from the OIDC user state and append it as a Bearer token:
```typescript
import { useAuth } from "react-oidc-context";

const MyComponent = () => {
  const auth = useAuth();

  const fetchData = async () => {
    if (!auth.user) return;
    
    const response = await fetch("http://localhost:8000/v1/events", {
      headers: {
        Authorization: `Bearer ${auth.user.access_token}`
      }
    });
    const data = await response.json();
    console.log(data);
  };
  
  return <button onClick={fetchData}>Get Events</button>;
};
```

### 5. Local Mock Testing with Docker
When running the stack locally, the mock OIDC provider is exposed at `http://localhost:4000`. You can authenticate using any of the following seeded user credentials:
- **adminuser** / **password** (Global System Administrator)
- **organizeruser** / **password** (Event-scoped Scorer/Organizer)
- **scoreruser** / **password** (Event-scoped Scorer)
- **leaderuser** / **password** (Station Leader)
- **memberuser** / **password** (Station Member)

All event-scoped roles are mapped to mock event ID: `01a022b8-45f0-7612-872e-201e8c8158db`.

