import { useEffect, useState } from "react";

import ApiService from "@/api/ApiService";
import EventSelector from "@/api/helpers/EventSelector";

import "./Patrols.css";

export default function Patrols() {

    const [patrols, setPatrols] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showEventSelector, setShowEventSelector] = useState(false);

    useEffect(() => {

        loadPatrols();

    }, []);

    async function loadPatrols(eventId = null) {

        try {

            setLoading(true);
            setError(null);

            const resolvedEventId =
                eventId ??
                ApiService.userData.getEventId();

            /*
             * System administrators may not have an event
             * assigned to their account. Let them select one.
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
                await ApiService.patrolData.getPatrols(
                    resolvedEventId
                );

            setPatrols(response ?? []);

        } catch (error) {

            console.error(
                "Failed to load patrols:",
                error
            );

            setError(
                error?.message ??
                "Unable to load patrols."
            );

        } finally {

            setLoading(false);

        }

    }

    async function handleEventSelected(eventId) {

        setShowEventSelector(false);

        await loadPatrols(eventId);

    }

    if (loading) {

        return (

            <div className="patrols-page">

                <div className="loading-panel">

                    Loading patrols...

                </div>

            </div>

        );

    }

    return (

        <div className="patrols-page">

            {showEventSelector && (

                <EventSelector
                    onSelect={handleEventSelected}
                />

            )}

            <div className="page-header">

                <div>

                    <h1>Patrols</h1>

                    <p>
                        Patrols participating in this event.
                    </p>

                </div>

            </div>

            {error && (

                <div className="error-banner">

                    {error}

                </div>

            )}

            {!error && patrols.length === 0 && (

                <div className="empty-panel">

                    <h2>No Patrols</h2>

                    <p>
                        There are currently no patrols registered
                        for this event.
                    </p>

                </div>

            )}

            {!error && patrols.length > 0 && (

                <div className="patrol-grid">

                    {patrols.map(patrol => (

                        <div
                            className="patrol-card"
                            key={patrol.id}
                        >

                            <div className="patrol-card-header">

                                <h2>
                                    {patrol.programName}
                                </h2>

                            </div>

                            <div className="patrol-card-body">

                                <h4>
                                    Troop:{" "}
                                    {patrol.members?.[0]?.troop ?? "Unknown"}
                                </h4>

                                <div className="patrol-member-count">

                                    {patrol.members?.length ?? 0}

                                    {" "}

                                    {(patrol.members?.length ?? 0) === 1
                                        ? "Member"
                                        : "Members"}

                                </div>

                                {patrol.members?.length > 0 && (

                                    <ul className="patrol-members">

                                        {patrol.members.map(member => (

                                            <li key={member.id}>

                                                <strong>
                                                    {member.name}
                                                </strong>

                                                {member.rank && (

                                                    <span>
                                                        {" "}
                                                        — {member.rank}
                                                    </span>

                                                )}

                                            </li>

                                        ))}

                                    </ul>

                                )}

                            </div>

                        </div>

                    ))}

                </div>

            )}

        </div>

    );

}