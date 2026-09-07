import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";

import "./Login.css";

function Login() {

    const location = useLocation();

    const auth = useAuth();

    const [searchParams] = useSearchParams();

    const loggedOut = searchParams.get("loggedOut") === "true";
    const isExpired = searchParams.get("expired") === "true";

    async function handleLogin() {

        try {

            await auth.signinRedirect({
                state: {
                    from: location.state?.from ?? "/dashboard"
                }
            });

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

            <div className="login-container">

                <img
                    className="login-logo"
                    src="/favicon.jpg"
                    alt="Night Ops Adventures"
                />

                {loggedOut && (

                    <div
                        className="login-logout-message"
                        role="status"
                    >

                        <div className="login-logout-icon">

                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>

                        </div>

                        <div className="login-logout-content">

                            <strong>
                                You have been signed out
                            </strong>

                            <span>
                                Your Night Runner session has ended successfully.
                            </span>

                        </div>

                    </div>

                )}

                {isExpired && (

                    <div
                        className="login-logout-message"
                        role="status"
                    >

                        <div className="login-expired-icon">

                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>

                        </div>

                        <div className="login-expired-content">

                            <strong>
                                Your session has expired
                            </strong>
                            <br/>
                            <span>
                                Please sign in again to continue.
                            </span>

                        </div>

                    </div>

                )}

                <div className="login-card">

                    <div className="login-header">

                        <h1>
                            Night Runner
                        </h1>

                        <p className="login-subtitle">
                            Sign in to continue to Night Runner.
                        </p>

                    </div>

                    <div className="login-provider">

                        <div className="login-provider-icon">
                            🔐
                        </div>

                        <div>
                            <strong>
                                Secure Sign In
                            </strong>

                            <p>
                                You'll be redirected to the
                                secure sign-in page.
                            </p>
                        </div>

                    </div>

                    {auth.error && (

                        <div className="login-error">
                            <strong>
                                Sign-in failed
                            </strong>

                            <span>
                                {auth.error.message}
                            </span>
                        </div>

                    )}

                    <button
                        type="button"
                        className="login-button"
                        onClick={handleLogin}
                        disabled={auth.isLoading}
                    >

                        {auth.isLoading
                            ? "Connecting..."
                            : "Sign In"
                        }

                    </button>

                    <div className="login-divider">
                        <span>or</span>
                    </div>

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

                <p className="login-footer">
                    Authentication is securely handled by
                    the Night Runner identity provider.
                </p>

            </div>

        </div>

    );

}

export default Login;