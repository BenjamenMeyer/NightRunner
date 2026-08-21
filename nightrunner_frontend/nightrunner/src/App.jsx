import {Routes, Route, Navigate} from "react-router-dom";

import Layout from "./components/Layout";

import Me from "./pages/Me";
import Login from "./pages/login/Login";
import NotFound from "./pages/NotFound";
import Patrols from "@/pages/user/Patrols.jsx";
import Dashboard from "@/pages/Dashboard.jsx";
import Stations from "@/pages/user/Stations.jsx";
import Scoring from "@/pages/scoring/Scoring.jsx";
import Register from "@/pages/login/Register.jsx";
import ApiService from "@/api/ApiService.js";
import LiveScoring from "@/pages/livescoring/LiveScoring.jsx";
import AdminRoutes from "@/pages/admin/AdminRoutes.jsx";
import Events from "@/pages/user/Events.jsx";

function RequireAuth({ children }) {

    //return children;

    return ApiService.isAuthenticated()
        ? children
        : <Navigate to="/login" replace />;

}

function HomeRedirect() {

    //return <Navigate to="/dashboard" replace />;

    return ApiService.isAuthenticated()
        ? <Navigate to="/dashboard" replace />
        : <Navigate to="/login" replace />;

}

function LoginRoute() {
    //return <Login />;

    return ApiService.isAuthenticated()
        ? <Navigate to="/dashboard" replace />
        : <Login />;

}

function App() {
    return (
        <Routes>

            {/* All pages using the main application layout */}
            <Route element={<Layout />}>

                <Route path="/" element={<HomeRedirect />} />

                <Route path="/dashboard" element={
                    <RequireAuth>
                        <Dashboard />
                    </RequireAuth>
                } />

                <Route path="/login" element={<LoginRoute />} />

                <Route path="/me" element={
                    <RequireAuth>
                        <Me />
                    </RequireAuth>
                } />

                <Route
                    path="/events"
                    element={<Events />}
                />

                <Route path="/patrols" element={
                    <RequireAuth>
                        <Patrols />
                    </RequireAuth>
                } />

                <Route path="/register" element={
                    <Register />
                }/>

                <Route path="/scoring" element={
                    <RequireAuth>
                        <Scoring />
                    </RequireAuth>
                } />

                <Route path="/stations" element={
                    <RequireAuth>
                        <Stations />
                    </RequireAuth>
                }/>

                <Route path="/admin/*" element={
                    <RequireAuth>
                        <AdminRoutes />
                    </RequireAuth>
                } />
                
                <Route path="/404" element={<NotFound />} />

            </Route>

            <Route path="/live" element={
                <RequireAuth>
                    <LiveScoring/>
                </RequireAuth>
            } />

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />

        </Routes>
    );
}

export default App;