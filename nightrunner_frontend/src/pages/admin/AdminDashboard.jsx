import { useEffect, useState } from "react";
import ApiService from "@/api/ApiService";
import "./AdminDashBoard.css";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        try {
            setLoading(true);
            setError(null);

            const user = ApiService.userData.get();
            if (!user) {
                throw new Error("Unable to determine the current user.");
            }

            const events = await ApiService.eventData.getEvents();

            if (!user.event) {
                setData({
                    event: null,
                    events,
                    statistics: null
                });
                return;
            }

            const event = await ApiService.eventData.getEvent(user.event);
            const [patrols, stations] = await Promise.all([
                ApiService.patrolData.getPatrols(),
                ApiService.stationData.getStations()
            ]);

            setData({
                event,
                events,
                statistics: {
                    patrols: patrols.length,
                    stations: stations.length,
                    completed: 0,
                    currentlyScoring: 0
                }
            });
        } catch (error) {
            console.error("Failed to load admin dashboard:", error);
            setError(error.message ?? "Failed to load the admin dashboard.");
        } finally {
            setLoading(false);
        }
    }

    // Handles picking an option from the dropdown menu safely
    const handleDropdownSelect = async (e) => {
        const selectedId = e.target.value;
        if (!selectedId) return;

        // Verify access
        if (ApiService.userData.isSystemAdmin()) {
            try {
                setLoading(true);

                // Find the event template that matches our selected option from our loaded list
                const selectedEvent = data.events.find(ev => String(ev.id) === String(selectedId));

                if (!selectedEvent) {
                    throw new Error("Selected event context could not be resolved.");
                }

                // Fetch the patrols and stations related to this newly selected event scope
                const [patrols, stations] = await Promise.all([
                    ApiService.patrolData.getPatrols(),
                    ApiService.stationData.getStations()
                ]);

                // Overwrite the local component state directly with the newly loaded context
                setData({
                    event: selectedEvent,
                    events: data.events,
                    statistics: {
                        patrols: patrols.length,
                        stations: stations.length,
                        completed: 0,
                        currentlyScoring: 0
                    }
                });
            } catch (err) {
                console.error("Failed to swap event view state locally:", err);
                setError(err.message ?? "Failed to update dashboard view metrics.");
            } finally {
                setLoading(false);
            }
        } else {
            setError("Permission denied: Only System Administrators can select an event from this layout.");
        }
    };

    if (loading) {
        return (
            <div className="admin-dashboard">
                <p>Loading dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-dashboard">
                <div className="admin-dashboard-error">
                    <h2>Unable to load dashboard</h2>
                    <p>{error}</p>
                    <button onClick={loadDashboard} className="primary-button">Try Again</button>
                </div>
            </div>
        );
    }

    /*
     * ---------------------------------------------------------
     * No event selected
     * ---------------------------------------------------------
     */
    if (!data.event) {
        return (
            <div className="admin-dashboard">
                <div className="admin-dashboard-header">
                    <div>
                        <h1>Admin Dashboard</h1>
                        <p>Select an event to begin managing it.</p>
                    </div>
                </div>

                <section className="admin-section">
                    <div className="section-header">
                        <div>
                            <h2>No Event Selected</h2>
                            <p>Select an event to manage its patrols, stations, scoring, and other event resources.</p>
                        </div>
                    </div>

                    {data.events.length === 0 ? (
                        <div className="event-card">
                            <div>
                                <h3>No Events</h3>
                                <p>No events have been created yet.</p>
                            </div>
                            <button className="primary-button" onClick={() => { setLoading(true); }}>
                                Create Event
                            </button>
                        </div>
                    ) : (
                        <div className="event-selection-container" style={{ margin: "20px 0" }}>
                            <label htmlFor="admin-event-select" style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                                Choose an Event from the list:
                            </label>

                            <select
                                id="admin-event-select"
                                onChange={handleDropdownSelect}
                                defaultValue=""
                                style={{ padding: "10px", width: "100%", maxWidth: "400px", borderRadius: "4px", fontSize: "16px" }}
                            >
                                <option value="" disabled>-- Select an Event --</option>
                                {data.events.map(event => (
                                    <option key={event.id} value={event.id}>
                                        {event.name} {event.location ? `(${event.location})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </section>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            {/* Header */}
            <div className="admin-dashboard-header">
                <div>
                    <h1>Admin Dashboard</h1>
                    <p>Manage and monitor your event.</p>
                </div>
                <div className={`event-status ${data.event.status ?? ""}`}>
                    {data.event.statusLabel ?? data.event.status ?? "Active"}
                </div>
            </div>

            {/* Current Event */}
            <section className="admin-section">
                <div className="section-header">
                    <div>
                        <h2>Current Event</h2>
                        <p>Event currently selected for management.</p>
                    </div>
                </div>
                <div className="event-card">
                    <div>
                        <h3>{data.event.name}</h3>
                        {data.event.date && <p>{data.event.date}</p>}
                        {data.event.location && <p>{data.event.location}</p>}
                    </div>
                    <Link className="primary-button" to="/admin/event">
                        Manage Event
                    </Link>
                </div>
            </section>

            {/* Statistics */}
            <section className="admin-section">
                <div className="section-header">
                    <div>
                        <h2>Event Overview</h2>
                    </div>
                </div>
                <div className="admin-stat-grid">
                    <div className="admin-stat-card">
                        <span className="admin-stat-label">Patrols</span>
                        <strong>{data.statistics.patrols}</strong>
                    </div>
                    <div className="admin-stat-card">
                        <span className="admin-stat-label">Stations</span>
                        <strong>{data.statistics.stations}</strong>
                    </div>
                    <div className="admin-stat-card">
                        <span className="admin-stat-label">Completed</span>
                        <strong>{data.statistics.completed}</strong>
                    </div>
                    <div className="admin-stat-card">
                        <span className="admin-stat-label">Currently Scoring</span>
                        <strong>{data.statistics.currentlyScoring}</strong>
                    </div>
                </div>
            </section>

            {/* Management */}
            <section className="admin-section">
                <div className="section-header">
                    <div>
                        <h2>Management</h2>
                        <p>Manage the resources used by this event.</p>
                    </div>
                </div>
                <div className="admin-action-grid">
                    <AdminAction title="Event" description="Edit event details and configuration." path="/admin/event" />
                    <AdminAction title="Patrols" description="Register and manage event patrols." path="/admin/patrols" />
                    <AdminAction title="Stations" description="Manage scoring stations and requirements." path="/admin/stations" />
                    {ApiService.userData.isSystemAdmin() && (
                        <AdminAction title="Configurations" description="Manage event configuration presets." path="/admin/configurations" />
                    )}
                </div>
            </section>

            {/* Live Event */}
            <section className="admin-section">
                <div className="section-header">
                    <div>
                        <h2>Live Event</h2>
                        <p>Monitor the event while scoring is taking place.</p>
                    </div>
                </div>
                <div className="live-event-card">
                    <div>
                        <h3>Live Patrol Progress</h3>
                        <p>View which stations each patrol has completed without displaying scores.</p>
                    </div>
                    <Link className="primary-button" to="/live">
                        Open Live Scoring
                    </Link>
                </div>
            </section>
        </div>
    );
}

function AdminAction({ title, description, path }) {
    return (
        <Link className="admin-action-card" to={path}>
            <div>
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
            <span className="admin-action-arrow">→</span>
        </Link>
    );
}