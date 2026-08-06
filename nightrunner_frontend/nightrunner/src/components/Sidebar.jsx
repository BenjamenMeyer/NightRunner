import { NavLink } from "react-router-dom";

import NOAImage from "../../public/favicon.jpg";
import "./Sidebar.css";
import ApiService from "@/api/ApiService.js";

function Sidebar() {

    const loggedIn = ApiService.isAuthenticated()

    const links = [

        ...(loggedIn
            ? [
                {
                    name: "Dashboard",
                    path: "/dashboard"
                }
            ]
            : [
                {
                    name: "Login",
                    path: "/login"
                }
            ]),

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

        <aside className="sidebar">

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
                        className={({ isActive }) =>
                            isActive
                                ? "sidebar-link active"
                                : "sidebar-link"
                        }
                    >
                        {link.name}
                    </NavLink>

                ))}

            </nav>

            <div className="sidebar-footer">

                <span>Night Runner</span>

                <small>
                    NightOps Tracking System
                </small>

            </div>

        </aside>

    );

}

export default Sidebar;