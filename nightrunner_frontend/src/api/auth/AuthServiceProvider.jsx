import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

import AuthService from "@/api/auth/AuthService.js";
import ApiService from "@/api/ApiService.js";

export default function AuthServiceProvider({
                                                children
                                            }) {

    const auth = useAuth();
    const [firebaseUser, setFirebaseUser] = useState(null);

    useEffect(() => {

        AuthService.initialize(auth);

        if (auth.isAuthenticated) {
            // Eagerly fetch backend user profile & roles so cached user and admin rights update reactively
            ApiService.userData.get().catch(() => {});
        }

    }, [auth, auth.isAuthenticated]);

    useEffect(() => {
        let unsubscribe;
        import("@/api/auth/firebaseAuth.js").then(({ subscribeToFirebaseToken, isFirebaseMode, auth }) => {
            if (isFirebaseMode) {
                unsubscribe = subscribeToFirebaseToken(async (token, user) => {
                    if (token) {
                        localStorage.setItem("firebase_id_token", token);
                        setFirebaseUser(user);
                        // Eagerly fetch backend user profile & roles so cached user and admin rights update reactively
                        ApiService.userData.get().catch(() => {});
                    } else {
                        localStorage.removeItem("firebase_id_token");
                        setFirebaseUser(null);
                        ApiService.userData.clear();
                    }
                });

                // Periodically check Firebase user token freshness every 10 minutes if user is active
                const tokenInterval = setInterval(async () => {
                    if (auth?.currentUser) {
                        try {
                            const freshToken = await auth.currentUser.getIdToken(/* forceRefresh */ false);
                            if (freshToken) {
                                localStorage.setItem("firebase_id_token", freshToken);
                            }
                        } catch (err) {
                            console.warn("Failed periodic background token refresh:", err);
                        }
                    }
                }, 10 * 60 * 1000);

                return () => clearInterval(tokenInterval);
            }
        });

        // 12-Hour Inactivity Session Expiry Manager
        const MAX_INACTIVE_MS = 12 * 60 * 60 * 1000; // 12 hours
        const updateActivity = () => {
            localStorage.setItem("last_user_activity", Date.now().toString());
        };

        // Initialize activity timestamp on first load if not set
        if (!localStorage.getItem("last_user_activity")) {
            updateActivity();
        }

        // Attach event listeners for user interaction
        const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"];
        activityEvents.forEach((evt) => window.addEventListener(evt, updateActivity, { passive: true }));

        // Interval timer to check for 12h inactivity timeout
        const inactivityCheckInterval = setInterval(() => {
            const lastActivity = parseInt(localStorage.getItem("last_user_activity") || "0", 10);
            if (lastActivity && Date.now() - lastActivity > MAX_INACTIVE_MS) {
                console.warn("User inactive for over 12 hours. Session expired.");
                localStorage.removeItem("last_user_activity");
                AuthService.logout().catch(() => {
                    window.location.href = "/login?loggedOut=true";
                });
            }
        }, 60 * 1000); // Check every minute

        return () => {
            if (unsubscribe) unsubscribe();
            activityEvents.forEach((evt) => window.removeEventListener(evt, updateActivity));
            clearInterval(inactivityCheckInterval);
        };
    }, []);

    // Combine oidc-context auth with firebase state
    const effectiveIsAuthenticated = auth.isAuthenticated || Boolean(localStorage.getItem("firebase_id_token")) || Boolean(firebaseUser);

    const mergedAuth = {
        ...auth,
        isAuthenticated: effectiveIsAuthenticated,
        user: auth.user || (firebaseUser ? {
            profile: {
                name: firebaseUser.displayName || firebaseUser.email,
                email: firebaseUser.email,
                sub: firebaseUser.uid
            }
        } : null)
    };

    AuthService.initialize(mergedAuth);

    return children;

}