import { NavLink } from "react-router-dom";
import "./header.css";

function Header({

                    sidebarOpen,
                    setSidebarOpen

                }) {

    return (

        <header className="header">

            <div className="header-left">

                <button
                    className="sidebar-toggle"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label="Toggle navigation"
                >

                    ☰

                </button>

                <h2>
                    Night Runner
                </h2>

            </div>

            <NavLink
                to="/me"
                className={({ isActive }) =>
                    isActive
                        ? "header-user active"
                        : "header-user"
                }
                aria-label="My Profile"
            >

                <svg
                    className="header-user-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >

                    <circle
                        cx="12"
                        cy="8"
                        r="4"
                        stroke="currentColor"
                        strokeWidth="2"
                    />

                    <path
                        d="M4 21C4 16.5817 7.58172 13 12 13C16.4183 13 20 16.5817 20 21"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />

                </svg>

                <span>
                    User
                </span>

            </NavLink>

        </header>

    );

}

export default Header;