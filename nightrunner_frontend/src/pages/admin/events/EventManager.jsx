import { useEffect, useState } from "react";

import "./EventManager.css";
import ApiService from "@/api/ApiService.js";

export default function EventManager() {

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState(null);

    const [success, setSuccess] = useState(null);

    const [event, setEvent] = useState(null);

    const [events, setEvents] = useState([]);

    const [selectedEventId, setSelectedEventId] = useState("");

    const [form, setForm] = useState({
        name: "",
        date: "",
        description: "",
        roundingPrecision: 1000
    });


    /*
     * Load the user's current event.
     */
    useEffect(() => {

        async function loadEvent() {

            try {

                setLoading(true);
                setError(null);

                const user = ApiService.userData.get();

                if (!user) {

                    throw new Error(
                        "Unable to determine the current user."
                    );

                }

                /*
                 * Normal event-scoped user.
                 *
                 * Their event is fixed by user.event.
                 */
                if (user.event) {

                    const response = await ApiService.eventData.getEvent(user.event);

                    setEvent(response);

                    setForm({
                        name: response.name ?? "",
                        date: response.date ?? "",
                        description:
                            response.description ?? "",
                        roundingPrecision:
                            response.roundingPrecision ?? 1000
                    });

                    return;

                }


                /*
                 * A System Admin is allowed to have no event.
                 *
                 * Give them a list of events to select from.
                 */
                if (ApiService.userData.isSystemAdmin()) {

                    const response =
                        await ApiService.eventData.getEvents();

                    setEvents(
                        Array.isArray(response)
                            ? response
                            : response.events ?? []
                    );

                    return;

                }


                /*
                 * Non-admin without an event.
                 */
                throw new Error(
                    "No event is currently assigned to your account."
                );

            }
            catch (error) {

                console.error(
                    "Failed to load event:",
                    error
                );

                setError(
                    error.message ??
                    "Failed to load the event."
                );

            }
            finally {

                setLoading(false);

            }

        }

        loadEvent();

    }, []);


    /*
     * Load a selected event.
     *
     * This is only reachable for a System Admin who
     * does not already have an event assigned.
     */
    async function handleEventSelect(eventId) {

        setSelectedEventId(eventId);

        setError(null);
        setSuccess(null);

        if (!eventId) {

            setEvent(null);

            return;

        }

        try {

            setLoading(true);

            const response = await ApiService.eventData.getEvent(eventId);

            setEvent(response);

            setForm({
                name: response.name ?? "",
                date: response.date ?? "",
                description:
                    response.description ?? "",
                roundingPrecision:
                    response.roundingPrecision ?? 1000
            });

        }
        catch (error) {

            console.error(
                "Failed to load selected event:",
                error
            );

            setError(
                error.message ??
                "Failed to load the selected event."
            );

            setEvent(null);

        }
        finally {

            setLoading(false);

        }

    }


    function handleChange(event) {

        const {
            name,
            value
        } = event.target;

        setForm(previous => ({
            ...previous,

            [name]:
                name === "roundingPrecision"
                    ? Number(value)
                    : value
        }));

        setSuccess(null);

    }


    async function handleSubmit(submitEvent) {

        submitEvent.preventDefault();

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {

            if (!form.name.trim()) {
                throw new Error("Event name is required.");
            }

            if (!form.date) {
                throw new Error("Event date is required.");
            }

            if (!event?.id) {
                throw new Error("No event is currently selected.");
            }

            const updatedEvent = await ApiService.eventData.updateEvent(
                event.id,
                {
                    ...event,
                    name: form.name.trim(),
                    date: form.date,
                    description: form.description.trim(),
                    roundingPrecision: form.roundingPrecision
                }
            );

            setEvent(updatedEvent);

            setForm({
                name: updatedEvent.name ?? "",
                date: updatedEvent.date ?? "",
                description: updatedEvent.description ?? "",
                roundingPrecision:
                    updatedEvent.roundingPrecision ?? 1000
            });

            setSuccess(
                "Event details saved successfully."
            );

        }
        catch (error) {

            console.error(
                "Failed to update event:",
                error
            );

            setError(
                error.message ??
                "Failed to save event."
            );

        }
        finally {

            setSaving(false);

        }

    }


    if (loading) {

        return (

            <div className="event-manager">

                <div className="loading-panel">

                    <p>
                        Loading event...
                    </p>

                </div>

            </div>

        );

    }


    /*
     * No event selected.
     *
     * Only a System Admin can get here.
     */
    if (!event) {

        return (

            <div className="event-manager">

                <div className="page-header">

                    <div>

                        <h1>Event</h1>

                        <p>
                            Select an event to manage.
                        </p>

                    </div>

                </div>


                {error && (

                    <div className="error-banner">

                        {error}

                    </div>

                )}


                {ApiService.userData.isSystemAdmin() && !error && (

                    <section className="admin-section">

                        <div className="section-header">

                            <div>

                                <h2>
                                    Select Event
                                </h2>

                                <p>
                                    Select an event to access its
                                    management tools.
                                </p>

                            </div>

                        </div>


                        <div className="form-group">

                            <label htmlFor="event-select">

                                Event

                            </label>

                            <select
                                id="event-select"
                                value={selectedEventId}
                                onChange={event =>
                                    handleEventSelect(
                                        event.target.value
                                    )
                                }
                            >

                                <option value="">
                                    Select an event...
                                </option>

                                {events.map(event => (

                                    <option
                                        key={event.id}
                                        value={event.id}
                                    >

                                        {event.name}

                                    </option>

                                ))}

                            </select>

                        </div>

                    </section>

                )}

            </div>

        );

    }


    return (

        <div className="event-manager">

            <div className="page-header">

                <div>

                    <h1>
                        Event
                    </h1>

                    <p>
                        Manage the details and configuration
                        of the current event.
                    </p>

                </div>

            </div>


            {error && (

                <div className="error-banner">

                    {error}

                </div>

            )}


            {success && (

                <div className="success-banner">

                    {success}

                </div>

            )}


            <form
                className="event-form"
                onSubmit={handleSubmit}
            >

                <section className="admin-section">

                    <div className="section-header">

                        <div>

                            <h2>
                                Event Details
                            </h2>

                            <p>
                                Basic information about the event.
                            </p>

                        </div>

                    </div>


                    <div className="form-grid">

                        <div className="form-group">

                            <label htmlFor="event-name">
                                Event Name
                            </label>

                            <input
                                id="event-name"
                                name="name"
                                type="text"
                                value={form.name}
                                onChange={handleChange}
                                disabled={saving}
                                required
                            />

                        </div>


                        <div className="form-group">

                            <label htmlFor="event-date">
                                Event Date
                            </label>

                            <input
                                id="event-date"
                                name="date"
                                type="date"
                                value={form.date}
                                onChange={handleChange}
                                disabled={saving}
                                required
                            />

                        </div>


                        <div className="form-group form-group-full">

                            <label htmlFor="event-description">
                                Description
                            </label>

                            <textarea
                                id="event-description"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                disabled={saving}
                                rows={5}
                            />

                        </div>


                        <div className="form-group">

                            <label htmlFor="rounding-precision">
                                Rounding Precision
                            </label>

                            <input
                                id="rounding-precision"
                                name="roundingPrecision"
                                type="number"
                                min="1"
                                value={form.roundingPrecision}
                                onChange={handleChange}
                                disabled={saving}
                                required
                            />

                            <small>
                                Used when calculating scoring
                                precision.
                            </small>

                        </div>

                    </div>

                </section>


                <section className="admin-section">

                    <div className="section-header">

                        <div>

                            <h2>
                                Event Information
                            </h2>

                            <p>
                                Information managed by the system.
                            </p>

                        </div>

                    </div>


                    <div className="event-information-grid">

                        <div>

                            <span className="information-label">
                                Event ID
                            </span>

                            <code>
                                {event.id}
                            </code>

                        </div>


                        <div>

                            <span className="information-label">
                                Patrols
                            </span>

                            <strong>
                                {event.patrols?.length ?? 0}
                            </strong>

                        </div>


                        <div>

                            <span className="information-label">
                                Stations
                            </span>

                            <strong>
                                {event.stations?.length ?? 0}
                            </strong>

                        </div>


                        <div>

                            <span className="information-label">
                                Organizers
                            </span>

                            <strong>
                                {event.organizers?.length ?? 0}
                            </strong>

                        </div>

                    </div>

                </section>


                <div className="form-actions">

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={saving}
                    >

                        {saving
                            ? "Saving..."
                            : "Save Changes"
                        }

                    </button>

                </div>

            </form>

        </div>

    );

}