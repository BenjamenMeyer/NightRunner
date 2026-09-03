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

    return children;

}