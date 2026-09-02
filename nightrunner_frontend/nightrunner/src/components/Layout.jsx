import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "react-oidc-context";

import Header from "./Header";
import Sidebar from "./Sidebar";

import Footer from "@/components/Footer.jsx";

export default function Layout() {

    const auth = useAuth();

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const loggedIn =
        auth.isAuthenticated;

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