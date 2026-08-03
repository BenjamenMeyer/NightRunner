import { Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";

import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Register from "@/pages/Register.jsx";
import Patrols from "@/pages/Patrols.jsx";
import Dashboard from "@/pages/Dashboard.jsx";

function App() {
    return (
        <Routes>

            {/* All pages using the main application layout */}
            <Route element={<Layout />}>

                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/patrols" element={<Patrols />} />
                <Route path="/register" element={<Register />}/>
                <Route path="/404" element={<NotFound />} />

            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />

        </Routes>
    );
}

export default App;