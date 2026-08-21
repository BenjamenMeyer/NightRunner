import { Routes, Route, Navigate } from "react-router-dom";

import AdminDashboard from "./AdminDashboard.jsx";
import Patrols from "@/pages/admin/patrols/Patrols.jsx";
import Stations from "@/pages/admin/stations/Stations.jsx";
import EventManager from "@/pages/admin/events/EventManager.jsx";
import EventCreator from "@/pages/admin/events/EventCreator.jsx";
import UserManager from "@/pages/admin/user/UserManager.jsx";
import StationEditor from "@/pages/admin/stations/StationEditor.jsx";
import PatrolEditor from "@/pages/admin/patrols/PatrolEditor.jsx";
import Configurations from "@/pages/admin/configurations/Configurations.jsx";
import ConfigurationEditor from "@/pages/admin/configurations/ConfigurationEditor.jsx";

export default function AdminRoutes() {

    return (

        <Routes>

            {/* Admin Dashboard */}
            <Route
                index
                element={<AdminDashboard />}
            />

            {/* Patrols */}
            <Route
                path="patrols"
                element={<Patrols />}
            />

            <Route
                path="patrols/create"
                element={
                    <PatrolEditor mode="create" />
                }
            />

            <Route
                path="patrols/edit"
                element={
                    <PatrolEditor mode="edit" />
                }
            />

            {/* Stations */}
            <Route
                path="stations"
                element={<Stations />}
            />

            <Route
                path="stations/create"
                element={<StationEditor />}
            />

            <Route
                path="stations/edit"
                element={<StationEditor />}
            />

            {/* Configurations */}
            <Route
                path="configurations"
                element={<Configurations />}
            />

            <Route
                path="configurations/create"
                element={
                    <ConfigurationEditor
                        mode="create"
                    />
                }
            />

            <Route
                path="configurations/edit"
                element={
                    <ConfigurationEditor
                        mode="edit"
                    />
                }
            />

            {/* Events */}
            <Route
                path="events"
                element={<EventManager />}
            />

            <Route
                path="event/create"
                element={<EventCreator />}
            />

            {/* User Management */}
            <Route
                path="users"
                element={<UserManager />}
            />

            {/* Unknown admin route */}
            <Route
                path="*"
                element={<Navigate to="/admin" replace />}
            />

        </Routes>

    );

}