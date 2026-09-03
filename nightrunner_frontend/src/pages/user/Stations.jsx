import { useEffect, useState } from "react";

import ApiService from "@/api/ApiService";
import EventSelector from "@/api/helpers/EventSelector";

import "./Stations.css";

export default function Stations() {

    const [stations, setStations] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showEventSelector, setShowEventSelector] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    useEffect(() => {

        loadStations();

    }, []);

    async function loadStations(eventId = null) {

        try {

            setLoading(true);
            setError(null);

            const resolvedEventId =
                eventId ??
                ApiService.userData.getEventId();

            /*
             * System administrators may not have an event
             * assigned to their account. In that case, let
             * them select the event they want to manage.
             */
            if (!resolvedEventId) {

                if (ApiService.userData.isSystemAdmin()) {

                    setShowEventSelector(true);
                    setLoading(false);

                    return;

                }

                throw new Error(
                    "No event is currently assigned to your account."
                );

            }

            const response =
                await ApiService.stationData.getStations(
                    resolvedEventId
                );

            setStations(response ?? []);
            setSelectedEvent(resolvedEventId);

        } catch (error) {

            console.error(
                "Failed to load stations:",
                error
            );

            setError(
                error?.message ??
                "Unable to load stations."
            );

        } finally {

            setLoading(false);

        }

    }

    async function handleEventSelected(eventId) {

        setShowEventSelector(false);

        await loadStations(eventId);

    }

    if (loading) {

        return (

            <div className="stations-page">

                <div className="loading-panel">

                    Loading stations...

                </div>

            </div>

        );

    }

    return (

        <div className="stations-page">

            {showEventSelector && (

                <EventSelector
                    onSelect={handleEventSelected}
                />

            )}

            <div className="page-header">

                <div>

                    <h1>Stations</h1>

                    <p>
                        Stations available during this event.
                    </p>

                </div>

            </div>

            {error && (

                <div className="error-banner">

                    {error}

                </div>

            )}

            {!error && stations.length === 0 && (

                <div className="empty-panel">

                    <h2>No Stations</h2>

                    <p>
                        There are currently no stations configured
                        for this event.
                    </p>

                </div>

            )}

            {!error && stations.length > 0 && (

                <div className="station-grid">

                    {stations.map(station => (

                        <div
                            className="station-card"
                            key={station.id}
                        >

                            <div className="station-card-header">

                                <h2>
                                    {station.name}
                                </h2>

                            </div>

                            <div className="station-card-body">

                                {station.description ? (

                                    <p className="station-description">

                                        {station.description}

                                    </p>

                                ) : (

                                    <p className="station-description muted">

                                        No description available.

                                    </p>

                                )}

                                <div className="station-info">

                                    <div>

                                        <span>
                                            Station Staff
                                        </span>

                                        <strong>
                                            {station.members?.length ?? 0}
                                        </strong>

                                    </div>

                                </div>

                            </div>

                        </div>

                    ))}

                </div>

            )}

        </div>

    );

}