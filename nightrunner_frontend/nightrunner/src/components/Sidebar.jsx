import { NavLink } from "react-router-dom";

import NOAImage from "../../public/favicon.jpg";
import "./Sidebar.css";

import ApiService from "@/api/ApiService.js";

function Sidebar({

                     open,
                     close

                 }) {

    const loggedIn = ApiService.isAuthenticated();
    const isAdmin = ApiService.userData.isAdmin();

    const links = loggedIn

        ? [

            {
                name: "Dashboard",
                path: "/dashboard"
            },

            ...(isAdmin

                    ? [

                        {
                            name: "Admin Dashboard",
                            path: "/admin",
                            exact: true
                        },
                        {
                            name: "Event Manager",
                            path: "/admin/events"
                        },
                        {
                            name: "Patrol Manager",
                            path: "/admin/patrols"
                        },
                        {
                            name: "Station Manager",
                            path: "/admin/stations"
                        },
                        {
                            name: "User Manager",
                            path: "/admin/users"
                        },

                        ...(ApiService.userData.isSystemAdmin() ? [
                            {
                                name: "Configuration Manager",
                                path: "/admin/configurations"
                            }
                        ] : [])

                    ]

                    : [

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
                        }

                    ]

            ),

            {
                name: "Scoring",
                path: "/scoring"
            }

        ]

        : [

            {
                name: "Login",
                path: "/login"
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
                            end={link.exact}
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

                    {loggedIn && (

                        <a
                            href="/live"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sidebar-link live-link"
                        >

                            Live Scoring

                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >

                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />

                                <polyline points="15 3 21 3 21 9" />

                                <line
                                    x1="10"
                                    y1="14"
                                    x2="21"
                                    y2="3"
                                />

                            </svg>

                        </a>

                    )}

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