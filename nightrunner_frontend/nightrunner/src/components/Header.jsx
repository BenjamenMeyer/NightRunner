import {NavLink} from "react-router-dom";
import "./header.css";

function Header() {

    return (

        <header className="header">

            <h2>Night Runner</h2>

            <NavLink
                to="/me"
                className={({ isActive }) =>
                    isActive ? "header-user active" : "header-user"
                }
            >
                User
            </NavLink>

        </header>

    );

}

export default Header;