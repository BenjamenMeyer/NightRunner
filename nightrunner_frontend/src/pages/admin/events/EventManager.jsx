import {
    useEffect,
    useState
} from "react";

import "./EventManager.css";
import {useEventContext} from "../../../api/helpers/EventContext.jsx";
import ApiService from "../../../api/ApiService.js";

export default function EventManager() {

    const {
        event,
        eventId,
        loading: eventLoading,
        error: eventError
    } = useEventContext();

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState(null);

    const [success, setSuccess] = useState(null);

    const [form, setForm] = useState({
        name: "",
        date: "",
        description: "",
        roundingPrecision: 1000
    });

    useEffect(() => {

        if (!event) {
            return;
        }

        setForm({
            name: event.name ?? "",
            date: event.date ?? "",
            description:
                event.description ?? "",
            roundingPrecision:
                event.roundingPrecision ?? 1000
        });

    }, [event]);

    function handleChange(inputEvent) {

        const {
            name,
            value
        } = inputEvent.target;

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

                throw new Error(
                    "Event name is required."
                );

            }

            if (!form.date) {

                throw new Error(
                    "Event date is required."
                );

            }

            if (!eventId || !event?.id) {

                throw new Error(
                    "No event is currently selected."
                );

            }

            const updatedEvent =
                await ApiService.eventData.updateEvent(
                    event.id,
                    {
                        ...event,

                        name:
                            form.name.trim(),

                        date:
                        form.date,

                        description:
                            form.description.trim(),

                        roundingPrecision:
                        form.roundingPrecision
                    }
                );

            setForm({
                name:
                    updatedEvent.name ?? "",

                date:
                    updatedEvent.date ?? "",

                description:
                    updatedEvent.description ?? "",

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
                error?.message ??
                "Failed to save event."
            );

        }
        finally {

            setSaving(false);

        }

    }

    if (eventLoading) {

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

    if (eventError) {
        return (
            <div className="event-manager">
                <div className="error-banner">
                    {eventError}
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="event-manager">
                <div className="page-header">
                    <div>
                        <h1>
                            Event
                        </h1>
                        <p>
                            No event is currently selected.
                        </p>
                    </div>
                </div>
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