import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import {
    isFirebaseMode,
    firebaseLoginWithEmail,
    firebaseLoginWithGoogle
} from "@/api/firebaseAuth.js";

import "./Login.css";

function Login() {

    const location = useLocation();
    const navigate = useNavigate();
    const auth = useAuth();
    const [searchParams] = useSearchParams();

    const loggedOut = searchParams.get("loggedOut") === "true";
    const isExpired = searchParams.get("expired") === "true";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firebaseError, setFirebaseError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fromPath = location.state?.from ?? "/dashboard";

    async function handleLogin() {

        try {

            await auth.signinRedirect({
                state: {
                    from: fromPath
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

    async function handleFirebaseEmailLogin(e) {
        e.preventDefault();
        setFirebaseError(null);
        setIsSubmitting(true);
        try {
            await firebaseLoginWithEmail(email, password);
            navigate(fromPath);
        } catch (err) {
            console.error("Firebase Email login error:", err);
            setFirebaseError(err.message || "Failed to sign in with email and password.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleFirebaseGoogleLogin() {
        setFirebaseError(null);
        setIsSubmitting(true);
        try {
            await firebaseLoginWithGoogle();
            navigate(fromPath);
        } catch (err) {
            console.error("Firebase Google login error:", err);
            setFirebaseError(err.message || "Failed to sign in with Google.");
        } finally {
            setIsSubmitting(false);
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

                    {isFirebaseMode ? (
                        <div className="login-firebase-container">
                            <form onSubmit={handleFirebaseEmailLogin} className="login-email-form">
                                <div className="login-field">
                                    <label htmlFor="login-email">Email Address</label>
                                    <input
                                        id="login-email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="login-field">
                                    <label htmlFor="login-password">Password</label>
                                    <input
                                        id="login-password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                {(firebaseError || auth.error) && (
                                    <div className="login-error">
                                        <strong>Sign-in failed</strong>
                                        <span>{firebaseError || auth.error?.message}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="login-button"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Signing in..." : "Sign In with Email"}
                                </button>
                            </form>

                            <div className="login-divider">
                                <span>or sign in with</span>
                            </div>

                            <button
                                type="button"
                                className="login-social-button google"
                                onClick={handleFirebaseGoogleLogin}
                                disabled={isSubmitting}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                                </svg>
                                Continue with Google
                            </button>
                        </div>
                    ) : (
                        <>
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
                        </>
                    )}

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