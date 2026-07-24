import { NavLink } from "react-router-dom";

function Sidebar() {

    return (

        <aside className="sidebar">

            <h2>Night Runner</h2>

            <nav className="sidebar-nav">

                <NavLink to="/">Login</NavLink>

                <NavLink to="/dashboard">Dashboard</NavLink>

                <NavLink to="/events">Events</NavLink>

                <NavLink to="/patrols">Patrols</NavLink>

                <NavLink to="/stations">Stations</NavLink>

                <NavLink to="/reports">Reports</NavLink>

            </nav>

        </aside>

    );

}

export default Sidebar;