import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import "./AdminDashBoard.css";
import ApiService from "../../api/ApiService.js";
import EventSelector from "../../api/helpers/EventSelector.jsx";

export default function AdminDashboard() {

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const [eventId, setEventId] = useState(
        ApiService.userData.getEventId()
    );

    const [showEventSelector, setShowEventSelector] =
        useState(false);

    useEffect(() => {

        if (!eventId) {

            if (ApiService.userData.isSystemAdmin()) {

                setShowEventSelector(true);
                setLoading(false);

                return;

            }

            setError(
                "No event is currently assigned to your account."
            );

            setLoading(false);

            return;

        }

        loadDashboard(eventId);

    }, [eventId]);

    async function loadDashboard(selectedEventId) {

        try {

            setLoading(true);
            setError(null);

            const eventsResponse =
                await ApiService.eventData.getEvents();

            const events =
                Array.isArray(eventsResponse)
                    ? eventsResponse
                    : eventsResponse.events ?? [];

            const event =
                await ApiService.eventData.getEvent(
                    selectedEventId
                );

            const [
                patrols,
                stations
            ] = await Promise.all([

                ApiService.patrolData.getPatrols(
                    selectedEventId
                ),

                ApiService.stationData.getStations(
                    selectedEventId
                )

            ]);

            setData({

                event,

                events,

                statistics: {
                    patrols: patrols?.length ?? 0,
                    stations: stations?.length ?? 0,
                    completed: 0,
                    currentlyScoring: 0
                }

            });

            setShowEventSelector(false);

        } catch (error) {

            console.error(
                "Failed to load admin dashboard:",
                error
            );

            setError(
                error?.message ??
                "Failed to load the admin dashboard."
            );

        } finally {

            setLoading(false);

        }

    }

    function handleEventSelected(selectedEventId) {

        setData(null);
        setEventId(selectedEventId);
        setShowEventSelector(false);

    }

    if (loading) {

        return (

            <div className="admin-dashboard">

                <p>
                    Loading dashboard...
                </p>

            </div>

        );

    }

    if (error) {

        return (

            <div className="admin-dashboard">

                <div className="admin-dashboard-error">

                    <h2>
                        Unable to load dashboard
                    </h2>

                    <p>
                        {error}
                    </p>

                    <button
                        onClick={() => {

                            if (eventId) {
                                loadDashboard(eventId);
                            } else {
                                setShowEventSelector(true);
                            }

                        }}
                        className="primary-button"
                    >
                        Try Again
                    </button>

                </div>

            </div>

        );

    }

    return (

        <div className="admin-dashboard">

            {showEventSelector && (

                <EventSelector
                    onSelect={handleEventSelected}
                />

            )}

            {!data?.event ? (

                <div className="admin-dashboard-header">

                    <div>

                        <h1>
                            Admin Dashboard
                        </h1>

                        <p>
                            Select an event to begin managing it.
                        </p>

                    </div>

                </div>

            ) : (

                <>

                    <div className="admin-dashboard-header">

                        <div>

                            <h1>
                                Admin Dashboard
                            </h1>

                            <p>
                                Manage and monitor your event.
                            </p>

                        </div>

                        <div
                            className={`event-status ${
                                data.event.status ?? ""
                            }`}
                        >
                            {data.event.statusLabel ??
                                data.event.status ??
                                "Active"}
                        </div>

                    </div>

                    <section className="admin-section">

                        <div className="section-header">

                            <div>

                                <h2>
                                    Current Event
                                </h2>

                                <p>
                                    Event currently selected for management.
                                </p>

                            </div>

                        </div>

                        <div className="event-card">

                            <div>

                                <h3>
                                    {data.event.name}
                                </h3>

                                {data.event.date && (
                                    <p>
                                        {data.event.date}
                                    </p>
                                )}

                                {data.event.location && (
                                    <p>
                                        {data.event.location}
                                    </p>
                                )}

                            </div>

                            <Link
                                className="primary-button"
                                to="/admin/event"
                            >
                                Manage Event
                            </Link>

                        </div>

                    </section>

                    <section className="admin-section">

                        <div className="section-header">

                            <div>
                                <h2>
                                    Event Overview
                                </h2>
                            </div>

                        </div>

                        <div className="admin-stat-grid">

                            <div className="admin-stat-card">

                                <span className="admin-stat-label">
                                    Patrols
                                </span>

                                <strong>
                                    {data.statistics.patrols}
                                </strong>

                            </div>

                            <div className="admin-stat-card">

                                <span className="admin-stat-label">
                                    Stations
                                </span>

                                <strong>
                                    {data.statistics.stations}
                                </strong>

                            </div>

                            <div className="admin-stat-card">

                                <span className="admin-stat-label">
                                    Completed
                                </span>

                                <strong>
                                    {data.statistics.completed}
                                </strong>

                            </div>

                            <div className="admin-stat-card">

                                <span className="admin-stat-label">
                                    Currently Scoring
                                </span>

                                <strong>
                                    {data.statistics.currentlyScoring}
                                </strong>

                            </div>

                        </div>

                    </section>

                    <section className="admin-section">

                        <div className="section-header">

                            <div>

                                <h2>
                                    Management
                                </h2>

                                <p>
                                    Manage the resources used by this event.
                                </p>

                            </div>

                        </div>

                        <div className="admin-action-grid">

                            <AdminAction
                                title="Event"
                                description="Edit event details and configuration."
                                path="/admin/event"
                            />

                            <AdminAction
                                title="Patrols"
                                description="Register and manage event patrols."
                                path="/admin/patrols"
                            />

                            <AdminAction
                                title="Stations"
                                description="Manage scoring stations and requirements."
                                path="/admin/stations"
                            />

                            {ApiService.userData.isSystemAdmin() && (

                                <AdminAction
                                    title="Configurations"
                                    description="Manage event configuration presets."
                                    path="/admin/configurations"
                                />

                            )}

                        </div>

                    </section>

                    <section className="admin-section">

                        <div className="section-header">

                            <div>

                                <h2>
                                    Live Event
                                </h2>

                                <p>
                                    Monitor the event while scoring is taking place.
                                </p>

                            </div>

                        </div>

                        <div className="live-event-card">

                            <div>

                                <h3>
                                    Live Patrol Progress
                                </h3>

                                <p>
                                    View which stations each patrol has
                                    completed without displaying scores.
                                </p>

                            </div>

                            <Link
                                className="primary-button"
                                to="/live"
                            >
                                Open Live Scoring
                            </Link>

                        </div>

                    </section>

                </>

            )}

        </div>

    );

}

function AdminAction({ title, description, path }) {

    return (

        <Link
            className="admin-action-card"
            to={path}
        >

            <div>

                <h3>
                    {title}
                </h3>

                <p>
                    {description}
                </p>

            </div>

            <span className="admin-action-arrow">
                →
            </span>

        </Link>

    );

}