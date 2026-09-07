import { useEffect } from "react";
import { useAuth } from "react-oidc-context";

import AuthService from "@/api/AuthService.js";

export default function AuthServiceProvider({
                                                children
                                            }) {

    const auth = useAuth();

    useEffect(() => {

        AuthService.initialize(auth);

    }, [auth]);

    useEffect(() => {
        import("@/api/firebaseAuth.js").then(({ subscribeToFirebaseToken, isFirebaseMode }) => {
            if (isFirebaseMode) {
                return subscribeToFirebaseToken((token) => {
                    if (token) {
                        localStorage.setItem("firebase_id_token", token);
                    } else {
                        localStorage.removeItem("firebase_id_token");
                    }
                });
            }
        });
    }, []);

    return children;

}