import { Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";

import Me from "./pages/Me";
import Login from "./pages/login/Login";
import NotFound from "./pages/NotFound";
import Patrols from "@/pages/Patrols.jsx";
import Dashboard from "@/pages/Dashboard.jsx";
import Stations from "@/pages/stations/Stations.jsx";
import Scoring from "@/pages/scoring/Scoring.jsx";
import Register from "@/pages/login/Register.jsx";

function App() {
    return (
        <Routes>

            {/* All pages using the main application layout */}
            <Route element={<Layout />}>

                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/me" element={<Me />} />
                <Route path="/patrols" element={<Patrols />} />
                <Route path="/register" element={<Register />}/>
                <Route path="/scoring" element={<Scoring/>} />
                <Route path="/stations" element={<Stations/>}/>
                <Route path="/404" element={<NotFound />} />

            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />

        </Routes>
    );
}

export default App;