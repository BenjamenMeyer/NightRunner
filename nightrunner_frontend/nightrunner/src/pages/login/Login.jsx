import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import NOAImage from "../../../public/favicon.jpg";

import "./Login.css";
import ApiService from "@/api/ApiService.js";

function Login() {

    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    async function handleSubmit(event) {

        event.preventDefault();

        setError("");

        setLoading(true);

        try {

            await ApiService.login(
                username,
                password
            );

            navigate("/dashboard");

        }
        catch (err) {

            setError(err.message);

        }
        finally {

            setLoading(false);

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

                <form
                    className="login-form"
                    onSubmit={handleSubmit}
                >

                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) =>
                            setUsername(e.target.value)
                        }
                        required
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                        required
                    />

                    {
                        error &&
                        <div className="login-error">
                            {error}
                        </div>
                    }

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {
                            loading
                                ? "Signing In..."
                                : "Sign In"
                        }
                    </button>

                </form>

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