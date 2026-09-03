import { Navigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";

export default function Callback() {

    const auth = useAuth();

    if (auth.isLoading) {

        return (
            <div>
                Completing sign in...
            </div>
        );

    }

    if (auth.error) {

        return (
            <div>
                Authentication failed:
                {" "}
                {auth.error.message}
            </div>
        );

    }

    if (auth.isAuthenticated) {

        const from =
            auth.user?.state?.from ??
            "/dashboard";


        return (
            <Navigate
                to={from}
                replace
            />
        );

    }

    return (
        <Navigate
            to="/login"
            replace
        />
    );

}