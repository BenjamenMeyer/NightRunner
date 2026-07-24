import { useState } from "react";
import { useNavigate } from "react-router-dom";

import NOAImage from "../assets/nightopadventures.jpg";

import { login } from "../api/AuthService";

function Login() {

    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {

        event.preventDefault();

        setError("");
        setLoading(true);

        try {

            const data = await login(
                username,
                password
            );

            /*
             * Store the token temporarily.
             *
             * We will eventually replace this with
             * a proper authentication context.
             */

            localStorage.setItem(
                "night-runner-token",
                data.token
            );

            localStorage.setItem(
                "night-runner-user",
                JSON.stringify(data.user)
            );

            navigate("/dashboard");

        } catch (error) {

            setError(error.message);

        } finally {

            setLoading(false);

        }

    }

    return (

        <div className="login-page">

            <img
                src={NOAImage}
                alt="Night Ops Adventures"
                className="logo"
            />

            <div className="card login-card">

                <h1>Login</h1>

                <form
                    className="form"
                    onSubmit={handleSubmit}
                >

                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(event) =>
                            setUsername(event.target.value)
                        }
                        required
                        autoComplete="current-username"
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(event) =>
                            setPassword(event.target.value)
                        }
                        required
                        autoComplete="current-password"
                    />

                    {error && (
                        <p className="form-error">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Logging in..."
                            : "Login"
                        }
                    </button>

                </form>

            </div>

        </div>

    );

}

export default Login;