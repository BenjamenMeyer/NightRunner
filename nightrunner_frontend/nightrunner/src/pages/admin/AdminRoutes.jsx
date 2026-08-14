import { Routes, Route, Navigate } from "react-router-dom";

import AdminDashboard from "./AdminDashboard.jsx";
import Patrols from "@/pages/admin/Patrols.jsx";
import Stations from "@/pages/admin/stations/Stations.jsx";
import EventManager from "@/pages/admin/events/EventManager.jsx";
import EventCreator from "@/pages/admin/events/EventCreator.jsx";

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

            {/* Stations */}
            <Route
                path="stations"
                element={<Stations />}
            />

            {/* Events */}
            {/* Events */}
            <Route
                path="event"
                element={<EventManager />}
            />

            <Route
                path="event/create"
                element={<EventCreator />}
            />

            {/* Unknown admin route */}
            <Route
                path="*"
                element={<Navigate to="/admin" replace />}
            />

        </Routes>

    );

}