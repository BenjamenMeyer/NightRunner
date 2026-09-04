import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";

import "./index.css";
import "./App.css";

import App from "./App.jsx";
import AuthServiceProvider from "./api/AuthServiceProvider.jsx";
import BrandingProvider from "./branding/BrandingProvider.jsx";
import {EventProvider} from "./api/helpers/EventContext.jsx";

const oidcConfig = {

    authority:
        import.meta.env.VITE_OIDC_AUTHORITY ??
        "http://localhost:4000",

    client_id:
        import.meta.env.VITE_OIDC_CLIENT_ID ??
        "client-id",

    redirect_uri:
        `${window.location.origin}/callback`,

    response_type: "code",

    scope: "openid profile email",

    // Store the session in localStorage so all tabs share the same OIDC session.
    // The default (sessionStorage) is tab-isolated, which breaks pages opened
    // in a new tab (e.g. /live) before the React auth context has initialised.
    userStore:
        new WebStorageStateStore({ store: window.localStorage }),

    onSigninCallback: () => {
        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );
    }
};


createRoot(
    document.getElementById("root")
).render(
    //<StrictMode>
        <BrowserRouter>

            <AuthProvider {...oidcConfig}>
                <AuthServiceProvider>

                    <EventProvider>
                        <BrandingProvider>
                            <App />
                        </BrandingProvider>
                    </EventProvider>

                </AuthServiceProvider>
            </AuthProvider>

        </BrowserRouter>
    //</StrictMode>
);