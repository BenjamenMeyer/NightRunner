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
            >

                User

            </NavLink>

        </header>

    );

}

export default Header;