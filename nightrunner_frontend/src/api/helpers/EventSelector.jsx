import { useEffect, useState } from "react";

import ApiService from "@/api/ApiService";

import "./EventSelector.css";

export default function EventSelector({ onSelect }) {

    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {

        loadEvents();

    }, []);

    async function loadEvents() {

        try {

            setLoading(true);
            setError(null);

            const response =
                await ApiService.eventData.getEvents();

            setEvents(response ?? []);

        }
        catch (error) {

            console.error(
                "Failed to load events:",
                error
            );

            setError(
                error.message ??
                "Failed to load events."
            );

        }
        finally {

            setLoading(false);

        }

    }

    function handleSubmit(event) {

        event.preventDefault();

        if (!selectedEvent) {
            return;
        }

        const selected =
            events.find(
                (event) =>
                    String(event.id) ===
                    String(selectedEvent)
            );

        if (!selected) {

            setError(
                "The selected event could not be found."
            );

            return;

        }

        onSelect(selected.id);

    }

    return (

        <div className="event-selector-overlay">

            <div
                className="event-selector"
                role="dialog"
                aria-modal="true"
                aria-labelledby="event-selector-title"
            >

                <div className="event-selector-header">

                    <h2 id="event-selector-title">
                        Select an Event
                    </h2>

                    <p>
                        Your administrator account is not
                        assigned to an event. Select an event
                        to continue.
                    </p>

                </div>


                {loading && (

                    <div className="event-selector-loading">

                        Loading events...

                    </div>

                )}


                {!loading && error && (

                    <div className="event-selector-error">

                        {error}

                    </div>

                )}


                {!loading && !error && (

                    <form onSubmit={handleSubmit}>

                        <div className="event-selector-field">

                            <label htmlFor="event-selector">

                                Event

                            </label>

                            <select
                                id="event-selector"
                                value={selectedEvent}
                                onChange={(event) =>
                                    setSelectedEvent(
                                        event.target.value
                                    )
                                }
                            >

                                <option value="">
                                    Select an event...
                                </option>

                                {events.map((event) => (

                                    <option
                                        key={event.id}
                                        value={event.id}
                                    >
                                        {event.name}
                                    </option>

                                ))}

                            </select>

                        </div>


                        <div className="event-selector-actions">

                            <button
                                type="submit"
                                disabled={!selectedEvent}
                            >
                                Continue
                            </button>

                        </div>

                    </form>

                )}

            </div>

        </div>

    );

}