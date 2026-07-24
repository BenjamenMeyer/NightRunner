import { useNavigate } from "react-router-dom";

function NotFound() {

    const navigate = useNavigate();

    return (
        <div className="not-found-page">

            <h1>404</h1>

            <h2>Page Not Found</h2>

            <p>
                The page you are looking for does not exist.
            </p>

            <button onClick={() => navigate("/")}>
                Return Home
            </button>

        </div>
    );
}

export default NotFound;