import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { useAuth } from "react-oidc-context";

import Layout from "./components/Layout";

import Me from "./pages/Me";
import Login from "./pages/login/Login";
import Register from "./pages/login/Register.jsx";
import NotFound from "./pages/NotFound";

import Dashboard from "@/pages/Dashboard.jsx";
import Patrols from "@/pages/user/Patrols.jsx";
import Stations from "@/pages/user/Stations.jsx";
import Events from "@/pages/user/Events.jsx";

import Scoring from "@/pages/scoring/Scoring.jsx";
import LiveScoring from "@/pages/livescoring/LiveScoring.jsx";

import AdminRoutes from "@/pages/admin/AdminRoutes.jsx";

import Callback from "@/pages/Callback.jsx";
import {EventProvider} from "@/api/helpers/EventContext.jsx";

function ProtectedRoute({ children }) {

    const auth =
        useAuth();

    const location =
        useLocation();


    if (auth.isLoading) {

        return (
            <div>
                Loading authentication...
            </div>
        );

    }


    if (auth.error) {

        return (
            <div>
                Authentication error:
                {" "}
                {auth.error.message}
            </div>
        );

    }


    if (!auth.isAuthenticated) {

        return (
            <Navigate
                to="/login"
                state={{
                    from: location
                }}
                replace
            />
        );

    }


    return children;

}


function AnonymousRoute({ children }) {

    const auth =
        useAuth();


    if (auth.isLoading) {

        return (
            <div>
                Loading authentication...
            </div>
        );

    }


    if (auth.isAuthenticated) {

        return (
            <Navigate
                to="/dashboard"
                replace
            />
        );

    }


    return children;

}


function App() {

    return (

        <Routes>

            <Route element={<Layout />}>

                <Route
                    path="/"
                    element={
                        <Navigate
                            to="/dashboard"
                            replace
                        />
                    }
                />


                {/* Authentication */}

                <Route
                    path="/login"
                    element={
                        <AnonymousRoute>
                            <Login />
                        </AnonymousRoute>
                    }
                />

                <Route
                    path="/register"
                    element={
                        <AnonymousRoute>
                            <Register />
                        </AnonymousRoute>
                    }
                />

                <Route
                    path="/callback"
                    element={<Callback />}
                />

                {/* Public */}

                <Route
                    path="/events"
                    element={<Events />}
                />


                {/* Protected */}

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/me"
                    element={
                        <ProtectedRoute>
                            <Me />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/patrols"
                    element={
                        <ProtectedRoute>
                            <Patrols />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/scoring"
                    element={
                        <ProtectedRoute>
                            <Scoring />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/stations"
                    element={
                        <ProtectedRoute>
                            <Stations />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin/*"
                    element={
                        <ProtectedRoute>
                            <EventProvider>
                                <AdminRoutes />
                            </EventProvider>
                        </ProtectedRoute>
                    }
                />


                <Route
                    path="/404"
                    element={<NotFound />}
                />

            </Route>


            <Route
                path="/live"
                element={
                    <ProtectedRoute>
                        <LiveScoring />
                    </ProtectedRoute>
                }
            />


            <Route
                path="*"
                element={<NotFound />}
            />

        </Routes>

    );

}


export default App;