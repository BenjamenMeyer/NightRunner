import { Outlet } from "react-router-dom";

import Header from "./Header";
import Sidebar from "./Sidebar";
import ApiService from "@/api/ApiService.js";

function Layout() {

    const loggedIn = ApiService.isAuthenticated();

    return (
        <div className="app-layout">

            {loggedIn && <Sidebar />}

            <Header />

            <main className="page-content">
                <Outlet />
            </main>

        </div>
    );
}

export default Layout;