import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";

import NOAImage from "../../../public/favicon.jpg";

import "./Login.css";

function Login() {

    const navigate = useNavigate();
    const auth = useAuth();

    async function handleLogin() {

        try {

            await auth.signinRedirect();

        }
        catch (error) {

            console.error(
                "Failed to start authentication:",
                error
            );

        }

    }

    return (

        <div className="login-page">

            <img
                className="login-logo"
                src={NOAImage}
                alt="Night Ops Adventures"
            />

            <div className="login-card">

                <h1>Night Runner</h1>

                <p className="login-subtitle">
                    Sign in to continue.
                </p>

                <button
                    type="button"
                    onClick={handleLogin}
                    disabled={auth.isLoading}
                >
                    {auth.isLoading
                        ? "Signing In..."
                        : "Sign In"
                    }
                </button>

                <div className="login-divider"></div>

                <div className="register-section">

                    <span>
                        Don't have an account?
                    </span>

                    <Link
                        to="/register"
                        className="register-link"
                    >
                        Create Account
                    </Link>

                </div>

            </div>

        </div>

    );

}

export default Login;