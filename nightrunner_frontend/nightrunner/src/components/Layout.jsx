import { useState } from "react";
import { Outlet } from "react-router-dom";

import Header from "./Header";
import Sidebar from "./Sidebar";

import ApiService from "@/api/ApiService.js";
import Footer from "@/components/Footer.jsx";

function Layout() {

    const loggedIn = ApiService.isAuthenticated();

    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (

        <div className="app-layout">

            {loggedIn && (

                <Sidebar
                    open={sidebarOpen}
                    close={() => setSidebarOpen(false)}
                />

            )}

            <Header
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />

            <main
                className="page-content"
                onClick={() => {

                    // Clicking the page closes the mobile sidebar.
                    if (sidebarOpen) {
                        setSidebarOpen(false);
                    }

                }}
            >

                <div className="page-content-inner">

                    <Outlet />

                </div>

                <Footer />

            </main>

        </div>

    );

}

export default Layout;