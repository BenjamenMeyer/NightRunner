import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "react-oidc-context";

import "./index.css";
import "./App.css";

import App from "./App.jsx";

import BrandingProvider
    from "@/branding/BrandingProvider.jsx";

const oidcConfig = {

    authority:
        import.meta.env.VITE_OIDC_AUTHORITY ||
        "http://localhost:4000",

    client_id:
        import.meta.env.VITE_OIDC_CLIENT_ID ||
        "client-id",

    redirect_uri:
        `${window.location.origin}/callback`,

    post_logout_redirect_uri:
        `${window.location.origin}/login`,

    response_type: "code",

    scope:
        "openid profile email",

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

    <StrictMode>

        <AuthProvider {...oidcConfig}>

            <BrowserRouter>

                <BrandingProvider>

                    <App />

                </BrandingProvider>

            </BrowserRouter>

        </AuthProvider>

    </StrictMode>

);