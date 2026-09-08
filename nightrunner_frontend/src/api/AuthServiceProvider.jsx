import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

import AuthService from "@/api/AuthService.js";

export default function AuthServiceProvider({
                                                children
                                            }) {

    const auth = useAuth();
    const [firebaseUser, setFirebaseUser] = useState(null);

    useEffect(() => {

        AuthService.initialize(auth);

    }, [auth]);

    useEffect(() => {
        let unsubscribe;
        import("@/api/firebaseAuth.js").then(({ subscribeToFirebaseToken, isFirebaseMode }) => {
            if (isFirebaseMode) {
                unsubscribe = subscribeToFirebaseToken((token, user) => {
                    if (token) {
                        localStorage.setItem("firebase_id_token", token);
                        setFirebaseUser(user);
                    } else {
                        localStorage.removeItem("firebase_id_token");
                        setFirebaseUser(null);
                    }
                });
            }
        });
        return () => {
            if (unsubscribe) unsubscribe();
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