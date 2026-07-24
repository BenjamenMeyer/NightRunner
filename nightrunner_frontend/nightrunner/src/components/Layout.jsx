import { Outlet } from "react-router-dom";

import Header from "./Header";
import Sidebar from "./Sidebar";

function Layout() {
    return (
        <div className="app-layout">

            <Sidebar />

            <Header />

            <main className="page-content">
                <Outlet />
            </main>

        </div>
    );
}

export default Layout;