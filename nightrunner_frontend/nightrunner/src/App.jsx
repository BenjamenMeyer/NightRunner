import {Routes, Route, Navigate, useLocation} from "react-router-dom";

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
import Callback from "@/pages/Callback.jsx";

import { useAuth } from 'react-oidc-context';

// 1. Protects pages meant ONLY for logged-in users
function ProtectedRoute({ children }) {
    const auth = useAuth();
    const location = useLocation();

    if (auth.isLoading) {
        return <div>Loading authentication...</div>;
    }

    if (!auth.isAuthenticated) {
        // Save the current location to redirect back after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}

// 2. Protects pages meant ONLY for logged-out users (Login/Register)
function AnonymousRoute({ children }) {
    const auth = useAuth();

    if (auth.isLoading) {
        return <div>Loading authentication...</div>;
    }

    if (auth.isAuthenticated) {
        // If already logged in, kick them to the dashboard safely
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}


function App() {
    return (
        <Routes>
            {/* All pages using the main application layout */}
            <Route element={<Layout />}>

                {/* Safe Index Redirection */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Public / Guest Only Routes */}
                <Route path="/login" element={
                    <AnonymousRoute>
                        <Login />
                    </AnonymousRoute>
                } />
                <Route path="/register" element={
                    <AnonymousRoute>
                        <Register />
                    </AnonymousRoute>
                } />
                <Route path="/callback" element={<Callback />} />
                <Route path="/events" element={<Events />} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />
                <Route path="/me" element={
                    <ProtectedRoute>
                        <Me />
                    </ProtectedRoute>
                } />
                <Route path="/patrols" element={
                    <ProtectedRoute>
                        <Patrols />
                    </ProtectedRoute>
                } />
                <Route path="/scoring" element={
                    <ProtectedRoute>
                        <Scoring />
                    </ProtectedRoute>
                } />
                <Route path="/stations" element={
                    <ProtectedRoute>
                        <Stations />
                    </ProtectedRoute>
                } />
                <Route path="/admin/*" element={
          <ProtectedRoute>
            <AdminRoutes />
          </ProtectedRoute>
        } />

        <Route path="/404" element={<NotFound />} />
            </Route>

            {/* Standalone Protected Route */}
            <Route path="/live" element={
                <ProtectedRoute>
                    <LiveScoring />
                </ProtectedRoute>
            } />

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

export default App;
