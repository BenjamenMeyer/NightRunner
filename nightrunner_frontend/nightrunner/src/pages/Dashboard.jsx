import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import ApiService from "@/api/ApiService";

import "./Dashboard.css";

export default function Dashboard() {

    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);

    const [stats, setStats] = useState({
        events: [],
        patrols: [],
        stations: []
    });

    useEffect(() => {

        loadDashboard();

    }, []);

    async function loadDashboard() {

        try {

            setLoading(true);
            setError(null);

            const [
                events,
                patrols,
                stations
            ] = await Promise.all([

                ApiService.get("/events"),
                ApiService.get("/patrols"),
                ApiService.get("/stations")

            ]);

            setStats({
                events,
                patrols,
                stations
            });

        } catch (error) {

            setError(error.message);

        } finally {

            setLoading(false);

        }

    }

    return (

        <div className="dashboard">

            <div className="dashboard-top">

                <div>

                    <h1>Dashboard</h1>

                    <p>

                        Welcome to Night Runner.

                    </p>

                </div>

            </div>

            {error && (

                <div className="error-banner">

                    {error}

                </div>

            )}

            <div className="dashboard-cards">

                <div
                    className="dashboard-card clickable"
                    onClick={() => navigate("/dashboard/events")}
                >

                    <h2>Events</h2>

                    <span>

                        {loading
                            ? "..."
                            : stats.events.length}

                    </span>

                </div>

                <div
                    className="dashboard-card clickable"
                    onClick={() => navigate("/patrols")}
                >

                    <h2>Patrols</h2>

                    <span>

                        {loading
                            ? "..."
                            : stats.patrols.length}

                    </span>

                </div>

                <div
                    className="dashboard-card clickable"
                    onClick={() => navigate("/dashboard/stations")}
                >

                    <h2>Stations</h2>

                    <span>

                        {loading
                            ? "..."
                            : stats.stations.length}

                    </span>

                </div>

                <div
                    className="dashboard-card clickable"
                    onClick={() => navigate("/dashboard/reports")}
                >

                    <h2>Reports</h2>

                    <span>

                        View

                    </span>

                </div>

            </div>

            <div className="dashboard-section">

                <div className="card">

                    <div className="section-header">

                        <h2>Upcoming Events</h2>

                        <button
                            className="secondary-button"
                            onClick={() => navigate("/dashboard/events")}
                        >

                            View All

                        </button>

                    </div>

                    {loading ? (

                        <p>

                            Loading...

                        </p>

                    ) : stats.events.length === 0 ? (

                        <p>

                            No events have been created.

                        </p>

                    ) : (

                        <table className="dashboard-table">

                            <thead>

                            <tr>

                                <th>Name</th>

                                <th>Date</th>

                            </tr>

                            </thead>

                            <tbody>

                            {stats.events.map(event => (

                                <tr
                                    key={event.id}
                                    className="table-clickable"
                                    onClick={() =>
                                        navigate("/dashboard/events")
                                    }
                                >

                                    <td>

                                        {event.name}

                                    </td>

                                    <td>

                                        {event.date}

                                    </td>

                                </tr>

                            ))}

                            </tbody>

                        </table>

                    )}

                </div>

            </div>

        </div>

    );

}