import { useNavigate } from "react-router-dom";

import "./NotFound.css";

export default function NotFound() {

    const navigate = useNavigate();

    return (

        <div className="not-found-page">

            <div className="not-found-card">

                <div className="not-found-code">

                    404

                </div>

                <h1>

                    Page Not Found

                </h1>

                <p>

                    The page you requested doesn't exist, may have been moved,
                    or you may not have permission to access it.

                </p>

                <div className="not-found-actions">

                    <button
                        className="primary-button"
                        onClick={() => navigate("/")}
                    >

                        Return Home

                    </button>

                    <button
                        className="secondary-button"
                        onClick={() => navigate(-1)}
                    >

                        Go Back

                    </button>

                </div>

            </div>

        </div>

    );

}