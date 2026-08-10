import { NavLink } from "react-router-dom";

import NOAImage from "../../public/favicon.jpg";
import "./Sidebar.css";

import ApiService from "@/api/ApiService.js";

function Sidebar({

                     open,
                     close

                 }) {

    const loggedIn = ApiService.isAuthenticated();

    const links = [

        ...(loggedIn
            ? [{
                name: "Dashboard",
                path: "/dashboard"
            }]
            : [{
                name: "Login",
                path: "/login"
            }]),

        {
            name: "Events",
            path: "/events"
        },
        {
            name: "Patrols",
            path: "/patrols"
        },
        {
            name: "Stations",
            path: "/stations"
        },
        {
            name: "Reports",
            path: "/reports"
        },
        {
            name: "Scoring",
            path: "/scoring"
        }

    ];

    return (

        <>

            {open && (
                <div
                    className="sidebar-backdrop"
                    onClick={close}
                />
            )}

            <aside
                className={`sidebar ${open ? "open" : ""}`}
            >

                <div className="sidebar-header">

                    <img
                        src={NOAImage}
                        alt="Night Runner"
                        className="sidebar-logo"
                    />

                    <h2>

                        Night Runner

                    </h2>

                </div>

                <nav className="sidebar-nav">

                    {links.map(link => (

                        <NavLink
                            key={link.path}
                            to={link.path}
                            onClick={close}
                            className={({ isActive }) =>
                                isActive
                                    ? "sidebar-link active"
                                    : "sidebar-link"
                            }
                        >

                            {link.name}

                        </NavLink>

                    ))}

                    <a
                        href="/live"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sidebar-link"
                    >
                        Live Progress
                    </a>

                </nav>

                <div className="sidebar-footer">

                    <span>

                        Night Runner

                    </span>

                    <small>

                        NightOps Tracking System

                    </small>

                </div>

            </aside>

        </>

    );

}

export default Sidebar;